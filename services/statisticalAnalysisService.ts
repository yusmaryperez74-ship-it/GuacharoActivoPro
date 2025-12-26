import { LotteryId, Animal } from '../types';
import { ANIMALS } from '../constants';

/**
 * SERVICIO DE ANÁLISIS ESTADÍSTICO PARA LOTERÍA DE ANIMALITOS
 * 
 * Implementa análisis estadístico basado en datos históricos reales.
 * NO garantiza premios ni resultados futuros.
 * 
 * Algoritmos implementados:
 * 1. Análisis de frecuencia total
 * 2. Análisis de frecuencia reciente (ventanas temporales)
 * 3. Análisis de ausencia (días sin salir)
 * 4. Score ponderado configurable
 */

export interface HistoricalResult {
  date: string;
  hour?: string;
  animal: Animal;
  animalNumber: string;
  animalName: string;
}

export interface FrequencyAnalysis {
  animalId: string;
  animal: Animal;
  totalAppearances: number;
  totalFrequency: number; // Porcentaje del total
  recentAppearances5: number;
  recentAppearances10: number;
  recentAppearances20: number;
  recentFrequency5: number;
  recentFrequency10: number;
  recentFrequency20: number;
  daysSinceLastAppearance: number;
  lastAppearanceDate: string | null;
  isHot: boolean; // Animal caliente
  isCold: boolean; // Animal frío
}

export interface PredictionScore {
  animalId: string;
  animal: Animal;
  score: number;
  rank: number;
  frequencyTotal: number;
  frequencyRecent: number;
  daysSinceLastAppearance: number;
  category: 'hot' | 'warm' | 'cold' | 'frozen';
  explanation: string;
  confidence: 'alta' | 'media' | 'baja';
}

export interface StatisticalPrediction {
  lotteryId: LotteryId;
  analysisDate: string;
  totalResults: number;
  analysisWindow: {
    recent5: number;
    recent10: number;
    recent20: number;
  };
  top5: PredictionScore[];
  top10: PredictionScore[];
  hotAnimals: PredictionScore[];
  coldAnimals: PredictionScore[];
  allAnimals: PredictionScore[];
  weights: {
    recentFrequency: number;
    totalFrequency: number;
    daysSinceAppearance: number;
  };
  disclaimer: string;
}

export class StatisticalAnalysisService {
  
  // Pesos configurables del algoritmo de puntuación
  private static DEFAULT_WEIGHTS = {
    recentFrequency: 0.5,    // 50% - Tendencia reciente
    totalFrequency: 0.3,     // 30% - Frecuencia histórica
    daysSinceAppearance: 0.2 // 20% - Tiempo sin salir
  };

  private static DISCLAIMER = "Esta app muestra análisis estadístico basado en resultados históricos. No garantiza premios ni resultados futuros. La lotería es un proceso aleatorio.";

  /**
   * Análisis estadístico completo para una lotería específica
   */
  static analyzeHistoricalData(
    lotteryId: LotteryId,
    historicalResults: HistoricalResult[],
    customWeights?: Partial<typeof StatisticalAnalysisService.DEFAULT_WEIGHTS>
  ): StatisticalPrediction {
    
    console.log(`📊 [Statistical] Starting analysis for ${lotteryId} with ${historicalResults.length} results`);
    
    const weights = { ...this.DEFAULT_WEIGHTS, ...customWeights };
    
    // 1. Análisis de frecuencia para todos los animales
    const frequencyAnalysis = this.calculateFrequencyAnalysis(historicalResults);
    
    // 2. Calcular scores ponderados
    const scoredAnimals = this.calculatePredictionScores(frequencyAnalysis, weights);
    
    // 3. Categorizar animales
    const categorizedAnimals = this.categorizeAnimals(scoredAnimals);
    
    // 4. Generar predicción estructurada
    const prediction: StatisticalPrediction = {
      lotteryId,
      analysisDate: new Date().toISOString().split('T')[0],
      totalResults: historicalResults.length,
      analysisWindow: {
        recent5: Math.min(5, historicalResults.length),
        recent10: Math.min(10, historicalResults.length),
        recent20: Math.min(20, historicalResults.length)
      },
      top5: categorizedAnimals.slice(0, 5),
      top10: categorizedAnimals.slice(0, 10),
      hotAnimals: categorizedAnimals.filter(a => a.category === 'hot'),
      coldAnimals: categorizedAnimals.filter(a => a.category === 'cold' || a.category === 'frozen'),
      allAnimals: categorizedAnimals,
      weights,
      disclaimer: this.DISCLAIMER
    };

    console.log(`✅ [Statistical] Analysis completed: Top animal is ${prediction.top5[0]?.animal.name} with score ${prediction.top5[0]?.score.toFixed(2)}`);
    
    return prediction;
  }

