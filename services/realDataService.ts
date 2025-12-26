import { LotteryId, DrawResult, Animal } from '../types';
import { ANIMALS } from '../constants';
import { DATA_SOURCES, CORS_PROXIES, HTML_PATTERNS, RATE_LIMITS, CACHE_CONFIG } from '../config/dataSourcesConfig';

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
   */
  static async getRealResults(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMITS.SCRAPING_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.SCRAPING_DELAY_MS - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const cached = this.getCachedResults(lotteryId);
    if (cached) {
      return cached;
    }

    const sources = DATA_SOURCES[lotteryId]
      .filter(source => source.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const source of sources) {
      try {
        console.log(`🔍 Trying ${source.name} for ${lotteryId}...`);
        
        let result;
        switch (source.type) {
          case 'api':
            result = await this.fetchFromAPI(source);
            break;
          case 'scraping':
            result = await this.fetchFromScraping(source, lotteryId);
            break;
          case 'community':
            result = await this.fetchFromCommunity(source, lotteryId);
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

    // Si todo falla, retornar cache expirado si existe
    const expiredCache = this.getCachedResults(lotteryId, true);
    return expiredCache || { draws: [], sources: ['No sources available'] };
  }

  /**
   * Método 1: API oficial (si existe)
   */
  private static async fetchFromOfficialAPI(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    // Nota: Estas APIs son hipotéticas, necesitarían ser reales
    const apiUrls = {
      GUACHARO: 'https://api.loteriadehoy.com/v1/guacharo/today',
      LOTTO_ACTIVO: 'https://api.loteriadehoy.com/v1/lotto-activo/today'
    };

    try {
      const response = await fetch(apiUrls[lotteryId], {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GuacharoAI/2.0'
        }
      });

      if (!response.ok) throw new Error(`API responded with ${response.status}`);

      const data = await response.json();
      return this.parseOfficialAPIResponse(data, lotteryId);
    } catch (error) {
      throw new Error(`Official API failed: ${error}`);
    }
  }

  /**
   * Método 2: Fuentes de respaldo
   */
  private static async fetchFromBackupSources(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    const urls = BACKUP_URLS[lotteryId];
    
    for (const url of urls) {
      try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.contents) {
          const results = this.parseHTMLResults(data.contents, lotteryId);
          if (results.draws.length > 0) {
            return { ...results, sources: [url] };
          }
        }
      } catch (error) {
        console.warn(`Backup source ${url} failed:`, error);
        continue;
      }
    }

    throw new Error('All backup sources failed');
  }

  /**
   * Método 3: API comunitaria (datos crowdsourced)
   */
  private static async fetchFromCommunityAPI(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    // Esta sería una API comunitaria donde usuarios reportan resultados
    const communityAPI = 'https://api.animalitos-community.com/v1/results';
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${communityAPI}?lottery=${lotteryId}&date=${today}`);
      
      if (!response.ok) throw new Error(`Community API failed: ${response.status}`);
      
      const data = await response.json();
      return this.parseCommunityAPIResponse(data, lotteryId);
    } catch (error) {
      throw new Error(`Community API failed: ${error}`);
    }
  }

  /**
   * Método 4: Web scraping directo (sin IA)
   */
  private static async fetchFromWebScraping(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    const url = OFFICIAL_URLS[lotteryId];
    
    try {
      // Usar un proxy CORS para obtener el HTML
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) throw new Error('No content received');
      
      const results = this.parseHTMLResults(data.contents, lotteryId);
      return { ...results, sources: [url] };
    } catch (error) {
      throw new Error(`Web scraping failed: ${error}`);
    }
  }

  /**
   * Parser para respuesta de API oficial
   */
  private static parseOfficialAPIResponse(data: any, lotteryId: LotteryId): { draws: Partial<DrawResult>[], sources: string[] } {
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
  private static parseCommunityAPIResponse(data: any, lotteryId: LotteryId): { draws: Partial<DrawResult>[], sources: string[] } {
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
  private static parseHTMLResults(html: string, lotteryId: LotteryId): { draws: Partial<DrawResult>[], sources: string[] } {
    const draws: Partial<DrawResult>[] = [];
    
    try {
      // Patrones comunes para extraer resultados de HTML
      const patterns = [
        // Patrón 1: <td>09:00</td><td>León</td> o <td>09:00</td><td>05</td>
        /<td[^>]*>(\d{2}:\d{2})<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi,
        // Patrón 2: <div class="hour">09:00</div><div class="animal">León</div>
        /<div[^>]*class="[^"]*hour[^"]*"[^>]*>(\d{2}:\d{2})<\/div>\s*<div[^>]*class="[^"]*animal[^"]*"[^>]*>([^<]+)<\/div>/gi,
        // Patrón 3: JSON embebido
        /resultados["\s]*:\s*\[([^\]]+)\]/gi
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const hour = match[1];
          const animalStr = match[2];
          
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
        
        if (draws.length > 0) break; // Si encontramos resultados, no seguir con otros patrones
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
      const isExpired = Date.now() - data.timestamp > this.CACHE_DURATION;
      
      if (isExpired && !allowExpired) return null;
      
      return {
        draws: data.draws,
        sources: data.sources.concat(isExpired ? [' (cached - expired)'] : [' (cached)'])
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