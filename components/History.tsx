
import React from 'react';
import { View } from '../types';
import Navbar from './Navbar';
import { ANIMALS } from '../constants';

interface HistoryProps {
  onNavigate: (view: View) => void;
}

const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const mockHistory = [
    { time: '12:00 PM', prediction: ANIMALS[1], result: ANIMALS[1], isWin: true },
    { time: '11:00 AM', prediction: ANIMALS[11], result: ANIMALS[3], isWin: false },
    { time: '10:00 AM', prediction: ANIMALS[15], result: ANIMALS[15], isWin: true },
    { time: '09:00 AM', prediction: ANIMALS[5], result: ANIMALS[5], isWin: true },
  ];

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 py-10 flex items-center justify-between border-b border-black/5">
          <h2 className="text-xl font-black">Historial</h2>
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-full size-10 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
          </div>
        </header>

        <div className="px-6 py-6 space-y-6">
          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl bg-white dark:bg-surface-dark border border-black/5 p-4 flex flex-col items-center text-center shadow-sm">
              <p className="text-2xl font-black">78%</p>
              <p className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">Efectividad</p>
            </div>
            <div className="flex-1 rounded-2xl bg-white dark:bg-surface-dark border border-black/5 p-4 flex flex-col items-center text-center shadow-sm">
              <p className="text-2xl font-black">12/15</p>
              <p className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">Aciertos</p>
            </div>
          </div>

          <div className="space-y-3">
            {mockHistory.map((item, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border border-black/5 shadow-sm p-4 flex flex-col gap-3">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.isWin ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-sub-light">{item.time}</span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${item.isWin ? 'bg-primary/20 text-yellow-800 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <span className="text-[10px] font-black uppercase">{item.isWin ? 'Acierto' : 'Fallido'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-background-light dark:bg-background-dark border border-black/5">
                    <div className="text-xl">{item.prediction.emoji}</div>
                    <p className="font-bold text-[10px] truncate">{item.prediction.name}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300">arrow_forward</span>
                  <div className={`flex-1 flex flex-col items-center p-2 rounded-xl border ${item.isWin ? 'bg-primary/10 border-primary/30' : 'bg-gray-50 dark:bg-gray-800 border-black/5'}`}>
                    <div className="text-xl">{item.result.emoji}</div>
                    <p className="font-bold text-[10px] truncate">{item.result.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Navbar activeView={View.HISTORY} onNavigate={onNavigate} />
    </div>
  );
};

export default History;
