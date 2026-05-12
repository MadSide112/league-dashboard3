import { Participant, Parameter, CompetitionInfo } from './types';

export const initialParticipants: Participant[] = [];

export const initialParameters: Parameter[] = [
 { id: '1', name: 'Сделка по вторичке/ижс', weight: 3, shouldSum: true },
  { id: '2', name: 'Сделка 2.0', weight: 2, shouldSum: true },
  { id: '3', name: 'Эксклюзивы', weight: 5, shouldSum: true },
  { id: '4', name: 'Сделка межрег', weight: 3, shouldSum: true },
  { id: '5', name: 'Реферал', weight: 5, shouldSum: true },
  { id: '6', name: 'Двойная сделка', weight: 5, shouldSum: true },
  { id: '7', name: 'ЗвБ', weight: 1, shouldSum: false }, // ❌ НЕ суммируется
  { id: '8', name: 'Бронь', weight: 2, shouldSum: false }, // ❌ НЕ суммируется
  { id: '9', name: 'Задаток', weight: 2, shouldSum: false }, // ❌ НЕ суммируется
  { id: '10', name: 'Собрание', weight: 1, shouldSum: true },
  { id: '11', name: 'Пост', weight: 1, shouldSum: true },
  { id: '12', name: 'Отзыв', weight: 1, shouldSum: true },
  { id: '13', name: 'Работа в департаменте', weight: 1, shouldSum: true },
  { id: '14', name: 'Нарушение регламента', weight: -1, shouldSum: true },
  { id: '15', name: 'Дежурство', weight: 1, shouldSum: true },
];

// Текущая формула выручки
export const REVENUE_POINTS_PER_50000 = 5;

export const competitionInfo: CompetitionInfo = {
  title: 'Лига чемпионов',
  startDate: '01.03.2026',
  endDate: '01.09.2026',
};

// Функция для пересчета общего балла с учетом весов параметров
export function calculateTotalScore(participant: Participant, parameters: Parameter[]): number {
  // Рассчитываем баллы параметров: count * weight
  const paramsScore = parameters.reduce((sum, param) => {
    const count = participant.parameters[param.name] || 0;
    return sum + (count * param.weight);
  }, 0);
  
  const revenueScore = Math.floor(participant.revenue / 50000) * 5;
  return paramsScore + revenueScore;
}

// Функция обновления баллов за выручку
export function updateRevenueScore(participant: Participant, parameters: Parameter[]): Participant {
  const revenueScore = Math.floor(participant.revenue / 50000) * 5;
  
  // Рассчитываем баллы параметров с учетом весов
  const paramsScore = parameters.reduce((sum, param) => {
    const count = participant.parameters[param.name] || 0;
    return sum + (count * param.weight);
  }, 0);
  
  return {
    ...participant,
    revenueScore,
    totalScore: paramsScore + revenueScore,
  };
}
