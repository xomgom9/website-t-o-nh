
import React, { useState, useEffect } from 'react';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, GenerationSession, RemixMode, RemixConfig, Workspace, WorkspaceStatus } from './types';
import { checkApiKey, promptForApiKey, generateImageFromPrompt, describeImage, generateRemix, setCustomApiKey, clearCustomApiKey, refreshApiKeySession } from './services/geminiService';
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
    const unlocked = localStorage.getItem('app_unlocked') === 'true';
    const timestamp = localStorage.getItem('app_unlocked_ts');
    if (unlocked && timestamp) {
      const elapsed = Date.now() - parseInt(timestamp);
      if (elapsed < 24 * 60 * 60 * 1000) {
        return true;
      }
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const getStatusColor = (status: WorkspaceStatus) => {
    switch (status) {
      case 'generating': return 'bg-amber-600 border-amber-500';
      case 'success': return 'bg-emerald-600 border-emerald-500';
      case 'error': return 'bg-red-600 border-red-500';
      default: return 'bg-indigo-600 border-indigo-500';
    }
  };

  const updateWorkspace = (id: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const updateActiveWorkspace = (updates: Partial<Workspace>) => {
    updateWorkspace(activeWorkspaceId, updates);
  };

  const addWorkspace = () => {
    const newWs = createNewWorkspace(workspaces.length);
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
  };

  const deleteWorkspaces = (ids: string[]) => {
    if (workspaces.length <= ids.length) {
      // Don't delete all workspaces
      const newWs = createNewWorkspace(0);
      setWorkspaces([newWs]);
      setActiveWorkspaceId(newWs.id);
      return;
    }

    const remaining = workspaces.filter(w => !ids.includes(w.id));
    setWorkspaces(remaining);
    if (ids.includes(activeWorkspaceId)) {
      setActiveWorkspaceId(remaining[0].id);
    }
    setDeleteSelection(new Set());
    setIsDeleteMode(false);
  };

  const toggleDeleteSelection = (id: string) => {
    setDeleteSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (isUnlocked) {
      const handleActivity = () => {
        localStorage.setItem('app_unlocked_ts', Date.now().toString());
        refreshApiKeySession();
      };
      
      const checkExpiry = () => {
        const timestamp = localStorage.getItem('app_unlocked_ts');
        if (timestamp) {
          const elapsed = Date.now() - parseInt(timestamp);
          if (elapsed >= 24 * 60 * 60 * 1000) {
            setIsUnlocked(false);
            localStorage.removeItem('app_unlocked');
            localStorage.removeItem('app_unlocked_ts');
            clearCustomApiKey();
          }
        }
      };

      const interval = setInterval(checkExpiry, 60000); // Check every minute

      window.addEventListener('click', handleActivity);
      window.addEventListener('keydown', handleActivity);
      return () => {
        clearInterval(interval);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keydown', handleActivity);
      };
    }
  }, [isUnlocked]);

  useEffect(() => {
    const initAuth = async () => {
        setApiKeyReady(await checkApiKey());
    };
    initAuth();
  }, []);

  const handleGenerate = async () => {
    const targetWsId = activeWorkspaceId;
    const targetWs = activeWorkspace;

    if (!targetWs.prompt.trim()) {
      setError("Vui lòng nhập prompt.");
      return;
    }
    if (!apiKeyReady) {
        await promptForApiKey();
        setApiKeyReady(await checkApiKey());
        return;
    }

    updateWorkspace(targetWsId, { 
        isGenerating: true, 
        status: 'generating',
        generatedBatch: [], 
        selectedImageId: null 
    });
    
    setError(null);
    const successfulImages: GeneratedImage[] = [];

    try {
      const promises = Array(targetWs.config.batchSize).fill(targetWs.prompt).map(async (taskPrompt, index) => {
        try {
          let imageUrl = "";
          if (targetWs.activeTab === 'remix' && targetWs.remixImage) {
              imageUrl = await generateRemix(targetWs.remixImage, taskPrompt, targetWs.remixConfig, targetWs.config);
          } else {
              imageUrl = await generateImageFromPrompt(taskPrompt, targetWs.config, targetWs.isProductMode);
          }

          const newImg: GeneratedImage = {
            id: `${Date.now()}-${index}`,
            url: imageUrl,
            prompt: taskPrompt,
            config: { ...targetWs.config },
            timestamp: Date.now(),
            isProduct: targetWs.isProductMode
          };

          setWorkspaces(prev => prev.map(w => {
              if (w.id === targetWsId) {
                  const updatedBatch = [...w.generatedBatch, newImg];
                  const updatedAssets = targetWs.isProductMode ? [...w.productAssets, newImg] : w.productAssets;
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
      updateWorkspace(targetWsId, { isGenerating: false, status: 'success' });
      if (successfulImages.length > 0) {
          const newSession: GenerationSession = {
            id: Date.now().toString(),
            prompt: targetWs.prompt,
            images: successfulImages,
            timestamp: Date.now(),
            config: { ...targetWs.config }
          };
          setHistory(prev => [newSession, ...prev]);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
      updateWorkspace(targetWsId, { isGenerating: false, status: 'error' });
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
          localStorage.setItem('app_unlocked_ts', Date.now().toString());
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
             <button 
               onClick={() => updateActiveWorkspace({ activeTab: 'text-to-image' })} 
               className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                 activeWorkspace.activeTab === 'text-to-image' 
                   ? `${getStatusColor(activeWorkspace.status)} text-white shadow` 
                   : 'text-slate-400 hover:text-white'
               }`}
             >
               Creative
             </button>
             <button 
               onClick={() => updateActiveWorkspace({ activeTab: 'remix' })} 
               className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                 activeWorkspace.activeTab === 'remix' 
                   ? `${getStatusColor(activeWorkspace.status)} text-white shadow` 
                   : 'text-slate-400 hover:text-white'
               }`}
             >
               Remix
             </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                const hasCustom = localStorage.getItem('custom_gemini_api_key');
                const action = window.confirm(
                  hasCustom 
                    ? "Bạn đang dùng Key tùy chỉnh. Nhấn OK để nhập Key mới, Cancel để xóa Key tùy chỉnh và dùng Key hệ thống."
                    : "Bạn muốn nhập Key tùy chỉnh (OK) hay chọn Key từ hệ thống (Cancel)?"
                );

                if (hasCustom && !action) {
                  clearCustomApiKey();
                  alert("Đã xóa Key tùy chỉnh. Hệ thống sẽ dùng Key mặc định.");
                } else if (action) {
                  const customKey = window.prompt("Nhập Gemini API Key của bạn:");
                  if (customKey) {
                    setCustomApiKey(customKey);
                    alert("Đã lưu API Key tùy chỉnh!");
                  }
                } else {
                  await promptForApiKey();
                }
                setApiKeyReady(await checkApiKey());
              }} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 border ${
                localStorage.getItem('custom_gemini_api_key') 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Thay đổi API Key"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>API Key</span>
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-2 overflow-x-auto scrollbar-hide border-t border-slate-800/50">
          {workspaces.map((ws) => (
            <div 
              key={ws.id}
              className={`group relative flex items-center h-8 px-3 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                activeWorkspaceId === ws.id 
                  ? 'bg-slate-800 border-slate-700 text-white' 
                  : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
              }`}
              onClick={() => !isDeleteMode && setActiveWorkspaceId(ws.id)}
            >
              {isDeleteMode && (
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleDeleteSelection(ws.id); }}
                  className={`mr-2 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    deleteSelection.has(ws.id) ? 'bg-red-500 border-red-500' : 'border-slate-600'
                  }`}
                >
                  {deleteSelection.has(ws.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
              )}

              {/* Status Indicator */}
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                ws.status === 'generating' ? 'bg-amber-500 animate-pulse' :
                ws.status === 'success' ? 'bg-emerald-500' :
                ws.status === 'error' ? 'bg-red-500' : 'bg-slate-600'
              }`} />

              {editingNameId === ws.id ? (
                <input 
                  autoFocus
                  className="bg-transparent outline-none border-b border-indigo-500 w-20"
                  value={ws.name}
                  onChange={(e) => updateWorkspace(ws.id, { name: e.target.value })}
                  onBlur={() => setEditingNameId(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingNameId(null)}
                />
              ) : (
                <span onDoubleClick={() => setEditingNameId(ws.id)}>{ws.name}</span>
              )}

              {activeWorkspaceId === ws.id && !isDeleteMode && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteWorkspaces([ws.id]); }}
                  className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center gap-1 ml-auto">
            {isDeleteMode ? (
              <>
                <button 
                  onClick={() => deleteWorkspaces(Array.from(deleteSelection))}
                  disabled={deleteSelection.size === 0}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold disabled:opacity-50 transition"
                >
                  Xóa ({deleteSelection.size})
                </button>
                <button 
                  onClick={() => { setIsDeleteMode(false); setDeleteSelection(new Set()); }}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold transition"
                >
                  Hủy
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsDeleteMode(true)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                  title="Chọn để xóa nhiều"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button 
                  onClick={addWorkspace}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition"
                  title="Thêm Project mới"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg>
                </button>
              </>
            )}
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
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Image Display Section */}
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

                {/* Prompt Area Section */}
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

                {/* Settings Section */}
                <SettingsPanel 
                    config={activeWorkspace.config} 
                    onChange={(c) => updateActiveWorkspace({ config: c })} 
                    onApiKeyChange={async () => setApiKeyReady(await checkApiKey())}
                    disabled={activeWorkspace.isGenerating} 
                />

                {/* Product Assets Section */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Product Assets</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
                        {activeWorkspace.productAssets.length === 0 ? (
                            <div className="col-span-full py-10 text-center text-slate-600 border border-dashed border-slate-700 rounded-lg">
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
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
