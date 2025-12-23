
import React, { useState, useEffect, useCallback } from 'react';
import { View, Prediction, DrawResult } from '../types';
import { generatePrediction, fetchRealResults, fetchExtendedHistory } from '../services/geminiService';
import { getDrawSchedule, getNextDrawCountdown } from '../services/lotteryService';
import Navbar from './Navbar';

interface DashboardProps {
  onNavigate: (view: View) => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, toggleDarkMode, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingReal, setFetchingReal] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [draws, setDraws] = useState<DrawResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const hydrate = useCallback(async () => {
    setFetchingReal(true);
    try {
      const [realData, historyData] = await Promise.all([
        fetchRealResults(),
        fetchExtendedHistory()
      ]);

      const today = new Date().toISOString().split('T')[0];
      const mergedHistory = [...historyData.history];
      
      realData.draws.forEach(rd => {
        const exists = mergedHistory.find(h => h.date === today && h.hour === rd.hour);
        if (!exists && rd.animal) {
          mergedHistory.unshift({
            date: today,
            hour: rd.hour,
            animal: rd.animal.name,
            number: rd.animal.number,
            animalData: rd.animal
          });
        }
      });

      setDraws(getDrawSchedule(realData.draws as any));
      setHistory(mergedHistory);
      
      setLastUpdate(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      setShowUpdateToast(true);
      setTimeout(() => setShowUpdateToast(false), 3000);
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setFetchingReal(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    const timer = setInterval(() => setCountdown(getNextDrawCountdown()), 1000);
    const refreshTimer = setInterval(() => hydrate(), 120000);
    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, [hydrate]);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const results = await generatePrediction(history);
      setPredictions(results);
    } catch (e) {
      console.error("Prediction error", e);
    } finally {
      setLoading(false);
    }
  };

  const lastCompletedDraw = [...draws].reverse().find(d => d.isCompleted && d.animal);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden text-text-main-light dark:text-text-main-dark">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 relative">
        
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 pointer-events-none ${showUpdateToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/10">
            <span className="material-symbols-outlined text-sm animate-bounce text-primary">verified</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado con loteriadehoy.com</span>
          </div>
        </div>

        <div className="bg-primary/20 dark:bg-primary/10 px-6 py-10 rounded-b-[3rem] relative shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-neutral-900 dark:text-primary">raven</span>
              <h1 className="text-xl font-black tracking-tight">Guácharo AI</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => hydrate()} className={`size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center ${fetchingReal ? 'animate-spin' : ''}`} disabled={fetchingReal}>
                <span className="material-symbols-outlined text-xl">refresh</span>
              </button>
              <button onClick={toggleDarkMode} className="size-10 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center">
                <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Siguiente Sorteo</p>
            <div className="flex items-end gap-3">
              <h2 className="text-5xl font-black tracking-tighter text-yellow-700 dark:text-primary">{countdown}</h2>
              <span className="text-xs font-black mb-2 opacity-30 uppercase">Faltan</span>
            </div>
          </div>

          <div className={`mt-8 transition-all duration-700 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-lg relative overflow-hidden`}>
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Resultado más reciente</h3>
               <div className={`size-2 rounded-full ${fetchingReal ? 'bg-primary animate-pulse' : 'bg-green-500'}`}></div>
             </div>
             
             {lastCompletedDraw ? (
               <div className="flex items-center gap-4 relative animate-in fade-in zoom-in duration-500">
                 <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark flex items-center justify-center text-3xl shadow-sm">
                   {lastCompletedDraw.animal?.emoji}
                 </div>
                 <div>
                   <h4 className="font-black text-lg uppercase tracking-tight">{lastCompletedDraw.animal?.name}</h4>
                   <p className="text-xs font-bold text-primary-dark"># {lastCompletedDraw.animal?.number} • Sorteo {lastCompletedDraw.label}</p>
                 </div>
               </div>
             ) : (
               <div className="h-14 flex items-center gap-3 opacity-30 italic text-sm">Escaneando resultados de hoy...</div>
             )}
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className="text-xl font-black">Top 5 Probabilidades</h3>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">IA Análisis de 200 Sorteos</p>
            </div>
            <button onClick={handleGenerate} disabled={loading} className={`px-5 py-2.5 rounded-full bg-primary text-black font-black text-xs shadow-md transition-all active:scale-95 ${loading ? 'opacity-50 animate-pulse' : ''}`}>
              {loading ? 'ANALIZANDO...' : 'RECALCULAR'}
            </button>
          </div>

          <div className="space-y-4">
            {predictions.length > 0 ? predictions.map((p, i) => (
              <div key={i} className="bg-white dark:bg-surface-dark rounded-3xl p-5 shadow-sm border border-black/5 animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-background-light dark:bg-background-dark flex items-center justify-center text-4xl">
                      {p.animal.emoji}
                    </div>
                    <div>
                      <h4 className="font-black text-xl uppercase tracking-tighter">{p.animal.name}</h4>
                      <p className="text-sm font-bold text-primary-dark">Código {p.animal.number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tracking-tighter text-yellow-600 dark:text-primary">{p.probability}%</p>
                    <p className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 ${p.confidence === 'SEGURA' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                      {p.confidence}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium leading-relaxed italic">"{p.reasoning}"</p>
              </div>
            )) : (
              <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-5xl">psychology</span>
                <p className="text-sm font-black uppercase">IA Lista para Análisis</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Navbar activeView={View.DASHBOARD} onNavigate={onNavigate} />
    </div>
  );
};

export default Dashboard;
