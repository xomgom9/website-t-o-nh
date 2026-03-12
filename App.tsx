
import React, { useState, useEffect } from 'react';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, GenerationSession, RemixMode, RemixConfig, Workspace, WorkspaceStatus } from './types';
import { checkApiKey, promptForApiKey, generateImageFromPrompt, describeImage, generateRemix } from './services/geminiService';
import { SettingsPanel } from './components/SettingsPanel';
import { ImageDisplay } from './components/ImageDisplay';
import { ImageEditor } from './components/ImageEditor';
import { Button } from './components/Button';
import { HistorySidebar } from './components/HistorySidebar';
import { PinLock } from './components/PinLock';

const DEFAULT_CONFIG: GenerationConfig = {
  aspectRatio: AspectRatio.Square,
  imageSize: ImageSize.OneK,
  batchSize: 4
};

const DEFAULT_REMIX_CONFIG: RemixConfig = {
  creativity: 0.2,
  structureMatch: true,
  characterMatch: false
};

const createNewWorkspace = (index: number): Workspace => ({
  id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: `Project ${index + 1}`,
  activeTab: 'text-to-image',
  prompt: '',
  isGenerating: false,
  isProductMode: false,
  status: 'idle',
  remixImage: null,
  remixConfig: { ...DEFAULT_REMIX_CONFIG },
  generatedBatch: [],
  productAssets: [],
  selectedImageId: null,
  config: { ...DEFAULT_CONFIG }
});

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([createNewWorkspace(0)]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(workspaces[0].id);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [deleteSelection, setDeleteSelection] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [history, setHistory] = useState<GenerationSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('app_unlocked') === 'true';
  });
  const [error, setError] = useState<string | null>(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const updateActiveWorkspace = (updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, ...updates } : w));
  };

  useEffect(() => {
    const initAuth = async () => {
        setApiKeyReady(await checkApiKey());
    };
    initAuth();
  }, []);

  const handleGenerate = async () => {
    if (!activeWorkspace.prompt.trim()) {
      setError("Vui lòng nhập prompt.");
      return;
    }
    if (!apiKeyReady) {
        await promptForApiKey();
        setApiKeyReady(await checkApiKey());
        return;
    }

    updateActiveWorkspace({ 
        isGenerating: true, 
        status: 'generating',
        generatedBatch: [], 
        selectedImageId: null 
    });
    
    setError(null);
    const successfulImages: GeneratedImage[] = [];

    try {
      const promises = Array(activeWorkspace.config.batchSize).fill(activeWorkspace.prompt).map(async (taskPrompt, index) => {
        try {
          let imageUrl = "";
          if (activeWorkspace.activeTab === 'remix' && activeWorkspace.remixImage) {
              imageUrl = await generateRemix(activeWorkspace.remixImage, taskPrompt, activeWorkspace.remixConfig, activeWorkspace.config);
          } else {
              imageUrl = await generateImageFromPrompt(taskPrompt, activeWorkspace.config, activeWorkspace.isProductMode);
          }

          const newImg: GeneratedImage = {
            id: `${Date.now()}-${index}`,
            url: imageUrl,
            prompt: taskPrompt,
            config: { ...activeWorkspace.config },
            timestamp: Date.now(),
            isProduct: activeWorkspace.isProductMode
          };

          setWorkspaces(prev => prev.map(w => {
              if (w.id === activeWorkspaceId) {
                  const updatedBatch = [...w.generatedBatch, newImg];
                  const updatedAssets = activeWorkspace.isProductMode ? [...w.productAssets, newImg] : w.productAssets;
                  return {
                      ...w,
                      generatedBatch: updatedBatch,
                      productAssets: updatedAssets,
                      selectedImageId: updatedBatch.length === 1 ? newImg.id : w.selectedImageId
                  };
              }
              return w;
          }));
          successfulImages.push(newImg);
        } catch (e) { console.error(e); }
      });

      await Promise.allSettled(promises);
      updateActiveWorkspace({ isGenerating: false, status: 'success' });
      if (successfulImages.length > 0) {
          const newSession: GenerationSession = {
            id: Date.now().toString(),
            prompt: activeWorkspace.prompt,
            images: successfulImages,
            timestamp: Date.now(),
            config: { ...activeWorkspace.config }
          };
          setHistory(prev => [newSession, ...prev]);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
      updateActiveWorkspace({ isGenerating: false, status: 'error' });
    }
  };

  const activeImage = activeWorkspace.generatedBatch.find(img => img.id === activeWorkspace.selectedImageId) || null;

  if (!isUnlocked) {
    return (
      <PinLock 
        defaultPin="270704" 
        onUnlock={() => {
          setIsUnlocked(true);
          localStorage.setItem('app_unlocked', 'true');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-12 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-[#0f172a]/95 z-30 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Nano Studio</h1>
          </div>
          
          <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
             <button onClick={() => updateActiveWorkspace({ activeTab: 'text-to-image' })} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeWorkspace.activeTab === 'text-to-image' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Creative</button>
             <button onClick={() => updateActiveWorkspace({ activeTab: 'remix' })} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeWorkspace.activeTab === 'remix' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Remix</button>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onSelectSession={(s) => updateActiveWorkspace({ prompt: s.prompt, config: s.config, generatedBatch: s.images, selectedImageId: s.images[0]?.id })} onClearHistory={() => setHistory([])} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {isEditing && activeImage ? (
            <ImageEditor 
                imageUrl={activeImage.url} 
                productAssets={activeWorkspace.productAssets}
                onSave={(url) => { updateActiveWorkspace({ generatedBatch: activeWorkspace.generatedBatch.map(img => img.id === activeWorkspace.selectedImageId ? {...img, url} : img) }); setIsEditing(false); }} 
                onCancel={() => setIsEditing(false)} 
            />
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Side: Generation Controls */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-2xl relative">
                        <ImageDisplay image={activeImage} isGenerating={activeWorkspace.isGenerating} onEdit={() => setIsEditing(true)} />
                        
                        {(activeWorkspace.generatedBatch.length > 0 || activeWorkspace.isGenerating) && (
                            <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {activeWorkspace.generatedBatch.map((img) => (
                                    <button key={img.id} onClick={() => updateActiveWorkspace({ selectedImageId: img.id })} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${activeWorkspace.selectedImageId === img.id ? 'border-indigo-500' : 'border-slate-700'}`}>
                                        <img src={img.url} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
                                {activeWorkspace.activeTab === 'remix' ? 'Remix Logic' : activeWorkspace.isProductMode ? 'Product Studio Mode' : 'Creative Prompt'}
                            </label>
                            
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => updateActiveWorkspace({ isProductMode: !activeWorkspace.isProductMode })}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${activeWorkspace.isProductMode ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                    Product Mode
                                </button>
                            </div>
                        </div>

                        <textarea 
                            value={activeWorkspace.prompt} 
                            onChange={(e) => updateActiveWorkspace({ prompt: e.target.value })} 
                            placeholder={activeWorkspace.isProductMode ? "Mô tả sản phẩm bạn muốn tạo (ví dụ: Đồng hồ sang trọng)..." : "Mô tả ý tưởng của bạn..."}
                            className="w-full min-h-[100px] bg-slate-900/80 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        />
                        
                        <Button onClick={handleGenerate} isLoading={activeWorkspace.isGenerating} className="w-full h-12 font-bold uppercase tracking-widest">
                            {activeWorkspace.isProductMode ? 'Tạo Sản Phẩm Studio' : 'Tạo Ảnh Sáng Tạo'}
                        </Button>
                    </div>
                </div>

                {/* Right Side: Assets & Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col h-full">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Product Assets</h3>
                        <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
                            {activeWorkspace.productAssets.length === 0 ? (
                                <div className="col-span-3 py-10 text-center text-slate-600 border border-dashed border-slate-700 rounded-lg">
                                    <p className="text-[10px]">No assets yet. Turn on Product Mode to create items.</p>
                                </div>
                            ) : (
                                activeWorkspace.productAssets.map(asset => (
                                    <div key={asset.id} className="group relative aspect-square rounded-md overflow-hidden bg-black/40 border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer">
                                        <img src={asset.url} className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <SettingsPanel config={activeWorkspace.config} onChange={(c) => updateActiveWorkspace({ config: c })} disabled={activeWorkspace.isGenerating} />
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
