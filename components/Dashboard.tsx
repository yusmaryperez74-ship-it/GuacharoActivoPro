
import React, { useState, useEffect, useCallback } from 'react';
import { View, Prediction, DrawResult, LotteryId } from '../types';
import { getDrawSchedule, getNextDrawCountdown } from '../services/lotteryService';
import { ValidationService, AccuracyMetrics } from '../services/validationService';
import { NotificationService } from '../services/notificationService';
import { PredictionService } from '../services/predictionService';
import { RealResultsService } from '../services/realResultsService';
import Navbar from './Navbar';
import SmartAlerts from './SmartAlerts';
import ManualResultEntry from './ManualResultEntry';
import DebugLotoVen from './DebugLotoVen';
import StatisticalAnalysis from './StatisticalAnalysis';

interface DashboardProps {
  lotteryId: LotteryId;
  onLotteryChange: (id: LotteryId) => void;
  onNavigate: (view: View) => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ lotteryId, onLotteryChange, onNavigate, toggleDarkMode, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingReal, setFetchingReal] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [draws, setDraws] = useState<DrawResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");
  const [accuracy, setAccuracy] = useState<AccuracyMetrics | null>(null);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showDebugLotoVen, setShowDebugLotoVen] = useState(false);
  const [showStatisticalAnalysis, setShowStatisticalAnalysis] = useState(false);
  const [realDataStats, setRealDataStats] = useState<any>(null);

  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const themeColor = isLottoActivo ? 'text-blue-500' : 'text-primary';
  const bgColor = isLottoActivo ? 'bg-blue-500/20' : 'bg-primary/20';
  const accentBorder = isLottoActivo ? 'border-blue-500/30' : 'border-primary/30';

  // Al cambiar la lotería, limpiamos las predicciones anteriores y sincronizamos datos
  const handleLotterySwitch = (id: LotteryId) => {
    if (id === lotteryId) return;
    setPredictions([]); // Limpiamos para evitar confusión visual
    onLotteryChange(id);
  };

  const hydrate = useCallback(async () => {
    setFetchingReal(true);
    try {
      console.log(`🔄 [Dashboard] Loading REAL results for ${lotteryId}...`);
      
      // Cargar resultados reales desde LotoVen
      const realResults = await RealResultsService.getHistoricalResults(lotteryId);
      
      if (realResults.success) {
        // Actualizar draws con resultados del día
        setDraws(getDrawSchedule(realResults.draws));
        
        // Actualizar historial con datos reales persistentes
        setHistory(realResults.history);
        
        // Actualizar estadísticas
        const stats = RealResultsService.getHistoryStats(lotteryId);
        setRealDataStats(stats);
        
        console.log(`✅ [Dashboard] Loaded ${realResults.history.length} real historical entries`);
        console.log(`📊 [Dashboard] Date range: ${stats.dateRange.from} to ${stats.dateRange.to}`);
      } else {
        console.error(`❌ [Dashboard] Failed to load real results:`, realResults.sources);
        // Mantener datos existentes en caso de error
        setDraws(getDrawSchedule([]));
      }

    } catch (error) {
      console.error("❌ [Dashboard] Error loading real data:", error);
      setDraws(getDrawSchedule([]));
    } finally {
      setFetchingReal(false);
    }
  }, [lotteryId]);

  useEffect(() => {
    hydrate();
    
    // Cargar métricas de precisión
    const metrics = ValidationService.calculateAccuracy(lotteryId);
    setAccuracy(metrics);
    
    // Cargar contador de alertas
    setUnreadAlerts(NotificationService.getUnreadCount(lotteryId));
    
    const timer = setInterval(() => setCountdown(getNextDrawCountdown()), 1000);
    return () => clearInterval(timer);
  }, [hydrate]);

  const handleGenerate = async () => {
    if (loading || history.length === 0) return;
    setLoading(true);
    try {
      console.log(`🎯 [Dashboard] Generating statistical prediction for ${lotteryId} with ${history.length} real results...`);
      
      // Generar predicción estadística basada SOLO en datos reales
      const statisticalResponse = await PredictionService.generatePrediction({ lotteryId });
      
      if (statisticalResponse.success && statisticalResponse.data) {
        // Convertir predicción estadística a formato legacy para compatibilidad
        const legacyPredictions: Prediction[] = statisticalResponse.data.top5.map(animal => ({
          animal: animal.animal,
          probability: Math.round(animal.score),
          confidence: animal.confidence === 'alta' ? 'SEGURA' : 'MODERADA',
          reasoning: `Análisis estadístico: ${animal.explanation}`,
          factors: {
            frequency: animal.frequencyTotal,
            recentTrend: animal.frequencyRecent,
            timePattern: animal.daysSinceLastAppearance,
            hotCold: animal.category === 'hot' ? 'hot' : animal.category === 'cold' ? 'cold' : 'neutral'
          }
        }));
        
        setPredictions(legacyPredictions);
        
        // Generar alertas inteligentes basadas en análisis estadístico
        const alerts = NotificationService.generateSmartAlerts(legacyPredictions, lotteryId, history);
        if (alerts.length > 0) {
          NotificationService.saveAlerts(alerts);
          setUnreadAlerts(NotificationService.getUnreadCount(lotteryId));
        }
        
        console.log(`✅ [Dashboard] Generated predictions based on ${statisticalResponse.data.totalResults} real results`);
      } else {
        console.error(`❌ [Dashboard] Statistical analysis failed:`, statisticalResponse.error);
        setPredictions([]);
      }
    } catch (error) {
      console.error("❌ [Dashboard] Prediction error:", error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const lastCompletedDraw = React.useMemo(() => {
    // Buscar el último sorteo completado con resultado real (no solo por tiempo)
    const completedWithResults = draws.filter(d => d.animal !== null);
    if (completedWithResults.length > 0) {
      return completedWithResults[completedWithResults.length - 1];
    }
    
    // Si no hay resultados reales, buscar el último que debería estar completado por tiempo
    const now = new Date();
    const venezuelaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
    const currentMinutes = venezuelaTime.getHours() * 60 + venezuelaTime.getMinutes();
    
    return [...draws].reverse().find(d => {
      const [h, m] = d.hour.split(':').map(Number);
      const drawMinutes = h * 60 + m;
      return currentMinutes >= (drawMinutes + 10); // 10 minutos después del sorteo
    });
  }, [draws]);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 relative">
        
        {/* Lotería Switcher */}
        <div className="sticky top-0 z-[100] bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 border-b border-black/5 flex gap-2">
          <button 
            onClick={() => handleLotterySwitch('GUACHARO')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${!isLottoActivo ? 'bg-primary text-black shadow-lg scale-105' : 'bg-black/5 opacity-40'}`}
          >
            GUÁCHARO ACTIVO
          </button>
          <button 
            onClick={() => handleLotterySwitch('LOTTO_ACTIVO')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${isLottoActivo ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-black/5 opacity-40'}`}
          >
            LOTTO ACTIVO
          </button>
        </div>

        <div className={`${bgColor} px-6 py-10 rounded-b-[3rem] relative shadow-sm transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-3xl ${isLottoActivo ? 'text-blue-600' : 'text-neutral-900 dark:text-primary'}`}>
                {isLottoActivo ? 'casino' : 'raven'}
              </span>
              <h1 className="text-xl font-black tracking-tight">{isLottoActivo ? 'Lotto Activo AI' : 'Guácharo AI'}</h1>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAlerts(true)}
                className={`size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center relative ${unreadAlerts > 0 ? 'animate-pulse' : ''}`}
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {unreadAlerts > 0 && (
                  <div className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{unreadAlerts}</span>
                  </div>
                )}
              </button>
              <button 
                onClick={() => setShowStatisticalAnalysis(true)}
                className="size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center"
                title="Análisis Estadístico"
              >
                <span className="material-symbols-outlined text-xl">analytics</span>
              </button>
              <button 
                onClick={() => setShowDebugLotoVen(true)}
                className="size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center"
                title="Debug LotoVen"
              >
                <span className="material-symbols-outlined text-xl">bug_report</span>
              </button>
              <button 
                onClick={() => setShowManualEntry(true)}
                className="size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center"
                title="Reportar resultado manualmente"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button onClick={() => hydrate()} className={`size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center ${fetchingReal ? 'animate-spin' : ''}`}>
                <span className="material-symbols-outlined text-xl">refresh</span>
              </button>
              <button 
                onClick={() => RealResultsService.clearTodayCache(lotteryId)}
                className="size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center"
                title="Limpiar cache y forzar actualización"
              >
                <span className="material-symbols-outlined text-xl">cached</span>
              </button>
              <button onClick={toggleDarkMode} className="size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center">
                <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Próximo Sorteo</p>
            <h2 className={`text-5xl font-black tracking-tighter ${isLottoActivo ? 'text-blue-700' : 'text-yellow-700 dark:text-primary'}`}>{countdown}</h2>
          </div>

          <div className="mt-8 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-lg">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Último Resultado</h3>
               <div className="flex items-center gap-2">
                 <div className={`size-2 rounded-full ${fetchingReal ? 'bg-primary animate-pulse' : 'bg-green-500'}`}></div>
                 <span className="text-[8px] opacity-40">
                   {fetchingReal ? 'Cargando desde LotoVen...' : realDataStats ? `${realDataStats.totalEntries} resultados reales` : 'LotoVen'}
                 </span>
               </div>
             </div>
             {lastCompletedDraw ? (
               <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                 <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark flex items-center justify-center text-3xl shadow-sm">{lastCompletedDraw.animal?.emoji}</div>
                 <div>
                   <h4 className="font-black text-lg uppercase tracking-tight">{lastCompletedDraw.animal?.name}</h4>
                   <p className="text-xs font-bold opacity-60"># {lastCompletedDraw.animal?.number} • {lastCompletedDraw.label}</p>
                 </div>
               </div>
             ) : (
               <div className="h-14 flex items-center opacity-30 italic text-sm">
                 {fetchingReal ? (
                   <div className="flex items-center gap-2">
                     <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                     <span>Cargando resultados reales desde LotoVen...</span>
                   </div>
                 ) : (
                   <div className="flex items-center gap-2">
                     <span className="material-symbols-outlined text-lg">schedule</span>
                     <span>Esperando próximo sorteo...</span>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        <div className="px-6 py-8">
          {/* Métricas de Precisión */}
          {accuracy && accuracy.totalPredictions > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black">Precisión del Sistema</h3>
                <button 
                  onClick={() => setShowAccuracy(!showAccuracy)}
                  className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
                >
                  {showAccuracy ? 'Ocultar' : 'Ver detalles'}
                </button>
              </div>
              
              <div className={`grid grid-cols-3 gap-3 mb-4 ${showAccuracy ? 'mb-6' : ''}`}>
                <div className={`${bgColor} rounded-2xl p-4 text-center`}>
                  <div className={`text-2xl font-black ${themeColor}`}>
                    {accuracy.exactAccuracy.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                    Exacta
                  </div>
                </div>
                <div className={`${bgColor} rounded-2xl p-4 text-center`}>
                  <div className={`text-2xl font-black ${themeColor}`}>
                    {accuracy.top3Accuracy.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                    Top 3
                  </div>
                </div>
                <div className={`${bgColor} rounded-2xl p-4 text-center`}>
                  <div className={`text-2xl font-black ${themeColor}`}>
                    {accuracy.top5Accuracy.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                    Top 5
                  </div>
                </div>
              </div>

              {showAccuracy && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-white dark:bg-surface-dark rounded-2xl p-4">
                    <h4 className="text-sm font-black mb-3">Precisión por Confianza</h4>
                    <div className="space-y-2">
                      {Object.entries(accuracy.confidenceBreakdown).map(([level, stats]) => (
                        <div key={level} className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                            level === 'segura' ? 'bg-green-500/10 text-green-600' :
                            level === 'moderada' ? 'bg-yellow-500/10 text-yellow-600' :
                            'bg-red-500/10 text-red-600'
                          }`}>
                            {level}
                          </span>
                          <span className="text-sm font-bold">
                            {stats.accuracy.toFixed(1)}% ({stats.hits}/{stats.total})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-surface-dark rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">Posición Promedio</span>
                      <span className={`text-lg font-black ${themeColor}`}>
                        #{accuracy.averagePosition.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      Basado en {accuracy.totalPredictions} predicciones
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className="text-xl font-black">Análisis Estadístico</h3>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">
                Basado en {history.length} sorteos reales de {lotteryId} • Solo datos de LotoVen
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowStatisticalAnalysis(true)}
                className={`px-3 py-2 rounded-full font-black text-xs shadow-lg transition-all active:scale-95 ${isLottoActivo ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-black'}`}
              >
                VER ANÁLISIS
              </button>
              <button 
                onClick={handleGenerate} 
                disabled={loading || history.length === 0} 
                className={`px-6 py-3 rounded-full font-black text-xs shadow-xl transition-all active:scale-95 ${isLottoActivo ? 'bg-blue-600 text-white' : 'bg-primary text-black'} ${loading ? 'opacity-50' : ''}`}
              >
                {loading ? 'ANALIZANDO...' : 'RECALCULAR'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {predictions.length > 0 ? predictions.map((p, i) => (
              <div key={i} className={`bg-white dark:bg-surface-dark rounded-3xl p-5 shadow-sm border ${accentBorder} animate-in slide-in-from-bottom-4 duration-300`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-4xl">{p.animal.emoji}</div>
                    <div>
                      <h4 className="font-black text-xl uppercase tracking-tighter">{p.animal.name}</h4>
                      <p className={`text-sm font-bold ${isLottoActivo ? 'text-blue-500' : 'text-primary-dark'}`}>Código {p.animal.number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black tracking-tighter ${isLottoActivo ? 'text-blue-600' : 'text-yellow-600'}`}>{p.probability}%</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.confidence === 'SEGURA' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                      {p.confidence}
                    </span>
                  </div>
                </div>
                <p className="text-xs mt-3 opacity-60 leading-relaxed italic font-medium">"{p.reasoning}"</p>
              </div>
            )) : (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                <span className={`material-symbols-outlined text-6xl ${isLottoActivo ? 'text-blue-500' : 'text-primary'}`}>analytics</span>
                <div className="space-y-1">
                   <p className="font-black uppercase tracking-widest text-sm">Análisis Estadístico Listo</p>
                   <p className="text-[10px] font-bold">Haz clic en "RECALCULAR" para analizar {history.length} sorteos reales de {isLottoActivo ? 'Lotto Activo' : 'Guácharo'}.</p>
                   <p className="text-[8px] opacity-60 mt-2">Sistema basado en datos reales de LotoVen • Sin simulaciones</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Navbar activeView={View.DASHBOARD} onNavigate={onNavigate} />
      
      <SmartAlerts 
        lotteryId={lotteryId}
        isVisible={showAlerts}
        onClose={() => {
          setShowAlerts(false);
          setUnreadAlerts(NotificationService.getUnreadCount(lotteryId));
        }}
      />
      
      <ManualResultEntry
        lotteryId={lotteryId}
        isVisible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onResultAdded={(hour, animal) => {
          // Actualizar los datos cuando se reporte un resultado
          hydrate();
          console.log(`✅ Result reported: ${animal.name} at ${hour}`);
        }}
      />
      
      <DebugLotoVen
        isVisible={showDebugLotoVen}
        onClose={() => setShowDebugLotoVen(false)}
      />
      
      <StatisticalAnalysis
        lotteryId={lotteryId}
        isVisible={showStatisticalAnalysis}
        onClose={() => setShowStatisticalAnalysis(false)}
      />
    </div>
  );
};

export default Dashboard;
