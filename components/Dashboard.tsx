
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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [draws, setDraws] = useState<DrawResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const hydrate = useCallback(async () => {
    const cachedHistory = localStorage.getItem('guacharo_history_v4');
    if (cachedHistory) {
      try {
        const parsed = JSON.parse(cachedHistory);
        setHistory(parsed);
        setDraws(getDrawSchedule());
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }

    setFetchingReal(true);
    try {
      const [realData, historyData] = await Promise.all([
        fetchRealResults(),
        fetchExtendedHistory()
      ]);
      setDraws(getDrawSchedule(realData.draws as any));
      setHistory(historyData.history);
      setLastUpdate(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setFetchingReal(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    const timer = setInterval(() => setCountdown(getNextDrawCountdown()), 1000);
    return () => clearInterval(timer);
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

  const getReasoningTags = (reasoning: string) => {
    const tags = [];
    const r = (reasoning || "").toLowerCase();
    if (r.includes("tendencia") || r.includes("momentum")) {
      tags.push({ label: 'MOMENTUM', icon: 'trending_up', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' });
    }
    if (r.includes("transición") || r.includes("markov")) {
      tags.push({ label: 'MARKOV', icon: 'hub', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' });
    }
    if (r.includes("recurrencia") || r.includes("historial")) {
      tags.push({ label: 'RECURRENCIA', icon: 'rebase_edit', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' });
    }
    return tags;
  };

  const lastCompletedDraw = [...draws].reverse().find(d => d.isCompleted && d.animal);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden text-text-main-light dark:text-text-main-dark">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="bg-primary/20 dark:bg-primary/10 px-6 py-10 rounded-b-[3rem] relative shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-neutral-900 dark:text-primary">raven</span>
              <h1 className="text-xl font-black tracking-tight">Guácharo AI</h1>
            </div>
            <button onClick={toggleDarkMode} className="size-10 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md flex items-center justify-center">
              <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Siguiente Sorteo</p>
            <div className="flex items-end gap-3">
              <h2 className="text-5xl font-black tracking-tighter text-yellow-700 dark:text-primary">{countdown}</h2>
              <span className="text-xs font-black mb-2 opacity-30">EN CURSO</span>
            </div>
          </div>

          <div className="mt-8 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-lg">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Último Resultado Real</h3>
               {fetchingReal && <div className="size-2 bg-primary rounded-full animate-pulse"></div>}
             </div>
             {lastCompletedDraw ? (
               <div className="flex items-center gap-4">
                 <div className="size-14 rounded-2xl bg-white dark:bg-surface-dark flex items-center justify-center text-3xl shadow-sm border border-black/5">
                   {lastCompletedDraw.animal?.emoji}
                 </div>
                 <div>
                   <h4 className="font-black text-lg uppercase tracking-tight">{lastCompletedDraw.animal?.name}</h4>
                   <p className="text-xs font-bold text-primary-dark dark:text-primary"># {lastCompletedDraw.animal?.number} • {lastCompletedDraw.label}</p>
                 </div>
               </div>
             ) : (
               <div className="h-14 flex items-center opacity-30 italic text-sm font-medium">Sincronizando oráculo...</div>
             )}
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className="text-xl font-black">Top 5 Probabilidades</h3>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Análisis Multidimensional</p>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-black font-black text-xs shadow-md transition-all active:scale-95 ${loading ? 'opacity-50 animate-pulse cursor-not-allowed' : ''}`}
            >
              <span className="material-symbols-outlined text-sm">{loading ? 'sync' : 'psychology'}</span>
              {loading ? 'PROCESANDO...' : 'RECALCULAR'}
            </button>
          </div>

          <div className="space-y-4">
            {predictions.length > 0 ? (
              predictions.map((p, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark rounded-3xl p-5 shadow-sm border border-black/5 group hover:border-primary/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="size-16 rounded-2xl bg-background-light dark:bg-background-dark flex items-center justify-center text-4xl group-hover:bg-primary/10 transition-colors">
                          {p.animal.emoji}
                        </div>
                        <div className="absolute -top-2 -left-2 size-6 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-surface-dark">
                          {i + 1}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-black text-xl uppercase tracking-tighter">{p.animal.name}</h4>
                        <p className="text-sm font-bold text-primary-dark dark:text-primary">Código {p.animal.number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black tracking-tighter text-yellow-600 dark:text-primary">{p.probability}%</p>
                      <p className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${
                        p.confidence === 'SEGURA' ? 'bg-green-500/10 text-green-600' : 
                        p.confidence === 'MODERADA' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {p.confidence}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium leading-relaxed mb-4 italic">
                    "{p.reasoning}"
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {getReasoningTags(p.reasoning).map((tag, j) => (
                      <div key={j} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black ${tag.color}`}>
                        <span className="material-symbols-outlined text-[14px]">{tag.icon}</span>
                        {tag.label}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center flex flex-col items-center gap-5">
                <div className="size-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-4xl opacity-20 border-4 border-dashed border-black/10 dark:border-white/10">
                  <span className="material-symbols-outlined text-4xl">analytics</span>
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest opacity-40">Motor de Inferencias Listo</p>
                  <p className="text-xs font-medium opacity-30 mt-1 max-w-[220px] mx-auto">Toca "RECALCULAR" para procesar el historial y obtener el Top 5 de hoy.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 bg-black/5 dark:bg-white/5 rounded-[2.5rem] p-6 border border-black/5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black tracking-tight">Sorteos Pendientes</h3>
              <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{lastUpdate && `Actualizado: ${lastUpdate}`}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {draws.filter(d => !d.isCompleted).slice(0, 6).map((d, i) => (
                <div key={i} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${d.isNext ? 'bg-primary/20 border-primary shadow-sm scale-[1.05] z-10' : 'bg-white dark:bg-surface-dark border-black/5 opacity-60'}`}>
                  <p className={`text-[10px] font-black uppercase ${d.isNext ? 'text-black' : 'opacity-50'}`}>{d.label}</p>
                  <span className={`material-symbols-outlined ${d.isNext ? 'text-yellow-700 animate-pulse' : 'opacity-30'} text-xl`}>pending_actions</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Navbar activeView={View.DASHBOARD} onNavigate={onNavigate} />
    </div>
  );
};

export default Dashboard;
