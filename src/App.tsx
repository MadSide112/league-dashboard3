import { useState, useEffect, useCallback } from 'react';
import { Participant, Parameter } from './types';
import { initialParticipants, initialParameters } from './data';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import PasswordProtectedPanel from './components/PasswordProtectedPanel';
import LogsViewer from './components/LogsViewer';
import { importParticipantsFromSheet, exportSnapshotToDatedSheet, syncWithDatabase, getLastSyncTime } from './utils/googleSheets';
import { logger } from './utils/logger';
import { useToast } from './components/Toast';
import { usePersistedParticipants } from './hooks/usePersistedParticipants';
import { withRetry } from './utils/retry';
import { getErrorMessage } from './utils/errors';
import { CONFIG } from './config';
import LeagueLogo from './components/LeagueLogo';
import SyncIndicator from './components/SyncIndicator';

function App() {
  // State с персистентностью
  const [participants, setParticipants] = usePersistedParticipants(initialParticipants);
  const [parameters, setParameters] = useState<Parameter[]>(initialParameters);
  
  // UI state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isImportingSheet, setIsImportingSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Sync tracking
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const { showToast } = useToast();

  // ============================================================================
  // INITIAL DATA LOAD (только один раз при монтировании)
  // ============================================================================
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsInitialLoading(true);
      
      try {
        logger.info('Init', 'Loading initial data from Google Sheets...');
        const lastSync = await getLastSyncTime(CONFIG.SHEET_URL);
        if (lastSync && isMounted) {
        setLastSyncTime(lastSync);
        logger.info('Init', `Last sync time: ${lastSync.toISOString()}`);
        }
        
        const freshData = await withRetry(
          () => importParticipantsFromSheet(CONFIG.SHEET_URL, parameters),
          {
            maxRetries: CONFIG.MAX_RETRIES,
            delayMs: CONFIG.RETRY_DELAY_MS,
            backoff: 'exponential',
            onRetry: (attempt, error) => {
              logger.warning('Retry', `Attempt ${attempt}/${CONFIG.MAX_RETRIES}: ${getErrorMessage(error)}`);
            }
          }
        );
        
        if (isMounted && freshData && freshData.length > 0) {
          setParticipants(freshData);
          logger.success('Init', `Loaded ${freshData.length} participants from Google Sheets`);
          
          // Показываем уведомление только если данные отличаются от кэша
          if (participants.length !== freshData.length) {
            showToast(`Загружено ${freshData.length} участников`, 'success');
          }
        }
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        logger.error('Init', `Failed to load initial data: ${errorMessage}`);
        
        // Если есть кэшированные данные - используем их
        if (participants.length > 0) {
          logger.info('Cache', `Using cached data: ${participants.length} participants`);
          showToast('Используются кэшированные данные', 'warning');
        } else {
          // Если кэша нет - показываем ошибку
          showToast(`Ошибка загрузки данных: ${errorMessage}`, 'error');
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []); // Только при монтировании!

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A - открыть админ-панель
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminPanel(prev => !prev);
        logger.info('UI', 'Admin panel toggled via keyboard shortcut');
      }
      
      // Ctrl+Shift+L - открыть логи
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setShowLogs(prev => !prev);
        logger.info('UI', 'Logs viewer toggled via keyboard shortcut');
      }

      // Esc - закрыть все панели
      if (e.key === 'Escape') {
        setShowAdminPanel(false);
        setShowLogs(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================================================
  // PARTICIPANT MANAGEMENT
  // ============================================================================
  const handleUpdateParticipant = useCallback((id: string, updates: Partial<Participant>) => {
    setParticipants(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      logger.info('Update', `Updated participant: ${updates.fullName || 'unknown'}`);
      return updated;
    });
  }, [setParticipants]);

  const handleAddParticipant = useCallback((newParticipant: Omit<Participant, 'id'>) => {
    const participant: Participant = { 
      ...newParticipant, 
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
    
    setParticipants(prev => {
      const updated = [...prev, participant];
      logger.success('Add', `Added new participant: ${participant.fullName}`);
      showToast(`Добавлен участник: ${participant.fullName}`, 'success');
      return updated;
    });
  }, [setParticipants, showToast]);

  const handleDeleteParticipant = useCallback((id: string) => {
    const participant = participants.find(p => p.id === id);
    
    if (!participant) {
      showToast('Участник не найден', 'error');
      return;
    }

    if (window.confirm(`Удалить участника "${participant.fullName}"?`)) {
      setParticipants(prev => {
        const updated = prev.filter(p => p.id !== id);
        logger.warning('Delete', `Deleted participant: ${participant.fullName}`);
        showToast(`Удален участник: ${participant.fullName}`, 'info');
        return updated;
      });
    }
  }, [participants, setParticipants, showToast]);

  // ============================================================================
  // PARAMETER MANAGEMENT
  // ============================================================================
  const handleUpdateParameters = useCallback((newParameters: Parameter[]) => {
    setParameters(newParameters);
    
    // Пересчитываем баллы для всех участников с новыми параметрами
    setParticipants(prev => prev.map(participant => {
      const updatedParameters = { ...participant.parameters };
      
      // Добавляем новые параметры со значением 0
      newParameters.forEach(param => {
        if (!(param.name in updatedParameters)) {
          updatedParameters[param.name] = 0;
        }
      });
      
      // Удаляем параметры, которых больше нет
      Object.keys(updatedParameters).forEach(name => {
        if (!newParameters.some(p => p.name === name)) {
          delete updatedParameters[name];
        }
      });
      
      // Пересчитываем баллы
      const paramsScore = newParameters.reduce((sum, p) => {
        return sum + ((updatedParameters[p.name] || 0) * p.weight);
      }, 0);
      
      return { 
        ...participant, 
        parameters: updatedParameters, 
        totalScore: paramsScore + participant.revenueScore 
      };
    }));

    logger.success('Parameters', `Updated ${newParameters.length} parameters`);
    showToast('Параметры обновлены', 'success');
  }, [setParticipants, showToast]);

  // ============================================================================
  // GOOGLE SHEETS OPERATIONS
  // ============================================================================

  // Импорт из Google Sheets
// Синхронизация с базой данных
const handleImportGoogleSheet = useCallback(async () => {
  setIsImportingSheet(true);
  
  try {
    logger.info('Sync', 'Starting import from Google Sheets...');
    
    const importedParticipants = await withRetry(
      () => importParticipantsFromSheet(CONFIG.SHEET_URL, parameters),
      {
        maxRetries: CONFIG.MAX_RETRIES,
        delayMs: CONFIG.RETRY_DELAY_MS,
        backoff: 'exponential',
        onRetry: (attempt, error) => {
          logger.warning('Retry', `Import attempt ${attempt}/${CONFIG.MAX_RETRIES}: ${getErrorMessage(error)}`);
          showToast(`Повторная попытка ${attempt}/${CONFIG.MAX_RETRIES}...`, 'warning');
        }
      }
    );

    setParticipants(current => {
      const idByName = new Map(current.map(p => [p.fullName.toLowerCase(), p.id]));
      
      return importedParticipants.map(p => ({
        ...p,
        id: idByName.get(p.fullName.toLowerCase()) || p.id,
      }));
    });    
    logger.success('Sync', `Imported ${importedParticipants.length} participants from Google Sheets`);
    showToast(`Импорт завершен! Загружено ${importedParticipants.length} участников`, 'success');
    
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    logger.error('Sync', `Import failed: ${errorMessage}`);
    showToast(`Ошибка импорта: ${errorMessage}`, 'error');
  } finally {
    setIsImportingSheet(false);
  }
}, [parameters, setParticipants, showToast]);

  // Экспорт снапшота в новый лист
  const handleExportSnapshot = useCallback(async () => {
    if (participants.length === 0) {
      showToast('Нет данных для экспорта', 'warning');
      return;
    }

    setIsExporting(true);
    
    try {
      logger.info('Export', `Starting export of ${participants.length} participants...`);
      
      const result = await withRetry(
        () => exportSnapshotToDatedSheet(CONFIG.SHEET_URL, participants, parameters),
        {
          maxRetries: CONFIG.MAX_RETRIES,
          delayMs: CONFIG.RETRY_DELAY_MS,
          backoff: 'exponential',
          onRetry: (attempt, error) => {
            logger.warning('Retry', `Export attempt ${attempt}/${CONFIG.MAX_RETRIES}: ${getErrorMessage(error)}`);
            showToast(`Повторная попытка ${attempt}/${CONFIG.MAX_RETRIES}...`, 'warning');
          }
        }
      );

      if (result.success) {
        logger.success('Export', 'Monthly snapshot exported to Google Sheets');
        showToast(
          'Выгрузка успешно выполнена! Создан новый лист с текущей датой.', 
          'success'
        );
      } else {
        throw new Error(result.error || 'Export failed');
      }
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('Export', `Export failed: ${errorMessage}`);
      showToast(`Ошибка выгрузки: ${errorMessage}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [participants, parameters, showToast]);

  // Синхронизация с базой данных
  const handleSyncWithDatabase = useCallback(async () => {
    setIsSyncing(true);
    
    try {
      logger.info('Sync', 'Starting database synchronization...');
      
      const mergedParticipants = await withRetry(
        () => syncWithDatabase(CONFIG.SHEET_URL, parameters),
        {
          maxRetries: CONFIG.MAX_RETRIES,
          delayMs: CONFIG.RETRY_DELAY_MS,
          backoff: 'exponential',
          onRetry: (attempt, error) => {
            logger.warning('Retry', `Sync attempt ${attempt}/${CONFIG.MAX_RETRIES}: ${getErrorMessage(error)}`);
            showToast(`Повторная попытка ${attempt}/${CONFIG.MAX_RETRIES}...`, 'warning');
          }
        }
      );

      setParticipants(mergedParticipants);
      
      const lastSync = await getLastSyncTime(CONFIG.SHEET_URL);
      if (lastSync) {
        setLastSyncTime(lastSync);
      }
      
      logger.success(
        'Sync', 
        `Database synced: ${mergedParticipants.length} participants. Data from "Файл редактирования" added to "База данных"`
      );
      
      showToast(
        'Синхронизация завершена! Данные из "Файл редактирования" добавлены в "База данных".', 
        'success'
      );
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('Sync', `Database sync failed: ${errorMessage}`);
      showToast(`Ошибка синхронизации: ${errorMessage}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [parameters, setParticipants, showToast]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Показываем загрузчик только при первой загрузке и если нет кэша
  if (isInitialLoading && participants.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="mb-4">
            <LeagueLogo size="lg" />
          </div>
          <div className="mb-4 h-1 w-64 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-amber-500 to-amber-600"></div>
          </div>
          <p className="text-sm text-zinc-400">Загрузка данных из Google Sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500/30">
      {/* Main Dashboard */}
      <Dashboard participants={participants} parameters={parameters} />

      {/* Sync Indicator - показываем в правом верхнем углу */}
      <div className="fixed right-6 top-6 z-30">
        <SyncIndicator 
          lastSyncTime={lastSyncTime} 
          isLoading={isInitialLoading || isImportingSheet || isSyncing} 
        />
      </div>

      {/* Admin Button - показываем в правом нижнем углу */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setShowAdminPanel(true)}
          className="flex h-12 w-12 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-200 hover:shadow-lg hover:shadow-amber-600/20"
          title="Открыть админ-панель (Ctrl+Shift+A)"
        >
          <span className="text-[11px] font-semibold tracking-[0.14em]">ADM</span>
        </button>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <PasswordProtectedPanel onClose={() => setShowAdminPanel(false)}>
          <div className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm md:p-8">
            <div className="mx-auto max-w-7xl">
              {/* Header */}
              <header className="mb-4 border border-zinc-800 bg-zinc-900/80 px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <LeagueLogo size="sm" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                        Панель управления
                      </p>
                      <h2 className="font-serif text-2xl uppercase tracking-[0.08em] text-zinc-100">
                        Лига чемпионов
                      </h2>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setShowAdminPanel(false)}
                    className="flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-800 text-zinc-400 transition-colors hover:border-red-600 hover:text-red-400"
                    title="Закрыть (Esc)"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>

                {/* Sync Indicator in header */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    Google Sheet: {CONFIG.SHEET_URL.split('/d/')[1]?.split('/')[0] || 'N/A'}
                  </p>
                  <SyncIndicator 
                    lastSyncTime={lastSyncTime} 
                    isLoading={isImportingSheet || isSyncing || isExporting} 
                  />
                </div>
              </header>

              {/* Admin Panel Component */}
              <AdminPanel
                participants={participants}
                parameters={parameters}
                onUpdateParticipant={handleUpdateParticipant}
                onAddParticipant={handleAddParticipant}
                onDeleteParticipant={handleDeleteParticipant}
                onUpdateParameters={handleUpdateParameters}
                onImportGoogleSheet={handleImportGoogleSheet}
                isImportingSheet={isImportingSheet}
                onExportSnapshot={handleExportSnapshot}
                isExporting={isExporting}
                onSyncWithDatabase={handleSyncWithDatabase}
                isSyncing={isSyncing}
                onViewLogs={() => setShowLogs(true)}
                onClose={() => setShowAdminPanel(false)}
              />
            </div>
          </div>
        </PasswordProtectedPanel>
      )}

      {/* Logs Viewer Modal */}
      {showLogs && (
        <LogsViewer onClose={() => setShowLogs(false)} />
      )}
    </div>
  );
}

export { App };
