import { LotteryId } from '../types';

/**
 * Configuración de fuentes de datos para obtener resultados reales
 * Fuente principal: https://lotoven.com/animalitos/
 */

export interface DataSource {
  name: string;
  url: string;
  type: 'api' | 'scraping' | 'community';
  priority: number; // 1 = más alta prioridad
  isActive: boolean;
  requiresAuth?: boolean;
  headers?: Record<string, string>;
}

export const DATA_SOURCES: Record<LotteryId, DataSource[]> = {
  GUACHARO: [
    // Fuente principal - LotoVen
    {
      name: 'LotoVen - Guácharo Activo',
      url: 'https://lotoven.com/animalitos/',
      type: 'scraping',
      priority: 1,
      isActive: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    },
    
    // Fuentes de respaldo
    {
      name: 'Lotería de Hoy - Web',
      url: 'https://www.loteriadehoy.com/animalito/guacharoactivo/resultados/',
      type: 'scraping',
      priority: 2,
      isActive: true
    },
    {
      name: 'Triple Caliente',
      url: 'https://www.triplecaliente.com/guacharo-activo',
      type: 'scraping',
      priority: 3,
      isActive: true
    }
  ],

  LOTTO_ACTIVO: [
    // Fuente principal - LotoVen
    {
      name: 'LotoVen - Lotto Activo',
      url: 'https://lotoven.com/animalitos/',
      type: 'scraping',
      priority: 1,
      isActive: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    },
    
    // Fuentes de respaldo
    {
      name: 'Lotería de Hoy - Web',
      url: 'https://www.loteriadehoy.com/animalito/lottoactivo/resultados/',
      type: 'scraping',
      priority: 2,
      isActive: true
    },
    {
      name: 'Triple Caliente',
      url: 'https://www.triplecaliente.com/lotto-activo',
      type: 'scraping',
      priority: 3,
      isActive: true
    }
  ]
};

/**
 * Configuración de proxies CORS para scraping
 */
export const CORS_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/'
];

/**
 * Patrones de HTML específicos para LotoVen y otros sitios
 */
export const HTML_PATTERNS = {
  // Patrones específicos para LotoVen
  LOTOVEN: [
    // Patrón para tabla de resultados de LotoVen
    /<tr[^>]*>\s*<td[^>]*>([^<]*(?:Guácharo|Lotto)[^<]*)<\/td>\s*<td[^>]*>(\d{2}:\d{2})<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d{2})<\/td>/gi,
    // Patrón alternativo para divs
    /<div[^>]*class="[^"]*resultado[^"]*"[^>]*>.*?(\d{2}:\d{2}).*?([A-Za-z]+).*?(\d{2}).*?<\/div>/gi,
    // Patrón para JSON embebido
    /resultados["\s]*:\s*\[([^\]]+)\]/gi
  ],
  
  // Patrones para otros sitios (respaldo)
  LOTERIA_DE_HOY: [
    /<td[^>]*class="[^"]*hora[^"]*"[^>]*>(\d{2}:\d{2})<\/td>\s*<td[^>]*class="[^"]*animal[^"]*"[^>]*>([^<]+)<\/td>/gi,
    /<div[^>]*class="[^"]*resultado[^"]*"[^>]*>.*?(\d{2}:\d{2}).*?([A-Za-z]+|\d{1,2}).*?<\/div>/gi
  ],
  
  TRIPLE_CALIENTE: [
    /<span[^>]*class="[^"]*time[^"]*"[^>]*>(\d{2}:\d{2})<\/span>.*?<span[^>]*class="[^"]*animal[^"]*"[^>]*>([^<]+)<\/span>/gi
  ]
};

/**
 * Configuración de rate limiting
 */
export const RATE_LIMITS = {
  API_CALLS_PER_MINUTE: 10,
  SCRAPING_DELAY_MS: 3000, // 3 segundos para ser más respetuosos
  MAX_RETRIES: 3,
  TIMEOUT_MS: 15000 // 15 segundos timeout
};

/**
 * Configuración de cache
 */
export const CACHE_CONFIG = {
  REAL_RESULTS_TTL: 3 * 60 * 1000, // 3 minutos (más frecuente)
  HISTORY_TTL: 10 * 60 * 1000,     // 10 minutos
  COMMUNITY_DATA_TTL: 2 * 60 * 1000 // 2 minutos
};