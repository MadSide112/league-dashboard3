import Papa from 'papaparse';
import { CONFIG } from '../config';
import { Parameter, Participant } from '../types';

const REVENUE_POINTS_PER_50000 = CONFIG.REVENUE_POINTS_PER_50000;
const GAS_WEB_APP_URL = CONFIG.GAS_WEB_APP_URL;

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

const parseNumericValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  if (!value.trim()) {
    return 0;
  }

  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');

  const parsed = parseFloat(normalized);
  
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeHeader = (header: string): string => header.trim();

// Получить ключ месяца в формате YYYY-MM
const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Проверка смены месяца
const hasMonthChanged = (lastMonthKey: string | undefined, currentMonthKey: string): boolean => {
  if (!lastMonthKey) return false;
  return lastMonthKey !== currentMonthKey;
};

// Получить серверное время из Google Apps Script
export const getServerTime = async (): Promise<Date> => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'getServerTime',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error('Failed to get server time');
    }

    console.log('🕐 Server time received:', result.serverTime);
    return new Date(result.serverTime);
  } catch (error) {
    console.warn('⚠️ Failed to get server time, using local time:', error);
    // Fallback на локальное время
    return new Date();
  }
};

// ========== ЗАГРУЗКА ДАННЫХ ИЗ ЛИСТА ==========

const loadParticipantsFromSheetName = async (
  spreadsheetId: string,
  sheetName: string,
  parameters: Parameter[],
  idPrefix: string
): Promise<Participant[]> => {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(csvUrl);
  
  if (!response.ok) {
    throw new Error(`Не удалось получить данные из листа "${sheetName}".`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`Ошибка парсинга CSV из листа "${sheetName}".`);
  }

  const rows = parsed.data as Array<Record<string, string>>;
  if (rows.length === 0) {
    return [];
  }

  return rows.reduce<Participant[]>((acc, row: Record<string, string>, index: number) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
    );

    const fullName = String(normalizedRow['ФИО'] || '').trim();
    if (!fullName) {
      return acc;
    }

    const participantParams: Record<string, number> = {};
    let paramsScore = 0;

    parameters.forEach((parameter) => {
      const count = parseNumericValue(normalizedRow[parameter.name]);
      participantParams[parameter.name] = count;
      paramsScore += count * parameter.weight;
    });

    const revenue = parseNumericValue(normalizedRow['Выручка']);
    const revenueScore = Math.floor(revenue / 50000) * REVENUE_POINTS_PER_50000;

    // Дополнительные поля из таблицы (если есть)
    const lastUpdated = normalizedRow['lastUpdated'] || undefined;
    const currentMonth = normalizedRow['currentMonth'] || undefined;
    const monthlyBaseRevenue = parseNumericValue(normalizedRow['monthlyBaseRevenue']);

    // Парсим monthlyBase (JSON в строке)
    let monthlyBase: { [key: string]: number } = {};
    if (normalizedRow['monthlyBase']) {
      try {
        monthlyBase = JSON.parse(normalizedRow['monthlyBase']);
      } catch {
        monthlyBase = {};
      }
    }

    acc.push({
      id: `${idPrefix}-${Date.now()}-${index}`,
      fullName,
      parameters: participantParams,
      revenue,
      revenueScore,
      totalScore: paramsScore + revenueScore,
      lastUpdated,
      currentMonth,
      monthlyBase,
      monthlyBaseRevenue,
    });

    return acc;
  }, []);
};

// ========== ЭКСПОРТ ФУНКЦИЙ ==========

export const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9-_]+$/.test(trimmed) && !trimmed.includes('/')) {
    return trimmed;
  }

  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Не удалось определить Spreadsheet ID из ссылки');
  }

  return match[1];
};

export const importParticipantsFromSheet = async (
  spreadsheetUrlOrId: string,
  parameters: Parameter[]
): Promise<Participant[]> => {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  try {
    return await loadParticipantsFromSheetName(spreadsheetId, CONFIG.SHEETS.DATABASE, parameters, 'db');
  } catch {
    throw new Error('Не удалось получить данные из листа "База данных". Проверьте доступ и название листа.');
  }
};

export const importFromEditingFile = async (
  spreadsheetUrlOrId: string,
  parameters: Parameter[]
): Promise<Participant[]> => {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  try {
    return await loadParticipantsFromSheetName(spreadsheetId, CONFIG.SHEETS.EDITING, parameters, 'edit');
  } catch {
    throw new Error('Не удалось получить данные из листа "Файл редактирования". Проверьте доступ и наличие листа.');
  }
};

export const exportSnapshotToDatedSheet = async (
  spreadsheetUrlOrId: string,
  participants: Participant[],
  parameters: Parameter[]
): Promise<{ success: boolean; sheetName?: string; error?: string }> => {
  try {
    const headers = ['ФИО', ...parameters.map((p) => p.name), 'Выручка', 'Баллы за выручку', 'Общий балл'];
    const rows = [
      headers,
      ...participants.map((p) => [
        p.fullName,
        ...parameters.map((param) => p.parameters[param.name] || 0),
        p.revenue,
        p.revenueScore,
        p.totalScore,
      ]),
    ];

    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'exportMonth',
        spreadsheetId: extractSpreadsheetId(spreadsheetUrlOrId),
        rows,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка экспорта'
    };
  }
};

