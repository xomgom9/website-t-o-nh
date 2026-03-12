
import React, { useState, useEffect } from 'react';
import { AspectRatio, ImageSize, GenerationConfig, GeneratedImage, GenerationSession, RemixMode, RemixConfig, Workspace, WorkspaceStatus } from './types';
import { checkApiKey, promptForApiKey, generateImageFromPrompt, describeImage, generateRemix, setCustomApiKey, clearCustomApiKey, refreshApiKeySession, generateMultiAngleImages } from './services/geminiService';
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
      case 'generating': return 'bg-amber-500 border-amber-400';
      case 'success': return 'bg-emerald-500 border-emerald-400';
      case 'error': return 'bg-red-500 border-red-400';
      default: return 'bg-amber-500 border-amber-400';
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

    if (!targetWs.prompt.trim() && (targetWs.activeTab !== 'multi-angle' || !targetWs.remixImage)) {
      setError("Vui lòng nhập prompt hoặc tải lên ảnh nhân vật.");
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
      if (targetWs.activeTab === 'multi-angle') {
        const imageUrls = await generateMultiAngleImages(targetWs.prompt, targetWs.config, targetWs.remixImage);
        
        const newImages: GeneratedImage[] = imageUrls.map((url, index) => ({
          id: `${Date.now()}-${index}`,
          url: url,
          prompt: targetWs.prompt,
          config: { ...targetWs.config },
          timestamp: Date.now(),
          isProduct: targetWs.isProductMode
        }));

        setWorkspaces(prev => prev.map(w => {
          if (w.id === targetWsId) {
            const updatedBatch = [...w.generatedBatch, ...newImages];
            return {
              ...w,
              generatedBatch: updatedBatch,
              selectedImageId: newImages[0].id
            };
          }
          return w;
        }));
        successfulImages.push(...newImages);
      } else {
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
      }
      
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
    <div className="min-h-screen bg-black text-zinc-200 pb-12 font-sans flex flex-col">
      <header className="border-b border-zinc-800 bg-black/95 z-30 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-black font-bold text-lg">N</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-500">Nano Banana Pro from Google</h1>
          </div>
          
          <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
             <button 
               onClick={() => updateActiveWorkspace({ activeTab: 'text-to-image' })} 
               className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                 activeWorkspace.activeTab === 'text-to-image' 
                   ? `${getStatusColor(activeWorkspace.status)} text-black shadow-lg` 
                   : 'text-zinc-500 hover:text-zinc-200'
               }`}
             >
               Creative
             </button>
             <button 
               onClick={() => updateActiveWorkspace({ activeTab: 'remix' })} 
               className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                 activeWorkspace.activeTab === 'remix' 
                   ? `${getStatusColor(activeWorkspace.status)} text-black shadow-lg` 
                   : 'text-zinc-500 hover:text-zinc-200'
               }`}
             >
               Remix
             </button>
             <button 
               onClick={() => updateActiveWorkspace({ activeTab: 'multi-angle' })} 
               className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                 activeWorkspace.activeTab === 'multi-angle' 
                   ? `${getStatusColor(activeWorkspace.status)} text-black shadow-lg` 
                   : 'text-zinc-500 hover:text-zinc-200'
               }`}
             >
               Multi-Angle
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
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
              title="Thay đổi API Key"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>API Key</span>
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition border border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-2 overflow-x-auto scrollbar-hide border-t border-zinc-900">
          {workspaces.map((ws) => (
            <div 
              key={ws.id}
              className={`group relative flex items-center h-8 px-3 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                activeWorkspaceId === ws.id 
                  ? 'bg-zinc-900 border-amber-500/50 text-amber-500' 
                  : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
              }`}
              onClick={() => !isDeleteMode && setActiveWorkspaceId(ws.id)}
            >
              {isDeleteMode && (
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleDeleteSelection(ws.id); }}
                  className={`mr-2 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    deleteSelection.has(ws.id) ? 'bg-amber-500 border-amber-500' : 'border-zinc-700'
                  }`}
                >
                  {deleteSelection.has(ws.id) && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-black" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
              )}

              {/* Status Indicator */}
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                ws.status === 'generating' ? 'bg-amber-500 animate-pulse' :
                ws.status === 'success' ? 'bg-emerald-500' :
                ws.status === 'error' ? 'bg-red-500' : 'bg-zinc-700'
              }`} />

              {editingNameId === ws.id ? (
                <input 
                  autoFocus
                  className="bg-transparent outline-none border-b border-amber-500 w-20 text-amber-500"
                  value={ws.name}
                  onChange={(e) => updateWorkspace(ws.id, { name: e.target.value })}
                  onBlur={() => setEditingNameId(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingNameId(null)}
                />
              ) : (
                <span onDoubleClick={() => setEditingNameId(ws.id)} className={activeWorkspaceId === ws.id ? 'text-amber-500' : ''}>{ws.name}</span>
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
                  className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold transition border border-zinc-700"
                >
                  Hủy
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsDeleteMode(true)}
                  className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-600 hover:text-red-400 transition"
                  title="Chọn để xóa nhiều"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button 
                  onClick={addWorkspace}
                  className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-600 hover:text-amber-500 transition"
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
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-2xl relative">
                    {activeWorkspace.activeTab === 'multi-angle' && activeWorkspace.generatedBatch.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeWorkspace.generatedBatch.slice(-2).map((img) => (
                                <div key={img.id} className="space-y-2">
                                    <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 px-2">
                                        {img.prompt.includes('front') ? 'Góc Chính Diện' : img.prompt.includes('45') ? 'Góc 45 Độ' : 'Góc 180 Độ'}
                                    </div>
                                    <ImageDisplay image={img} isGenerating={activeWorkspace.isGenerating} onEdit={() => { updateActiveWorkspace({ selectedImageId: img.id }); setIsEditing(true); }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ImageDisplay image={activeImage} isGenerating={activeWorkspace.isGenerating} onEdit={() => setIsEditing(true)} />
                    )}
                    
                    {(activeWorkspace.generatedBatch.length > 0 || activeWorkspace.isGenerating) && (
                        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {activeWorkspace.generatedBatch.map((img) => (
                                <button key={img.id} onClick={() => updateActiveWorkspace({ selectedImageId: img.id })} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${activeWorkspace.selectedImageId === img.id ? 'border-amber-500' : 'border-zinc-800'}`}>
                                    <img src={img.url} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Prompt Area Section */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-amber-500 uppercase tracking-widest">
                            {activeWorkspace.activeTab === 'remix' ? 'Remix Logic' : activeWorkspace.activeTab === 'multi-angle' ? 'Multi-Angle Studio' : activeWorkspace.isProductMode ? 'Product Studio Mode' : 'Creative Prompt'}
                        </label>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => updateActiveWorkspace({ isProductMode: !activeWorkspace.isProductMode })}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${activeWorkspace.isProductMode ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                Product Mode
                            </button>
                        </div>
                    </div>

                    {activeWorkspace.activeTab !== 'multi-angle' && (
                        <textarea 
                            value={activeWorkspace.prompt} 
                            onChange={(e) => updateActiveWorkspace({ prompt: e.target.value })} 
                            placeholder={activeWorkspace.isProductMode ? "Mô tả sản phẩm bạn muốn tạo (ví dụ: Đồng hồ sang trọng)..." : "Mô tả ý tưởng của bạn..."}
                            className="w-full min-h-[100px] bg-black border border-zinc-800 rounded-lg p-4 text-zinc-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
                        />
                    )}

                    {activeWorkspace.activeTab === 'multi-angle' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tải lên ảnh nhân vật (Tùy chọn)</label>
                            <div className="flex items-center gap-4">
                                <div 
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e: any) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (re) => updateActiveWorkspace({ remixImage: re.target?.result as string });
                                                reader.readAsDataURL(file);
                                            }
                                        };
                                        input.click();
                                    }}
                                    className={`w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${activeWorkspace.remixImage ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-black'}`}
                                >
                                    {activeWorkspace.remixImage ? (
                                        <img src={activeWorkspace.remixImage} className="w-full h-full object-contain rounded-md" />
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="text-[8px] text-zinc-600 font-bold uppercase">Upload</span>
                                        </>
                                    )}
                                </div>
                                {activeWorkspace.remixImage && (
                                    <button 
                                        onClick={() => updateActiveWorkspace({ remixImage: null })}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest"
                                    >
                                        Gỡ bỏ ảnh
                                    </button>
                                )}
                                <div className="flex-1 text-[10px] text-zinc-500 italic">
                                    {activeWorkspace.remixImage 
                                        ? "Ảnh đã được tải lên. Hệ thống sẽ tạo góc 45° và 180° dựa trên nhân vật này." 
                                        : "Nếu không tải ảnh, hệ thống sẽ tạo 3 góc (0°, 45°, 180°) từ prompt."}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <Button onClick={handleGenerate} isLoading={activeWorkspace.isGenerating} className="w-full h-12 font-bold uppercase tracking-widest">
                        {activeWorkspace.activeTab === 'multi-angle' ? 'Tạo Đa Góc Độ' : activeWorkspace.isProductMode ? 'Tạo Sản Phẩm Studio' : 'Tạo Ảnh Sáng Tạo'}
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
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4">Product Assets</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
                        {activeWorkspace.productAssets.length === 0 ? (
                            <div className="col-span-full py-10 text-center text-zinc-700 border border-dashed border-zinc-800 rounded-lg">
                                <p className="text-[10px]">No assets yet. Turn on Product Mode to create items.</p>
                            </div>
                        ) : (
                            activeWorkspace.productAssets.map(asset => (
                                <div key={asset.id} className="group relative aspect-square rounded-md overflow-hidden bg-black/40 border border-zinc-800 hover:border-amber-500 transition-all cursor-pointer">
                                    <img src={asset.url} className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
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
