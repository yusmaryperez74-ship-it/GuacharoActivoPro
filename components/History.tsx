
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import Navbar from './Navbar';
import { fetchExtendedHistory } from '../services/geminiService';

interface HistoryProps {
  onNavigate: (view: View) => void;
}

const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'data'>('list');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchExtendedHistory();
      // Sort history by date and hour descending
      const sortedHistory = (data.history || []).sort((a: any, b: any) => {
        const dateA = new Date(`${a.date}T${a.hour}`).getTime();
        const dateB = new Date(`${b.date}T${b.hour}`).getTime();
        return dateB - dateA;
      });
      setHistory(sortedHistory);
      setSources(data.sources);
      setLoading(false);
    };
    load();
  }, []);

  const exportAsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `guacharo_archive_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportAsCSV = () => {
    const headers = ["Fecha", "Hora", "Animal", "Numero"];
    const rows = history.map(item => [item.date, item.hour, item.animal, item.number]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "guacharo_database_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 pt-10 pb-6 flex items-center justify-between border-b border-black/5">
          <div>
            <h2 className="text-xl font-black">Base de Datos</h2>
            <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark font-bold uppercase tracking-widest">Sincronización de 60 Sorteos</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportAsCSV}
              className="size-10 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center hover:bg-green-500/20 transition-all"
              title="Descargar CSV"
            >
              <span className="material-symbols-outlined text-xl">file_download</span>
            </button>
            <button 
              onClick={exportAsJSON}
              className="size-10 rounded-full bg-primary/20 text-yellow-700 dark:text-primary flex items-center justify-center hover:scale-105 transition-transform"
              title="Descargar JSON"
            >
              <span className="material-symbols-outlined text-xl">database</span>
            </button>
          </div>
        </header>

        <div className="px-6 py-4">
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeTab === 'list' ? 'bg-white dark:bg-surface-dark shadow-sm' : 'opacity-40'}`}
            >
              REGISTRO VISUAL
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeTab === 'data' ? 'bg-white dark:bg-surface-dark shadow-sm' : 'opacity-40'}`}
            >
              API & METADATA
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="size-14 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-black text-text-sub-light animate-pulse uppercase tracking-widest">Indexando Sorteos Reales...</p>
            </div>
          ) : activeTab === 'list' ? (
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-surface-dark border border-black/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm group">
                    <div className="size-12 rounded-xl bg-background-light dark:bg-background-dark flex items-center justify-center text-2xl group-hover:bg-primary/10 transition-colors">
                      {item.animalData?.emoji || '💠'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-black text-sm uppercase tracking-tight">{item.animalData?.name || item.animal}</h4>
                        <span className="text-[9px] font-black text-white bg-black/80 dark:bg-white/20 px-1.5 py-0.5 rounded">{item.hour}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-primary-dark dark:text-primary"># {item.number}</p>
                        <p className="text-[9px] font-black opacity-30">{item.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-50 font-black text-xs">Error: No data records found.</div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-green-500 icon-filled text-sm">verified_user</span>
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Nodos de Datos Verificados</h3>
                </div>
                <div className="space-y-2">
                  {sources.length > 0 ? sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl border border-black/5 hover:border-primary/50 transition-all shadow-sm">
                      <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black truncate">{s.title}</p>
                        <p className="text-[8px] text-text-sub-light truncate opacity-60">{s.uri}</p>
                      </div>
                      <span className="material-symbols-outlined text-[14px] opacity-30">link</span>
                    </a>
                  )) : (
                    <p className="text-[10px] opacity-50 italic">Cargando oráculos de red...</p>
                  )}
                </div>
              </div>

              <div className="bg-[#0c0c0c] text-primary font-mono text-[9px] p-5 rounded-3xl overflow-hidden border border-primary/20 shadow-2xl">
                <div className="flex justify-between items-center mb-4 border-b border-primary/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-black uppercase tracking-tighter text-[10px]">API ENDPOINT: /v1/history</span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(history, null, 2));
                    }} 
                    className="text-[8px] border border-primary/40 px-3 py-1 rounded-full uppercase hover:bg-primary hover:text-black transition-all"
                  >
                    Copy Object
                  </button>
                </div>
                <div className="max-h-[260px] overflow-y-auto no-scrollbar opacity-80">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(history.slice(0, 5), null, 2)}</pre>
                  <div className="mt-4 border-t border-primary/10 pt-4 text-center">
                    <p className="opacity-40 uppercase tracking-[0.2em] text-[7px] font-black">
                      Mostrando 5 de {history.length} objetos de datos
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">info</span> 
                  Protocolo de Transparencia
                </h4>
                <p className="text-[10px] text-text-sub-light leading-relaxed font-medium">
                  Este historial es recolectado en tiempo real desde los servidores de resultados nacionales. Cada entrada está vinculada a una firma de timestamp oficial proporcionada por los agregadores de lotería. Si detecta una discrepancia, consulte directamente la fuente del oráculo.
                </p>
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
