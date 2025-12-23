
import React, { useState, useEffect } from 'react';
import { View, LotteryId } from './types';
import Welcome from './components/Welcome';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Trends from './components/Trends';
import Premium from './components/Premium';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.WELCOME);
  const [selectedLottery, setSelectedLottery] = useState<LotteryId>('GUACHARO');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const renderView = () => {
    switch (currentView) {
      case View.WELCOME:
        return <Welcome onStart={() => setCurrentView(View.DASHBOARD)} />;
      case View.DASHBOARD:
        return <Dashboard 
          lotteryId={selectedLottery}
          onLotteryChange={setSelectedLottery}
          onNavigate={(view) => setCurrentView(view)} 
          toggleDarkMode={toggleDarkMode} 
          isDarkMode={isDarkMode} 
        />;
      case View.HISTORY:
        return <History 
          lotteryId={selectedLottery}
          onNavigate={(view) => setCurrentView(view)} 
        />;
      case View.TRENDS:
        return <Trends 
          lotteryId={selectedLottery}
          onNavigate={(view) => setCurrentView(view)} 
          onBack={() => setCurrentView(View.DASHBOARD)} 
        />;
      case View.PREMIUM:
        return <Premium onClose={() => setCurrentView(View.DASHBOARD)} />;
      default:
        return <Welcome onStart={() => setCurrentView(View.DASHBOARD)} />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-200 dark:bg-black overflow-hidden">
      <div className="relative h-full w-full max-w-md overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl transition-all duration-300">
        {renderView()}
      </div>
    </div>
  );
};

export default App;
