
import { GoogleGenAI, Type } from "@google/genai";
import { ANIMALS } from '../constants';
import { Prediction, DrawResult } from '../types';
import { PredictionEngine } from './lotteryService';

// Inicialización siguiendo estrictamente las guías del SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_KEYS = {
  HISTORY: 'guacharo_history_v4',
  LAST_FETCH: 'guacharo_last_fetch_v4',
  PREDICTIONS: 'guacharo_predictions_v4'
};

/**
 * Servicio de Predicción optimizado para retornar el TOP 5 de animales.
 */
export const generatePrediction = async (history: any[] = []): Promise<Prediction[]> => {
  const cached = localStorage.getItem(CACHE_KEYS.PREDICTIONS);
  if (cached && history.length > 0) {
    const parsed = JSON.parse(cached);
    if (parsed.historyLength === history.length && parsed.data.length === 5) return parsed.data;
  }

  // Motor Estadístico Local solicita el top 5 inicialmente
  const engine = new PredictionEngine(history);
  const statsPredictions = engine.generatePredictions(5);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SISTEMA ANALÍTICO GUÁCHARO AI. 
                DATOS LOCALES (TOP 5): ${statsPredictions.map(p => `${p.animal.name} (${p.probability}%)`).join(', ')}.
                HISTORIAL RECIENTE: ${history.slice(0, 5).map(h => h.animalData?.name || h.animal).join(' -> ')}.
                TAREA: Valida y refina estos 5 resultados basándote en patrones de recurrencia y probabilidad.`,
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
                  animalId: { type: Type.STRING, description: "ID o número del animal" },
                  probability: { type: Type.NUMBER, description: "Probabilidad porcentual (0-100)" },
                  confidence: { type: Type.STRING, enum: ["SEGURA", "MODERADA", "ARRIESGADA"] },
                  reasoning: { type: Type.STRING, description: "Breve explicación técnica" }
                },
                required: ["animalId", "probability", "confidence", "reasoning"]
              }
            }
          }
        },
        temperature: 0.2,
      }
    });

    const data = JSON.parse(response.text || "{\"predictions\":[]}");
    
    // Procesamos el TOP 5 completo retornado por la IA
    const finalData = (data.predictions || []).slice(0, 5).map((p: any) => ({
      animal: ANIMALS.find(a => a.id === p.animalId || a.number === p.animalId) || ANIMALS[0],
      probability: p.probability,
      confidence: p.confidence as any,
      reasoning: p.reasoning
    }));

    // Si la IA falla o devuelve menos de 5, completamos con el motor estadístico
    if (finalData.length < 5) {
      const missingCount = 5 - finalData.length;
      const existingIds = new Set(finalData.map((f: any) => f.animal.id));
      const extra = statsPredictions
        .filter(sp => !existingIds.has(sp.animal.id))
        .slice(0, missingCount);
      finalData.push(...extra);
    }

    localStorage.setItem(CACHE_KEYS.PREDICTIONS, JSON.stringify({
      data: finalData,
      historyLength: history.length,
      timestamp: Date.now()
    }));

    return finalData;
  } catch (error) {
    console.error("Error en refinamiento AI, usando top 5 estadístico:", error);
    return statsPredictions.slice(0, 5);
  }
};

export const fetchRealResults = async (): Promise<{ draws: Partial<DrawResult>[], sources: {uri: string, title: string}[] }> => {
  try {
    const today = new Date().toLocaleDateString('es-ES');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Resultados OFICIALES de 'Guacharo Activo' hoy ${today}. JSON con 'hour', 'animalName' y 'number'.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      uri: c.web?.uri,
      title: c.web?.title
    })).filter((s: any) => s && s.uri) || [];

    const data = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{\"draws\":[]}");
    
    const formattedDraws = (data.draws || []).map((d: any) => ({
      hour: d.hour,
      animal: ANIMALS.find(a => a.name.toLowerCase() === d.animalName?.toLowerCase() || a.number === d.number?.toString().padStart(2, '0')) || null,
      isCompleted: true
    }));

    return { draws: formattedDraws, sources };
  } catch (error) {
    console.error("Error al obtener resultados reales:", error);
    return { draws: [], sources: [] };
  }
};

export const fetchExtendedHistory = async (): Promise<{ history: any[], sources: any[] }> => {
  const cachedHistory = localStorage.getItem(CACHE_KEYS.HISTORY);
  if (cachedHistory) {
    const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
    if (lastFetch && (Date.now() - parseInt(lastFetch)) < 1800000) {
      return { history: JSON.parse(cachedHistory), sources: [] };
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Últimos 60 sorteos de 'Guacharo Activo'. JSON: { "history": [{ "date": "YYYY-MM-DD", "hour": "HH:mm", "animal": "string", "number": "string" }] }`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      uri: c.web?.uri,
      title: c.web?.title
    })).filter((s: any) => s && s.uri) || [];

    const data = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{\"history\":[]}");
    
    const history = (data.history || []).map((item: any) => ({
      ...item,
      animalData: ANIMALS.find(a => a.name.toLowerCase() === item.animal?.toLowerCase() || a.number === item.number?.toString().padStart(2, '0'))
    }));

    localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(history));
    localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
    
    return { history, sources };
  } catch (error) {
    return { history: JSON.parse(cachedHistory || "[]"), sources: [] };
  }
};
