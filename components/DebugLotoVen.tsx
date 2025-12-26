import React, { useState } from 'react';
import { LotteryId } from '../types';
import { LotoVenService } from '../services/lotovenService';

interface DebugLotoVenProps {
  isVisible: boolean;
  onClose: () => void;
}

const DebugLotoVen: React.FC<DebugLotoVenProps> = ({ isVisible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLotoVen = async (lotteryId: LotteryId) => {
    setLoading(true);
    setResults(null);
    setLogs([]);
    
    addLog(`🔍 Testing ${lotteryId} from LotoVen...`);
    
    try {
      // Override console.log temporarily to capture logs
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      console.log = (...args) => {
        addLog(`LOG: ${args.join(' ')}`);
        originalLog(...args);
      };
      
      console.warn = (...args) => {
        addLog(`WARN: ${args.join(' ')}`);
        originalWarn(...args);
      };
      
      console.error = (...args) => {
        addLog(`ERROR: ${args.join(' ')}`);
        originalError(...args);
      };

      const result = await LotoVenService.getResults(lotteryId);
      
      // Restore console
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      
      setResults(result);
      addLog(`✅ Test completed: ${result.draws.length} results found`);
      
    } catch (error: any) {
      addLog(`❌ Test failed: ${error?.message || 'Unknown error'}`);
      setResults({ draws: [], sources: ['Error'], error: error?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Debug LotoVen Integration</h2>
            <button 
              onClick={onClose}
              className="size-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => testLotoVen('GUACHARO')}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary text-black rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Guácharo'}
            </button>
            <button
              onClick={() => testLotoVen('LOTTO_ACTIVO')}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Lotto Activo'}
            </button>
          </div>

          {results && (
            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4">
              <h3 className="font-bold mb-3">Results:</h3>
              <div className="space-y-2">
                <div>
                  <strong>Draws found:</strong> {results.draws.length}
                </div>
                <div>
                  <strong>Sources:</strong> {results.sources.join(', ')}
                </div>
                {results.error && (
                  <div className="text-red-500">
                    <strong>Error:</strong> {results.error}
                  </div>
                )}
                {results.draws.length > 0 && (
                  <div>
                    <strong>Sample results:</strong>
                    <div className="mt-2 space-y-1">
                      {results.draws.slice(0, 5).map((draw: any, i: number) => (
                        <div key={i} className="text-sm bg-white/50 dark:bg-black/20 p-2 rounded">
                          {draw.hour} - {draw.animal?.name} #{draw.animal?.number} {draw.animal?.emoji}
                        </div>
                      ))}
                      {results.draws.length > 5 && (
                        <div className="text-sm opacity-60">
                          ... and {results.draws.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 max-h-60 overflow-y-auto">
            <h3 className="font-bold mb-3">Console Logs:</h3>
            <div className="space-y-1 text-sm font-mono">
              {logs.length === 0 ? (
                <div className="opacity-60">No logs yet. Click a test button to start.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`${
                    log.includes('ERROR') ? 'text-red-500' :
                    log.includes('WARN') ? 'text-yellow-500' :
                    log.includes('SUCCESS') ? 'text-green-500' :
                    'opacity-70'
                  }`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugLotoVen;