import { useEffect, useState } from 'react';

interface SyncIndicatorProps {
  lastSyncTime: Date | null;
  isLoading: boolean;
}

export default function SyncIndicator({ lastSyncTime, isLoading }: SyncIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastSyncTime) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - lastSyncTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);

      if (minutes < 1) {
        setTimeAgo('только что');
      } else if (minutes < 60) {
        setTimeAgo(`${minutes} мин назад`);
      } else if (hours < 24) {
        setTimeAgo(`${hours} ч назад`);
      } else {
        const days = Math.floor(hours / 24);
        setTimeAgo(`${days} дн назад`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-amber-600/50 bg-amber-900/20 px-3 py-1.5 text-sm text-amber-200">
        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
        <span>Синхронизация...</span>
      </div>
    );
  }

  if (!lastSyncTime) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-400">
        <div className="h-2 w-2 rounded-full bg-zinc-500"></div>
        <span>Нет данных</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-green-600/50 bg-green-900/20 px-3 py-1.5 text-sm text-green-200">
      <div className="h-2 w-2 rounded-full bg-green-500"></div>
      <span>Обновлено {timeAgo}</span>
    </div>
  );
}