  /**
   * Análisis de frecuencia para todos los animales
   */
  private static calculateFrequencyAnalysis(results: HistoricalResult[]): FrequencyAnalysis[] {
    const totalResults = results.length;
    const today = new Date();
    
    return ANIMALS.map(animal => {
      // Filtrar resultados de este animal
      const animalResults = results.filter(r => r.animal.id === animal.id);
      
      // Análisis de frecuencia total
      const totalAppearances = animalResults.length;
      const totalFrequency = totalResults > 0 ? (totalAppearances / totalResults) * 100 : 0;
      
      // Análisis de frecuencia reciente (ventanas temporales)
      const recent5 = results.slice(-5);
      const recent10 = results.slice(-10);
      const recent20 = results.slice(-20);
      
      const recentAppearances5 = recent5.filter(r => r.animal.id === animal.id).length;
      const recentAppearances10 = recent10.filter(r => r.animal.id === animal.id).length;
      const recentAppearances20 = recent20.filter(r => r.animal.id === animal.id).length;
      
      const recentFrequency5 = recent5.length > 0 ? (recentAppearances5 / recent5.length) * 100 : 0;
      const recentFrequency10 = recent10.length > 0 ? (recentAppearances10 / recent10.length) * 100 : 0;
      const recentFrequency20 = recent20.length > 0 ? (recentAppearances20 / recent20.length) * 100 : 0;
      
      // Análisis de ausencia
      const lastResult = animalResults[animalResults.length - 1];
      let daysSinceLastAppearance = 0;
      let lastAppearanceDate: string | null = null;
      
      if (lastResult) {
        lastAppearanceDate = lastResult.date;
        const lastDate = new Date(lastResult.date);
        daysSinceLastAppearance = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        daysSinceLastAppearance = 999; // Nunca ha salido
      }
      
      // Categorización caliente/frío
      const avgFrequency = 100 / ANIMALS.length; // Frecuencia esperada aleatoria
      const isHot = recentFrequency10 > avgFrequency * 1.5; // 50% más que el promedio
      const isCold = recentFrequency10 < avgFrequency * 0.5; // 50% menos que el promedio
      
      return {
        animalId: animal.id,
        animal,
        totalAppearances,
        totalFrequency,
        recentAppearances5,
        recentAppearances10,
        recentAppearances20,
        recentFrequency5,
        recentFrequency10,
        recentFrequency20,
        daysSinceLastAppearance,
        lastAppearanceDate,
        isHot,
        isCold
      };
    });
  }

  /**
   * Calcular scores ponderados para cada animal
   */
  private static calculatePredictionScores(
    frequencyAnalysis: FrequencyAnalysis[],
    weights: typeof StatisticalAnalysisService.DEFAULT_WEIGHTS
  ): PredictionScore[] {
    
    // Normalizar valores para el cálculo del score
    const maxRecentFreq = Math.max(...frequencyAnalysis.map(f => f.recentFrequency10));
    const maxTotalFreq = Math.max(...frequencyAnalysis.map(f => f.totalFrequency));
    const maxDaysSince = Math.max(...frequencyAnalysis.map(f => f.daysSinceLastAppearance));
    
    return frequencyAnalysis.map(analysis => {
      // Normalizar valores (0-1)
      const normalizedRecentFreq = maxRecentFreq > 0 ? analysis.recentFrequency10 / maxRecentFreq : 0;
      const normalizedTotalFreq = maxTotalFreq > 0 ? analysis.totalFrequency / maxTotalFreq : 0;
      const normalizedDaysSince = maxDaysSince > 0 ? analysis.daysSinceLastAppearance / maxDaysSince : 0;
      
      // Calcular score ponderado
      const score = (
        normalizedRecentFreq * weights.recentFrequency +
        normalizedTotalFreq * weights.totalFrequency +
        normalizedDaysSince * weights.daysSinceAppearance
      ) * 100; // Escalar a 0-100
      
      // Generar explicación
      const explanation = this.generateExplanation(analysis, score);
      
      // Determinar confianza
      const confidence = this.determineConfidence(analysis, score);
      
      return {
        animalId: analysis.animalId,
        animal: analysis.animal,
        score,
        rank: 0, // Se asignará después del ordenamiento
        frequencyTotal: analysis.totalFrequency,
        frequencyRecent: analysis.recentFrequency10,
        daysSinceLastAppearance: analysis.daysSinceLastAppearance,
        category: 'warm' as const, // Se asignará después
        explanation,
        confidence
      };
    });
  }

