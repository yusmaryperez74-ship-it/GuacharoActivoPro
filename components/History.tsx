
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, LotteryId } from '../types';
import Navbar from './Navbar';
import { fetchExtendedHistory } from '../services/geminiService';
import { ANIMALS } from '../constants';

interface HistoryProps {
  lotteryId: LotteryId;
  onNavigate: (view: View) => void;
}

const PAGE_SIZE = 20;

const History: React.FC<HistoryProps> = ({ lotteryId, onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const accentColor = isLottoActivo ? 'text-blue-500' : 'text-primary';
  const accentBg = isLottoActivo ? 'bg-blue-500/10' : 'bg-primary/10';

  const loadData = async (force = false) => {
    if (force) localStorage.removeItem(`last_fetch_${lotteryId}_v4`);
    setLoading(true);
    try {
      const data = await fetchExtendedHistory(lotteryId);
      const sorted = (data.history || []).sort((a: any, b: any) => {
        const timeA = new Date(`${a.date}T${a.hour}`).getTime();
        const timeB = new Date(`${b.date}T${b.hour}`).getTime();
        return timeB - timeA;
      });
      setHistory(sorted);
      setVisibleCount(PAGE_SIZE);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, [lotteryId]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const name = (item.animalData?.name || item.animal || "").toLowerCase();
      const num = (item.animalData?.number || item.number || "").toString();
      const dateMatch = selectedDate ? item.date === selectedDate : true;
      const searchMatch = name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm);
      return dateMatch && searchMatch;
    });
  }, [history, searchTerm, selectedDate]);

  const displayedHistory = filteredHistory.slice(0, visibleCount);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 pt-10 pb-4 border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">Historial {isLottoActivo ? 'Lotto Activo' : 'Guácharo'}</h2>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                {loading ? 'Sincronizando...' : `${filteredHistory.length} Sorteos filtrados`}
              </p>
            </div>
            <button 
              onClick={() => loadData(true)} 
              className={`size-10 rounded-full ${accentBg} flex items-center justify-center transition-transform active:scale-90`}
            >
              <span className={`material-symbols-outlined text-xl ${accentColor} ${loading ? 'animate-spin' : ''}`}>sync</span>
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-30">search</span>
              <input 
                type="text" 
                placeholder="Buscar animal..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border-none rounded-xl py-2.5 px-3 text-[10px] font-black w-28 appearance-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </header>

        <div className="px-6 py-6 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className={`size-12 border-4 ${accentColor.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin`}></div>
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Extrayendo datos de la nube...</p>
            </div>
          ) : displayedHistory.length > 0 ? (
            <>
              {displayedHistory.map((item, idx) => (
                <div key={`${item.date}-${item.hour}-${idx}`} className="bg-white dark:bg-surface-dark border border-black/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-primary/20 transition-all animate-in fade-in duration-500">
                  <div className="size-14 rounded-2xl bg-black/5 flex items-center justify-center text-3xl shrink-0">
                    {item.animalData?.emoji || '💠'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-sm uppercase truncate">{item.animalData?.name || item.animal}</h4>
                      <span className={`text-[9px] font-black ${accentBg} ${accentColor} px-2 py-0.5 rounded-lg`}>
                        {item.hour}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold opacity-60">Código {item.animalData?.number || item.number}</p>
                      <p className="text-[9px] opacity-30 font-black">{item.date}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {visibleCount < filteredHistory.length && (
                <button 
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)} 
                  className="w-full py-5 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl text-[10px] font-black opacity-40 uppercase tracking-[0.2em] hover:opacity-100 hover:border-primary/50 transition-all active:scale-[0.98]"
                >
                  Cargar más registros ({filteredHistory.length - visibleCount})
                </button>
              )}
            </>
          ) : (
            <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-6xl">database_off</span>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase">Sin Resultados</p>
                <p className="text-[10px]">Prueba ajustando los filtros de búsqueda o fecha.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Navbar activeView={View.HISTORY} onNavigate={onNavigate} />
    </div>
  );
};

export default History;
