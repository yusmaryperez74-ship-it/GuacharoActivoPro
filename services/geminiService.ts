
import { GoogleGenAI, Type } from "@google/genai";
import { ANIMALS } from '../constants';
import { Prediction, DrawResult, Animal } from '../types';
import { PredictionEngine } from './lotteryService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_KEYS = {
  HISTORY: 'guacharo_history_v4',
  LAST_FETCH: 'guacharo_last_fetch_v4',
  PREDICTIONS: 'guacharo_predictions_v4'
};

// Exporting TARGET_URL to fix reference errors in components/History.tsx
export const TARGET_URL = "https://www.loteriadehoy.com/animalito/guacharoactivo/resultados/";

/**
 * Normaliza nombres de animales para un mapeo robusto.
 */
const findAnimalByFlexibleInput = (input: string): Animal | null => {
  if (!input) return null;
  const str = input.toString().trim();
  
  // Extraer solo números (ej: "36-Culebra" -> "36")
  const numMatch = str.match(/\d+/);
  const extractedNum = numMatch ? numMatch[0].padStart(2, '0') : null;
  
  if (extractedNum) {
    const byNum = ANIMALS.find(a => a.number === extractedNum);
    if (byNum) return byNum;
  }

  // Búsqueda por nombre
  const cleanInput = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
  const byName = ANIMALS.find(a => {
    const cleanName = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
    return cleanName === cleanInput || cleanName.includes(cleanInput) || cleanInput.includes(cleanName);
  });
  
  return byName || null;
};

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
    return fallback;
  }
};

export const generatePrediction = async (history: any[] = []): Promise<Prediction[]> => {
  const engine = new PredictionEngine(history);
  const statsPredictions = engine.generatePredictions(5);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza los últimos 200 sorteos de Guácharo Activo: ${history.slice(0, 10).map(h => h.animalData?.name || h.animal).join(' -> ')}.
      Usa el motor estadístico sugerido: ${statsPredictions.map(p => `${p.animal.name} (${p.probability}%)`).join(', ')}.
      Genera predicciones con lógica de racha y retraso.`,
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
        temperature: 0.3,
      }
    });

    const data = safeParseJSON(response.text || "", { predictions: [] });
    const finalData = (data.predictions || []).slice(0, 5).map((p: any) => ({
      animal: findAnimalByFlexibleInput(p.animalId) || ANIMALS[0],
      probability: p.probability,
      confidence: p.confidence as any,
      reasoning: p.reasoning
    }));

    return finalData.length >= 5 ? finalData : statsPredictions.slice(0, 5);
  } catch (error) {
    return statsPredictions.slice(0, 5);
  }
};

export const fetchRealResults = async (): Promise<{ draws: Partial<DrawResult>[], sources: {uri: string, title: string}[] }> => {
  try {
    const today = new Date().toLocaleDateString('es-ES');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `URGENTE: Consulta ${TARGET_URL} y obtén los resultados de la lotería "Guácharo Activo" para hoy ${today}.
      Extrae la hora y el animal ganador (Nombre o número).
      FORMATO JSON: { "draws": [{ "hour": "HH:mm", "animal": "Nombre/Número" }] }`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const sources = [{ uri: TARGET_URL, title: "Lotería de Hoy - Guácharo Activo" }];
    const data = safeParseJSON(response.text || "", { draws: [] });
    
    const formattedDraws = (data.draws || []).map((d: any) => ({
      hour: d.hour,
      animal: findAnimalByFlexibleInput(d.animal),
      isCompleted: true
    })).filter((d: any) => d.animal !== null);

    return { draws: formattedDraws, sources };
  } catch (error) {
    return { draws: [], sources: [] };
  }
};

export const fetchExtendedHistory = async (): Promise<{ history: any[], sources: any[] }> => {
  const cachedHistory = localStorage.getItem(CACHE_KEYS.HISTORY);
  const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
  
  if (cachedHistory && lastFetch && (Date.now() - parseInt(lastFetch)) < 600000) {
    return { history: JSON.parse(cachedHistory), sources: [] };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Accede a ${TARGET_URL} y extrae los últimos 200 resultados de Guácharo Activo.
      Incluye la fecha, la hora y el animal/número.
      FORMATO JSON: { "history": [{ "date": "YYYY-MM-DD", "hour": "HH:mm", "animal": "Nombre", "number": "00" }] }`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const data = safeParseJSON(response.text || "", { history: [] });
    const history = (data.history || []).map((item: any) => ({
      ...item,
      animalData: findAnimalByFlexibleInput(item.animal || item.number)
    })).filter((h: any) => h.animalData);

    if (history.length > 0) {
      localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(history));
      localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
    }
    
    return { history: history.length > 0 ? history : (cachedHistory ? JSON.parse(cachedHistory) : generateFallbackHistory()), sources: [] };
  } catch (error) {
    return { history: cachedHistory ? JSON.parse(cachedHistory) : generateFallbackHistory(), sources: [] };
  }
};

function generateFallbackHistory(): any[] {
  const fallback: any[] = [];
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];
  for (let i = 0; i < 25; i++) {
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
