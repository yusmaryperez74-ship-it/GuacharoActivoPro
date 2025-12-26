import { LotteryId, DrawResult, Animal } from '../types';
import { ANIMALS } from '../constants';
import { LotoVenService } from './lotovenService';

/**
 * SERVICIO DE RESULTADOS REALES - SOLO DATOS DE LOTOVEN
 * 
 * Este servicio maneja ÚNICAMENTE resultados reales obtenidos de LotoVen.
 * NO genera simulaciones ni datos ficticios.
 * Los resultados históricos son persistentes y no cambian.
 */

export interface RealHistoryEntry {
  date: string;
  hour: string;
  animal: Animal;
  animalData: Animal;
  number: string;
  source: 'LotoVen';
  timestamp: number; // Para garantizar persistencia
}

export interface RealResultsResponse {
  success: boolean;
  draws: DrawResult[];
  history: RealHistoryEntry[];
  sources: string[];
  lastUpdate: string;
  totalResults: number;
}

export class RealResultsService {
  private static HISTORY_CACHE_KEY = 'real_history_persistent_v1';
  private static RESULTS_CACHE_KEY = 'real_results_today_v1';
  private static CACHE_DURATION = 2 * 60 * 1000; // 2 minutos para resultados del día
  
  /**
   * Obtener resultados reales del día actual desde LotoVen
   */
  static async getTodayResults(lotteryId: LotteryId): Promise<{ draws: DrawResult[], sources: string[] }> {
    console.log(`🔍 [RealResults] Fetching today's results for ${lotteryId} from LotoVen...`);
    
    try {
      // Verificar cache de resultados del día
      const cachedToday = this.getCachedTodayResults(lotteryId);
      if (cachedToday) {
        console.log(`📦 [RealResults] Using cached today results: ${cachedToday.draws.length} draws`);
        return cachedToday;
      }
      
      // Obtener desde LotoVen
      const lotovenResults = await LotoVenService.getResults(lotteryId);
      
      if (lotovenResults.draws.length === 0) {
        console.warn(`⚠️ [RealResults] No results from LotoVen for ${lotteryId}`);
        return { draws: [], sources: ['LotoVen - No results today'] };
      }
      
      // Convertir a formato DrawResult
      const today = new Date();
      const venezuelaTime = new Date(today.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
      
      const drawResults: DrawResult[] = lotovenResults.draws.map(draw => ({
        hour: draw.hour || '00:00',
        label: `${draw.hour || '00:00'}`,
        animal: draw.animal || null,
        isCompleted: true,
        isActive: false,
        isNext: false
      }));
      
      // Guardar en cache
      this.cacheTodayResults(lotteryId, { draws: drawResults, sources: lotovenResults.sources });
      
      console.log(`✅ [RealResults] Loaded ${drawResults.length} real results for ${lotteryId}`);
      return { draws: drawResults, sources: lotovenResults.sources };
      
    } catch (error: any) {
      console.error(`❌ [RealResults] Error fetching today results:`, error);
      return { draws: [], sources: [`Error: ${error?.message || 'Unknown'}`] };
    }
  }
  
  /**
   * Obtener historial completo persistente (SOLO datos reales)
   */
  static async getHistoricalResults(lotteryId: LotteryId): Promise<RealResultsResponse> {
    console.log(`📚 [RealResults] Loading historical results for ${lotteryId}...`);
    
    try {
      // Cargar historial persistente
      let persistentHistory = this.getPersistentHistory(lotteryId);
      
      // Obtener resultados del día actual
      const todayResults = await this.getTodayResults(lotteryId);
      
      // Agregar resultados de hoy al historial si no existen
      const today = new Date();
      const venezuelaTime = new Date(today.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
      const todayStr = venezuelaTime.toISOString().split('T')[0];
      
      let newEntriesAdded = 0;
      
      todayResults.draws.forEach(draw => {
        if (draw.animal && draw.hour) {
          // Verificar si ya existe esta entrada
          const exists = persistentHistory.find(h => 
            h.date === todayStr && 
            h.hour === draw.hour && 
            h.animal.id === draw.animal!.id
          );
          
          if (!exists) {
            const newEntry: RealHistoryEntry = {
              date: todayStr,
              hour: draw.hour,
              animal: draw.animal,
              animalData: draw.animal,
              number: draw.animal.number,
              source: 'LotoVen',
              timestamp: Date.now()
            };
            
            persistentHistory.unshift(newEntry); // Agregar al inicio
            newEntriesAdded++;
          }
        }
      });
      
      // Guardar historial actualizado si hay nuevas entradas
      if (newEntriesAdded > 0) {
        this.savePersistentHistory(lotteryId, persistentHistory);
        console.log(`💾 [RealResults] Added ${newEntriesAdded} new entries to persistent history`);
      }
      
      // Ordenar por fecha y hora (más recientes primero)
      persistentHistory.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.hour.localeCompare(a.hour);
      });
      
      console.log(`✅ [RealResults] Loaded ${persistentHistory.length} historical entries for ${lotteryId}`);
      
      return {
        success: true,
        draws: todayResults.draws,
        history: persistentHistory,
        sources: todayResults.sources,
        lastUpdate: new Date().toISOString(),
        totalResults: persistentHistory.length
      };
      
    } catch (error: any) {
      console.error(`❌ [RealResults] Error loading historical results:`, error);
      
      return {
        success: false,
        draws: [],
        history: [],
        sources: [`Error: ${error?.message || 'Unknown'}`],
        lastUpdate: new Date().toISOString(),
        totalResults: 0
      };
    }
  }
  
