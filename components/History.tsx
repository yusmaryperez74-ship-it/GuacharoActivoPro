
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Animal } from '../types';
import Navbar from './Navbar';
// Importing TARGET_URL to resolve reference errors
import { fetchExtendedHistory, TARGET_URL } from '../services/geminiService';
import { ANIMALS } from '../constants';

interface HistoryProps {
  onNavigate: (view: View) => void;
}

const PAGE_SIZE = 20;

const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'data'>('list');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async (force: boolean = false) => {
    if (force) localStorage.removeItem('guacharo_last_fetch_v4');
    setLoading(true);
    try {
      const data = await fetchExtendedHistory();
      const sortedHistory = (data.history || []).sort((a: any, b: any) => {
        const dateA = new Date(`${a.date}T${a.hour}`).getTime();
        const dateB = new Date(`${b.date}T${b.hour}`).getTime();
        return dateB - dateA;
      });
      setHistory(sortedHistory);
      setSources(data.sources || []);
      setVisibleCount(PAGE_SIZE);
    } catch (e) {
      console.error("Error loading history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const animalName = (item.animalData?.name || item.animal || "").toLowerCase();
      const animalNum = (item.animalData?.number || item.number || "").toString();
      const animalId = item.animalData?.id || item.number;

      const matchesSearch = searchTerm 
        ? (animalName.includes(searchTerm.toLowerCase()) || animalNum.includes(searchTerm))
        : true;
        
      const matchesDate = filterDate ? item.date === filterDate : true;
      const matchesAnimal = selectedAnimalId ? animalId === selectedAnimalId : true;
      
      return matchesSearch && matchesDate && matchesAnimal;
    });
  }, [history, searchTerm, filterDate, selectedAnimalId]);

  const displayedHistory = useMemo(() => {
    return filteredHistory.slice(0, visibleCount);
  }, [filteredHistory, visibleCount]);

  const loadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setSelectedAnimalId(null);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-black/5">
          <div className="px-6 pt-10 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black">Base de Datos</h2>
                <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark font-bold uppercase tracking-widest">
                  {loading ? 'Sincronizando...' : `${history.length} Sorteos Extraídos`}
                </p>
              </div>
              <button 
                onClick={() => loadData(true)}
                className={`size-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center transition-all ${loading ? 'animate-spin opacity-50' : 'active:scale-90'}`}
              >
                <span className="material-symbols-outlined text-xl">sync</span>
              </button>
            </div>

            <div className="flex gap-2 items-center mb-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar animal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:ring-1 focus:ring-primary"
                />
              </div>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-black/5 dark:bg-white/5 border-none rounded-xl py-2.5 px-3 text-[10px] font-black w-28 appearance-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {ANIMALS.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAnimalId(selectedAnimalId === animal.id ? null : animal.id)}
                  className={`shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    selectedAnimalId === animal.id ? 'bg-primary border-primary scale-105' : 'bg-white dark:bg-surface-dark border-black/5 opacity-60'
                  }`}
                >
                  <span className="text-lg">{animal.emoji}</span>
                  <span className="text-[8px] font-black">{animal.number}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="px-6 py-4">
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl mb-6">
            <button onClick={() => setActiveTab('list')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${activeTab === 'list' ? 'bg-white dark:bg-surface-dark shadow-sm' : 'opacity-40'}`}>LISTADO</button>
            <button onClick={() => setActiveTab('data')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${activeTab === 'data' ? 'bg-white dark:bg-surface-dark shadow-sm' : 'opacity-40'}`}>FUENTES</button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black opacity-40">Consultando loteriadehoy.com...</p>
            </div>
          ) : activeTab === 'list' ? (
            <div className="space-y-3">
              {displayedHistory.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-surface-dark border border-black/5 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in duration-300">
                  <div className="size-12 rounded-xl bg-background-light dark:bg-background-dark flex items-center justify-center text-2xl">
                    {item.animalData?.emoji || '💠'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm uppercase">{item.animalData?.name || item.animal}</h4>
                      <span className="text-[9px] font-black bg-black/5 px-2 py-0.5 rounded">{item.hour}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs font-bold text-primary-dark"># {item.animalData?.number || item.number}</p>
                      <p className="text-[9px] opacity-40 font-black">{item.date}</p>
                    </div>
                  </div>
                </div>
              ))}
              {visibleCount < filteredHistory.length && (
                <button onClick={loadMore} className="w-full py-4 mt-2 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase opacity-60">
                  Cargar más ({filteredHistory.length - visibleCount})
                </button>
              )}
              {filteredHistory.length === 0 && (
                <div className="text-center py-20 opacity-30">No hay registros para este filtro</div>
              )}
            </div>
          ) : (
            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
              <h3 className="text-[10px] font-black mb-3 opacity-50 uppercase">Fuente de Verificación</h3>
              {/* Using imported TARGET_URL here */}
              <a href={TARGET_URL} target="_blank" className="flex items-center gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl border border-black/5">
                <span className="material-symbols-outlined text-primary">public</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black truncate">Resultados Oficiales</p>
                  <p className="text-[8px] opacity-50 truncate">{TARGET_URL}</p>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
      <Navbar activeView={View.HISTORY} onNavigate={onNavigate} />
    </div>
  );
};

export default History;
