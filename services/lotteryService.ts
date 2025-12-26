
import { ANIMALS } from '../constants';
import { DrawResult, Animal, Prediction } from '../types';

const DRAW_HOURS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00'
];

export class PredictionEngine {
  private history: any[] = [];
  private animals: Animal[] = ANIMALS;
  
  private cache: {
    globalFreq: Record<string, number>;
    trendScores: Record<string, number>;
    markovProbs: Record<string, number> | null;
    cyclicalPatterns: Record<string, number>;
    hotColdAnalysis: Record<string, { isHot: boolean; streak: number; lastSeen: number }>;
    timeBasedPatterns: Record<string, Record<string, number>>;
    lastUpdate: number;
  } | null = null;

  constructor(history: any[]) {
    this.history = history.slice(0, 200);
    this.precompute();
  }

  public precompute() {
    if (this.history.length === 0) return;

    this.cache = {
      globalFreq: this.calculateGlobalFrequencies(),
      trendScores: this.calculateTrendScores(),
      markovProbs: this.calculateMarkovProbabilities(),
      cyclicalPatterns: this.calculateCyclicalPatterns(),
      hotColdAnalysis: this.calculateHotColdAnalysis(),
      timeBasedPatterns: this.calculateTimeBasedPatterns(),
      lastUpdate: Date.now()
    };
  }

