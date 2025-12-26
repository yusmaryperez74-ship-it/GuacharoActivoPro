import { LotteryId } from '../types';

/**
 * Configuración de fuentes de datos para obtener resultados reales
 * 
 * IMPORTANTE: Estas URLs son ejemplos. Para producción necesitas:
 * 1. APIs oficiales de las loterías
 * 2. Servicios de scraping confiables
 * 3. APIs comunitarias verificadas
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
    // Fuente oficial (prioridad más alta)
    {
      name: 'Lotería de Hoy - API',
      url: 'https://api.loteriadehoy.com/v1/guacharo/today',
      type: 'api',
      priority: 1,
      isActive: false, // Cambiar a true cuando esté disponible
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GuacharoAI/2.0'
      }
    },
    
    // Fuentes de scraping
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
    },
    {
      name: 'Animalitos Venezuela',
      url: 'https://www.animalitosvenezuela.com/guacharo',
      type: 'scraping',
      priority: 4,
      isActive: true
    },
    
    // API comunitaria
    {
      name: 'Community API',
      url: 'https://api.animalitos-community.com/v1/results',
      type: 'community',
      priority: 5,
      isActive: false, // Activar cuando esté implementada
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ],

  LOTTO_ACTIVO: [
    // Fuente oficial
    {
      name: 'Lotería de Hoy - API',
      url: 'https://api.loteriadehoy.com/v1/lotto-activo/today',
      type: 'api',
      priority: 1,
      isActive: false,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GuacharoAI/2.0'
      }
    },
    
    // Fuentes de scraping
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
    },
    {
      name: 'Animalitos Venezuela',
      url: 'https://www.animalitosvenezuela.com/lotto-activo',
      type: 'scraping',
      priority: 4,
      isActive: true
    },
    
    // API comunitaria
    {
      name: 'Community API',
      url: 'https://api.animalitos-community.com/v1/results',
      type: 'community',
      priority: 5,
      isActive: false,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ]
};

/**
 * Configuración de proxies CORS para scraping
 */
export const CORS_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.codetabs.com/v1/proxy?quest='
];

/**
 * Patrones de HTML para extraer resultados
 */
export const HTML_PATTERNS = {
  // Patrones comunes para diferentes sitios
  LOTERIA_DE_HOY: [
    /<td[^>]*class="[^"]*hora[^"]*"[^>]*>(\d{2}:\d{2})<\/td>\s*<td[^>]*class="[^"]*animal[^"]*"[^>]*>([^<]+)<\/td>/gi,
    /<div[^>]*class="[^"]*resultado[^"]*"[^>]*>.*?(\d{2}:\d{2}).*?([A-Za-z]+|\d{1,2}).*?<\/div>/gi
  ],
  
  TRIPLE_CALIENTE: [
    /<span[^>]*class="[^"]*time[^"]*"[^>]*>(\d{2}:\d{2})<\/span>.*?<span[^>]*class="[^"]*animal[^"]*"[^>]*>([^<]+)<\/span>/gi
  ],
  
  ANIMALITOS_VENEZUELA: [
    /<tr[^>]*>.*?<td[^>]*>(\d{2}:\d{2})<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<\/tr>/gi
  ]
};

/**
 * Configuración de rate limiting
 */
export const RATE_LIMITS = {
  API_CALLS_PER_MINUTE: 10,
  SCRAPING_DELAY_MS: 2000,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 10000
};

/**
 * Configuración de cache
 */
export const CACHE_CONFIG = {
  REAL_RESULTS_TTL: 5 * 60 * 1000, // 5 minutos
  HISTORY_TTL: 15 * 60 * 1000,     // 15 minutos
  COMMUNITY_DATA_TTL: 2 * 60 * 1000 // 2 minutos
};