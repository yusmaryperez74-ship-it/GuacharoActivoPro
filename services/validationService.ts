import { Prediction, Animal } from '../types';

export interface PredictionResult {
  predictions: Prediction[];
  actualResult: Animal | null;
  timestamp: string;
  lotteryId: string;
  hour: string;
  isWin: boolean;
  topPosition?: number; // En qué posición estaba el animal ganador
}

export interface AccuracyMetrics {
  totalPredictions: number;
  exactHits: number; // Predicción #1 correcta
  top3Hits: number;   // Animal ganador en top 3
  top5Hits: number;   // Animal ganador en top 5
  exactAccuracy: number;
  top3Accuracy: number;
  top5Accuracy: number;
  averagePosition: number;
  confidenceBreakdown: {
    segura: { total: number; hits: number; accuracy: number };
    moderada: { total: number; hits: number; accuracy: number };
    arriesgada: { total: number; hits: number; accuracy: number };
  };
}

export class ValidationService {
  private static STORAGE_KEY = 'prediction_results_v2';

  static savePredictionResult(result: PredictionResult) {
    const stored = this.getStoredResults();
    stored.push(result);
    
    // Mantener solo los últimos 200 resultados
    if (stored.length > 200) {
      stored.splice(0, stored.length - 200);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
  }

  static getStoredResults(): PredictionResult[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static calculateAccuracy(lotteryId?: string): AccuracyMetrics {
    const results = this.getStoredResults()
      .filter(r => !lotteryId || r.lotteryId === lotteryId)
      .filter(r => r.actualResult !== null);

    if (results.length === 0) {
      return {
        totalPredictions: 0,
        exactHits: 0,
        top3Hits: 0,
        top5Hits: 0,
        exactAccuracy: 0,
        top3Accuracy: 0,
        top5Accuracy: 0,
        averagePosition: 0,
        confidenceBreakdown: {
          segura: { total: 0, hits: 0, accuracy: 0 },
          moderada: { total: 0, hits: 0, accuracy: 0 },
          arriesgada: { total: 0, hits: 0, accuracy: 0 }
        }
      };
    }

    let exactHits = 0;
    let top3Hits = 0;
    let top5Hits = 0;
    let totalPosition = 0;
    
    const confidenceStats = {
      segura: { total: 0, hits: 0 },
      moderada: { total: 0, hits: 0 },
      arriesgada: { total: 0, hits: 0 }
    };

    results.forEach(result => {
      if (!result.actualResult) return;

      const winnerPosition = result.predictions.findIndex(
        p => p.animal.id === result.actualResult!.id
      );

      if (winnerPosition !== -1) {
        totalPosition += winnerPosition + 1;
        
        if (winnerPosition === 0) exactHits++;
        if (winnerPosition < 3) top3Hits++;
        if (winnerPosition < 5) top5Hits++;

        // Estadísticas por confianza (solo para predicción #1)
        const topPrediction = result.predictions[0];
        if (topPrediction) {
          const confidence = topPrediction.confidence.toLowerCase() as keyof typeof confidenceStats;
          confidenceStats[confidence].total++;
          if (winnerPosition === 0) {
            confidenceStats[confidence].hits++;
          }
        }
      } else {
        totalPosition += 6; // Penalizar si no está en top 5
        
        const topPrediction = result.predictions[0];
        if (topPrediction) {
          const confidence = topPrediction.confidence.toLowerCase() as keyof typeof confidenceStats;
          confidenceStats[confidence].total++;
        }
      }
    });

    return {
      totalPredictions: results.length,
      exactHits,
      top3Hits,
      top5Hits,
      exactAccuracy: (exactHits / results.length) * 100,
      top3Accuracy: (top3Hits / results.length) * 100,
      top5Accuracy: (top5Hits / results.length) * 100,
      averagePosition: totalPosition / results.length,
      confidenceBreakdown: {
        segura: {
          total: confidenceStats.segura.total,
          hits: confidenceStats.segura.hits,
          accuracy: confidenceStats.segura.total > 0 
            ? (confidenceStats.segura.hits / confidenceStats.segura.total) * 100 
            : 0
        },
        moderada: {
          total: confidenceStats.moderada.total,
          hits: confidenceStats.moderada.hits,
          accuracy: confidenceStats.moderada.total > 0 
            ? (confidenceStats.moderada.hits / confidenceStats.moderada.total) * 100 
            : 0
        },
        arriesgada: {
          total: confidenceStats.arriesgada.total,
          hits: confidenceStats.arriesgada.hits,
          accuracy: confidenceStats.arriesgada.total > 0 
            ? (confidenceStats.arriesgada.hits / confidenceStats.arriesgada.total) * 100 
            : 0
        }
      }
    };
  }

  static getRecentPerformance(days: number = 7, lotteryId?: string): {
    daily: Array<{ date: string; accuracy: number; predictions: number }>;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentResults = this.getStoredResults()
      .filter(r => !lotteryId || r.lotteryId === lotteryId)
      .filter(r => new Date(r.timestamp) >= cutoffDate)
      .filter(r => r.actualResult !== null);

    // Agrupar por día
    const dailyStats: Record<string, { hits: number; total: number }> = {};
    
    recentResults.forEach(result => {
      const date = result.timestamp.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { hits: 0, total: 0 };
      }
      
      dailyStats[date].total++;
      if (result.isWin) {
        dailyStats[date].hits++;
      }
    });

    const daily = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        accuracy: (stats.hits / stats.total) * 100,
        predictions: stats.total
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calcular tendencia
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (daily.length >= 3) {
      const recent = daily.slice(-3).reduce((sum, d) => sum + d.accuracy, 0) / 3;
      const older = daily.slice(0, -3).reduce((sum, d) => sum + d.accuracy, 0) / Math.max(1, daily.length - 3);
      
      if (recent > older + 5) trend = 'improving';
      else if (recent < older - 5) trend = 'declining';
    }

    return { daily, trend };
  }
}