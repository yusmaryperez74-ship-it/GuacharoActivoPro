import React, { useState, useEffect } from 'react';
import { LotteryId } from '../types';
import { PredictionService } from '../services/predictionService';
import { StatisticalPrediction, PredictionScore } from '../services/statisticalAnalysisService';

interface StatisticalAnalysisProps {
  lotteryId: LotteryId;
  isVisible: boolean;
  onClose: () => void;
}

const StatisticalAnalysis: React.FC<StatisticalAnalysisProps> = ({ lotteryId, isVisible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<StatisticalPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'top10' | 'hot' | 'cold' | 'all'>('top10');

  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const themeColor = isLottoActivo ? 'text-blue-600' : 'text-yellow-600';
  const bgColor = isLottoActivo ? 'bg-blue-500/10' : 'bg-yellow-500/10';
  const borderColor = isLottoActivo ? 'border-blue-500/20' : 'border-yellow-500/20';

  useEffect(() => {
    if (isVisible) {
      loadAnalysis();
    }
  }, [isVisible, lotteryId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await PredictionService.generatePrediction({ lotteryId });
      
      if (response.success && response.data) {
        setPrediction(response.data);
      } else {
        setError(response.error || 'Error al generar análisis');
      }
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hot': return '🔥';
      case 'warm': return '🌡️';
      case 'cold': return '❄️';
      case 'frozen': return '🧊';
      default: return '📊';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'hot': return 'text-red-600 bg-red-500/10';
      case 'warm': return 'text-orange-600 bg-orange-500/10';
      case 'cold': return 'text-blue-600 bg-blue-500/10';
      case 'frozen': return 'text-gray-600 bg-gray-500/10';
      default: return 'text-gray-600 bg-gray-500/10';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'alta': return 'text-green-600 bg-green-500/10';
      case 'media': return 'text-yellow-600 bg-yellow-500/10';
      case 'baja': return 'text-red-600 bg-red-500/10';
      default: return 'text-gray-600 bg-gray-500/10';
    }
  };

  const renderAnimalCard = (animal: PredictionScore, index: number) => (
    <div key={animal.animalId} className={`bg-white dark:bg-surface-dark rounded-2xl p-4 ${borderColor} border animate-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-2xl">
            {animal.animal.emoji}
          </div>
          <div>
            <h4 className="font-black text-lg uppercase tracking-tight">{animal.animal.name}</h4>
            <p className="text-xs font-bold opacity-60">#{animal.animal.number} • Rank #{animal.rank}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${themeColor}`}>
            {animal.score.toFixed(1)}
          </div>
          <div className="text-xs font-bold opacity-60">puntos</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-sm font-bold">{animal.frequencyRecent.toFixed(1)}%</div>
          <div className="text-xs opacity-60">Reciente</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold">{animal.frequencyTotal.toFixed(1)}%</div>
          <div className="text-xs opacity-60">Total</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold">{animal.daysSinceLastAppearance}</div>
          <div className="text-xs opacity-60">Días</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getCategoryColor(animal.category)}`}>
          {getCategoryIcon(animal.category)} {animal.category.toUpperCase()}
        </span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getConfidenceColor(animal.confidence)}`}>
          {animal.confidence.toUpperCase()}
        </span>
      </div>
      
      <p className="text-xs mt-3 opacity-70 italic leading-relaxed">
        {animal.explanation}
      </p>
    </div>
  );

  const getTabData = () => {
    if (!prediction) return [];
    
    switch (activeTab) {
      case 'top10': return prediction.top10;
      case 'hot': return prediction.hotAnimals;
      case 'cold': return prediction.coldAnimals;
      case 'all': return prediction.allAnimals;
      default: return [];
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className={`${bgColor} p-6 border-b border-black/10 dark:border-white/10`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Análisis Estadístico</h2>
              <p className="text-sm opacity-70 font-medium">
                {isLottoActivo ? 'Lotto Activo' : 'Guácharo Activo'} • Basado en datos históricos
              </p>
            </div>
            <button 
              onClick={onClose}
              className="size-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3">
                <div className={`size-6 border-2 ${isLottoActivo ? 'border-blue-500' : 'border-yellow-500'} border-t-transparent rounded-full animate-spin`}></div>
                <span className="font-medium">Analizando datos históricos...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">error</span>
                <span className="font-bold text-red-600">Error en el análisis</span>
              </div>
              <p className="text-sm mt-2 opacity-70">{error}</p>
              <button 
                onClick={loadAnalysis}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold"
              >
                Reintentar
              </button>
            </div>
          )}

          {prediction && (
            <>
              {/* Estadísticas generales */}
              <div className={`${bgColor} rounded-2xl p-4 mb-6`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-black ${themeColor}`}>{prediction.totalResults}</div>
                    <div className="text-xs font-bold opacity-60">Sorteos Analizados</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-black ${themeColor}`}>{prediction.analysisWindow.recent20}</div>
                    <div className="text-xs font-bold opacity-60">Ventana Reciente</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-black ${themeColor}`}>{prediction.hotAnimals.length}</div>
                    <div className="text-xs font-bold opacity-60">Animales Calientes</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-black ${themeColor}`}>{prediction.coldAnimals.length}</div>
                    <div className="text-xs font-bold opacity-60">Animales Fríos</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto">
                {[
                  { key: 'top10', label: 'Top 10', count: prediction.top10.length },
                  { key: 'hot', label: 'Calientes', count: prediction.hotAnimals.length },
                  { key: 'cold', label: 'Fríos', count: prediction.coldAnimals.length },
                  { key: 'all', label: 'Todos', count: prediction.allAnimals.length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.key
                        ? `${isLottoActivo ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-black'}`
                        : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Lista de animales */}
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {getTabData().map((animal, index) => renderAnimalCard(animal, index))}
              </div>

              {/* Disclaimer */}
              <div className="mt-6 p-4 bg-gray-500/10 rounded-2xl border border-gray-500/20">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-gray-600 text-lg">info</span>
                  <div>
                    <h4 className="font-bold text-sm text-gray-600 mb-1">Aviso Importante</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {prediction.disclaimer}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticalAnalysis;