
import { GoogleGenAI, Type } from "@google/genai";
import { ANIMALS } from '../constants';
import { Prediction, DrawResult, Animal, LotteryId } from '../types';
import { PredictionEngine } from './lotteryService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_KEYS = {
  HISTORY: (id: LotteryId) => `history_${id}_v4`,
  LAST_FETCH: (id: LotteryId) => `last_fetch_${id}_v4`,
  PREDICTIONS: (id: LotteryId) => `predictions_${id}_v4`
};

export const LOTTERY_URLS: Record<LotteryId, string> = {
  GUACHARO: "https://www.loteriadehoy.com/animalito/guacharoactivo/resultados/",
  LOTTO_ACTIVO: "https://www.loteriadehoy.com/animalito/lottoactivo/resultados/"
};

/**
 * Normalización de animales experta. 
 */
const findAnimalByFlexibleInput = (input: string): Animal | null => {
  if (!input) return null;
  const str = input.toString().trim();
  
  const numMatch = str.match(/\b(00|[0-9]{1,2})\b/);
  if (numMatch) {
    const num = numMatch[0].padStart(2, '0').replace(/^0([0-9])$/, '0$1');
    const byNum = ANIMALS.find(a => a.number === num || a.id === num);
    if (byNum) return byNum;
  }

  const cleanInput = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
  if (cleanInput.length < 2) return null;

  return ANIMALS.find(a => {
    const cleanName = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
    return cleanName === cleanInput || cleanName.includes(cleanInput) || cleanInput.includes(cleanName);
  }) || null;
};

const safeParseJSON = (text: string, fallback: any) => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
    return JSON.parse(text);
  } catch (e) { return fallback; }
};

export const generatePrediction = async (lotteryId: LotteryId, history: any[] = []): Promise<Prediction[]> => {
  // Inicializamos el motor estadístico con el historial específico de la lotería seleccionada
  const engine = new PredictionEngine(history);
  const statsPredictions = engine.generatePredictions(8); // Obtenemos un pool más amplio para la IA

  const lotteryName = lotteryId === 'GUACHARO' ? 'Guácharo Activo' : 'Lotto Activo';
  
  // Análisis avanzado del historial
  const recentTrends = history.slice(0, 10).map(h => h.animalData?.name || h.animal).join(' → ');
  const hotAnimals = getHotAnimals(history);
  const coldAnimals = getColdAnimals(history);
  const currentHour = new Date().getHours();
  const timeContext = getTimeContext(currentHour);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SISTEMA EXPERTO EN ANÁLISIS DE LOTERÍAS VENEZOLANAS - ${lotteryName}

CONTEXTO TEMPORAL: ${timeContext}
HORA ACTUAL: ${currentHour}:00

HISTORIAL RECIENTE (Últimos 10 sorteos):
${recentTrends}

ANÁLISIS ESTADÍSTICO AVANZADO:
🔥 ANIMALES CALIENTES (3+ apariciones en 20 sorteos): ${hotAnimals.join(', ')}
😴 ANIMALES DORMIDOS (40+ sorteos sin salir): ${coldAnimals.join(', ')}

BASE ESTADÍSTICA COMPUTACIONAL:
${statsPredictions.map(p => `${p.animal.name} (#${p.animal.number}): ${p.probability}% - ${p.reasoning}`).join('\n')}

INSTRUCCIONES ESPECÍFICAS:
1. Analiza patrones cíclicos específicos de ${lotteryName}
2. Considera el factor temporal (hora del día)
3. Evalúa animales "dormidos" vs "calientes"
4. Aplica teoría de probabilidades bayesianas
5. Considera rachas y anti-rachas históricas

GENERA exactamente 5 predicciones optimizadas. El razonamiento debe ser técnico y específico.
Prioriza animales con múltiples señales convergentes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  animalId: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                  confidence: { type: Type.STRING, enum: ["SEGURA", "MODERADA", "ARRIESGADA"] },
                  reasoning: { type: Type.STRING }
                },
                required: ["animalId", "probability", "confidence", "reasoning"]
              }
            }
          }
        },
        temperature: 0.3, // Reducir temperatura para mayor consistencia
        topP: 0.8
      }
    });

    const data = safeParseJSON(response.text || "", { predictions: [] });
    const finalPredictions = (data.predictions || []).slice(0, 5).map((p: any) => ({
      animal: findAnimalByFlexibleInput(p.animalId) || statsPredictions[0].animal,
      probability: Math.min(Math.max(p.probability, 1), 25), // Limitar probabilidades realistas
      confidence: p.confidence as any,
      reasoning: p.reasoning
    }));

    // Si la IA falla o retorna menos de 5, usamos el motor estadístico local
    return finalPredictions.length >= 3 ? finalPredictions : statsPredictions.slice(0, 5);
  } catch (error) {
    console.error("Gemini Error:", error);
    return statsPredictions.slice(0, 5);
  }
};

