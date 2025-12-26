import { LotteryId, DrawResult, Animal } from '../types';
import { ANIMALS } from '../constants';
import { DATA_SOURCES, CORS_PROXIES, HTML_PATTERNS, RATE_LIMITS, CACHE_CONFIG } from '../config/dataSourcesConfig';
import { LotoVenService } from './lotovenService';

// URLs oficiales de las loterías
const OFFICIAL_URLS = {
  GUACHARO: 'https://www.loteriadehoy.com/animalito/guacharoactivo/resultados/',
  LOTTO_ACTIVO: 'https://www.loteriadehoy.com/animalito/lottoactivo/resultados/'
};

// Backup URLs
const BACKUP_URLS = {
  GUACHARO: [
    'https://www.triplecaliente.com/guacharo-activo',
    'https://www.animalitosvenezuela.com/guacharo'
  ],
  LOTTO_ACTIVO: [
    'https://www.triplecaliente.com/lotto-activo',
    'https://www.animalitosvenezuela.com/lotto-activo'
  ]
};

interface RealResult {
  hour: string;
  animal: string;
  number: string;
  date: string;
  source: string;
}

export class RealDataService {
  private static CACHE_KEY = 'real_results_cache_v2';
  private static lastRequestTime = 0;

  /**
   * Obtiene los resultados reales usando múltiples métodos configurables
   * Prioridad: LotoVen -> Otras fuentes -> Fallbacks
   */
  static async getRealResults(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMITS.SCRAPING_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.SCRAPING_DELAY_MS - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    console.log(`🚀 Starting data fetch for ${lotteryId}...`);

    // 1. PRIORIDAD MÁXIMA: Intentar LotoVen primero
    try {
      console.log(`🎯 Trying LotoVen for ${lotteryId}...`);
      const lotovenResult = await LotoVenService.getResults(lotteryId);
      
      if (lotovenResult.draws.length > 0) {
        console.log(`✅ LotoVen SUCCESS: ${lotovenResult.draws.length} results`);
        return lotovenResult;
      } else {
        console.log(`⚠️ LotoVen returned no results`);
      }
    } catch (error) {
      console.warn(`❌ LotoVen failed:`, error);
    }

    // 2. FALLBACK: Usar otras fuentes configuradas
    const cached = this.getCachedResults(lotteryId);
    if (cached) {
      console.log(`📦 Using cached results as fallback`);
      return cached;
    }

    const sources = DATA_SOURCES[lotteryId]
      .filter(source => source.isActive && source.name !== 'LotoVen - Guácharo Activo' && source.name !== 'LotoVen - Lotto Activo')
      .sort((a, b) => a.priority - b.priority);

    for (const source of sources) {
      try {
        console.log(`🔍 Trying ${source.name} for ${lotteryId}...`);
        
        let result;
        switch (source.type) {
          case 'api':
            result = await this.fetchFromOfficialAPI(source.url);
            break;
          case 'scraping':
            result = await this.fetchFromWebScraping(source.url);
            break;
          case 'community':
            result = await this.fetchFromCommunityAPI(source.url);
            break;
          default:
            continue;
        }

        if (result.draws.length > 0) {
          console.log(`✅ Success with ${source.name}: ${result.draws.length} results`);
          this.cacheResults(lotteryId, result);
          return { ...result, sources: [source.name] };
        }
      } catch (error) {
        console.warn(`❌ ${source.name} failed:`, error);
        continue;
      }
    }

    // 3. ÚLTIMO RECURSO: Cache expirado
    const expiredCache = this.getCachedResults(lotteryId, true);
    if (expiredCache) {
      console.log(`🕰️ Using expired cache as last resort`);
      return expiredCache;
    }

    console.log(`❌ All sources failed for ${lotteryId}`);
    return { draws: [], sources: ['All sources failed'] };
  }

