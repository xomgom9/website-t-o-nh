import React, { useState, useEffect, useRef } from 'react';

interface PinLockProps {
  onUnlock: () => void;
  defaultPin: string;
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock, defaultPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePinChange = (value: string) => {
    if (error) return;
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setPin(value);
      if (value.length === 6) {
        if (value === defaultPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setError(false);
            setPin('');
          }, 1000);
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (error) return;
      
      // Only handle Backspace here if needed, but the hidden input usually handles it.
      // We'll rely on the hidden input for numeric entry to avoid double-triggering.
      if (e.key === 'Backspace') {
        // handlePinChange(pin.slice(0, -1)); 
        // Actually, the input's onChange will handle backspace naturally.
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, error]);

  // Keep focus on the hidden input to trigger numeric keyboard on mobile
  useEffect(() => {
    const interval = setInterval(() => {
      if (!error) inputRef.current?.focus();
    }, 100);
    return () => clearInterval(interval);
  }, [error]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4 overflow-y-auto"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative z-10 my-auto">
        <div className="mb-6 sm:mb-8 inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3 tracking-tight">Nano Banana Pro</h2>
        <p className="text-zinc-400 mb-6 sm:mb-10 text-sm sm:text-base font-medium">Vui lòng nhập mã PIN bảo mật</p>
        
        <div className="space-y-6 sm:space-y-8">
          <div className="flex justify-center gap-2 sm:gap-3">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className={`w-10 h-14 sm:w-12 sm:h-16 rounded-xl border-2 flex items-center justify-center text-xl sm:text-2xl font-bold transition-all duration-200 ${
                  error ? 'border-red-500 bg-red-500/10 text-red-500 animate-shake' : 
                  pin.length > i ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 
                  'border-zinc-800 bg-zinc-900/50 text-zinc-700'
                }`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          <input
            ref={inputRef}
            type="tel"
            pattern="[0-9]*"
            inputMode="numeric"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
            maxLength={6}
          />

          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((val, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (val === 'del') handlePinChange(pin.slice(0, -1));
                  else if (typeof val === 'number') handlePinChange(pin + val);
                }}
                disabled={val === '' || error}
                className={`h-14 sm:h-16 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold transition-all ${
                  val === '' ? 'opacity-0' : 
                  val === 'del' ? 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 active:bg-zinc-700' : 
                  'bg-zinc-800/50 text-white hover:bg-zinc-800 hover:text-amber-500 active:scale-95 active:bg-zinc-700'
                } ${error ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {val === 'del' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : val}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-8 sm:mt-12 pt-6 border-t border-zinc-800/50">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-bold">Encrypted Access • Gemini AI</p>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};
