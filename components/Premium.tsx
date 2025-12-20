
import React from 'react';

interface PremiumProps {
  onClose: () => void;
}

const Premium: React.FC<PremiumProps> = ({ onClose }) => {
  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center p-6 pt-10 justify-between">
          <button 
            onClick={onClose}
            className="bg-black/20 backdrop-blur-md rounded-full text-white flex size-10 shrink-0 items-center justify-center hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <button className="text-white/90 text-sm font-medium hover:text-white transition-colors backdrop-blur-sm px-4 py-1.5 rounded-full bg-black/20">Restaurar</button>
        </div>

        <div className="relative w-full">
          <div 
            className="bg-cover bg-center flex flex-col justify-end overflow-hidden min-h-[380px] rounded-b-[3rem] relative"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCgnX_Wl4nY4upZb8JPRN-Yw6H_I1VU4yN0IHnL5mB1yJ0y1LG2I3ntbLttbjbkWsJdSyUC7j0UlrDMz6Sh96s9zM6Y7f9kPYyTOuYsVjd7sXrLhHoQdVJOhDvK-sVnzjehotJbyfx-pixdWZj7Z7S7XJUvi9Pr4BAnfsPIN8YbzgHFBZkgU4JL02GH-9Cw4WQPJ3WTp-RcBgsTbu9kh3BPjjvCvVvfj7hjMqCrKQa9ZWfoBZ1qbnIpe4z-npgRwXbqa3sS9q_HV7DH")' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/40 dark:via-background-dark/40 to-transparent"></div>
            <div className="relative z-10 flex flex-col p-6 pb-8 items-center text-center">
              <div className="bg-primary text-black text-[10px] font-black px-4 py-1 rounded-full mb-4 uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                MEJOR VALOR
              </div>
              <h1 className="text-text-main-light dark:text-white tracking-tight text-3xl font-black leading-tight mb-2">
                Desbloquea tu Suerte<br />con <span className="text-yellow-600 dark:text-primary">IA Premium</span>
              </h1>
              <p className="text-text-sub-light dark:text-text-sub-dark text-sm font-medium leading-relaxed max-w-[280px]">
                Predicciones 3x más precisas para la Lotería del Guácharo usando Machine Learning.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-3 pb-8 -mt-4 relative z-20">
          {[
            { title: 'Modelos Avanzados de IA', desc: 'Algoritmos de aprendizaje profundo.', icon: 'neurology' },
            { title: 'Top 10 Animalitos Diarios', desc: 'Mayor probabilidad de acierto.', icon: 'trending_up' },
            { title: 'Sin Publicidad', desc: 'Navegación 100% fluida y rápida.', icon: 'block' }
          ].map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-black/5">
              <div className="flex items-center justify-center rounded-full bg-primary/20 shrink-0 size-12 text-yellow-700 dark:text-primary">
                <span className="material-symbols-outlined icon-filled">{benefit.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black leading-tight">{benefit.title}</h3>
                <p className="text-text-sub-light dark:text-text-sub-dark text-xs mt-0.5">{benefit.desc}</p>
              </div>
              <div className="shrink-0 text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined icon-filled">check_circle</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-10">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-1.5 flex shadow-sm border border-black/5 relative mb-6">
            <button className="flex-1 py-4 flex flex-col items-center justify-center rounded-xl relative z-0 opacity-40">
              <span className="text-xs font-bold">Mensual</span>
              <span className="text-xl font-black">$4.99</span>
            </button>
            <div className="w-1/2 absolute top-1.5 bottom-1.5 right-1.5 border-2 border-primary rounded-xl z-10 flex flex-col items-center justify-center">
               <div className="absolute -top-3 bg-primary text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  AHORRA 33%
              </div>
              <span className="text-xs font-black">Anual</span>
              <span className="text-xl font-black">$39.99</span>
              <span className="text-[9px] text-text-sub-light mt-0.5">Solo $3.33/mes</span>
            </div>
          </div>

          <button className="w-full bg-primary hover:bg-primary-dark text-black text-lg font-black py-4 rounded-full shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
            Suscribirse Ahora
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          <p className="text-center text-[10px] text-text-sub-light mt-4 px-10">
            La suscripción se renueva automáticamente. Cancela en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Premium;
