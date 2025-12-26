import { LotteryId, DrawResult, Animal } from '../types';
import { ANIMALS } from '../constants';
import { CORS_PROXIES, RATE_LIMITS } from '../config/dataSourcesConfig';

export class LotoVenService {
  private static BASE_URL = 'https://lotoven.com/animalitos/';
  private static CACHE_KEY = 'lotoven_results_v1';
  private static CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

  /**
   * Obtiene los resultados desde LotoVen
   */
  static async getResults(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    console.log(`🔍 Fetching ${lotteryId} results from LotoVen...`);

    // Verificar cache primero
    const cached = this.getCachedResults(lotteryId);
    if (cached) {
      console.log(`📦 Using cached results for ${lotteryId}`);
      return cached;
    }

    // Intentar múltiples proxies CORS
    for (const proxy of CORS_PROXIES) {
      try {
        const result = await this.fetchWithProxy(proxy, lotteryId);
        if (result.draws.length > 0) {
          this.cacheResults(lotteryId, result);
          return result;
        }
      } catch (error) {
        console.warn(`❌ Proxy ${proxy} failed:`, error);
        continue;
      }
    }

    // Si todos los proxies fallan, intentar fetch directo (puede fallar por CORS)
    try {
      const result = await this.fetchDirect(lotteryId);
      if (result.draws.length > 0) {
        this.cacheResults(lotteryId, result);
        return result;
      }
    } catch (error) {
      console.warn('❌ Direct fetch failed:', error);
    }

    return { draws: [], sources: ['LotoVen - Failed'] };
  }

  /**
   * Fetch usando proxy CORS
   */
  private static async fetchWithProxy(proxy: string, lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    const proxyUrl = `${proxy}${encodeURIComponent(this.BASE_URL)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(RATE_LIMITS.TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let html: string;
    
    // Diferentes proxies retornan datos de forma diferente
    if (proxy.includes('allorigins')) {
      const data = await response.json();
      html = data.contents;
    } else {
      html = await response.text();
    }

    if (!html || html.length < 100) {
      throw new Error('Empty or invalid HTML response');
    }

    return this.parseHTML(html, lotteryId);
  }

  /**
   * Fetch directo (puede fallar por CORS)
   */
  private static async fetchDirect(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    const response = await fetch(this.BASE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(RATE_LIMITS.TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseHTML(html, lotteryId);
  }

  /**
   * Parser específico para el HTML de LotoVen
   */
  private static parseHTML(html: string, lotteryId: LotteryId): { draws: Partial<DrawResult>[], sources: string[] } {
    const draws: Partial<DrawResult>[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📄 Parsing HTML for ${lotteryId} (${html.length} chars)`);

    try {
      // Patrones específicos para LotoVen
      const patterns = [
        // Patrón 1: Tabla con resultados
        /<tr[^>]*>\s*<td[^>]*>([^<]*(?:Guácharo|Lotto)[^<]*)<\/td>\s*<td[^>]*>(\d{2}:\d{2})<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d{2})<\/td>/gi,
        
        // Patrón 2: Divs con clase resultado
        /<div[^>]*class="[^"]*resultado[^"]*"[^>]*>.*?(\d{2}:\d{2}).*?([A-Za-z]+).*?(\d{2}).*?<\/div>/gi,
        
        // Patrón 3: Estructura más simple
        /<td[^>]*>(\d{2}:\d{2})<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d{2})<\/td>/gi,
        
        // Patrón 4: JSON embebido
        /\{[^}]*"hora"[^}]*"(\d{2}:\d{2})"[^}]*"animal"[^}]*"([^"]+)"[^}]*\}/gi
      ];

      for (const pattern of patterns) {
        let match;
        let matchCount = 0;
        
        while ((match = pattern.exec(html)) !== null && matchCount < 20) {
          matchCount++;
          
          let hour: string;
          let animalStr: string;
          let lotteryType: string = '';

          // Determinar qué grupos corresponden a qué datos según el patrón
          if (match.length === 5) {
            // Patrón con tipo de lotería
            [, lotteryType, hour, animalStr] = match;
          } else if (match.length === 4) {
            // Patrón sin tipo de lotería
            [, hour, animalStr] = match;
          } else if (match.length === 3) {
            // Patrón simple
            [, hour, animalStr] = match;
          } else {
            continue;
          }

          // Filtrar por tipo de lotería si está disponible
          if (lotteryType) {
            const isGuacharo = lotteryType.toLowerCase().includes('guácharo') || lotteryType.toLowerCase().includes('guacharo');
            const isLotto = lotteryType.toLowerCase().includes('lotto');
            
            if (lotteryId === 'GUACHARO' && !isGuacharo) continue;
            if (lotteryId === 'LOTTO_ACTIVO' && !isLotto) continue;
          }

          // Validar y limpiar datos
          if (!hour || !animalStr) continue;
          
          hour = hour.trim();
          animalStr = animalStr.trim();

          // Validar formato de hora
          if (!/^\d{2}:\d{2}$/.test(hour)) continue;

          // Buscar el animal
          const animal = this.findAnimalByNameOrNumber(animalStr);
          if (!animal) {
            console.warn(`⚠️ Animal not found: "${animalStr}"`);
            continue;
          }

          // Verificar que no sea duplicado
          const isDuplicate = draws.some(d => d.hour === hour && d.animal?.id === animal.id);
          if (isDuplicate) continue;

          draws.push({
            hour,
            animal,
            isCompleted: true
          });

          console.log(`✅ Found result: ${hour} - ${animal.name} (#${animal.number})`);
        }

        // Si encontramos resultados con este patrón, no probar otros
        if (draws.length > 0) {
          console.log(`🎯 Pattern matched! Found ${draws.length} results`);
          break;
        }
      }

      // Ordenar por hora y eliminar duplicados
      const uniqueDraws = draws
        .filter((draw, index, self) => 
          index === self.findIndex(d => d.hour === draw.hour)
        )
        .sort((a, b) => (a.hour || '').localeCompare(b.hour || ''));

      console.log(`📊 Final results for ${lotteryId}: ${uniqueDraws.length} draws`);

      return {
        draws: uniqueDraws,
        sources: [`LotoVen (${uniqueDraws.length} results)`]
      };

    } catch (error) {
      console.error('❌ HTML parsing error:', error);
      return { draws: [], sources: ['LotoVen - Parse Error'] };
    }
  }

  /**
   * Buscar animal por nombre o número
   */
  private static findAnimalByNameOrNumber(input: string): Animal | null {
    if (!input) return null;
    
    const cleanInput = input.toString().trim().toLowerCase();
    
    // Buscar por número exacto
    const numberMatch = cleanInput.match(/\b(\d{1,2})\b/);
    if (numberMatch) {
      const num = numberMatch[1].padStart(2, '0');
      const byNumber = ANIMALS.find(a => a.number === num || a.id === num);
      if (byNumber) return byNumber;
    }

    // Buscar por nombre (con normalización)
    const normalizedInput = cleanInput
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/[^a-z]/g, ''); // Solo letras

    if (normalizedInput.length < 2) return null;

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
  private static getCachedResults(lotteryId: LotteryId): { draws: Partial<DrawResult>[], sources: string[] } | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY}_${lotteryId}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > this.CACHE_DURATION;
      
      if (isExpired) return null;
      
      return {
        draws: data.draws,
        sources: data.sources.map((s: string) => `${s} (cached)`)
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
}