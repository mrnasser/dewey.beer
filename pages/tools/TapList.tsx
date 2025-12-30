import React, { useState, useEffect } from 'react';
import { 
  GlassWater, 
  Settings, 
  RefreshCw, 
  Maximize, 
  Pencil, 
  Wand2, 
  Beer, 
  Droplet, 
  Thermometer, 
  Loader,
  Save,
  X,
  Check,
  Calendar,
  Cloud,
  CloudOff,
  AlertCircle,
  UploadCloud,
  DownloadCloud
} from 'lucide-react';
import { Tap, BrewfatherBatch } from '../../types';
import { generateBeerCreative } from '../../services/geminiService';

// --- Helpers ---

const srmToColor = (srm: number): string => {
  // Approximate SRM colors
  if (srm <= 2) return '#F8F753'; // Pale Straw
  if (srm <= 3) return '#F6F513'; // Straw
  if (srm <= 4) return '#ECE61A'; // Pale Gold
  if (srm <= 6) return '#D5BC26'; // Deep Gold
  if (srm <= 9) return '#BF923B'; // Pale Amber
  if (srm <= 12) return '#BF813A'; // Medium Amber
  if (srm <= 15) return '#BC6733'; // Deep Amber
  if (srm <= 20) return '#8D4C32'; // Brown
  if (srm <= 24) return '#5D341A'; // Dark Brown
  if (srm <= 30) return '#261716'; // Very Dark Brown
  if (srm > 30) return '#030403'; // Black
  return '#F8F753';
};

const getSRMGradient = (srm: number) => {
  const color = srmToColor(srm);
  return `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`;
};

const getBarColor = (srm: number) => {
  return srmToColor(srm);
};

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// --- Types ---

interface AppSettings {
  brewfather: {
    userId: string;
    apiKey: string;
  };
  storage: {
    enabled: boolean;
    url: string;
    method: 'PUT' | 'POST'; // PUT is standard for overwriting resources
    authHeader: string;
    authToken: string;
  };
}

const DEFAULT_TAP_COUNT = 4;
const DEFAULT_SETTINGS: AppSettings = {
  brewfather: { userId: '', apiKey: '' },
  storage: { 
    enabled: false, 
    url: '', 
    method: 'PUT', 
    authHeader: 'Authorization', 
    authToken: '' 
  }
};

// --- Components ---

