import React from 'react';
import { GenerationSession } from '../types';
import { Button } from './Button';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: GenerationSession[];
  onSelectSession: (session: GenerationSession) => void;
  onClearHistory: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelectSession,
  onClearHistory
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Creation History</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                <p>No history yet.</p>
                <p className="text-xs mt-1">Generate images to see them here.</p>
              </div>
            ) : (
              history.map((session) => (
                <div 
                  key={session.id} 
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                  className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-750 hover:ring-1 hover:ring-indigo-500 transition group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded">
                      {new Date(session.timestamp).toLocaleDateString()} • {new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-2 mb-2 font-medium">
                    {session.prompt}
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {session.images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="aspect-square rounded overflow-hidden bg-slate-900">
                        <img src={img.url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <Button 
                variant="secondary" 
                onClick={onClearHistory} 
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/30"
            >
                Clear History
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