  private calculateGlobalFrequencies() {
    const counts: Record<string, number> = {};
    this.history.forEach(h => {
      const id = h.animalData?.id || h.number;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    const total = this.history.length || 1;
    return Object.fromEntries(this.animals.map(a => [a.id, (counts[a.id] || 0) / total]));
  }

  private calculateTrendScores() {
    const windows = [
      { size: 15, weight: 0.50 },
      { size: 50, weight: 0.30 },
      { size: 150, weight: 0.20 }
    ];
    const scores: Record<string, number> = {};
    this.animals.forEach(a => scores[a.id] = 0);

    windows.forEach(w => {
      const slice = this.history.slice(0, w.size);
      const total = slice.length || 1;
      const windowCounts: Record<string, number> = {};
      slice.forEach(h => {
        const id = h.animalData?.id || h.number;
        if (id) windowCounts[id] = (windowCounts[id] || 0) + 1;
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

  // Nuevo: Análisis de patrones cíclicos (cada 7, 14, 21 días)
  private calculateCyclicalPatterns() {
    const patterns: Record<string, number> = {};
    const cycles = [7, 14, 21, 30]; // Ciclos a analizar
    
    this.animals.forEach(animal => {
      let score = 0;
      cycles.forEach(cycle => {
        const positions = this.history
          .map((h, i) => ({ ...h, index: i }))
          .filter(h => (h.animalData?.id || h.number) === animal.id)
          .map(h => h.index);
        
        // Buscar patrones cíclicos
        for (let i = 0; i < positions.length - 1; i++) {
          const diff = positions[i] - positions[i + 1];
          if (Math.abs(diff - cycle) <= 2) { // Tolerancia de ±2 posiciones
            score += 1 / cycle; // Ciclos más cortos tienen más peso
          }
        }
      });
      patterns[animal.id] = score;
    });
    
    return patterns;
  }

  // Nuevo: Análisis de animales "calientes" y "fríos"
  private calculateHotColdAnalysis() {
    const analysis: Record<string, { isHot: boolean; streak: number; lastSeen: number }> = {};
    
    this.animals.forEach(animal => {
      const positions = this.history
        .map((h, i) => ({ ...h, index: i }))
        .filter(h => (h.animalData?.id || h.number) === animal.id);
      
      const lastSeen = positions.length > 0 ? positions[0].index : this.history.length;
      const recentAppearances = positions.filter(p => p.index < 20).length; // Últimos 20 sorteos
      
      // Un animal está "caliente" si ha aparecido 3+ veces en los últimos 20 sorteos
      const isHot = recentAppearances >= 3;
      
      // Calcular racha actual
      let streak = 0;
      for (let i = 0; i < this.history.length; i++) {
        const currentAnimal = this.history[i].animalData?.id || this.history[i].number;
        if (currentAnimal === animal.id) {
          break;
        }
        streak++;
      }
      
      analysis[animal.id] = { isHot, streak, lastSeen };
    });
    
    return analysis;
  }

  // Nuevo: Patrones basados en hora del día
  private calculateTimeBasedPatterns() {
    const patterns: Record<string, Record<string, number>> = {};
    
    this.animals.forEach(animal => {
      patterns[animal.id] = {};
      
      // Agrupar por hora
      const hourCounts: Record<string, number> = {};
      this.history.forEach(h => {
        if ((h.animalData?.id || h.number) === animal.id) {
          const hour = h.hour?.split(':')[0] || '12';
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      
      // Normalizar por total de sorteos en cada hora
      Object.keys(hourCounts).forEach(hour => {
        const totalInHour = this.history.filter(h => h.hour?.startsWith(hour)).length || 1;
        patterns[animal.id][hour] = hourCounts[hour] / totalInHour;
      });
    });
    
    return patterns;
  }

  public generatePredictions(top: number = 5): Prediction[] {
    if (!this.cache) return [];

    const { globalFreq, trendScores, markovProbs, cyclicalPatterns, hotColdAnalysis, timeBasedPatterns } = this.cache;
    const currentHour = new Date().getHours().toString();
    
    // Pesos optimizados para mayor precisión
    const WEIGHTS = {
      GLOBAL: 0.15,      // Frecuencia histórica general
      TREND: 0.25,       // Tendencias recientes
      MARKOV: 0.20,      // Cadenas de Markov
      CYCLICAL: 0.15,    // Patrones cíclicos
      HOT_COLD: 0.15,    // Análisis caliente/frío
      TIME_BASED: 0.10   // Patrones por hora
    };

    return this.animals.map(animal => {
      const f = globalFreq[animal.id] || 0;
      const t = trendScores[animal.id] || 0;
      const m = markovProbs ? (markovProbs[animal.id] || 0) : f;
      const c = cyclicalPatterns[animal.id] || 0;
      const hc = this.calculateHotColdScore(hotColdAnalysis[animal.id]);
      const tb = timeBasedPatterns[animal.id]?.[currentHour] || f;
      
      const score = (f * WEIGHTS.GLOBAL) + 
                   (t * WEIGHTS.TREND) + 
                   (m * WEIGHTS.MARKOV) + 
                   (c * WEIGHTS.CYCLICAL) + 
                   (hc * WEIGHTS.HOT_COLD) + 
                   (tb * WEIGHTS.TIME_BASED);
      
      return {
        animal,
        probability: Math.round(score * 1000) / 10,
        confidence: this.calculateConfidence(score, hotColdAnalysis[animal.id]),
        reasoning: this.buildAdvancedReasoning(f, t, m, c, hotColdAnalysis[animal.id], !!markovProbs)
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, top);
  }

  private calculateHotColdScore(analysis: { isHot: boolean; streak: number; lastSeen: number }): number {
    if (!analysis) return 0;
    
    let score = 0;
    
    // Bonus por estar "caliente"
    if (analysis.isHot) {
      score += 0.3;
    }
    
    // Penalty/bonus por racha
    if (analysis.streak > 50) {
      score += 0.2; // Animal "dormido" puede despertar
    } else if (analysis.streak < 5) {
      score -= 0.1; // Recién salió, menos probable
    }
    
    // Factor de tiempo desde última aparición
    const timeFactor = Math.min(analysis.lastSeen / 100, 0.2);
    score += timeFactor;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateConfidence(score: number, hotColdAnalysis: { isHot: boolean; streak: number; lastSeen: number }): 'SEGURA' | 'MODERADA' | 'ARRIESGADA' {
    // Ajustar confianza basada en análisis caliente/frío
    let adjustedScore = score;
    
    if (hotColdAnalysis?.isHot) {
      adjustedScore += 0.02; // Boost para animales calientes
    }
    
    if (hotColdAnalysis?.streak > 30) {
      adjustedScore += 0.01; // Boost para animales dormidos
    }
    
    if (adjustedScore > 0.12) return 'SEGURA';
    if (adjustedScore > 0.06) return 'MODERADA';
    return 'ARRIESGADA';
  }

  private buildAdvancedReasoning(f: number, t: number, m: number, c: number, hotCold: { isHot: boolean; streak: number; lastSeen: number }, hasMarkov: boolean): string {
    const reasons = [];
    
    if (hotCold?.isHot) {
      reasons.push("🔥 Animal en racha caliente");
    }
    
    if (hotCold?.streak > 40) {
      reasons.push("😴 Animal dormido con potencial de despertar");
    }
    
    if (c > 0.1) {
      reasons.push("🔄 Patrón cíclico detectado");
    }
    
    if (t > f * 1.8) {
      reasons.push("📈 Tendencia alcista fuerte");
    }
    
    if (hasMarkov && m > 0.15) {
      reasons.push("🔗 Alta correlación con último ganador");
    }
    
    if (f > 0.08) {
      reasons.push("📊 Frecuencia histórica estable");
    }
    
    if (reasons.length === 0) {
      reasons.push("🤖 Anomalía estadística positiva");
    }
    
    return reasons.slice(0, 2).join(" • ");
  }
}

export const getDrawSchedule = (realResults: Partial<DrawResult>[] = []): DrawResult[] => {
  // Usar hora de Venezuela (UTC-4)
  const now = new Date();
  const venezuelaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
  const currentTotalMinutes = venezuelaTime.getHours() * 60 + venezuelaTime.getMinutes();

  return DRAW_HOURS.map((hourStr) => {
    const [h, m] = hourStr.split(':').map(Number);
    const drawTotalMinutes = h * 60 + m;
    const realMatch = realResults.find(r => r.hour === hourStr);
    
    // Un sorteo está completado solo si:
    // 1. Tenemos el resultado real, O
    // 2. Han pasado al menos 10 minutos después de la hora del sorteo
    const isCompleted = !!realMatch || (currentTotalMinutes >= (drawTotalMinutes + 10));
    
    // El próximo sorteo es el primero que no está completado y es futuro
    const isNext = !isCompleted && DRAW_HOURS.findIndex(hS => {
      const [h2, m2] = hS.split(':').map(Number);
      const drawMinutes = h2 * 60 + m2;
      return drawMinutes > currentTotalMinutes && !realResults.find(r => r.hour === hS);
    }) === DRAW_HOURS.indexOf(hourStr);
    
    return {
      hour: hourStr,
      label: h >= 12 ? (h === 12 ? '12:00 PM' : `${h-12}:00 PM`) : `${h}:00 AM`,
      animal: realMatch?.animal || null,
      isCompleted,
      isNext
    };
  });
};

export const getNextDrawCountdown = (): string => {
  // Usar hora de Venezuela (UTC-4)
  const now = new Date();
  const venezuelaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
  const currentMinutes = venezuelaTime.getHours() * 60 + venezuelaTime.getMinutes();
  
  const nextDraw = DRAW_HOURS.find(hStr => {
    const [h, m] = hStr.split(':').map(Number);
    return (h * 60 + m) > currentMinutes;
  });
  
  if (!nextDraw) {
    // Si no hay más sorteos hoy, mostrar el primero de mañana
    const tomorrow = new Date(venezuelaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const diffMs = tomorrow.getTime() - venezuelaTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m (mañana 09:00 AM)`;
  }
  
  const [nh, nm] = nextDraw.split(':').map(Number);
  const diff = (nh * 60 + nm) - currentMinutes;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  const s = 59 - venezuelaTime.getSeconds();
  
  if (h > 0) {
    return `${h}h ${m}m`;
  } else if (m > 0) {
    return `${m}m ${s}s`;
  } else {
    return `${s}s`;
  }
};
