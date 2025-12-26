import React, { useState, useEffect } from 'react';
import { LotteryId } from '../types';
import { NotificationService, SmartAlert } from '../services/notificationService';

interface SmartAlertsProps {
  lotteryId: LotteryId;
  isVisible: boolean;
  onClose: () => void;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ lotteryId, isVisible, onClose }) => {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const themeColor = isLottoActivo ? 'text-blue-500' : 'text-primary';
  const bgColor = isLottoActivo ? 'bg-blue-500/10' : 'bg-primary/10';

  useEffect(() => {
    if (isVisible) {
      loadAlerts();
    }
  }, [isVisible, lotteryId, filter]);

  const loadAlerts = () => {
    const allAlerts = NotificationService.getStoredAlerts()
      .filter(alert => alert.lotteryId === lotteryId);
    
    const filtered = filter === 'unread' 
      ? allAlerts.filter(alert => !alert.isRead)
      : allAlerts;
    
    setAlerts(filtered.slice(0, 20)); // Mostrar máximo 20
  };

  const handleMarkAsRead = (alertId: string) => {
    NotificationService.markAsRead(alertId);
    loadAlerts();
  };

  const getAlertIcon = (type: SmartAlert['type']) => {
    switch (type) {
      case 'hot_streak': return '🔥';
      case 'cold_awakening': return '😴';
      case 'pattern_detected': return '🔄';
      case 'high_confidence': return '🎯';
      default: return '📊';
    }
  };

  const getAlertColor = (type: SmartAlert['type']) => {
    switch (type) {
      case 'hot_streak': return 'border-red-500/30 bg-red-500/5';
      case 'cold_awakening': return 'border-blue-500/30 bg-blue-500/5';
      case 'pattern_detected': return 'border-purple-500/30 bg-purple-500/5';
      case 'high_confidence': return 'border-green-500/30 bg-green-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
      <div className="w-full max-w-md mx-auto bg-background-light dark:bg-background-dark rounded-t-3xl max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 py-4 border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">Alertas Inteligentes</h2>
            <button 
              onClick={onClose}
              className="size-8 rounded-full bg-black/5 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === 'unread' 
                  ? `${bgColor} ${themeColor}` 
                  : 'bg-black/5 opacity-60'
              }`}
            >
              Sin Leer ({NotificationService.getUnreadCount(lotteryId)})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === 'all' 
                  ? `${bgColor} ${themeColor}` 
                  : 'bg-black/5 opacity-60'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-6">
          {alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-2xl p-4 border transition-all ${getAlertColor(alert.type)} ${
                    !alert.isRead ? 'shadow-sm' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-2xl shrink-0">
                      {alert.animal.emoji}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getAlertIcon(alert.type)}</span>
                        <h3 className="font-black text-sm">{alert.title}</h3>
                        {!alert.isRead && (
                          <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                        )}
                      </div>
                      
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-2 leading-relaxed">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold opacity-60">
                            {alert.animal.name} #{alert.animal.number}
                          </span>
                          <div className="size-1 rounded-full bg-black/20"></div>
                          <span className={`text-xs font-bold ${themeColor}`}>
                            {alert.confidence.toFixed(1)}%
                          </span>
                        </div>
                        
                        {!alert.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
                          >
                            Marcar leída
                          </button>
                        )}
                      </div>
                      
                      <div className="text-[10px] opacity-40 mt-2">
                        {new Date(alert.timestamp).toLocaleString('es-ES')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center opacity-30">
              <span className="material-symbols-outlined text-6xl mb-4 block">notifications_off</span>
              <p className="font-bold">No hay alertas {filter === 'unread' ? 'sin leer' : 'disponibles'}</p>
              <p className="text-xs mt-1">Las alertas aparecerán cuando se detecten patrones importantes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAlerts;