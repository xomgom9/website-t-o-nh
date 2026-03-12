
import React, { useState } from 'react';
import { AspectRatio, ImageSize, GenerationConfig } from '../types';
import { getActiveApiKey, setCustomApiKey, clearCustomApiKey, promptForApiKey } from '../services/geminiService';

interface SettingsPanelProps {
  config: GenerationConfig;
  onChange: (newConfig: GenerationConfig) => void;
  onApiKeyChange: () => void;
  disabled: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onChange, onApiKeyChange, disabled }) => {
  const [customKey, setCustomKey] = useState(localStorage.getItem('custom_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);

  const handleSaveKey = () => {
    if (customKey.trim()) {
      setCustomApiKey(customKey.trim());
      onApiKeyChange();
      alert('Đã lưu API Key tùy chỉnh!');
    }
  };

  const handleClearKey = () => {
    clearCustomApiKey();
    setCustomKey('');
    onApiKeyChange();
    alert('Đã xóa API Key tùy chỉnh. Hệ thống sẽ sử dụng mặc định.');
  };

  const handleSelectDefault = async () => {
    await promptForApiKey();
    onApiKeyChange();
  };
  
  const handleRatioChange = (ratio: AspectRatio) => {
    onChange({ ...config, aspectRatio: ratio });
  };

  const handleSizeChange = (size: ImageSize) => {
    onChange({ ...config, imageSize: size });
  };

  const handleBatchChange = (size: number) => {
    onChange({ ...config, batchSize: size });
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 space-y-6">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(AspectRatio).map((ratio) => (
            <button
              key={ratio}
              onClick={() => handleRatioChange(ratio)}
              disabled={disabled}
              className={`
                px-3 py-2 text-sm rounded-lg border transition-all duration-200
                ${config.aspectRatio === ratio 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Resolution (Pro)
        </label>
        <div className="flex space-x-2">
          {Object.values(ImageSize).map((size) => (
            <button
              key={size}
              onClick={() => handleSizeChange(size)}
              disabled={disabled}
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border transition-all duration-200
                ${config.imageSize === size 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Batch Size (Simultaneous)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 4, 8].map((num) => (
            <button
              key={num}
              onClick={() => handleBatchChange(num)}
              disabled={disabled}
              className={`
                px-3 py-2 text-sm rounded-lg border transition-all duration-200
                ${config.batchSize === num 
                  ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {num}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Generating more images simultaneously uses more resources.
        </p>
      </div>

      <div className="pt-6 border-t border-slate-700 space-y-4">
        <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">
          API Management
        </label>
        
        <div className="space-y-2">
          <div className="relative">
            <input 
              type={showKey ? "text" : "password"}
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Nhập API Key tùy chỉnh..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none pr-10"
            />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleSaveKey}
              className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
            >
              Lưu Key
            </button>
            <button 
              onClick={handleClearKey}
              className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded-lg transition-all"
            >
              Xóa Key
            </button>
          </div>
        </div>

        <button 
          onClick={handleSelectDefault}
          className="w-full py-2 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          Chọn Key Mặc Định
        </button>
      </div>
    </div>
  );
};
