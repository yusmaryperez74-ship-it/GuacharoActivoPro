
import React, { useState } from 'react';
import { View } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import Navbar from './Navbar';

interface TrendsProps {
  onNavigate: (view: View) => void;
  onBack: () => void;
}

const Trends: React.FC<TrendsProps> = ({ onNavigate, onBack }) => {
  const [filter, setFilter] = useState('Semana');

  const data = [
    { name: 'Tigre', value: 18, color: '#f9f506' },
    { name: 'León', value: 12, color: '#e5e7eb' },
    { name: 'Zorro', value: 15, color: '#e5e7eb' },
    { name: 'Oso', value: 8, color: '#e5e7eb' },
    { name: 'Mono', value: 16, color: '#f9f50699' },
    { name: 'Lapa', value: 10, color: '#e5e7eb' },
  ];

  const heatMap = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    prob: Math.floor(Math.random() * 100),
    active: i === 0 || i === 4 || i === 8
  }));

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-8 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-black flex-1 text-center">Análisis de Tendencias</h1>
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <span className="material-symbols-outlined">info</span>
          </button>
        </header>

        <div className="px-4 py-2">
          <div className="flex h-12 w-full items-center justify-center rounded-full bg-white dark:bg-surface-dark p-1 shadow-sm border border-black/5">
            {['Frecuencia', 'Mapa de Calor', 'Ciclos'].map((mode) => (
              <button 
                key={mode}
                className={`flex-1 h-full rounded-full text-xs font-black transition-all ${mode === 'Frecuencia' ? 'bg-primary text-black shadow-sm' : 'text-text-sub-light'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['Semana', 'Mes', 'Año'].map((chip) => (
              <button 
                key={chip}
                onClick={() => setFilter(chip)}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-xs font-black transition-all
                  ${filter === chip ? 'bg-primary text-black shadow-sm' : 'bg-white dark:bg-surface-dark border border-black/5'}
                `}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-primary/20 flex gap-3 items-start">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-yellow-600 dark:text-primary">
              <span className="material-symbols-outlined icon-filled">auto_awesome</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black">Insight del Modelo</h3>
              <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed">
                El <span className="font-bold text-text-main-light dark:text-white">Tigre (10)</span> tiene un 200% más de frecuencia hoy.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-black/5">
            <h2 className="text-lg font-black mb-6">Frecuencia</h2>
            {/* Usamos Aspect Ratio 16/9 para adaptabilidad perfecta */}
            <div className="w-full">
              <ResponsiveContainer width="100%" aspect={1.5}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#6b7280' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 500, fill: '#6b7280' }} 
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-black mb-4">Probabilidad Térmica</h2>
            <div className="grid grid-cols-6 gap-3">
              {heatMap.map((cell) => (
                <div 
                  key={cell.id} 
                  className={`aspect-square rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-all hover:scale-105 relative
                    ${cell.active ? 'bg-primary' : cell.prob > 60 ? 'bg-primary/40' : 'bg-white dark:bg-surface-dark border border-black/5'}
                  `}
                >
                  <span className={`text-xs font-black ${cell.active ? 'text-black' : ''}`}>
                    {cell.id.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Navbar activeView={View.TRENDS} onNavigate={onNavigate} />
    </div>
  );
};

export default Trends;
