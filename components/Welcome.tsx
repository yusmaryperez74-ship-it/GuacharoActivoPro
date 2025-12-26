
import React from 'react';

interface WelcomeProps {
  onStart: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="flex h-full flex-col overflow-y-auto pb-10">
      <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 justify-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl text-neutral-900 dark:text-primary">raven</span>
          <h2 className="text-lg font-bold">Guácharo AI</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6">
        <div className="w-full py-4">
          <div 
            className="w-full bg-center bg-no-repeat bg-cover rounded-xl min-h-[260px] shadow-sm relative overflow-hidden"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCJUgY2dz843-ryUKigSezmyDOUspjGfJ3fAl_WNULah1obivT1ozBap7QbOJ2wETmSzA3gTkQLDeK6UGYY6Nlhq0U73PcSyW6qKBWW7IvzNLKKuKWRYFFULaMdmBKnje4xNsYkyBGje4TEW-NGRDsWothPJkvkdKSa2K-QSv90vLjA3Mzn4minzsua7oO6rcbPgV4AJAEwGSBmGOJY8kfDXlIC2rt08KXSCDMMmPCE_vmxS5b9vCRiOoxTyu-JJb3JqdvRI7jHVe4K")' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background-light/20 to-transparent dark:from-background-dark/40"></div>
          </div>
        </div>

        <h1 className="text-neutral-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight text-center pt-2">
          Predicciones <br /><span className="text-yellow-600 dark:text-primary">Inteligentes</span>
        </h1>

        <p className="text-neutral-600 dark:text-neutral-300 text-base font-normal leading-relaxed py-6 text-center">
          Nuestra inteligencia artificial analiza miles de datos históricos para ofrecerte las mejores probabilidades para la Lotería del Guácharo.
        </p>

        <div className="w-full mb-8">
          <div className="relative overflow-hidden rounded-xl shadow-lg h-36">
            <div 
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA3h-_x5l-vcc2cdOaCmLSC9MCrZowNu1O6-oK9fvXgIFrWVEMMCMgYoLo78KdqEpeHxQtli9wbHsUMon2WEX5N-xSfY3RYIZBfjLzLJkEIRnWVxjlzQxXBGcpyHEquOXuQakoMMhy5d8GQIgLW7q5UHXXsE0zRgbBAV5-kfQMeHF6GzoR5VgZ_FoxHpCxZ6aOTDluOCNcgMWua0KyaqrLG82Glpc_y-kZdfaoSCn9HGCm3rd9PYEI91wlpNFB7owYLZ08WEypxTieB")' }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90 z-10"></div>
            <div className="relative z-20 p-5 flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span className="text-xs font-bold uppercase tracking-wider">Aviso Legal</span>
              </div>
              <p className="text-white text-lg font-bold leading-tight">Descargo de Responsabilidad</p>
              <p className="text-gray-300 text-xs font-medium leading-relaxed">
                Pronósticos basados en estadística. No garantizamos resultados. Juega con responsabilidad.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={onStart}
          className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 text-black font-bold text-lg h-14 rounded-full shadow-lg flex items-center justify-center gap-2"
        >
          <span>Comenzar Análisis</span>
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>
        </button>
        
        <div className="flex justify-center gap-6 mt-6">
          <a className="text-xs text-neutral-400 dark:text-neutral-500" href="#">Privacidad</a>
          <a className="text-xs text-neutral-400 dark:text-neutral-500" href="#">Términos</a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
