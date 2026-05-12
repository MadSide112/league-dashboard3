import { LogEntry } from '../types';
import { CONFIG } from '../config';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

interface EnhancedLogEntry extends LogEntry {
  level?: LogLevel;
  stack?: string;
}

export const createLogger = (storageKey: string = CONFIG.LOG_STORAGE_KEY) => {
  const getLogs = (): EnhancedLogEntry[] => {
    try {
      const logs = localStorage.getItem(storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  };

  const addLog = (
    action: string,
    details: string,
    level: LogLevel = 'info',
    user: string = 'admin'
  ): void => {
    try {
      const logs = getLogs();
      const newLog: EnhancedLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action,
        details,
        user,
        level,
        stack: level === 'error' ? new Error().stack : undefined,
      };

      logs.unshift(newLog);

      // Keep only last N logs
      const trimmedLogs = logs.slice(0, CONFIG.MAX_LOGS);
      localStorage.setItem(storageKey, JSON.stringify(trimmedLogs));

      // Console logging with colors and emojis
      const emoji = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
      }[level];

      console.log(`${emoji} [${action}] ${details}`);

    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const clearLogs = (): void => {
    try {
      localStorage.removeItem(storageKey);
      console.log('🗑️ Logs cleared');
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const exportLogs = (): string => {
    const logs = getLogs();
    return JSON.stringify(logs, null, 2);
  };

  const getLogsByLevel = (level: LogLevel): EnhancedLogEntry[] => {
    return getLogs().filter(log => log.level === level);
  };

  const getRecentErrors = (limit: number = 10): EnhancedLogEntry[] => {
    return getLogs()
      .filter(log => log.level === 'error')
      .slice(0, limit);
  };

  return {
    getLogs,
    addLog,
    clearLogs,
    exportLogs,
    getLogsByLevel,
    getRecentErrors,

    // Shortcuts
    info: (action: string, details: string) => addLog(action, details, 'info'),
    success: (action: string, details: string) => addLog(action, details, 'success'),
    warning: (action: string, details: string) => addLog(action, details, 'warning'),
    error: (action: string, details: string) => addLog(action, details, 'error'),
  };
};

export const logger = createLogger();
