
import React, { useState } from 'react';
import { View, Prediction } from '../types';
import { generatePrediction } from '../services/geminiService';
import Navbar from './Navbar';

interface DashboardProps {
  onNavigate: (view: View) => void;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, toggleDarkMode, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    const results = await generatePrediction();
    setPredictions(results);
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="sticky top-0 z-40 flex items-center px-6 pt-10 pb-4 justify-between bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDarkMode}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark">Bienvenido</span>
              <h2 className="text-xl font-bold leading-none tracking-tight">Hola, Ganador 👋</h2>
            </div>
          </div>
          <button 
            onClick={() => onNavigate(View.PREMIUM)}
            className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <span className="material-symbols-outlined text-xl text-yellow-600 dark:text-primary icon-filled">workspace_premium</span>
          </button>
        </div>

        <div className="px-6 space-y-6">
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-text-main-light dark:text-white capitalize">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
              </h1>
              <p className="text-text-sub-light dark:text-text-sub-dark font-medium capitalize">
                {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="px-3 py-1 bg-black/5 dark:bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
              PRÓX. SORTEO 12:00 PM
            </div>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative bg-white dark:bg-surface-dark border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-[10px] font-black text-yellow-800 dark:text-yellow-400 mb-2 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[14px] icon-filled">auto_awesome</span>
                  IA Powered
                </div>
                <h2 className="text-2xl font-black text-text-main-light dark:text-white leading-tight">Predicción del Día</h2>
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark px-4">Análisis de +10k sorteos para encontrar tu animalito ganador.</p>
              </div>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-4 bg-primary hover:bg-primary-dark text-black rounded-full font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                  {loading ? 'sync' : 'bolt'}
                </span>
                {loading ? 'Analizando...' : 'Generar Predicción'}
              </button>
            </div>
          </div>

          {predictions.length > 0 && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Top Probables</h3>
                <button 
                  onClick={() => onNavigate(View.TRENDS)}
                  className="text-sm font-bold text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
                >
                  Ver estadísticas
                </button>
              </div>

              {predictions.map((p, idx) => (
                <div key={idx} className="p-4 bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-black/5 dark:border-white/5 flex gap-4 items-center">
                  <div 
                    className="size-16 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 bg-cover bg-center flex items-center justify-center text-3xl"
                    style={p.animal.imageUrl ? { backgroundImage: `url(${p.animal.imageUrl})` } : {}}
                  >
                    {!p.animal.imageUrl && p.animal.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-lg font-black truncate">{p.animal.name} ({p.animal.number})</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide
                        ${p.confidence === 'SEGURA' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                          p.confidence === 'MODERADA' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 
                          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}
                      `}>
                        {p.confidence}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-2 mb-1">
                      <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${p.probability}%` }}></div>
                    </div>
                    <p className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark text-right">{p.probability}% Probabilidad</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-500">
                <span className="material-symbols-outlined icon-filled">local_fire_department</span>
                <h4 className="font-bold text-sm">Calientes</h4>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className="size-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-lg">🐋</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="size-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-lg">🦅</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-blue-500">
                <span className="material-symbols-outlined icon-filled">ac_unit</span>
                <h4 className="font-bold text-sm">Dormidos</h4>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-lg">🐂</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-lg">🦂</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Navbar activeView={View.DASHBOARD} onNavigate={onNavigate} />
    </div>
  );
};

export default Dashboard;
