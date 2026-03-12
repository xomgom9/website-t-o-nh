import React, { useState } from 'react';

interface PinLockProps {
  onUnlock: () => void;
  defaultPin: string;
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock, defaultPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePinChange = (value: string) => {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617] p-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl text-center relative z-10">
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Nano Studio</h2>
        <p className="text-slate-400 mb-10 font-medium">Vui lòng nhập mã PIN bảo mật</p>
        
        <div className="space-y-8">
          <div className="flex justify-center gap-3">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                  error ? 'border-red-500 bg-red-500/10 text-red-500 animate-shake' : 
                  pin.length > i ? 'border-indigo-500 bg-indigo-500/10 text-white' : 
                  'border-slate-800 bg-slate-800/50 text-slate-600'
                }`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          <input
            type="tel"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-default"
            autoFocus
            maxLength={6}
          />

          <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((val, i) => (
              <button
                key={i}
                onClick={() => {
                  if (val === 'del') handlePinChange(pin.slice(0, -1));
                  else if (typeof val === 'number') handlePinChange(pin + val);
                }}
                disabled={val === ''}
                className={`h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${
                  val === '' ? 'opacity-0' : 
                  val === 'del' ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' : 
                  'bg-slate-800/50 text-white hover:bg-slate-700 active:scale-90'
                }`}
              >
                {val === 'del' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : val}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-slate-800/50">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-bold">Encrypted Access • Gemini AI</p>
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