  /**
   * Agregar resultado manual (para correcciones)
   */
  static addManualResult(lotteryId: LotteryId, date: string, hour: string, animal: Animal): boolean {
    try {
      const history = this.getPersistentHistory(lotteryId);
      
      // Verificar si ya existe
      const exists = history.find(h => 
        h.date === date && 
        h.hour === hour
      );
      
      if (exists) {
        console.warn(`⚠️ [RealResults] Entry already exists for ${date} ${hour}`);
        return false;
      }
      
      // Agregar nueva entrada
      const newEntry: RealHistoryEntry = {
        date,
        hour,
        animal,
        animalData: animal,
        number: animal.number,
        source: 'LotoVen',
        timestamp: Date.now()
      };
      
      history.unshift(newEntry);
      this.savePersistentHistory(lotteryId, history);
      
      console.log(`✅ [RealResults] Added manual entry: ${date} ${hour} - ${animal.name}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [RealResults] Error adding manual result:`, error);
      return false;
    }
  }
  
  /**
   * Obtener estadísticas del historial real
   */
  static getHistoryStats(lotteryId: LotteryId): {
    totalEntries: number;
    dateRange: { from: string, to: string };
    sources: string[];
    lastUpdate: string;
  } {
    const history = this.getPersistentHistory(lotteryId);
    
    if (history.length === 0) {
      return {
        totalEntries: 0,
        dateRange: { from: 'N/A', to: 'N/A' },
        sources: [],
        lastUpdate: 'Never'
      };
    }
    
    const dates = history.map(h => h.date).sort();
    const sources = [...new Set(history.map(h => h.source))];
    const lastEntry = history.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
    
    return {
      totalEntries: history.length,
      dateRange: { 
        from: dates[0], 
        to: dates[dates.length - 1] 
      },
      sources,
      lastUpdate: new Date(lastEntry.timestamp).toISOString()
    };
  }
  
  /**
   * Limpiar cache de resultados del día (forzar actualización)
   */
  static clearTodayCache(lotteryId?: LotteryId): void {
    try {
      if (lotteryId) {
        localStorage.removeItem(`${this.RESULTS_CACHE_KEY}_${lotteryId}`);
        console.log(`🧹 [RealResults] Cleared today cache for ${lotteryId}`);
      } else {
        // Limpiar todo el cache de resultados del día
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.RESULTS_CACHE_KEY)) {
            localStorage.removeItem(key);
          }
        });
        console.log(`🧹 [RealResults] Cleared all today cache`);
      }
    } catch (error) {
      console.warn('Failed to clear today cache:', error);
    }
  }
  
  /**
   * Gestión de historial persistente
   */
  private static getPersistentHistory(lotteryId: LotteryId): RealHistoryEntry[] {
    try {
      const stored = localStorage.getItem(`${this.HISTORY_CACHE_KEY}_${lotteryId}`);
      if (!stored) return [];
      
      const data = JSON.parse(stored);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  
  private static savePersistentHistory(lotteryId: LotteryId, history: RealHistoryEntry[]): void {
    try {
      localStorage.setItem(`${this.HISTORY_CACHE_KEY}_${lotteryId}`, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save persistent history:', error);
    }
  }
  
  /**
   * Gestión de cache de resultados del día
   */
  private static getCachedTodayResults(lotteryId: LotteryId): { draws: DrawResult[], sources: string[] } | null {
    try {
      const cached = localStorage.getItem(`${this.RESULTS_CACHE_KEY}_${lotteryId}`);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > this.CACHE_DURATION;
      
      if (isExpired) return null;
      
      return {
        draws: data.draws,
        sources: data.sources
      };
    } catch {
      return null;
    }
  }
  
  private static cacheTodayResults(lotteryId: LotteryId, result: { draws: DrawResult[], sources: string[] }): void {
    try {
      const cacheData = {
        draws: result.draws,
        sources: result.sources,
        timestamp: Date.now()
      };
      localStorage.setItem(`${this.RESULTS_CACHE_KEY}_${lotteryId}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache today results:', error);
    }
  }
}