export const readDatabaseSheet = async (
  spreadsheetUrlOrId: string,
  parameters: Parameter[]
): Promise<Participant[]> => {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  try {
    return await loadParticipantsFromSheetName(spreadsheetId, CONFIG.SHEETS.DATABASE, parameters, 'db');
  } catch (error) {
    console.error('Error reading database sheet:', error);
    return [];
  }
};

export const writeSheetByName = async (
  _spreadsheetUrlOrId: string,
  sheetName: string,
  participants: Participant[],
  parameters: Parameter[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const headers = [
      'ФИО',
      ...parameters.map(p => p.name),
      'Выручка',
      'lastUpdated',
      'currentMonth',
      'monthlyBase',
      'monthlyBaseRevenue',
    ];
    
    const rows = [
      headers,
      ...participants.map(p => [
        p.fullName,
        ...parameters.map(param => p.parameters[param.name] || 0),
        p.revenue,
        p.lastUpdated || '',
        p.currentMonth || '',
        JSON.stringify(p.monthlyBase || {}),
        p.monthlyBaseRevenue || 0,
      ]),
    ];

    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateSheet',
        sheetName: sheetName,
        rows: rows,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Write error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка записи' 
    };
  }
};

export const clearSheetBody = async (
  _spreadsheetUrlOrId: string,
  sheetName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'clearSheetBody',
        sheetName: sheetName,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Clear error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка очистки' 
    };
  }
};

// ========== SYSTEM SETTINGS (глобальные настройки) ==========