  /**
   * Categorizar y ordenar animales por score
   */
  private static categorizeAnimals(scores: PredictionScore[]): PredictionScore[] {
    // Ordenar por score descendente
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    
    // Asignar ranks y categorías
    return sortedScores.map((score, index) => {
      const rank = index + 1;
      let category: PredictionScore['category'];
      
      if (rank <= 5) {
        category = 'hot';
      } else if (rank <= 15) {
        category = 'warm';
      } else if (rank <= 25) {
        category = 'cold';
      } else {
        category = 'frozen';
      }
      
      return {
        ...score,
        rank,
        category
      };
    });
  }

  /**
   * Generar explicación en lenguaje simple
   */
  private static generateExplanation(analysis: FrequencyAnalysis, score: number): string {
    const explanations = [];
    
    if (analysis.recentFrequency10 > 15) {
      explanations.push("tendencia reciente alta");
    } else if (analysis.recentFrequency10 < 5) {
      explanations.push("tendencia reciente baja");
    }
    
    if (analysis.daysSinceLastAppearance > 30) {
      explanations.push("mucho tiempo sin salir");
    } else if (analysis.daysSinceLastAppearance < 7) {
      explanations.push("salió recientemente");
    }
    
    if (analysis.totalFrequency > 4) {
      explanations.push("frecuencia histórica alta");
    } else if (analysis.totalFrequency < 2) {
      explanations.push("frecuencia histórica baja");
    }
    
    if (explanations.length === 0) {
      return "comportamiento promedio según análisis histórico";
    }
    
    return explanations.join(", ");
  }

  /**
   * Determinar nivel de confianza
   */
  private static determineConfidence(analysis: FrequencyAnalysis, score: number): 'alta' | 'media' | 'baja' {
    if (score > 70 && analysis.totalAppearances > 10) {
      return 'alta';
    } else if (score > 40 && analysis.totalAppearances > 5) {
      return 'media';
    } else {
      return 'baja';
    }
  }

  /**
   * Obtener análisis rápido para dashboard
   */
  static getQuickAnalysis(lotteryId: LotteryId, results: HistoricalResult[]): {
    hottest: PredictionScore;
    coldest: PredictionScore;
    trending: PredictionScore[];
    summary: string;
  } {
    const analysis = this.analyzeHistoricalData(lotteryId, results);
    
    const hottest = analysis.allAnimals[0];
    const coldest = analysis.allAnimals[analysis.allAnimals.length - 1];
    const trending = analysis.allAnimals.filter(a => a.frequencyRecent > a.frequencyTotal).slice(0, 3);
    
    const summary = `Análisis de ${results.length} sorteos. Animal con mayor probabilidad estimada: ${hottest.animal.name} (${hottest.score.toFixed(1)} pts)`;
    
    return {
      hottest,
      coldest,
      trending,
      summary
    };
  }

  /**
   * Exportar datos para análisis externo
   */
  static exportAnalysisData(prediction: StatisticalPrediction): string {
    return JSON.stringify({
      metadata: {
        lotteryId: prediction.lotteryId,
        analysisDate: prediction.analysisDate,
        totalResults: prediction.totalResults,
        weights: prediction.weights
      },
      results: prediction.allAnimals.map(animal => ({
        rank: animal.rank,
        animalId: animal.animalId,
        animalName: animal.animal.name,
        score: animal.score,
        frequencyTotal: animal.frequencyTotal,
        frequencyRecent: animal.frequencyRecent,
        daysSinceLastAppearance: animal.daysSinceLastAppearance,
        category: animal.category,
        confidence: animal.confidence
      }))
    }, null, 2);
  }
}