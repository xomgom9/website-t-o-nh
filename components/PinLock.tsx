import React, { useState } from 'react';

interface PinLockProps {
  onUnlock: () => void;
  defaultPin: string;
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock, defaultPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === defaultPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Yêu cầu mã PIN</h2>
        <p className="text-slate-400 mb-8">Vui lòng nhập mã PIN để truy cập Nano Studio</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Nhập mã PIN..."
              className={`w-full bg-slate-800 border ${error ? 'border-red-500 animate-shake' : 'border-slate-700'} rounded-xl py-4 px-6 text-center text-2xl tracking-[1em] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
              autoFocus
            />
            {error && (
              <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-500">Mã PIN không chính xác. Vui lòng thử lại.</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Mở khóa
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500">Nano Studio v2.0 • Bảo mật bởi Gemini</p>
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
