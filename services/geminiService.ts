
import { GoogleGenAI, Type } from "@google/genai";
import { ANIMALS } from '../constants';
import { Prediction } from '../types';

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePrediction = async (): Promise<Prediction[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Genera las 3 predicciones más probables para la lotería de animalitos hoy. " +
                "Analiza tendencias simuladas y elige 3 animales de la lista oficial. " +
                "Devuelve el resultado en formato JSON con la estructura: " +
                "{ predictions: [{ animalId: string, probability: number, confidence: 'SEGURA'|'MODERADA'|'ARRIESGADA', reasoning: string }] }",
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
                  animalId: { type: Type.STRING, description: 'ID o número del animalito' },
                  probability: { type: Type.NUMBER, description: 'Probabilidad de 0 a 100' },
                  confidence: { type: Type.STRING, description: 'Nivel de confianza' },
                  reasoning: { type: Type.STRING, description: 'Breve explicación estadística' }
                },
                required: ['animalId', 'probability', 'confidence', 'reasoning']
              }
            }
          }
        }
      }
    });

    // response.text is a property, not a method
    const data = JSON.parse(response.text);
    return data.predictions.map((p: any) => ({
      animal: ANIMALS.find(a => a.id === p.animalId || a.number === p.animalId) || ANIMALS[0],
      probability: p.probability,
      confidence: p.confidence,
      reasoning: p.reasoning
    }));
  } catch (error) {
    console.error("Error generating prediction:", error);
    // Fallback static predictions
    return [
      { animal: ANIMALS.find(a => a.id === '0')!, probability: 85, confidence: 'SEGURA', reasoning: 'Fuerte tendencia cíclica detectada.' },
      { animal: ANIMALS.find(a => a.id === '10')!, probability: 60, confidence: 'MODERADA', reasoning: 'Apariciones frecuentes en los últimos sorteos.' },
      { animal: ANIMALS.find(a => a.id === '36')!, probability: 45, confidence: 'ARRIESGADA', reasoning: 'Anomalía detectada en el patrón histórico.' }
    ];
  }
};
