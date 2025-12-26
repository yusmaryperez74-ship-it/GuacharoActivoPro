import { LotteryId } from '../types';
import { StatisticalAnalysisService, StatisticalPrediction, HistoricalResult } from './statisticalAnalysisService';
import { RealResultsService, RealHistoryEntry } from './realResultsService';

/**
 * SERVICIO DE PREDICCIÓN BASADO EN ANÁLISIS ESTADÍSTICO
 * 
 * Integra ÚNICAMENTE datos históricos reales de LotoVen con algoritmos estadísticos
 * para generar predicciones basadas en tendencias históricas.
 * 
 * IMPORTANTE: No garantiza premios ni resultados futuros.
 * NO utiliza simulaciones ni datos ficticios.
 */

export interface PredictionRequest {
  lotteryId: LotteryId;
  analysisDepth?: number; // Número de sorteos a analizar (default: todos)
  customWeights?: {
    recentFrequency?: number;
    totalFrequency?: number;
    daysSinceAppearance?: number;
  };
}

export interface PredictionResponse {
  success: boolean;
  data?: StatisticalPrediction;
  error?: string;
  metadata: {
    requestTime: string;
    processingTime: number;
    dataSource: string;
    analysisMethod: string;
  };
}

export class PredictionService {
  
  private static CACHE_KEY = 'statistical_predictions_v1';
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  
  /**
   * Generar predicción estadística para una lotería
   */
  static async generatePrediction(request: PredictionRequest): Promise<PredictionResponse> {
    const startTime = Date.now();
    
    console.log(`🎯 [Prediction] Starting statistical analysis for ${request.lotteryId}`);
    
    try {
      // 1. Verificar cache
      const cached = this.getCachedPrediction(request.lotteryId);
      if (cached) {
        console.log(`📦 [Prediction] Using cached prediction for ${request.lotteryId}`);
        return {
          success: true,
          data: cached,
          metadata: {
            requestTime: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            dataSource: 'cache',
            analysisMethod: 'statistical'
          }
        };
      }
      
      // 2. Obtener datos históricos
      const historicalData = await this.getHistoricalData(request.lotteryId, request.analysisDepth);
      
      if (historicalData.length === 0) {
        throw new Error('No hay datos históricos suficientes para el análisis');
      }
      
      // 3. Ejecutar análisis estadístico
      const prediction = StatisticalAnalysisService.analyzeHistoricalData(
        request.lotteryId,
        historicalData,
        request.customWeights
      );
      
      // 4. Guardar en cache
      this.cachePrediction(request.lotteryId, prediction);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [Prediction] Analysis completed in ${processingTime}ms for ${request.lotteryId}`);
      
      return {
        success: true,
        data: prediction,
        metadata: {
          requestTime: new Date().toISOString(),
          processingTime,
          dataSource: 'real-time',
          analysisMethod: 'statistical'
        }
      };
      
    } catch (error: any) {
      console.error(`❌ [Prediction] Error generating prediction:`, error);
      
      return {
        success: false,
        error: error?.message || 'Error desconocido en el análisis',
        metadata: {
          requestTime: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          dataSource: 'error',
          analysisMethod: 'statistical'
        }
      };
    }
  }
  
  /**
   * Obtener datos históricos reales formateados para análisis
   */
  private static async getHistoricalData(lotteryId: LotteryId, maxResults?: number): Promise<HistoricalResult[]> {
    try {
      // Obtener historial real desde LotoVen
      const realResults = await RealResultsService.getHistoricalResults(lotteryId);
      
      if (!realResults.success || realResults.history.length === 0) {
        throw new Error('No se pudieron obtener datos históricos reales');
      }
      
      let history = realResults.history;
      
      // Limitar resultados si se especifica
      if (maxResults && maxResults > 0) {
        history = history.slice(0, maxResults);
      }
      
      // Convertir al formato requerido por el análisis estadístico
      const formattedResults: HistoricalResult[] = history.map(h => ({
        date: h.date,
        hour: h.hour,
        animal: h.animal,
        animalNumber: h.animal.number,
        animalName: h.animal.name
      }));
      
      console.log(`📊 [Prediction] Loaded ${formattedResults.length} REAL historical results for ${lotteryId}`);
      
      return formattedResults;
      
    } catch (error) {
      console.error(`❌ [Prediction] Error loading real historical data:`, error);
      throw new Error('Error al cargar datos históricos reales');
    }
  }
  
  /**
   * Obtener predicción rápida para dashboard
   */
  static async getQuickPrediction(lotteryId: LotteryId): Promise<{
    topAnimal: string;
    score: number;
    confidence: string;
    summary: string;
    lastUpdate: string;
  } | null> {
    try {
      const response = await this.generatePrediction({ lotteryId });
      
      if (!response.success || !response.data) {
        return null;
      }
      
      const topAnimal = response.data.top5[0];
      
      return {
        topAnimal: topAnimal.animal.name,
        score: Math.round(topAnimal.score),
        confidence: topAnimal.confidence,
        summary: topAnimal.explanation,
        lastUpdate: response.data.analysisDate
      };
      
    } catch (error) {
      console.error(`❌ [Prediction] Error getting quick prediction:`, error);
      return null;
    }
  }
  
  /**
   * Comparar predicciones entre diferentes loterías
   */
  static async compareLotteries(): Promise<{
    guacharo: StatisticalPrediction | null;
    lottoActivo: StatisticalPrediction | null;
    comparison: {
      mostActiveAnimal: string;
      bestOpportunity: string;
      summary: string;
    };
  }> {
    try {
      const [guacharoResponse, lottoResponse] = await Promise.all([
        this.generatePrediction({ lotteryId: 'GUACHARO' }),
        this.generatePrediction({ lotteryId: 'LOTTO_ACTIVO' })
      ]);
      
      const guacharo = guacharoResponse.success ? guacharoResponse.data! : null;
      const lotto = lottoResponse.success ? lottoResponse.data! : null;
      
      // Análisis comparativo
      let mostActiveAnimal = 'N/A';
      let bestOpportunity = 'N/A';
      let summary = 'No hay datos suficientes para comparación';
      
      if (guacharo && lotto) {
        const guacharoTop = guacharo.top5[0];
        const lottoTop = lotto.top5[0];
        
        mostActiveAnimal = guacharoTop.score > lottoTop.score ? 
          `${guacharoTop.animal.name} (Guácharo)` : 
          `${lottoTop.animal.name} (Lotto Activo)`;
        
        bestOpportunity = guacharoTop.confidence === 'alta' ? 
          `Guácharo: ${guacharoTop.animal.name}` : 
          `Lotto Activo: ${lottoTop.animal.name}`;
        
        summary = `Análisis comparativo basado en ${guacharo.totalResults + lotto.totalResults} sorteos históricos`;
      }
      
      return {
        guacharo,
        lottoActivo: lotto,
        comparison: {
          mostActiveAnimal,
          bestOpportunity,
          summary
        }
      };
      
    } catch (error) {
      console.error(`❌ [Prediction] Error comparing lotteries:`, error);
      throw error;
    }
  }
  
  /**
   * Cache management
   */
  private static getCachedPrediction(lotteryId: LotteryId): StatisticalPrediction | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY}_${lotteryId}`);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > this.CACHE_DURATION;
      
      if (isExpired) return null;
      
      return data.prediction;
    } catch {
      return null;
    }
  }
  
  private static cachePrediction(lotteryId: LotteryId, prediction: StatisticalPrediction): void {
    try {
      const cacheData = {
        prediction,
        timestamp: Date.now()
      };
      localStorage.setItem(`${this.CACHE_KEY}_${lotteryId}`, JSON.stringify(cacheData));
      console.log(`💾 [Prediction] Cached prediction for ${lotteryId}`);
    } catch (error) {
      console.warn('Failed to cache prediction:', error);
    }
  }
  
  /**
   * Limpiar cache de predicciones
   */
  static clearCache(): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
      console.log(`🧹 [Prediction] Cache cleared`);
    } catch (error) {
      console.warn('Failed to clear prediction cache:', error);
    }
  }
}