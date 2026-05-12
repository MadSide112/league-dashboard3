import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Participant } from '../types';
import { CONFIG } from '../config';

const STORAGE_KEY = CONFIG.CACHE_KEY;
const TIMESTAMP_KEY = `${CONFIG.CACHE_KEY}_timestamp`;

export function usePersistedParticipants(
  initialValue: Participant[]
): [Participant[], Dispatch<SetStateAction<Participant[]>>] {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    // Пытаемся загрузить из localStorage при инициализации
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(TIMESTAMP_KEY);

      if (cached && timestamp) {
        const parsedTimestamp = parseInt(timestamp, 10);
        const now = Date.now();

        // Проверяем свежесть кэша
        if (now - parsedTimestamp < CONFIG.CACHE_DURATION) {
          const data: Participant[] = JSON.parse(cached);
          console.log('📦 Loaded from cache:', data.length, 'participants');
          return data;
        } else {
          console.log('⏰ Cache expired, will fetch fresh data');
        }
      }
    } catch (error) {
      console.error('❌ Error loading cache:', error);
    }

    return initialValue;
  });

  // Сохраняем в localStorage при каждом изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
      localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
      console.log('💾 Saved to cache:', participants.length, 'participants');
    } catch (error) {
      console.error('❌ Error saving cache:', error);
    }
  }, [participants]);

  return [participants, setParticipants];
}
