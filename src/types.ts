export interface Participant {
  id: string;
  fullName: string;
  totalScore: number;
  parameters: {
    [key: string]: number;
  };
  revenue: number; // выручка
  revenueScore: number; // баллы за выручку (5 за каждые 50000)
  lastUpdated?: string; // ISO дата последнего обновления
  currentMonth?: string; // Текущий месяц в формате YYYY-MM
  monthlyBase?: { [key: string]: number }; // Накопленные баллы на начало текущего месяца
  monthlyBaseRevenue?: number; // Накопленная выручка на начало текущего месяца
}

export interface Parameter {
  id: string;
  name: string;
  weight: number; // вес параметра для подсчета баллов (баллов за 1 единицу)
  unit?: string; // единица измерения (если нужна)
  shouldSum?: boolean; // суммировать значения между синхронизациями или заменять в рамках месяца
}

export interface CompetitionInfo {
  title: string;
  startDate: string;
  endDate: string;
  shouldSum?: boolean;
}

export interface AdminState {
  parameters: Parameter[];
  revenueFormula: {
    baseAmount: number; // 50000
    pointsPerBase: number; // 5
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user?: string;
}
