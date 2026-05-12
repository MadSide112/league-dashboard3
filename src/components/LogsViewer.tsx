import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger();

interface LogsViewerProps {
  onClose: () => void;
}

const LogsViewer: React.FC<LogsViewerProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    refreshLogs();
  }, []);

  const refreshLogs = () => {
    setLogs(logger.getLogs());
  };

  const handleClearLogs = () => {
    if (confirm('Вы уверены, что хотите очистить все логи?')) {
      logger.clearLogs();
      refreshLogs();
    }
  };

  const handleExportLogs = () => {
    const logsJson = logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competition_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === '' || 
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.details.toLowerCase().includes(filter.toLowerCase());
    const matchesDate = dateFilter === '' || 
      log.timestamp.startsWith(dateFilter);
    return matchesFilter && matchesDate;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="flex items-center text-xl font-semibold text-zinc-100">
            <span className="mr-3">Журнал действий</span>
            Логи действий
          </h2>
          <div className="flex gap-2">
            <button
              onClick={refreshLogs}
              className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-300"
            >
              Обновить
            </button>
            <button
              onClick={handleExportLogs}
              className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-300"
            >
              Экспорт
            </button>
            <button
              onClick={handleClearLogs}
              className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-300"
            >
              Очистить
            </button>
            <button
              onClick={onClose}
              className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-300"
            >
              Закрыть
            </button>
          </div>
        </div>

        <div className="border-b border-zinc-800 bg-zinc-950/70 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Поиск по действию или деталям
              </label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                placeholder="Введите текст для поиска..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Фильтр по дате
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-zinc-400">
                Всего логов: <strong>{filteredLogs.length}</strong> из <strong>{logs.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filteredLogs.length > 0 ? (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => (
                <div 
                  key={log.id} 
                  className="border border-zinc-800 bg-zinc-950/70 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="flex h-8 w-8 items-center justify-center border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-lg font-semibold text-zinc-100">{log.action}</div>
                        <div className="text-sm text-zinc-500">
                          {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                    {log.user && (
                      <div className="flex items-center space-x-2 border border-zinc-700 bg-zinc-900 px-3 py-1">
                        <span className="text-sm font-medium text-zinc-300">{log.user}</span>
                      </div>
                    )}
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="text-sm text-zinc-300">{log.details}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-500">
              <p className="text-2xl mb-3">Логи не найдены</p>
              <p className="text-lg mb-2">
                {filter || dateFilter 
                  ? 'Нет логов, удовлетворяющих условиям фильтрации' 
                  : 'Пока нет записей в логах'}
              </p>
              {(filter || dateFilter) && (
                <button
                  onClick={() => {
                    setFilter('');
                    setDateFilter('');
                  }}
                  className="mt-4 border border-zinc-700 bg-zinc-950 px-6 py-3 text-sm text-zinc-300"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 bg-zinc-950/70 p-4 text-center text-sm text-zinc-500">
          <p>
            Логи содержат информацию о всех действиях в системе. 
            Они автоматически сохраняются и могут быть экспортированы для анализа.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogsViewer;