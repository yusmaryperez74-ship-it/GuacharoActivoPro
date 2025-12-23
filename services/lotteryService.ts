
import { ANIMALS } from '../constants';
import { DrawResult, Animal, Prediction } from '../types';

const DRAW_HOURS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', 
  '16:00', '17:00', '18:00', '19:00'
];

export class PredictionEngine {
  private history: any[] = [];
  private animals: Animal[] = ANIMALS;
  
  private cache: {
    globalFreq: Record<string, number>;
    trendScores: Record<string, number>;
    markovProbs: Record<string, number> | null;
    lastUpdate: number;
  } | null = null;

  constructor(history: any[]) {
    // Capacidad aumentada a 200 para mayor precisión
    this.history = history.slice(0, 200);
    this.precompute();
  }

  public precompute() {
    if (this.history.length === 0) return;

    this.cache = {
      globalFreq: this.calculateGlobalFrequencies(),
      trendScores: this.calculateTrendScores(),
      markovProbs: this.calculateMarkovProbabilities(),
      lastUpdate: Date.now()
    };
  }

  private calculateGlobalFrequencies() {
    const counts: Record<string, number> = {};
    this.history.forEach(h => {
      const id = h.animalData?.id || h.number;
      counts[id] = (counts[id] || 0) + 1;
    });
    const total = this.history.length || 1;
    return Object.fromEntries(this.animals.map(a => [a.id, (counts[a.id] || 0) / total]));
  }

  private calculateTrendScores() {
    const windows = [
      { size: 20, weight: 0.40 }, // Ventanas ampliadas
      { size: 60, weight: 0.35 },
      { size: 120, weight: 0.25 }
    ];
    const scores: Record<string, number> = {};
    this.animals.forEach(a => scores[a.id] = 0);

    windows.forEach(w => {
      const slice = this.history.slice(0, w.size);
      const total = slice.length || 1;
      const windowCounts: Record<string, number> = {};
      slice.forEach(h => {
        const id = h.animalData?.id || h.number;
        windowCounts[id] = (windowCounts[id] || 0) + 1;
      });
      this.animals.forEach(a => {
        scores[a.id] += ((windowCounts[a.id] || 0) / total) * w.weight;
      });
    });
    return scores;
  }

  private calculateMarkovProbabilities() {
    if (this.history.length < 2) return null;
    const lastAnimal = this.history[0].animalData?.id || this.history[0].number;
    const transitions: Record<string, number> = {};
    let total = 0;

    for (let i = this.history.length - 2; i >= 0; i--) {
      const current = this.history[i + 1].animalData?.id || this.history[i + 1].number;
      const next = this.history[i].animalData?.id || this.history[i].number;
      if (current === lastAnimal) {
        transitions[next] = (transitions[next] || 0) + 1;
        total++;
      }
    }
    return total === 0 ? null : Object.fromEntries(this.animals.map(a => [a.id, (transitions[a.id] || 0) / total]));
  }

  public generatePredictions(top: number = 5): Prediction[] {
    if (!this.cache) return [];

    const { globalFreq, trendScores, markovProbs } = this.cache;
    const ALPHA = 0.25, BETA = 0.45, GAMMA = 0.30; // Ajuste de pesos para Markov

    return this.animals.map(animal => {
      const f = globalFreq[animal.id] || 0;
      const t = trendScores[animal.id] || 0;
      const m = markovProbs ? (markovProbs[animal.id] || 0) : f;
      const score = (f * ALPHA) + (t * BETA) + (m * GAMMA);
      
      return {
        animal,
        probability: Math.round(score * 1000) / 10,
        confidence: score > 0.09 ? 'SEGURA' : score > 0.05 ? 'MODERADA' : 'ARRIESGADA' as any,
        reasoning: this.buildReasoning(f, t, m, !!markovProbs)
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, top);
  }

  private buildReasoning(f: number, t: number, m: number, hasMarkov: boolean): string {
    if (t > f && m > 0.12) return "Alta probabilidad por transición directa y tendencia de 200 sorteos.";
    if (t > f) return "Tendencia positiva detectada en la ventana móvil de corto plazo.";
    if (hasMarkov && m > 0.1) return "Fuerte correlación estadística con el último ganador.";
    if (f > 0.06) return "Animal con alta frecuencia histórica (Top Tier 200).";
    return "Métrica base estable detectada por el modelo híbrido.";
  }
}

export const getDrawSchedule = (realResults: Partial<DrawResult>[] = []): DrawResult[] => {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  return DRAW_HOURS.map((hourStr) => {
    const [h, m] = hourStr.split(':').map(Number);
    const drawTotalMinutes = h * 60 + m;
    const realMatch = realResults.find(r => r.hour === hourStr);
    
    // Un sorteo está completado si ya pasó la hora o si tenemos el dato real
    const isCompleted = currentTotalMinutes >= drawTotalMinutes || !!realMatch;
    
    return {
      hour: hourStr,
      label: h >= 12 ? (h === 12 ? '12:00 PM' : `${h-12}:00 PM`) : `${h}:00 AM`,
      animal: realMatch?.animal || null,
      isCompleted,
      isNext: !isCompleted && DRAW_HOURS.findIndex(hS => {
        const [h2, m2] = hS.split(':').map(Number);
        return (h2 * 60 + m2) > currentTotalMinutes;
      }) === DRAW_HOURS.indexOf(hourStr)
    };
  });
};

export const getNextDrawCountdown = (): string => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextDraw = DRAW_HOURS.find(hStr => {
    const [h, m] = hStr.split(':').map(Number);
    return (h * 60 + m) > currentMinutes;
  });
  if (!nextDraw) return "Mañana 09:00 AM";
  const [nh, nm] = nextDraw.split(':').map(Number);
  const diff = (nh * 60 + nm) - currentMinutes;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${60 - now.getSeconds()}s`;
};
