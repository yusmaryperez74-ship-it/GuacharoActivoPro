
import React, { useState, useEffect, useMemo } from 'react';
import { View, LotteryId } from '../types';
import Navbar from './Navbar';
import { fetchExtendedHistory } from '../services/geminiService';
import { ANIMALS } from '../constants';

interface HistoryProps {
  lotteryId: LotteryId;
  onNavigate: (view: View) => void;
}

const PAGE_SIZE = 30;

// Helper para convertir formato 24h a 12h legible
const formatTo12h = (hour24: string) => {
  if (!hour24) return "";
  const [hours, minutes] = hour24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper para formatear la fecha a algo más legible (ej: Lunes, 15 de Mayo)
const formatDateLabel = (dateStr: string) => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const date = new Date(dateStr + 'T12:00:00'); // T12 para evitar problemas de zona horaria
  return new Intl.DateTimeFormat('es-ES', options).format(date);
};

const History: React.FC<HistoryProps> = ({ lotteryId, onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const accentColor = isLottoActivo ? 'text-blue-500' : 'text-primary';
  const accentBg = isLottoActivo ? 'bg-blue-500/10' : 'bg-primary/10';

  const loadData = async (force = false) => {
    if (force) localStorage.removeItem(`last_fetch_${lotteryId}_v4`);
    setLoading(true);
    try {
      const data = await fetchExtendedHistory(lotteryId);
      // Ordenar por fecha y luego por hora (descendente)
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

  // Filtrado inicial
  const filteredData = useMemo(() => {
    return history.filter(item => {
      const name = (item.animalData?.name || item.animal || "").toLowerCase();
      const num = (item.animalData?.number || item.number || "").toString();
      return name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm);
    });
  }, [history, searchTerm]);

  // Agrupación por días de los elementos visibles
  const groupedHistory = useMemo(() => {
    const displayed = filteredData.slice(0, visibleCount);
    const groups: Record<string, any[]> = {};
    
    displayed.forEach(item => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredData, visibleCount]);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 pt-10 pb-4 border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">Resultados Exactos</h2>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                {isLottoActivo ? 'Lotto Activo' : 'Guácharo Activo'} • {history.length} registros
              </p>
            </div>
            <button 
              onClick={() => loadData(true)} 
              className={`size-10 rounded-full ${accentBg} flex items-center justify-center transition-transform active:scale-90`}
            >
              <span className={`material-symbols-outlined text-xl ${accentColor} ${loading ? 'animate-spin' : ''}`}>sync</span>
            </button>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-30">search</span>
            <input 
              type="text" 
              placeholder="Buscar por animal o número..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </header>

        <div className="px-6 py-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className={`size-12 border-4 ${isLottoActivo ? 'border-blue-500' : 'border-primary'} border-t-transparent rounded-full animate-spin`}></div>
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Obteniendo historial detallado...</p>
            </div>
          ) : groupedHistory.length > 0 ? (
            <div className="space-y-8">
              {groupedHistory.map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <div className="sticky top-[140px] z-40 py-2">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-text-sub-light dark:text-text-sub-dark bg-background-light dark:bg-background-dark/80 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-black/5 shadow-sm">
                      {formatDateLabel(date)}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {items.map((item, idx) => (
                      <div key={`${item.date}-${item.hour}-${idx}`} className="bg-white dark:bg-surface-dark border border-black/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-primary/20 transition-all animate-in fade-in duration-500">
                        <div className="size-14 rounded-2xl bg-black/5 flex items-center justify-center text-3xl shrink-0">
                          {item.animalData?.emoji || '💠'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-black text-sm uppercase truncate">{item.animalData?.name || item.animal}</h4>
                            <span className={`text-[10px] font-black ${accentBg} ${accentColor} px-2 py-0.5 rounded-lg border border-black/5`}>
                              {formatTo12h(item.hour)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${isLottoActivo ? 'text-blue-600' : 'text-yellow-600'}`}>
                                #{item.animalData?.number || item.number}
                              </span>
                              <div className="size-1 rounded-full bg-black/10"></div>
                              <span className="text-[10px] opacity-40 font-bold uppercase">Sorteo Confirmado</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {visibleCount < filteredData.length && (
                <button 
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)} 
                  className="w-full py-5 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl text-[10px] font-black opacity-40 uppercase tracking-[0.2em] hover:opacity-100 hover:border-primary/50 transition-all active:scale-[0.98] mt-4"
                >
                  Cargar más resultados ({filteredData.length - visibleCount})
                </button>
              )}
            </div>
          ) : (
            <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-6xl">event_busy</span>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase">Sin resultados</p>
                <p className="text-[10px]">No hay sorteos registrados con ese criterio.</p>
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
