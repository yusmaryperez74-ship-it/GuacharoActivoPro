
export enum View {
  WELCOME = 'WELCOME',
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  TRENDS = 'TRENDS',
  PREMIUM = 'PREMIUM'
}

export type LotteryId = 'GUACHARO' | 'LOTTO_ACTIVO';

export interface LotteryConfig {
  id: LotteryId;
  name: string;
  color: string;
  url: string;
  icon: string;
}

export interface Animal {
  id: string;
  name: string;
  number: string;
  emoji: string;
  imageUrl?: string;
}

export interface Prediction {
  animal: Animal;
  probability: number;
  confidence: 'SEGURA' | 'MODERADA' | 'ARRIESGADA';
  reasoning: string;
}

export interface DrawResult {
  hour: string;
  label: string;
  animal: Animal | null;
  isCompleted: boolean;
  isNext: boolean;
}

export interface PastResult {
  date: string;
  time: string;
  prediction: Animal;
  result: Animal;
  isWin: boolean;
}

export interface TrendData {
  animal: string;
  frequency: number;
  change: string;
  isHot: boolean;
}
