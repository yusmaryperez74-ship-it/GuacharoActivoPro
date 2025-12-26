import React, { useState } from 'react';
import { LotteryId, Animal } from '../types';
import { ANIMALS } from '../constants';
import { RealResultsService } from '../services/realResultsService';

interface ManualResultEntryProps {
  lotteryId: LotteryId;
  isVisible: boolean;
  onClose: () => void;
  onResultAdded: (hour: string, animal: Animal) => void;
}

const DRAW_HOURS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00'
];

const ManualResultEntry: React.FC<ManualResultEntryProps> = ({ 
  lotteryId, 
  isVisible, 
  onClose, 
  onResultAdded 
}) => {
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isLottoActivo = lotteryId === 'LOTTO_ACTIVO';
  const themeColor = isLottoActivo ? 'text-blue-500' : 'text-primary';
  const bgColor = isLottoActivo ? 'bg-blue-500/10' : 'bg-primary/10';

  const filteredAnimals = ANIMALS.filter(animal => 
    animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.number.includes(searchTerm)
  );

  const handleSubmit = async () => {
    if (!selectedHour || !selectedAnimal) return;

    setIsSubmitting(true);
    try {
      // Agregar resultado usando el servicio de resultados reales
      const today = new Date();
      const venezuelaTime = new Date(today.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
      const dateStr = venezuelaTime.toISOString().split('T')[0];
      
      const success = RealResultsService.addManualResult(lotteryId, dateStr, selectedHour, selectedAnimal);
      
      if (success) {
        // Notificar al componente padre
        onResultAdded(selectedHour, selectedAnimal);
        
        // Limpiar formulario
        setSelectedHour('');
        setSelectedAnimal(null);
        setSearchTerm('');
        
        onClose();
        console.log(`✅ Manual result added: ${dateStr} ${selectedHour} - ${selectedAnimal.name}`);
      } else {
        console.warn('⚠️ Result already exists or failed to add');
      }
    } catch (error) {
      console.error('❌ Error adding manual result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background-light dark:bg-background-dark rounded-3xl max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-6 py-4 border-b border-black/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black">Reportar Resultado</h2>
            <button 
              onClick={onClose}
              className="size-8 rounded-full bg-black/5 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          <p className="text-xs opacity-60">
            Ayuda a la comunidad reportando resultados verificados de {isLottoActivo ? 'Lotto Activo' : 'Guácharo Activo'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Selección de Hora */}
          <div>
            <label className="block text-sm font-bold mb-3">Hora del Sorteo</label>
            <div className="grid grid-cols-3 gap-2">
              {DRAW_HOURS.map(hour => (
                <button
                  key={hour}
                  onClick={() => setSelectedHour(hour)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    selectedHour === hour 
                      ? `${bgColor} ${themeColor} border-2 border-current` 
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>

          {/* Búsqueda de Animal */}
          <div>
            <label className="block text-sm font-bold mb-3">Animal Ganador</label>
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-30">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre o número..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredAnimals.slice(0, 10).map(animal => (
                <button
                  key={animal.id}
                  onClick={() => {
                    setSelectedAnimal(animal);
                    setSearchTerm(animal.name);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedAnimal?.id === animal.id
                      ? `${bgColor} ${themeColor} border-2 border-current`
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  <div className="size-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-2xl">
                    {animal.emoji}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">{animal.name}</div>
                    <div className="text-xs opacity-60">#{animal.number}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          {selectedHour && selectedAnimal && (
            <div className={`${bgColor} rounded-2xl p-4`}>
              <h3 className="font-bold text-sm mb-2">Resumen del Reporte</h3>
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-2xl">
                  {selectedAnimal.emoji}
                </div>
                <div>
                  <div className="font-bold">{selectedAnimal.name} (#{selectedAnimal.number})</div>
                  <div className="text-sm opacity-60">Sorteo de las {selectedHour}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="p-6 pt-0">
          <button
            onClick={handleSubmit}
            disabled={!selectedHour || !selectedAnimal || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold transition-all ${
              selectedHour && selectedAnimal && !isSubmitting
                ? `${isLottoActivo ? 'bg-blue-600' : 'bg-primary'} text-${isLottoActivo ? 'white' : 'black'} hover:scale-[0.98]`
                : 'bg-black/10 text-black/30 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Reportando...</span>
              </div>
            ) : (
              'Reportar Resultado'
            )}
          </button>
          
          <p className="text-center text-xs opacity-40 mt-3">
            Los resultados reportados serán verificados por la comunidad
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualResultEntry;