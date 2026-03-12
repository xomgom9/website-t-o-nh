
import React from 'react';
import { GeneratedImage } from '../types';
import { Button } from './Button';

interface ImageDisplayProps {
  image: GeneratedImage | null;
  isGenerating: boolean;
  batchSize?: number;
  onEdit?: () => void;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ image, isGenerating, batchSize = 4, onEdit }) => {
  if (isGenerating && !image) {
    return (
      <div className="w-full aspect-square md:aspect-video rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center p-8 animate-pulse">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-300 font-medium">Creating {batchSize} variations...</p>
        <p className="text-slate-500 text-sm mt-2">Generating simultaneously for maximum creativity.</p>
      </div>
    );
  }

  if (!image && !isGenerating) {
    return (
      <div className="w-full aspect-square md:aspect-video rounded-xl bg-slate-800/30 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-slate-400 text-lg">Your imagination awaits</p>
        <p className="text-slate-500 text-sm mt-1">Enter a prompt and click Generate</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative group rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700 bg-slate-900">
        <img 
          src={image?.url} 
          alt={image?.prompt}
          className="w-full h-auto object-contain max-h-[70vh] mx-auto"
        />
        {isGenerating && (
             <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Processing Batch...</span>
             </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6">
            <div className="text-white">
                <p className="font-medium line-clamp-1 text-sm text-slate-300">{image?.prompt}</p>
                <p className="text-xs text-slate-500">{image?.config.imageSize} • {image?.config.aspectRatio}</p>
            </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button 
                onClick={onEdit}
                variant="secondary"
                className="text-xs"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                }
              >
                Edit
              </Button>
            )}
            <a 
                href={image?.url} 
                download={`nano-banana-${Date.now()}.png`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-white text-slate-900 hover:bg-slate-200 text-xs"
            >
                Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
