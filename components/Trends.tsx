
import React, { useState, useEffect, useMemo } from 'react';
import { View, Animal } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import Navbar from './Navbar';
import { fetchExtendedHistory } from '../services/geminiService';
import { ANIMALS } from '../constants';

interface TrendsProps {
  onNavigate: (view: View) => void;
  onBack: () => void;
}

type TabMode = 'Frecuencia' | 'Mapa de Calor' | 'Ciclos';

const Trends: React.FC<TrendsProps> = ({ onNavigate, onBack }) => {
  const [activeMode, setActiveMode] = useState<TabMode>('Frecuencia');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Reciente');

  useEffect(() => {
    const loadTrends = async () => {
      setLoading(true);
      try {
        const data = await fetchExtendedHistory();
        setHistory(data.history || []);
      } catch (e) {
        console.error("Error loading trends history:", e);
      } finally {
        setLoading(false);
      }
    };
    loadTrends();
  }, []);

  // PROCESAMIENTO: Frecuencia para el Gráfico de Barras
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
      const name = h.animalData?.name || h.animal;
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [history]);

  // PROCESAMIENTO: Mapa de Calor (Todos los animales)
  const heatMapData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
      const id = h.animalData?.id || h.number;
      counts[id] = (counts[id] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts), 1);

    return ANIMALS.map(animal => {
      const count = counts[animal.id] || 0;
      const intensity = count / maxCount;
      return {
        ...animal,
        count,
        intensity,
        isHot: intensity > 0.7
      };
    });
  }, [history]);

  // PROCESAMIENTO: Ciclos (Animales Fríos / Retraso)
  const cycleData = useMemo(() => {
    const delayMap: Record<string, number> = {};
    
    ANIMALS.forEach(animal => {
      const lastIndex = history.findIndex(h => (h.animalData?.id || h.number) === animal.id);
      delayMap[animal.id] = lastIndex === -1 ? history.length : lastIndex;
    });

    return ANIMALS.map(animal => ({
      ...animal,
      delay: delayMap[animal.id]
    })).sort((a, b) => b.delay - a.delay).slice(0, 12);
  }, [history]);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 pt-10 pb-6 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-black tracking-tight">Análisis Predictivo</h1>
          <div className="size-10"></div>
        </header>

        <div className="px-6 py-2">
          <div className="flex h-12 w-full items-center justify-center rounded-full bg-white dark:bg-surface-dark p-1 shadow-sm border border-black/5">
            {(['Frecuencia', 'Mapa de Calor', 'Ciclos'] as TabMode[]).map((mode) => (
              <button 
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`flex-1 h-full rounded-full text-[10px] font-black transition-all ${activeMode === mode ? 'bg-primary text-black shadow-md scale-105' : 'text-text-sub-light opacity-50'}`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Calculando Vectores...</p>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-8 animate-in fade-in duration-500">
            
            {/* INSIGHT CARD */}
            <div className="bg-white dark:bg-surface-dark rounded-3xl p-5 shadow-sm border border-primary/20 flex gap-4 items-start">
              <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 text-yellow-700 dark:text-primary">
                <span className="material-symbols-outlined icon-filled text-2xl">insights</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black uppercase tracking-tight">Hallazgo Crítico</h3>
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed font-medium">
                  {activeMode === 'Frecuencia' && `El animal "${chartData[0]?.name}" es el líder de frecuencia en este ciclo.`}
                  {activeMode === 'Mapa de Calor' && `Hay ${heatMapData.filter(h => h.isHot).length} animales en zona de alta presión térmica.`}
                  {activeMode === 'Ciclos' && `El animal "${cycleData[0]?.name}" tiene un retraso crítico de ${cycleData[0]?.delay} sorteos.`}
                </p>
              </div>
            </div>

            {/* CONTENT BASED ON ACTIVE MODE */}
            {activeMode === 'Frecuencia' && (
              <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-sm border border-black/5">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-black tracking-tight">Distribución de Éxito</h2>
                  <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded">HISTORIAL 60</span>
                </div>
                <div className="w-full">
                  <ResponsiveContainer width="100%" aspect={1.2}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: '#6b7280' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 600, fill: '#9ca3af' }} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(249, 245, 6, 0.05)' }}
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#f9f506' : '#e5e7eb'} className="dark:fill-white/10" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeMode === 'Mapa de Calor' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-tight">Matriz Térmica</h2>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-primary"></div>
                    <span className="text-[9px] font-black opacity-40">ALTA PRESIÓN</span>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {heatMapData.map((cell) => (
                    <div 
                      key={cell.id} 
                      className="group relative aspect-square rounded-2xl flex items-center justify-center transition-all hover:scale-110 cursor-help shadow-sm border border-black/5"
                      style={{ 
                        backgroundColor: `rgba(249, 245, 6, ${0.1 + (cell.intensity * 0.9)})`,
                      }}
                      title={`${cell.name}: ${cell.count} salidas`}
                    >
                      <span className={`text-xs font-black ${cell.intensity > 0.5 ? 'text-black' : 'opacity-60'}`}>
                        {cell.number}
                      </span>
                      {cell.intensity > 0.8 && (
                        <div className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full border-2 border-white dark:border-background-dark animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10">
                   <p className="text-[10px] font-bold opacity-50 text-center leading-relaxed">
                     Los colores intensos indican animales con mayor volumen de salida en la ventana de tiempo analizada.
                   </p>
                </div>
              </div>
            )}

            {activeMode === 'Ciclos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-black tracking-tight">Animales en Deuda</h2>
                  <span className="text-[10px] font-black text-primary-dark">RETRASO MÁXIMO</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {cycleData.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-black/5 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-background-light dark:bg-background-dark flex items-center justify-center text-2xl shadow-inner">
                          {item.emoji}
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight">{item.name}</h4>
                          <p className="text-[10px] font-bold opacity-40">Última salida: Hace {item.delay} sorteos</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="h-2 w-24 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500" 
                            style={{ width: `${Math.min((item.delay / history.length) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-black mt-1 text-orange-600">DEUDA CRÍTICA</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <Navbar activeView={View.TRENDS} onNavigate={onNavigate} />
    </div>
  );
};

export default Trends;
