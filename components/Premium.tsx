import React from 'react';

interface PremiumProps {
  onClose: () => void;
}

const Premium: React.FC<PremiumProps> = ({ onClose }) => {
  const [settings, setSettings] = React.useState({
    autoRefresh: true,
    soundAlerts: false,
    confidenceThreshold: 'MODERADA',
    maxPredictions: 5,
    historicalDepth: 200,
    enableSmartAlerts: true,
    alertTypes: {
      hotStreak: true,
      coldAwakening: true,
      patterns: true,
      highConfidence: true
    }
  });

  const handleSave = () => {
    localStorage.setItem('app_settings_v2', JSON.stringify(settings));
    onClose();
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('app_settings_v2');
    if (saved) {
      try {
        setSettings({ ...settings, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 pt-10 pb-6 flex items-center justify-between border-b border-black/5">
          <h1 className="text-xl font-black">Configuración Avanzada</h1>
          <button 
            onClick={onClose}
            className="size-10 rounded-full bg-black/5 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="px-6 py-6 space-y-6">
          {/* Configuración General */}
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black mb-4">General</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Actualización Automática</h3>
                  <p className="text-xs opacity-60">Sincronizar resultados cada 5 minutos</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoRefresh: !s.autoRefresh }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.autoRefresh ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Alertas Sonoras</h3>
                  <p className="text-xs opacity-60">Sonido cuando hay nuevas alertas</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, soundAlerts: !s.soundAlerts }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.soundAlerts ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.soundAlerts ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Configuración de Predicciones */}
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black mb-4">Predicciones</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-2">Umbral de Confianza Mínimo</h3>
                <select
                  value={settings.confidenceThreshold}
                  onChange={(e) => setSettings(s => ({ ...s, confidenceThreshold: e.target.value }))}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl py-2 px-3 text-sm font-bold"
                >
                  <option value="ARRIESGADA">Mostrar todas (incluye arriesgadas)</option>
                  <option value="MODERADA">Solo moderadas y seguras</option>
                  <option value="SEGURA">Solo predicciones seguras</option>
                </select>
              </div>

              <div>
                <h3 className="font-bold text-sm mb-2">Número de Predicciones</h3>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={settings.maxPredictions}
                  onChange={(e) => setSettings(s => ({ ...s, maxPredictions: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs opacity-60 mt-1">
                  <span>3</span>
                  <span className="font-bold">{settings.maxPredictions}</span>
                  <span>8</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm mb-2">Profundidad Histórica</h3>
                <select
                  value={settings.historicalDepth}
                  onChange={(e) => setSettings(s => ({ ...s, historicalDepth: parseInt(e.target.value) }))}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl py-2 px-3 text-sm font-bold"
                >
                  <option value={100}>100 sorteos (análisis rápido)</option>
                  <option value={200}>200 sorteos (recomendado)</option>
                  <option value={500}>500 sorteos (análisis profundo)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuración de Alertas */}
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black mb-4">Alertas Inteligentes</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Habilitar Alertas</h3>
                  <p className="text-xs opacity-60">Sistema de notificaciones inteligentes</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, enableSmartAlerts: !s.enableSmartAlerts }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.enableSmartAlerts ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.enableSmartAlerts ? 'translate-x-6' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>

              {settings.enableSmartAlerts && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  {Object.entries({
                    hotStreak: { label: 'Rachas Calientes', desc: 'Animales con 3+ apariciones recientes' },
                    coldAwakening: { label: 'Despertar de Dormidos', desc: 'Animales dormidos con potencial' },
                    patterns: { label: 'Patrones Cíclicos', desc: 'Detección de ciclos temporales' },
                    highConfidence: { label: 'Alta Confianza', desc: 'Predicciones con 15%+ probabilidad' }
                  }).map(([key, config]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs">{config.label}</h4>
                        <p className="text-[10px] opacity-60">{config.desc}</p>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ 
                          ...s, 
                          alertTypes: { ...s.alertTypes, [key]: !s.alertTypes[key as keyof typeof s.alertTypes] }
                        }))}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          settings.alertTypes[key as keyof typeof settings.alertTypes] ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.alertTypes[key as keyof typeof settings.alertTypes] ? 'translate-x-5' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black mb-4">Sistema</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="opacity-60">Versión</span>
                <span className="font-bold">2.0.0 Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Motor IA</span>
                <span className="font-bold">Gemini 3 Flash</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Algoritmo</span>
                <span className="font-bold">Híbrido Avanzado</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Última Actualización</span>
                <span className="font-bold">Hoy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-black/5">
        <button
          onClick={handleSave}
          className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all text-black font-bold py-4 rounded-2xl"
        >
          Guardar Configuración
        </button>
      </div>
    </div>
  );
};

export default Premium;