import { LotteryId, DrawResult, Animal } from '../types';
import { ANIMALS } from '../constants';
import { CORS_PROXIES, RATE_LIMITS } from '../config/dataSourcesConfig';

export class LotoVenService {
  private static BASE_URL = 'https://lotoven.com/animalitos/';
  private static CACHE_KEY = 'lotoven_results_v2';
  private static CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

  /**
   * Obtiene los resultados desde LotoVen con mejor debugging
   */
  static async getResults(lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    console.log(`🔍 [LotoVen] Starting fetch for ${lotteryId}...`);

    // Verificar cache primero
    const cached = this.getCachedResults(lotteryId);
    if (cached) {
      console.log(`📦 [LotoVen] Using cached results for ${lotteryId}: ${cached.draws.length} draws`);
      return cached;
    }

    const errors: string[] = [];
    let bestResult: { draws: Partial<DrawResult>[], sources: string[] } = { 
      draws: [], 
      sources: ['LotoVen - No results'] 
    };

    // Intentar múltiples proxies CORS
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxy = CORS_PROXIES[i];
      
      try {
        console.log(`🌐 [LotoVen] Trying proxy ${i + 1}/${CORS_PROXIES.length}: ${proxy}`);
        
        const result = await this.fetchWithProxy(proxy, lotteryId);
        
        if (result.draws.length > 0) {
          console.log(`✅ [LotoVen] SUCCESS with proxy ${i + 1}: ${result.draws.length} results`);
          this.cacheResults(lotteryId, result);
          return result;
        } else {
          console.warn(`⚠️ [LotoVen] Proxy ${i + 1} returned no results`);
          if (result.draws.length > bestResult.draws.length) {
            bestResult = result;
          }
        }
        
      } catch (error: any) {
        const errorMsg = `Proxy ${i + 1} (${proxy}): ${error?.message || 'Unknown error'}`;
        errors.push(errorMsg);
        console.warn(`❌ [LotoVen] ${errorMsg}`);
        continue;
      }
    }

    // Si todos los proxies fallan, intentar fetch directo (puede fallar por CORS)
    try {
      console.log(`🌐 [LotoVen] Trying direct fetch as last resort...`);
      const result = await this.fetchDirect(lotteryId);
      
      if (result.draws.length > 0) {
        console.log(`✅ [LotoVen] Direct fetch SUCCESS: ${result.draws.length} results`);
        this.cacheResults(lotteryId, result);
        return result;
      } else {
        console.warn(`⚠️ [LotoVen] Direct fetch returned no results`);
      }
      
    } catch (error: any) {
      const errorMsg = `Direct fetch: ${error?.message || 'Unknown error'}`;
      errors.push(errorMsg);
      console.warn(`❌ [LotoVen] ${errorMsg}`);
    }

    // Log resumen de errores
    console.error(`❌ [LotoVen] All methods failed for ${lotteryId}:`);
    errors.forEach((error, i) => console.error(`   ${i + 1}. ${error}`));

    return {
      draws: bestResult.draws,
      sources: [`LotoVen - Failed (${errors.length} attempts)`]
    };
  }

  /**
   * Fetch usando proxy CORS con retry mejorado
   */
  private static async fetchWithProxy(proxy: string, lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: string[] }> {
    const proxyUrl = `${proxy}${encodeURIComponent(this.BASE_URL)}`;
    
    console.log(`🌐 Trying proxy: ${proxy}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RATE_LIMITS.TIMEOUT_MS);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let html: string;
      
      // Diferentes proxies retornan datos de forma diferente
      if (proxy.includes('allorigins')) {
        const data = await response.json();
        html = data.contents;
        
        if (!html) {
          throw new Error('AllOrigins returned empty contents');
        }
      } else if (proxy.includes('codetabs')) {
        html = await response.text();
      } else {
        html = await response.text();
      }

      if (!html || html.length < 100) {
        throw new Error(`Invalid HTML response: ${html?.length || 0} chars`);
      }

      // Verificar si el HTML contiene contenido relevante
      const hasRelevantContent = html.toLowerCase().includes('animalito') || 
                                html.toLowerCase().includes('resultado') ||
                                html.toLowerCase().includes('sorteo') ||
                                html.toLowerCase().includes('guacharo') ||
                                html.toLowerCase().includes('lotto');

      if (!hasRelevantContent) {
        console.warn(`⚠️ HTML doesn't seem to contain lottery results`);
      }

      console.log(`✅ Proxy ${proxy} returned ${html.length} chars`);
      return this.parseHTML(html, lotteryId);

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error?.name === 'AbortError') {
        throw new Error(`Proxy timeout after ${RATE_LIMITS.TIMEOUT_MS}ms`);
      }
      
      throw new Error(`Proxy failed: ${error?.message || 'Unknown error'}`);
    }
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
   * Parser específico para el HTML de LotoVen - ACTUALIZADO con estructura real
   */
  private static parseHTML(html: string, lotteryId: LotteryId): { draws: Partial<DrawResult>[], sources: string[] } {
    const draws: Partial<DrawResult>[] = [];
    
    console.log(`📄 Parsing HTML for ${lotteryId} (${html.length} chars)`);

    try {
      // Primero, extraer la sección específica de la lotería
      let sectionHtml = html;
      
      if (lotteryId === 'GUACHARO') {
        const guacharoMatch = html.match(/<h3[^>]*>Resultados Guacharo Activo<\/h3>([\s\S]*?)(?=<h3|$)/i);
        if (guacharoMatch) {
          sectionHtml = guacharoMatch[1];
          console.log(`🎯 Extracted Guácharo section: ${sectionHtml.length} chars`);
        }
      } else if (lotteryId === 'LOTTO_ACTIVO') {
        const lottoMatch = html.match(/<h3[^>]*>Resultados Lotto Activo<\/h3>([\s\S]*?)(?=<h3|$)/i);
        if (lottoMatch) {
          sectionHtml = lottoMatch[1];
          console.log(`🎯 Extracted Lotto Activo section: ${sectionHtml.length} chars`);
        }
      }

      // Patrón específico para LotoVen basado en la estructura real
      const pattern = /<span class="info[^"]*">([^<]+)<\/span>[\s\S]*?<span class="info2 horario"[^>]*>(\d{1,2}:\d{2}\s*(?:AM|PM))<\/span>/gi;

      let match;
      let matchCount = 0;
      
      while ((match = pattern.exec(sectionHtml)) !== null && matchCount < 30) {
        matchCount++;
        
        const animalInfo = match[1].trim();
        const timeInfo = match[2].trim();
        
        console.log(`🔍 Raw match: "${animalInfo}" at "${timeInfo}"`);
        
        // Convertir hora de 12h a 24h
        let hour = timeInfo.replace(/\s*(AM|PM)/i, '');
        const isPM = /PM/i.test(timeInfo);
        
        let [h, m] = hour.split(':').map(Number);
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        
        const normalizedHour = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        // Buscar el animal
        const animal = this.findAnimalByNameOrNumber(animalInfo);
        if (!animal) {
          console.warn(`⚠️ Animal not found: "${animalInfo}"`);
          continue;
        }

        // Verificar que no sea duplicado
        const isDuplicate = draws.some(d => d.hour === normalizedHour && d.animal?.id === animal.id);
        if (isDuplicate) {
          console.log(`🔄 Duplicate found: ${normalizedHour} - ${animal.name}`);
          continue;
        }

        draws.push({
          hour: normalizedHour,
          animal,
          isCompleted: true
        });

        console.log(`✅ Found result: ${normalizedHour} - ${animal.name} (#${animal.number})`);
      }

      // Si no encontramos resultados con el patrón específico, intentar análisis más amplio
      if (draws.length === 0) {
        console.log(`🔍 No results with specific pattern, trying broader search...`);
        const broadResults = this.aggressiveHTMLParse(sectionHtml, lotteryId);
        draws.push(...broadResults);
      }

      // Ordenar por hora y eliminar duplicados finales
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

    } catch (error: any) {
      console.error('❌ HTML parsing error:', error?.message || 'Unknown error');
      return { draws: [], sources: ['LotoVen - Parse Error'] };
    }
  }

  /**
   * Análisis agresivo del HTML cuando los patrones normales fallan
   */
  private static aggressiveHTMLParse(html: string, lotteryId: LotteryId): Partial<DrawResult>[] {
    const draws: Partial<DrawResult>[] = [];
    
    try {
      // Buscar todas las horas en el HTML
      const hourMatches = html.match(/\b(\d{1,2}:\d{2})\b/g) || [];
      
      // Buscar todos los nombres de animales
      const animalNames = ANIMALS.map(a => a.name.toLowerCase());
      const animalMatches: { name: string, position: number, animal: Animal }[] = [];
      
      animalNames.forEach(name => {
        const regex = new RegExp(`\\b${name}\\b`, 'gi');
        let match;
        while ((match = regex.exec(html)) !== null) {
          const animal = ANIMALS.find(a => a.name.toLowerCase() === name);
          if (animal) {
            animalMatches.push({
              name,
              position: match.index,
              animal
            });
          }
        }
      });

      // Buscar números de animales
      const numberMatches: { number: string, position: number, animal: Animal }[] = [];
      ANIMALS.forEach(animal => {
        const regex = new RegExp(`\\b${animal.number}\\b`, 'g');
        let match;
        while ((match = regex.exec(html)) !== null) {
          numberMatches.push({
            number: animal.number,
            position: match.index,
            animal
          });
        }
      });

      // Intentar correlacionar horas con animales por proximidad
      hourMatches.forEach(hourStr => {
        const hourRegex = new RegExp(`\\b${hourStr.replace(':', '\\:')}\\b`);
        const hourMatch = hourRegex.exec(html);
        if (!hourMatch) return;

        const hourPosition = hourMatch.index;
        
        // Buscar el animal más cercano (dentro de 200 caracteres)
        let closestAnimal: Animal | null = null;
        let closestDistance = Infinity;

        [...animalMatches, ...numberMatches].forEach(({ position, animal }) => {
          const distance = Math.abs(position - hourPosition);
          if (distance < 200 && distance < closestDistance) {
            closestDistance = distance;
            closestAnimal = animal;
          }
        });

        if (closestAnimal) {
          const [h, m] = hourStr.split(':');
          const normalizedHour = `${h.padStart(2, '0')}:${m}`;
          
          // Verificar que no sea duplicado
          const isDuplicate = draws.some(d => d.hour === normalizedHour);
          if (!isDuplicate) {
            draws.push({
              hour: normalizedHour,
              animal: closestAnimal,
              isCompleted: true
            });
            console.log(`🎯 Aggressive match: ${normalizedHour} - ${(closestAnimal as Animal).name} (distance: ${closestDistance})`);
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Aggressive parsing error:', error?.message || 'Unknown error');
    }

    return draws;
  }

  /**
   * Buscar animal por nombre o número con matching mejorado
   */
  private static findAnimalByNameOrNumber(input: string): Animal | null {
    if (!input) return null;
    
    const cleanInput = input.toString().trim();
    if (cleanInput.length === 0) return null;
    
    console.log(`🔍 Searching animal for: "${cleanInput}"`);
    
    // 1. Buscar por número exacto primero
    const numberMatch = cleanInput.match(/\b(\d{1,2})\b/);
    if (numberMatch) {
      const num = numberMatch[1].padStart(2, '0');
      const byNumber = ANIMALS.find(a => a.number === num || a.id === num);
      if (byNumber) {
        console.log(`✅ Found by number: ${byNumber.name} (#${byNumber.number})`);
        return byNumber;
      }
    }

    // 2. Buscar por nombre exacto (sin normalizar)
    const exactMatch = ANIMALS.find(a => 
      a.name.toLowerCase() === cleanInput.toLowerCase()
    );
    if (exactMatch) {
      console.log(`✅ Found by exact name: ${exactMatch.name}`);
      return exactMatch;
    }

    // 3. Buscar por nombre normalizado (sin acentos)
    const normalizedInput = cleanInput
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/[^a-z]/g, ''); // Solo letras

    if (normalizedInput.length < 2) return null;

    // Buscar coincidencia exacta normalizada
    const normalizedExact = ANIMALS.find(a => {
      const normalizedName = a.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, '');
      
      return normalizedName === normalizedInput;
    });
    
    if (normalizedExact) {
      console.log(`✅ Found by normalized exact: ${normalizedExact.name}`);
      return normalizedExact;
    }

    // 4. Buscar por coincidencia parcial (contiene)
    const partialMatch = ANIMALS.find(a => {
      const normalizedName = a.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, '');
      
      return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
    });

    if (partialMatch) {
      console.log(`✅ Found by partial match: ${partialMatch.name}`);
      return partialMatch;
    }

    // 5. Buscar por similitud (Levenshtein distance)
    let bestMatch: Animal | null = null;
    let bestScore = Infinity;
    
    ANIMALS.forEach(animal => {
      const normalizedName = animal.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, '');
      
      const distance = this.levenshteinDistance(normalizedInput, normalizedName);
      const maxLength = Math.max(normalizedInput.length, normalizedName.length);
      const similarity = 1 - (distance / maxLength);
      
      // Si la similitud es mayor al 70% y es la mejor hasta ahora
      if (similarity > 0.7 && distance < bestScore) {
        bestScore = distance;
        bestMatch = animal;
      }
    });

    if (bestMatch) {
      console.log(`✅ Found by similarity: ${(bestMatch as Animal).name} (score: ${(1 - bestScore / Math.max(normalizedInput.length, (bestMatch as Animal).name.length)).toFixed(2)})`);
      return bestMatch;
    }

    console.warn(`❌ No animal found for: "${cleanInput}"`);
    return null;
  }

  /**
   * Calcular distancia de Levenshtein para similitud de strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
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