const TapList: React.FC = () => {
  // --- State ---
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('taplist_settings');
    // Migration check for old format
    const oldBf = localStorage.getItem('bf_settings');
    if (oldBf) {
       const parsed = JSON.parse(oldBf);
       return { ...DEFAULT_SETTINGS, brewfather: parsed };
    }
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Data
  const [taps, setTaps] = useState<Tap[]>([]);
  const [batches, setBatches] = useState<BrewfatherBatch[]>([]);
  
  // UI
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTapId, setEditingTapId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Tap>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Persistence Logic ---

  // 1. Load Settings & Initial Data
  useEffect(() => {
    localStorage.setItem('taplist_settings', JSON.stringify(settings));
  }, [settings]);

  // 2. Initialize Taps (Load Remote or Local)
  useEffect(() => {
    const loadTaps = async () => {
      setIsSyncing(true);
      setSyncError(null);

      // Try Remote First if enabled
      if (settings.storage.enabled && settings.storage.url) {
         try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (settings.storage.authToken) {
               headers[settings.storage.authHeader || 'Authorization'] = settings.storage.authToken;
            }
            
            const res = await fetch(settings.storage.url, { method: 'GET', headers });
            if (res.ok) {
               const data = await res.json();
               // Handle various JSON structures (e.g. { taps: [] } or just [])
               const tapData = Array.isArray(data) ? data : (data.record || data.taps || []);
               if (tapData.length > 0) {
                  setTaps(tapData);
                  setIsSyncing(false);
                  return;
               }
            } else {
               throw new Error(`Remote load failed: ${res.status}`);
            }
         } catch (e) {
            console.error(e);
            setSyncError("Failed to sync from cloud. Using local data.");
         }
      }

      // Fallback to Local
      const local = localStorage.getItem('taps');
      if (local) {
         setTaps(JSON.parse(local));
      } else {
         // Init Default
         setTaps(Array(DEFAULT_TAP_COUNT).fill(null).map((_, i) => ({
            id: i + 1,
            name: 'Empty Tap',
            style: 'Ready for Beer',
            abv: 0,
            ibu: 0,
            srm: 3,
            description: 'Nothing pouring right now.',
            active: false
         })));
      }
      setIsSyncing(false);
    };

    loadTaps();
  }, [settings.storage.enabled, settings.storage.url]); // Re-run if storage config changes

  // 3. Save Taps (Local + Remote)
  const saveTaps = async (newTaps: Tap[]) => {
    // Optimistic Update
    setTaps(newTaps);
    localStorage.setItem('taps', JSON.stringify(newTaps));

    // Remote Push
    if (settings.storage.enabled && settings.storage.url) {
       setIsSyncing(true);
       setSyncError(null);
       try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (settings.storage.authToken) {
             headers[settings.storage.authHeader || 'Authorization'] = settings.storage.authToken;
          }

          const res = await fetch(settings.storage.url, { 
             method: settings.storage.method, 
             headers,
             body: JSON.stringify(newTaps)
          });
          
          if (!res.ok) throw new Error(`Remote save failed: ${res.status}`);
       } catch (e) {
          console.error(e);
          setSyncError("Failed to save to cloud. Data saved locally.");
       } finally {
          setIsSyncing(false);
       }
    }
  };

  // --- Actions ---

  const fetchBatches = async () => {
    if (!settings.brewfather.userId || !settings.brewfather.apiKey) return;
    
    setIsLoadingBatches(true);
    try {
      const auth = btoa(`${settings.brewfather.userId}:${settings.brewfather.apiKey}`);
      const response = await fetch('https://api.brewfather.app/v2/batches?limit=50&include=recipe', {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch batches');
      
      const data = await response.json();
      const relevant = data.filter((b: any) => b.status === 'Conditioning' || b.status === 'Completed');
      setBatches(relevant);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleEditClick = (tap: Tap) => {
    setEditingTapId(tap.id);
    setEditForm({ ...tap });
    if (batches.length === 0 && settings.brewfather.userId) fetchBatches();
  };

  const handleSaveTap = () => {
    if (!editingTapId) return;
    const updatedTaps = taps.map(t => t.id === editingTapId ? { ...t, ...editForm } : t);
    saveTaps(updatedTaps);
    setEditingTapId(null);
  };

  const handleMagic = async () => {
    if (!editForm.style) return;
    setIsGenerating(true);
    const creative = await generateBeerCreative(
      editForm.name || 'Beer', 
      editForm.style, 
      editForm.abv || 0, 
      editForm.description || ''
    );
    
    if (creative) {
      setEditForm(prev => ({
        ...prev,
        name: creative.name,
        description: creative.description + (creative.foodPairing ? ` Recommended pairing: ${creative.foodPairing}` : '')
      }));
    }
    setIsGenerating(false);
  };

  const assignBatch = (batchId: string) => {
    const batch = batches.find(b => b._id === batchId);
    if (!batch) return;
    
    const toDateString = (ts: number) => new Date(ts).toISOString().split('T')[0];

    const finalAbv = batch.measuredAbv || batch.estimatedAbv || batch.recipe.abv;
    const finalIbu = batch.ibu || batch.recipe.ibu;
    const finalSrm = batch.color || batch.recipe.color;

    setEditForm(prev => ({
      ...prev,
      name: batch.name,
      style: batch.recipe.style.name,
      abv: finalAbv,
      ibu: finalIbu,
      srm: finalSrm,
      active: true,
      batchNo: batch.batchNo.toString(),
      brewDate: batch.brewDate ? toDateString(batch.brewDate) : undefined,
      kegDate: batch.bottlingDate ? toDateString(batch.bottlingDate) : undefined,
    }));
  };

  // --- Render ---

  return (
    <div className={`animate-fade-in ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950' : 'max-w-7xl mx-auto pb-20'}`}>
      
      {/* Header (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <GlassWater className="text-yellow-400" />
              On Tap
            </h1>
            <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400">Digital Menu & Tap Management</p>
                {/* Sync Status Indicator */}
                {settings.storage.enabled ? (
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${isSyncing ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : syncError ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-green-400 border-green-500/30 bg-green-500/10'}`}>
                        <Cloud size={12} />
                        {isSyncing ? 'Syncing...' : syncError ? 'Sync Failed' : 'Synced'}
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-slate-500 border border-slate-700/50 bg-slate-800/50">
                        <CloudOff size={12} /> Local
                    </div>
                )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-white/5 hover:bg-slate-700 transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsFullscreen(true)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-yellow-400 border border-yellow-500/20 hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Maximize size={18} /> Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Exit */}
      {isFullscreen && (
        <button 
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white/50 hover:text-white hover:bg-black/80 transition-colors"
        >
          <Maximize size={20} />
        </button>
      )}

      {/* Tap Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 h-full ${isFullscreen ? 'p-8 h-screen items-center' : ''}`}>
        {taps.map(tap => (
          <div 
            key={tap.id} 
            className={`relative bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-all group ${tap.active ? 'opacity-100' : 'opacity-70'} ${isFullscreen ? 'h-[80vh] justify-between shadow-2xl border-white/20' : 'h-[500px]'}`}
          >
            {/* Visual Header / Beer Color */}
            <div 
              className="h-1/3 relative overflow-hidden"
              style={{ background: !tap.image ? getSRMGradient(tap.srm) : 'black' }}
            >
               {tap.image ? (
                   <>
                     <img src={tap.image} alt={tap.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                     <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-slate-900"></div>
                   </>
               ) : (
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
               )}
               
               <div className="absolute top-4 left-4">
                 <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white font-bold border border-white/10">
                   {tap.id}
                 </div>
               </div>

               {!isFullscreen && (
                 <button 
                   onClick={() => handleEditClick(tap)}
                   className="absolute top-4 right-4 p-2 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                 >
                   <Pencil size={16} />
                 </button>
               )}

               <div className="absolute bottom-4 left-4 right-4 z-10">
                 <div className="inline-block px-2 py-1 rounded bg-white/10 backdrop-blur-md text-xs font-medium text-white/90 mb-2 border border-white/10 shadow-sm">
                   {tap.style}
                 </div>
                 <h2 className={`font-bold text-white leading-tight drop-shadow-md ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
                   {tap.name}
                 </h2>
               </div>
            </div>

            {/* Details */}
            <div className="flex-grow p-6 flex flex-col">
               
               <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                 <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">ABV</div>
                    <div className="text-xl font-mono text-yellow-400">{tap.abv.toFixed(1)}%</div>
                 </div>
                 <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">IBU</div>
                    <div className="text-xl font-mono text-green-400">{Math.round(tap.ibu)}</div>
                 </div>
                 <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">SRM</div>
                    <div className="text-xl font-mono" style={{ color: getBarColor(tap.srm) }}>{Math.round(tap.srm)}</div>
                 </div>
               </div>

               <div className="flex-grow">
                 <p className={`text-slate-400 leading-relaxed italic ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                   "{tap.description}"
                 </p>
               </div>

               {/* Footer Info */}
               <div className="mt-auto pt-4 text-xs text-slate-600 font-mono border-t border-white/5">
                  <div className="flex justify-between mb-1">
                     {tap.batchNo && <span>Batch #{tap.batchNo}</span>}
                     {tap.active && <span className="text-green-400/70">On Tap</span>}
                  </div>
                  <div className="flex justify-between text-slate-500">
                     {tap.brewDate && <span>Brewed: {formatDateDisplay(tap.brewDate)}</span>}
                     {tap.kegDate && <span>Kegged: {formatDateDisplay(tap.kegDate)}</span>}
                  </div>
               </div>
            </div>

            {/* Active Indicator Line */}
            <div className="h-2 w-full" style={{ background: tap.active ? getBarColor(tap.srm) : 'transparent' }}></div>
          </div>
        ))}
      </div>

      {/* --- Settings Modal --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <Settings size={20} className="text-slate-400" /> Configuration
                 </h2>
                 <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>
              
              <div className="space-y-6">
                  {/* Brewfather Section */}
                  <section className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                    <h3 className="text-sm font-bold text-yellow-500 uppercase mb-3 flex items-center gap-2">
                        <Beer size={16} /> Brewfather API
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">User ID</label>
                            <input 
                                type="text" 
                                value={settings.brewfather.userId}
                                onChange={(e) => setSettings({...settings, brewfather: {...settings.brewfather, userId: e.target.value}})}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">API Key</label>
                            <input 
                                type="password" 
                                value={settings.brewfather.apiKey}
                                onChange={(e) => setSettings({...settings, brewfather: {...settings.brewfather, apiKey: e.target.value}})}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none text-sm"
                            />
                        </div>
                        <p className="text-xs text-slate-500 italic">Required to fetch batch data.</p>
                    </div>
                  </section>

                  {/* Cloud Sync Section */}
                  <section className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-blue-400 uppercase flex items-center gap-2">
                            <Cloud size={16} /> Cloud Sync
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={settings.storage.enabled}
                                onChange={(e) => setSettings({...settings, storage: {...settings.storage, enabled: e.target.checked}})}
                                className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {settings.storage.enabled && (
                        <div className="space-y-3 animate-fade-in">
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Storage URL (Endpoint)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. https://api.jsonbin.io/v3/b/<ID> or http://myserver/taps"
                                    value={settings.storage.url}
                                    onChange={(e) => setSettings({...settings, storage: {...settings.storage, url: e.target.value}})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Method</label>
                                    <select 
                                        value={settings.storage.method}
                                        onChange={(e) => setSettings({...settings, storage: {...settings.storage, method: e.target.value as any}})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none text-sm"
                                    >
                                        <option value="PUT">PUT (Overwrite)</option>
                                        <option value="POST">POST</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Header Name</label>
                                    <input 
                                        type="text" 
                                        value={settings.storage.authHeader}
                                        onChange={(e) => setSettings({...settings, storage: {...settings.storage, authHeader: e.target.value}})}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Auth Token (Optional)</label>
                                <input 
                                    type="password" 
                                    value={settings.storage.authToken}
                                    onChange={(e) => setSettings({...settings, storage: {...settings.storage, authToken: e.target.value}})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none text-sm"
                                />
                            </div>
                            <p className="text-xs text-slate-500 italic">
                                Use <code>json-server</code> locally or a service like <code>jsonbin.io</code>.
                            </p>
                        </div>
                    )}
                  </section>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                 <button onClick={() => setIsSettingsOpen(false)} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500">
                    Close & Save
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Editor Modal --- */}
      {editingTapId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
              
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <Pencil size={20} className="text-yellow-400" /> Edit Tap {editingTapId}
                 </h2>
                 <button onClick={() => setEditingTapId(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
              </div>

              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                 
                 {/* Source Selection */}
                 <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                       <h3 className="text-sm font-bold text-slate-300 uppercase">Import from Brewfather</h3>
                       <button onClick={fetchBatches} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                         <RefreshCw size={12} className={isLoadingBatches ? 'animate-spin' : ''} /> Refresh
                       </button>
                    </div>
                    
                    {batches.length > 0 ? (
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none"
                        onChange={(e) => assignBatch(e.target.value)}
                        value=""
                      >
                         <option value="">Select a batch...</option>
                         {batches.map(b => (
                           <option key={b._id} value={b._id}>
                              #{b.batchNo} {b.name} ({b.status})
                           </option>
                         ))}
                      </select>
                    ) : (
                       <div className="text-xs text-slate-500 italic">
                          {settings.brewfather.userId ? "No conditioning/completed batches found." : "Configure API keys in settings to fetch batches."}
                       </div>
                    )}
                 </div>

                 {/* Manual Edits */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="text-sm font-bold text-white">Tap Details</div>
                       <div className="h-px flex-grow bg-white/10"></div>
                       <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={editForm.active} 
                            onChange={(e) => setEditForm({...editForm, active: e.target.checked})}
                            className="rounded bg-slate-800 border-slate-600 text-yellow-500 focus:ring-0" 
                          />
                          Active Tap
                       </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2">
                          <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Beer Name</label>
                          <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none" />
                       </div>
                       <div>
                          <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Style</label>
                          <input type="text" value={editForm.style} onChange={(e) => setEditForm({...editForm, style: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none" />
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                          <div>
                             <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">ABV %</label>
                             <input type="number" value={editForm.abv} onChange={(e) => setEditForm({...editForm, abv: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">IBU</label>
                             <input type="number" value={editForm.ibu} onChange={(e) => setEditForm({...editForm, ibu: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none" />
                          </div>
                          <div>
                             <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">SRM</label>
                             <input type="number" value={editForm.srm} onChange={(e) => setEditForm({...editForm, srm: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none" />
                          </div>
                       </div>
                       
                       <div>
                          <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={10} /> Brew Date</label>
                          <input 
                            type="date" 
                            value={editForm.brewDate || ''} 
                            onChange={(e) => setEditForm({...editForm, brewDate: e.target.value})} 
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none [color-scheme:dark]" 
                          />
                       </div>
                       <div>
                          <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={10} /> Kegged Date</label>
                          <input 
                            type="date" 
                            value={editForm.kegDate || ''} 
                            onChange={(e) => setEditForm({...editForm, kegDate: e.target.value})} 
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none [color-scheme:dark]" 
                          />
                       </div>
                    </div>

                    <div>
                       <div className="flex justify-between items-center mb-1">
                          <label className="text-xs text-slate-500 font-bold uppercase">Description</label>
                          <button 
                            onClick={handleMagic} 
                            disabled={isGenerating || !editForm.style}
                            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                          >
                             {isGenerating ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />} AI Magic
                          </button>
                       </div>
                       <textarea 
                         value={editForm.description} 
                         onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                         rows={3}
                         className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none"
                       />
                    </div>
                    
                    {/* Image URL */}
                    <div>
                       <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Image URL (Optional)</label>
                       <input 
                         type="text" 
                         value={editForm.image || ''} 
                         onChange={(e) => setEditForm({...editForm, image: e.target.value})}
                         placeholder="https://..." 
                         className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none"
                       />
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10 flex-shrink-0">
                 <button onClick={() => setEditingTapId(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium">Cancel</button>
                 <button onClick={handleSaveTap} className="flex-1 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 font-medium shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2">
                    <Save size={18} /> Save Tap
                 </button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
};

export default TapList;