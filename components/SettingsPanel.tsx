
import React from 'react';
import { AspectRatio, ImageSize, GenerationConfig } from '../types';

interface SettingsPanelProps {
  config: GenerationConfig;
  onChange: (newConfig: GenerationConfig) => void;
  disabled: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onChange, disabled }) => {
  
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
    </div>
  );
};
