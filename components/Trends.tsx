
import React, { useState, useEffect, useMemo } from 'react';
import { View, LotteryId } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import Navbar from './Navbar';
import { fetchExtendedHistory } from '../services/geminiService';

interface TrendsProps {
  lotteryId: LotteryId;
  onNavigate: (view: View) => void;
  onBack: () => void;
}

const Trends: React.FC<TrendsProps> = ({ lotteryId, onNavigate, onBack }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const chartColor = isLottoActivo ? '#3b82f6' : '#f9f506';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchExtendedHistory(lotteryId);
        setHistory(data.history || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadData();
  }, [lotteryId]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
      const name = h.animalData?.name || h.animal;
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [history]);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 pt-10 pb-6 flex items-center justify-between">
          <button onClick={onBack} className="size-10 rounded-full bg-black/5 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back</span></button>
          <h1 className="text-lg font-black uppercase tracking-tight">Vectores {lotteryId}</h1>
          <div className="size-10"></div>
        </header>

        <div className="px-6 py-6">
          <div className={`bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-sm border ${isLottoActivo ? 'border-blue-500/20' : 'border-primary/20'}`}>
            <h2 className="text-lg font-black mb-8 uppercase tracking-tighter">Frecuencia de Salida (200)</h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center animate-pulse">Analizando ciclos...</div>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? chartColor : '#e5e7eb'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
      <Navbar activeView={View.TRENDS} onNavigate={onNavigate} />
    </div>
  );
};

export default Trends;