export const getSystemSetting = async (
  spreadsheetUrlOrId: string,
  key: string
): Promise<string | null> => {
  try {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=System`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      console.warn('System sheet not found');
      return null;
    }

    const csvText = await response.text();
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const row = parsed.data.find((r: any) => r.key === key);
    return row?.value || null;
  } catch (error) {
    console.error('Error reading system setting:', error);
    return null;
  }
};

export const setSystemSetting = async (
  spreadsheetUrlOrId: string,
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
    
    let currentSettings: Array<[string, string]> = [];
    
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=System`;
      const response = await fetch(csvUrl);
      if (response.ok) {
        const csvText = await response.text();
        const parsed = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        
        currentSettings = parsed.data.map((r: any) => [r.key, r.value]);
      }
    } catch {
      // Лист пуст или не существует
    }

    const existingIndex = currentSettings.findIndex(([k]) => k === key);
    if (existingIndex >= 0) {
      currentSettings[existingIndex][1] = value;
    } else {
      currentSettings.push([key, value]);
    }

    const rows = [
      ['key', 'value'],
      ...currentSettings,
    ];

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateSheet',
        sheetName: 'System',
        rows: rows,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to set system setting');
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting system setting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getLastSyncTime = async (
  spreadsheetUrlOrId: string
): Promise<Date | null> => {
  const timeString = await getSystemSetting(spreadsheetUrlOrId, 'lastSyncTime');
  if (!timeString) return null;
  
  try {
    return new Date(timeString);
  } catch {
    return null;
  }
};

export const setLastSyncTime = async (
  spreadsheetUrlOrId: string,
  date: Date
): Promise<{ success: boolean; error?: string }> => {
  return setSystemSetting(spreadsheetUrlOrId, 'lastSyncTime', date.toISOString());
};

// ========== ✅ ГЛАВНАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ ==========

export const syncWithDatabase = async (
  spreadsheetUrlOrId: string,
  parameters: Parameter[]
): Promise<Participant[]> => {
  console.log('🔄 Starting sync...');
  
  const dbParticipants = await readDatabaseSheet(spreadsheetUrlOrId, parameters);
  console.log(`📖 Loaded ${dbParticipants.length} participants from database`);

  const editingParticipants = await importFromEditingFile(spreadsheetUrlOrId, parameters);
  console.log(`📝 Loaded ${editingParticipants.length} participants from editing file`);

  const mergedMap = new Map<string, Participant>();

  dbParticipants.forEach((p: Participant) => {
    mergedMap.set(p.fullName, { ...p });
  });

  const now = await getServerTime();
  const currentMonthKey = getMonthKey(now);
  
  console.log(`📅 Server time: ${now.toISOString()}`);
  console.log(`📅 Current month: ${currentMonthKey}`);
for (const p of editingParticipants) {
  const existing = mergedMap.get(p.fullName);
  
  if (existing) {
    // ========== УЧАСТНИК УЖЕ ЕСТЬ В БАЗЕ ==========
    
    const lastMonthKey = existing.currentMonth || currentMonthKey;
    const monthChanged = hasMonthChanged(lastMonthKey, currentMonthKey);
    
    console.log(`👤 Processing ${p.fullName}:`, {
      lastMonth: lastMonthKey,
      currentMonth: currentMonthKey,
      monthChanged,
      serverTime: now.toISOString(),
    });
    
    const monthlyBase = existing.monthlyBase || {};
    let monthlyBaseRevenue = existing.monthlyBaseRevenue || 0;
    
    const mergedParams: Record<string, number> = {};
    
    // ========== ОБРАБОТКА ПАРАМЕТРОВ ==========
    parameters.forEach((param: Parameter) => {
      const dbValue = existing.parameters[param.name] || 0;
      const newValue = p.parameters[param.name] || 0;
      const baseValue = monthlyBase[param.name] || 0;
      
      if (param.shouldSum === false) {
        // ❌ Параметр НЕ суммируется (ЗвБ, Бронь, Задаток)
        
        if (monthChanged) {
          // 🗓️ НОВЫЙ МЕСЯЦ
          // Фиксируем значение прошлого месяца как базу
          monthlyBase[param.name] = dbValue;
          // Итоговое = база + новое значение из файла
          mergedParams[param.name] = dbValue + newValue;
          
          console.log(`  📊 ${param.name} (новый месяц): фиксируем базу ${dbValue}, новое ${newValue}, итого = ${mergedParams[param.name]}`);
        } else {
          // 📅 ТОТ ЖЕ МЕСЯЦ - ПРОСТО ЗАМЕНЯЕМ!
          // Итоговое = база месяца + новое значение (замена текущего)
          mergedParams[param.name] = baseValue + newValue;
          
          console.log(`  📊 ${param.name} (тот же месяц): база ${baseValue} + новое ${newValue} = ${mergedParams[param.name]}`);
        }
      } else {
        // ✅ Обычный параметр - всегда суммируем
        mergedParams[param.name] = dbValue + newValue;
        console.log(`  ➕ ${param.name}: ${dbValue} + ${newValue} = ${mergedParams[param.name]}`);
      }
    });

    // ========== ОБРАБОТКА ВЫРУЧКИ (АНАЛОГИЧНО) ==========
    const dbRevenue = existing.revenue || 0;
    const newRevenue = p.revenue || 0;
    
    let mergedRevenue: number;
    
    if (monthChanged) {
      // 🗓️ НОВЫЙ МЕСЯЦ
      // Фиксируем выручку прошлого месяца как базу
      monthlyBaseRevenue = dbRevenue;
      // Итоговое = база + новое
      mergedRevenue = dbRevenue + newRevenue;
      
      console.log(`  💰 Выручка (новый месяц): фиксируем базу ${dbRevenue}, новое ${newRevenue}, итого = ${mergedRevenue}`);
    } else {
      // 📅 ТОТ ЖЕ МЕСЯЦ - ПРОСТО ЗАМЕНЯЕМ!
      // Итоговое = база месяца + новое (замена текущего)
      mergedRevenue = monthlyBaseRevenue + newRevenue;
      
      console.log(`  💰 Выручка (тот же месяц): база ${monthlyBaseRevenue} + новое ${newRevenue} = ${mergedRevenue}`);
    }

    // ========== РАСЧЁТ БАЛЛОВ ==========
    const mergedRevenueScore = Math.floor(mergedRevenue / 50000) * REVENUE_POINTS_PER_50000;

    let paramsScore = 0;
    parameters.forEach((param: Parameter) => {
      paramsScore += mergedParams[param.name] * param.weight;
    });

    // ========== СОХРАНЕНИЕ ==========
    mergedMap.set(p.fullName, {
      ...existing,
      parameters: mergedParams,
      revenue: mergedRevenue,
      revenueScore: mergedRevenueScore,
      totalScore: paramsScore + mergedRevenueScore,
      lastUpdated: now.toISOString(),
      currentMonth: currentMonthKey,
      monthlyBase: monthlyBase,
      monthlyBaseRevenue: monthlyBaseRevenue,
    });
    
    console.log(`  ✅ Total score: ${paramsScore + mergedRevenueScore}`);
    
  } else {
    // ========== НОВЫЙ УЧАСТНИК ==========
    console.log(`🆕 New participant: ${p.fullName}`);
    
    // Для нового участника база = 0, текущее значение = из файла
    mergedMap.set(p.fullName, {
      ...p,
      lastUpdated: now.toISOString(),
      currentMonth: currentMonthKey,
      monthlyBase: {}, // Пустая база
      monthlyBaseRevenue: 0, // Нулевая база выручки
    });
  }
}

  const mergedParticipants = Array.from(mergedMap.values());

  console.log(`💾 Writing ${mergedParticipants.length} participants to database`);
  await writeSheetByName(spreadsheetUrlOrId, CONFIG.SHEETS.DATABASE, mergedParticipants, parameters);

  console.log('🕐 Saving sync time to Google Sheets...');
  await setLastSyncTime(spreadsheetUrlOrId, now);
    
  console.log('✅ Sync complete!');
  return mergedParticipants;
};

export { GAS_WEB_APP_URL };
