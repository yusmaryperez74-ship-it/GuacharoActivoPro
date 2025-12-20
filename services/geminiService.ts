
import { GoogleGenAI, Type } from "@google/genai";
import { ANIMALS } from '../constants';
import { Prediction, DrawResult } from '../types';
import { PredictionEngine } from './lotteryService';

// Inicialización con named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_KEYS = {
  HISTORY: 'guacharo_history_v4',
  LAST_FETCH: 'guacharo_last_fetch_v4',
  PREDICTIONS: 'guacharo_predictions_v4'
};

/**
 * Utilidad para limpiar y parsear JSON de forma robusta
 */
const safeParseJSON = (text: string, fallback: any) => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    console.warn("Error parseando JSON, usando fallback:", e);
    return fallback;
  }
};

/**
 * Genera el TOP 5 de animales con mayor probabilidad
 */
export const generatePrediction = async (history: any[] = []): Promise<Prediction[]> => {
  const cached = localStorage.getItem(CACHE_KEYS.PREDICTIONS);
  if (cached && history.length > 0) {
    const parsed = JSON.parse(cached);
    if (parsed.historyLength === history.length && parsed.data.length === 5) return parsed.data;
  }

  const engine = new PredictionEngine(history);
  const statsPredictions = engine.generatePredictions(5);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SISTEMA ANALÍTICO GUÁCHARO AI. 
                DATOS ESTADÍSTICOS: ${statsPredictions.map(p => `${p.animal.name} (${p.probability}%)`).join(', ')}.
                HISTORIAL: ${history.slice(0, 5).map(h => h.animalData?.name || h.animal).join(' -> ')}.
                TAREA: Valida estos 5 resultados y provee razonamiento técnico.`,
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
        temperature: 0.1,
      }
    });

    const data = safeParseJSON(response.text || "", { predictions: [] });
    
    const finalData = (data.predictions || []).slice(0, 5).map((p: any) => ({
      animal: ANIMALS.find(a => a.id === p.animalId || a.number === p.animalId) || ANIMALS[0],
      probability: p.probability,
      confidence: p.confidence as any,
      reasoning: p.reasoning
    }));

    if (finalData.length < 5) {
      const existingIds = new Set(finalData.map((f: any) => f.animal.id));
      const extra = statsPredictions.filter(sp => !existingIds.has(sp.animal.id)).slice(0, 5 - finalData.length);
      finalData.push(...extra);
    }

    localStorage.setItem(CACHE_KEYS.PREDICTIONS, JSON.stringify({
      data: finalData,
      historyLength: history.length,
      timestamp: Date.now()
    }));

    return finalData;
  } catch (error) {
    return statsPredictions.slice(0, 5);
  }
};

/**
 * Obtiene resultados del día de hoy utilizando una ÚNICA fuente oficial para mayor velocidad.
 */
export const fetchRealResults = async (): Promise<{ draws: Partial<DrawResult>[], sources: {uri: string, title: string}[] }> => {
  try {
    const today = new Date().toLocaleDateString('es-ES');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `ACCESO RÁPIDO: Identifica la página OFICIAL de la lotería "Guácharo Activo" (o su Instagram oficial) y extrae únicamente los resultados de HOY ${today}. 
      REGLA: Usa solo UNA fuente (la más autoritativa). 
      RETORNA JSON: { "draws": [{ "hour": "HH:mm", "animalName": "Nombre", "number": "00" }] }.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      uri: c.web?.uri,
      title: c.web?.title
    })).filter((s: any) => s && s.uri).slice(0, 1) || []; // Solo mostramos la fuente principal

    const data = safeParseJSON(response.text || "", { draws: [] });
    
    const formattedDraws = (data.draws || []).map((d: any) => ({
      hour: d.hour,
      animal: ANIMALS.find(a => a.name.toLowerCase() === (d.animalName || "").toLowerCase() || a.number === d.number?.toString().padStart(2, '0')) || null,
      isCompleted: true
    }));

    return { draws: formattedDraws, sources };
  } catch (error) {
    console.error("Error en fetchRealResults:", error);
    return { draws: [], sources: [] };
  }
};

/**
 * Obtiene historial extendido utilizando la fuente más completa disponible para minimizar latencia.
 */
export const fetchExtendedHistory = async (): Promise<{ history: any[], sources: any[] }> => {
  const cachedHistory = localStorage.getItem(CACHE_KEYS.HISTORY);
  const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
  
  if (cachedHistory && lastFetch && (Date.now() - parseInt(lastFetch)) < 1800000) {
    return { history: JSON.parse(cachedHistory), sources: [] };
  }

  try {
    // Usamos gemini-3-flash-preview aquí también para máxima velocidad a petición del usuario
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `HISTORIAL RÁPIDO: Localiza el archivo oficial o la fuente más completa de resultados de "Guácharo Activo". 
      Extrae los últimos 60 sorteos de UNA SOLA página confiable.
      RETORNA JSON: { "history": [{ "date": "YYYY-MM-DD", "hour": "HH:mm", "animal": "Nombre", "number": "00" }] }.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      uri: c.web?.uri,
      title: c.web?.title
    })).filter((s: any) => s && s.uri).slice(0, 1) || [];

    const data = safeParseJSON(response.text || "", { history: [] });
    
    let history = (data.history || []).map((item: any) => ({
      ...item,
      animalData: ANIMALS.find(a => a.name.toLowerCase() === (item.animal || "").toLowerCase() || a.number === item.number?.toString().padStart(2, '0'))
    })).filter((h: any) => h.animalData);

    if (history.length < 5) {
      console.warn("Datos insuficientes, usando fallback");
      history = generateFallbackHistory();
    }

    localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(history));
    localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
    
    return { history, sources };
  } catch (error) {
    console.error("Error en fetchExtendedHistory:", error);
    return { history: cachedHistory ? JSON.parse(cachedHistory) : generateFallbackHistory(), sources: [] };
  }
};

/**
 * Generador de historial de respaldo
 */
function generateFallbackHistory() {
  const fallback = [];
  const today = new Date();
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    hours.forEach(hour => {
      const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      fallback.push({
        date: dateStr,
        hour: hour,
        animal: animal.name,
        number: animal.number,
        animalData: animal
      });
    });
  }
  return fallback.slice(0, 60);
}