  /**
   * Método 1: API oficial (si existe)
   */
  private static async fetchFromOfficialAPI(url: string): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GuacharoAI/2.0'
        }
      });

      if (!response.ok) throw new Error(`API responded with ${response.status}`);

      const data = await response.json();
      return this.parseOfficialAPIResponse(data);
    } catch (error) {
      throw new Error(`Official API failed: ${error}`);
    }
  }

  /**
   * Método 2: Web scraping directo
   */
  private static async fetchFromWebScraping(url: string): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    try {
      // Usar un proxy CORS para obtener el HTML
      const proxyUrl = `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) throw new Error('No content received');
      
      const results = this.parseHTMLResults(data.contents);
      return { ...results, sources: [url] };
    } catch (error) {
      throw new Error(`Web scraping failed: ${error}`);
    }
  }

  /**
   * Método 3: API comunitaria
   */
  private static async fetchFromCommunityAPI(url: string): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${url}?date=${today}`);
      
      if (!response.ok) throw new Error(`Community API failed: ${response.status}`);
      
      const data = await response.json();
      return this.parseCommunityAPIResponse(data);
    } catch (error) {
      throw new Error(`Community API failed: ${error}`);
    }
  }

  /**
   * Parser para respuesta de API oficial
   */
  private static parseOfficialAPIResponse(data: any): { draws: Partial<DrawResult>[], sources: string[] } {
    const draws: Partial<DrawResult>[] = [];
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const animal = this.findAnimalByNumberOrName(result.animal || result.number);
        if (animal && result.hour) {
          draws.push({
            hour: result.hour,
            animal,
            isCompleted: true
          });
        }
      }
    }

    return { draws, sources: ['Official API'] };
  }

  /**
   * Parser para API comunitaria
   */
  private static parseCommunityAPIResponse(data: any): { draws: Partial<DrawResult>[], sources: string[] } {
    const draws: Partial<DrawResult>[] = [];
    
    if (data.draws && Array.isArray(data.draws)) {
      for (const draw of data.draws) {
        if (draw.verified && draw.votes > 3) { // Solo resultados verificados
          const animal = this.findAnimalByNumberOrName(draw.animal);
          if (animal && draw.hour) {
            draws.push({
              hour: draw.hour,
              animal,
              isCompleted: true
            });
          }
        }
      }
    }

    return { draws, sources: ['Community API'] };
  }

  /**
   * Parser para HTML scraping
   */
  private static parseHTMLResults(html: string): { draws: Partial<DrawResult>[], sources: string[] } {
    const draws: Partial<DrawResult>[] = [];
    
    try {
      // Usar patrones de LotoVen principalmente
      const patterns = HTML_PATTERNS.LOTOVEN;

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const hour = match[2];
          const animalStr = match[3];
          
          if (hour && animalStr) {
            const animal = this.findAnimalByNumberOrName(animalStr.trim());
            if (animal) {
              draws.push({
                hour,
                animal,
                isCompleted: true
              });
            }
          }
        }
        
        if (draws.length > 0) break;
      }

      // Eliminar duplicados y ordenar por hora
      const uniqueDraws = draws.filter((draw, index, self) => 
        index === self.findIndex(d => d.hour === draw.hour)
      ).sort((a, b) => (a.hour || '').localeCompare(b.hour || ''));

      return { draws: uniqueDraws, sources: ['HTML Scraping'] };
    } catch (error) {
      console.error('HTML parsing error:', error);
      return { draws: [], sources: [] };
    }
  }

  /**
   * Buscar animal por número o nombre
   */
  private static findAnimalByNumberOrName(input: string): Animal | null {
    if (!input) return null;
    
    const cleanInput = input.toString().trim().toLowerCase();
    
    // Buscar por número
    const numberMatch = cleanInput.match(/\b(\d{1,2})\b/);
    if (numberMatch) {
      const num = numberMatch[1].padStart(2, '0');
      const byNumber = ANIMALS.find(a => a.number === num || a.id === num);
      if (byNumber) return byNumber;
    }

    // Buscar por nombre
    const normalizedInput = cleanInput
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, '');

    return ANIMALS.find(a => {
      const normalizedName = a.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, '');
      
      return normalizedName === normalizedInput || 
             normalizedName.includes(normalizedInput) || 
             normalizedInput.includes(normalizedName);
    }) || null;
  }

  /**
   * Cache management
   */
  private static getCachedResults(lotteryId: LotteryId, allowExpired = false): { draws: Partial<DrawResult>[], sources: string[] } | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY}_${lotteryId}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > CACHE_CONFIG.REAL_RESULTS_TTL;
      
      if (isExpired && !allowExpired) return null;
      
      return {
        draws: data.draws,
        sources: data.sources.concat(isExpired ? [' (expired cache)'] : [' (cached)'])
      };
    } catch {
      return null;
    }
  }

  private static cacheResults(lotteryId: LotteryId, result: { draws: Partial<DrawResult>[], sources: string[] }) {
    try {
      const cacheData = {
        draws: result.draws,
        sources: result.sources,
        timestamp: Date.now()
      };
      localStorage.setItem(`${this.CACHE_KEY}_${lotteryId}`, JSON.stringify(cacheData));
      console.log(`💾 Cached ${result.draws.length} results for ${lotteryId}`);
    } catch (error) {
      console.warn('Failed to cache results:', error);
    }
  }

  /**
   * Método para reportar un resultado manualmente (para API comunitaria)
   */
  static async reportResult(lotteryId: LotteryId, hour: string, animal: Animal): Promise<boolean> {
    try {
      const response = await fetch('https://api.animalitos-community.com/v1/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lottery: lotteryId,
          hour,
          animal: animal.name,
          number: animal.number,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}