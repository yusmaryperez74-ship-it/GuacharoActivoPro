/**
 * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
 * 
 * Configuración centralizada para controlar el comportamiento de la app.
 * IMPORTANTE: Esta app usa SOLO datos reales de LotoVen.
 */

export const APP_CONFIG = {
  // Configuración de datos
  DATA_SOURCE: {
    ONLY_REAL_DATA: true,           // Solo usar datos reales
    DISABLE_SIMULATIONS: true,      // Deshabilitar completamente simulaciones
    DISABLE_AI_GENERATION: true,    // Deshabilitar generación de IA
    PRIMARY_SOURCE: 'LotoVen',      // Fuente principal de datos
    FALLBACK_ENABLED: false         // Sin fallbacks a datos simulados
  },
  
  // Configuración de cache
  CACHE: {
    PERSISTENT_HISTORY: true,       // Historial persistente
    TODAY_RESULTS_TTL: 2 * 60 * 1000,  // 2 minutos para resultados del día
    PREDICTION_TTL: 5 * 60 * 1000,     // 5 minutos para predicciones
    CLEAR_ON_ERROR: false           // No limpiar cache en errores
  },
  
  // Configuración de análisis
  ANALYSIS: {
    STATISTICAL_ONLY: true,         // Solo análisis estadístico
    MIN_HISTORY_REQUIRED: 10,      // Mínimo 10 resultados para análisis
    CONFIDENCE_LEVELS: ['alta', 'media', 'baja'],
    WEIGHTS: {
      RECENT_FREQUENCY: 0.5,        // 50% peso a frecuencia reciente
      TOTAL_FREQUENCY: 0.3,         // 30% peso a frecuencia total
      DAYS_SINCE_LAST: 0.2          // 20% peso a días sin salir
    }
  },
  
  // Configuración de UI
  UI: {
    SHOW_DATA_SOURCE: true,         // Mostrar fuente de datos
    SHOW_DISCLAIMERS: true,         // Mostrar avisos legales
    SHOW_REAL_COUNT: true,          // Mostrar contador de datos reales
    HIDE_SIMULATION_FEATURES: true // Ocultar características de simulación
  },
  
  // Configuración de debugging
  DEBUG: {
    ENABLE_LOTOVEN_DEBUG: true,     // Habilitar debug de LotoVen
    LOG_DATA_SOURCES: true,         // Log de fuentes de datos
    LOG_CACHE_OPERATIONS: true,     // Log de operaciones de cache
    VERBOSE_ANALYSIS: true          // Log detallado de análisis
  },
  
  // Disclaimers obligatorios
  DISCLAIMERS: {
    MAIN: "Esta aplicación muestra análisis estadístico basado en resultados históricos reales. NO garantiza premios ni resultados futuros. La lotería es un proceso aleatorio.",
    DATA_SOURCE: "Todos los datos provienen de fuentes reales verificadas. No se utilizan simulaciones ni datos ficticios.",
    ANALYSIS: "El análisis estadístico se basa en frecuencias históricas y tendencias. Los resultados pasados no garantizan resultados futuros."
  }
} as const;

/**
 * Verificar si las simulaciones están deshabilitadas
 */
export function areSimulationsDisabled(): boolean {
  return APP_CONFIG.DATA_SOURCE.DISABLE_SIMULATIONS;
}

/**
 * Verificar si solo se deben usar datos reales
 */
export function isRealDataOnly(): boolean {
  return APP_CONFIG.DATA_SOURCE.ONLY_REAL_DATA;
}

/**
 * Obtener configuración de pesos para análisis estadístico
 */
export function getAnalysisWeights() {
  return APP_CONFIG.ANALYSIS.WEIGHTS;
}

/**
 * Obtener disclaimers obligatorios
 */
export function getDisclaimers() {
  return APP_CONFIG.DISCLAIMERS;
}