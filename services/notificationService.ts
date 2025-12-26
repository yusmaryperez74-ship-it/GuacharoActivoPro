import { Prediction, Animal, LotteryId } from '../types';

export interface SmartAlert {
  id: string;
  type: 'hot_streak' | 'cold_awakening' | 'pattern_detected' | 'high_confidence';
  title: string;
  message: string;
  animal: Animal;
  confidence: number;
  timestamp: string;
  lotteryId: LotteryId;
  isRead: boolean;
}

export class NotificationService {
  private static STORAGE_KEY = 'smart_alerts_v1';
  private static MAX_ALERTS = 50;

  static generateSmartAlerts(
    predictions: Prediction[], 
    lotteryId: LotteryId, 
    history: any[]
  ): SmartAlert[] {
    const alerts: SmartAlert[] = [];
    const timestamp = new Date().toISOString();

    // 1. Alerta por animal con confianza muy alta
    const highConfidencePredictions = predictions.filter(p => 
      p.confidence === 'SEGURA' && p.probability > 15
    );

    highConfidencePredictions.forEach(prediction => {
      alerts.push({
        id: `high_conf_${prediction.animal.id}_${Date.now()}`,
        type: 'high_confidence',
        title: '🎯 Predicción de Alta Confianza',
        message: `${prediction.animal.name} tiene ${prediction.probability}% de probabilidad con confianza SEGURA`,
        animal: prediction.animal,
        confidence: prediction.probability,
        timestamp,
        lotteryId,
        isRead: false
      });
    });

    // 2. Detectar animales en racha caliente
    const hotAnimals = this.detectHotStreaks(history);
    hotAnimals.forEach(animal => {
      const prediction = predictions.find(p => p.animal.id === animal.id);
      if (prediction) {
        alerts.push({
          id: `hot_streak_${animal.id}_${Date.now()}`,
          type: 'hot_streak',
          title: '🔥 Animal en Racha Caliente',
          message: `${animal.name} ha salido 3+ veces en los últimos 20 sorteos`,
          animal,
          confidence: prediction.probability,
          timestamp,
          lotteryId,
          isRead: false
        });
      }
    });

    // 3. Detectar animales "dormidos" que pueden despertar
    const coldAnimals = this.detectColdAwakening(history);
    coldAnimals.forEach(animal => {
      const prediction = predictions.find(p => p.animal.id === animal.id);
      if (prediction && prediction.probability > 8) {
        alerts.push({
          id: `cold_awakening_${animal.id}_${Date.now()}`,
          type: 'cold_awakening',
          title: '😴 Animal Dormido Despertando',
          message: `${animal.name} lleva 40+ sorteos sin salir, pero muestra señales de activación`,
          animal,
          confidence: prediction.probability,
          timestamp,
          lotteryId,
          isRead: false
        });
      }
    });

    // 4. Detectar patrones cíclicos
    const cyclicalAnimals = this.detectCyclicalPatterns(history);
    cyclicalAnimals.forEach(animal => {
      const prediction = predictions.find(p => p.animal.id === animal.id);
      if (prediction) {
        alerts.push({
          id: `pattern_${animal.id}_${Date.now()}`,
          type: 'pattern_detected',
          title: '🔄 Patrón Cíclico Detectado',
          message: `${animal.name} sigue un patrón cíclico y está en ventana de oportunidad`,
          animal,
          confidence: prediction.probability,
          timestamp,
          lotteryId,
          isRead: false
        });
      }
    });

    return alerts;
  }

  private static detectHotStreaks(history: any[]): Animal[] {
    const recentHistory = history.slice(0, 20); // Últimos 20 sorteos
    const animalCounts: Record<string, number> = {};
    
    recentHistory.forEach(h => {
      const animalId = h.animalData?.id || h.number;
      if (animalId) {
        animalCounts[animalId] = (animalCounts[animalId] || 0) + 1;
      }
    });

    return Object.entries(animalCounts)
      .filter(([_, count]) => count >= 3)
      .map(([animalId, _]) => {
        const animal = history.find(h => 
          (h.animalData?.id || h.number) === animalId
        )?.animalData;
        return animal;
      })
      .filter(Boolean);
  }

  private static detectColdAwakening(history: any[]): Animal[] {
    const coldAnimals: Animal[] = [];
    
    // Buscar animales que no han salido en 40+ sorteos
    const recentIds = new Set(
      history.slice(0, 40).map(h => h.animalData?.id || h.number)
    );

    // Encontrar animales que no están en los últimos 40 pero sí en el historial general
    const allAnimalsInHistory = new Set(
      history.map(h => h.animalData?.id || h.number).filter(Boolean)
    );

    allAnimalsInHistory.forEach(animalId => {
      if (!recentIds.has(animalId)) {
        const animal = history.find(h => 
          (h.animalData?.id || h.number) === animalId
        )?.animalData;
        if (animal) {
          coldAnimals.push(animal);
        }
      }
    });

    return coldAnimals.slice(0, 3); // Máximo 3 alertas de este tipo
  }

  private static detectCyclicalPatterns(history: any[]): Animal[] {
    // Implementación simplificada - buscar animales con patrones de 7, 14, 21 días
    const cyclicalAnimals: Animal[] = [];
    const cycles = [7, 14, 21];
    
    cycles.forEach(cycle => {
      const cycleHistory = history.filter((_, index) => index % cycle === 0);
      const animalCounts: Record<string, number> = {};
      
      cycleHistory.slice(0, 5).forEach(h => {
        const animalId = h.animalData?.id || h.number;
        if (animalId) {
          animalCounts[animalId] = (animalCounts[animalId] || 0) + 1;
        }
      });

      Object.entries(animalCounts)
        .filter(([_, count]) => count >= 2)
        .forEach(([animalId, _]) => {
          const animal = history.find(h => 
            (h.animalData?.id || h.number) === animalId
          )?.animalData;
          if (animal && !cyclicalAnimals.find(a => a.id === animal.id)) {
            cyclicalAnimals.push(animal);
          }
        });
    });

    return cyclicalAnimals.slice(0, 2);
  }

  static saveAlerts(alerts: SmartAlert[]) {
    const existing = this.getStoredAlerts();
    const combined = [...alerts, ...existing];
    
    // Eliminar duplicados basados en tipo y animal
    const unique = combined.filter((alert, index, arr) => 
      arr.findIndex(a => 
        a.type === alert.type && 
        a.animal.id === alert.animal.id && 
        a.lotteryId === alert.lotteryId
      ) === index
    );

    // Mantener solo las más recientes
    const sorted = unique
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, this.MAX_ALERTS);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sorted));
  }

  static getStoredAlerts(): SmartAlert[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static markAsRead(alertId: string) {
    const alerts = this.getStoredAlerts();
    const updated = alerts.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  static getUnreadCount(lotteryId?: LotteryId): number {
    return this.getStoredAlerts()
      .filter(alert => !alert.isRead)
      .filter(alert => !lotteryId || alert.lotteryId === lotteryId)
      .length;
  }

  static clearOldAlerts(daysOld: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    
    const alerts = this.getStoredAlerts()
      .filter(alert => new Date(alert.timestamp) >= cutoff);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(alerts));
  }
}