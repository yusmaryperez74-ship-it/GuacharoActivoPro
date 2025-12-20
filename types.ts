
export enum View {
  WELCOME = 'WELCOME',
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  TRENDS = 'TRENDS',
  PREMIUM = 'PREMIUM'
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
