
import React from 'react';
import { View } from '../types';

interface NavbarProps {
  activeView: View;
  onNavigate: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onNavigate }) => {
  const items = [
    { view: View.DASHBOARD, label: 'Inicio', icon: 'home' },
    { view: View.HISTORY, label: 'Historial', icon: 'history' },
    { view: View.TRENDS, label: 'Tendencias', icon: 'bar_chart' },
    { view: View.PREMIUM, label: 'Ajustes', icon: 'settings' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 w-full bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl border-t border-black/5 flex justify-around items-center py-4 pb-8 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {items.map((item) => {
        const isActive = activeView === item.view;
        return (
          <button 
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-yellow-600 dark:text-primary' : 'text-text-sub-light dark:text-gray-500'}`}
          >
            <span className={`material-symbols-outlined text-2xl ${isActive ? 'icon-filled' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
            {isActive && <div className="size-1 rounded-full bg-primary mt-0.5 animate-pulse"></div>}
          </button>
        );
      })}
    </div>
  );
};

export default Navbar;