// Funciones auxiliares para el análisis
function getHotAnimals(history: any[]): string[] {
  const recent = history.slice(0, 20);
  const counts: Record<string, number> = {};
  
  recent.forEach(h => {
    const name = h.animalData?.name || h.animal;
    if (name) counts[name] = (counts[name] || 0) + 1;
  });
  
  return Object.entries(counts)
    .filter(([_, count]) => count >= 3)
    .map(([name, _]) => name);
}

function getColdAnimals(history: any[]): string[] {
  const recentIds = new Set(history.slice(0, 40).map(h => h.animalData?.name || h.animal));
  const allAnimals = [...new Set(history.map(h => h.animalData?.name || h.animal))];
  
  return allAnimals.filter(name => name && !recentIds.has(name)).slice(0, 5);
}

function getTimeContext(hour: number): string {
  if (hour >= 9 && hour <= 11) return "MAÑANA - Patrones de apertura, tendencia a animales estables";
  if (hour >= 12 && hour <= 14) return "MEDIODÍA - Pico de actividad, mayor variabilidad";
  if (hour >= 15 && hour <= 17) return "TARDE - Patrones intermedios, equilibrio estadístico";
  if (hour >= 18 && hour <= 19) return "NOCHE - Cierre de jornada, tendencia a sorpresas";
  return "FUERA DE HORARIO - Análisis basado en patrones generales";
}

export const fetchRealResults = async (lotteryId: LotteryId): Promise<{ draws: Partial<DrawResult>[], sources: any[] }> => {
  try {
    const url = LOTTERY_URLS[lotteryId];
    const today = new Date().toLocaleDateString('es-ES');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Consulta el sitio ${url} y extrae los resultados de ${lotteryId} para hoy ${today}.
      NECESITO: Hora exacta y animal (nombre o número).
      RETORNA JSON: { "draws": [{ "hour": "HH:mm", "animal": "Nombre/Número" }] }`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const data = safeParseJSON(response.text || "", { draws: [] });
    return {
      draws: (data.draws || []).map((d: any) => ({
        hour: d.hour,
        animal: findAnimalByFlexibleInput(d.animal),
        isCompleted: true
      })).filter((d: any) => d.animal !== null),
      sources: [{ uri: url, title: `Sorteos Hoy - ${lotteryId}` }]
    };
  } catch (error) { return { draws: [], sources: [] }; }
};

export const fetchExtendedHistory = async (lotteryId: LotteryId): Promise<{ history: any[], sources: any[] }> => {
  const cacheKey = CACHE_KEYS.HISTORY(lotteryId);
  const fetchKey = CACHE_KEYS.LAST_FETCH(lotteryId);
  const cached = localStorage.getItem(cacheKey);
  const lastFetch = localStorage.getItem(fetchKey);

  if (cached && lastFetch && (Date.now() - parseInt(lastFetch)) < 900000) {
    return { history: JSON.parse(cached), sources: [] };
  }

  try {
    const url = LOTTERY_URLS[lotteryId];
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Accede a ${url} y extrae los últimos 200 resultados de la lotería ${lotteryId}.
      IMPORTANTE: Debes capturar los datos cronológicamente.
      JSON REQUERIDO: { "history": [{ "date": "YYYY-MM-DD", "hour": "HH:mm", "animal": "Nombre", "number": "Número" }] }`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const data = safeParseJSON(response.text || "", { history: [] });
    const history = (data.history || []).map((item: any) => ({
      ...item,
      animalData: findAnimalByFlexibleInput(item.animal || item.number)
    })).filter((h: any) => h.animalData);

    if (history.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(history));
      localStorage.setItem(fetchKey, Date.now().toString());
      return { history, sources: [{ uri: url, title: `Base de Datos ${lotteryId}` }] };
    }
    
    return { history: cached ? JSON.parse(cached) : generateFallbackHistory(lotteryId), sources: [] };
  } catch (error) { 
    return { history: cached ? JSON.parse(cached) : generateFallbackHistory(lotteryId), sources: [] }; 
  }
};

function generateFallbackHistory(id: LotteryId): any[] {
  const fallback: any[] = [];
  const hours = id === 'GUACHARO' 
    ? ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00']
    : ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    
  for (let i = 0; i < 20; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    hours.forEach(hour => {
      const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      fallback.push({ date: dateStr, hour, animal: animal.name, number: animal.number, animalData: animal });
    });
  }
  return fallback.slice(0, 200);
}
