import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, Trash2, RotateCcw, History, ExternalLink } from 'lucide-react';

// --- Types ---

interface UTMParams {
  url: string;
  source: string;
  medium: string;
  name: string;
  term: string;
  content: string;
}

interface HistoryItem extends UTMParams {
  id: string;
  timestamp: number;
  fullUrl: string;
}

// --- Constants ---

const DEFAULTS: UTMParams = {
  url: '',
  source: '',
  medium: '',
  name: '',
  term: '',
  content: ''
};

// --- Component ---

const UTMGenerator: React.FC = () => {
  const [params, setParams] = useState<UTMParams>(DEFAULTS);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('utm_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('utm_history', JSON.stringify(history));
  }, [history]);

  // Generate URL effect
  useEffect(() => {
    if (!params.url) {
      setGeneratedUrl('');
      return;
    }

    try {
      // Handle partial URLs or missing protocols
      let baseUrl = params.url;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
      }

      const urlObj = new URL(baseUrl);
      
      if (params.source) urlObj.searchParams.set('utm_source', params.source);
      if (params.medium) urlObj.searchParams.set('utm_medium', params.medium);
      if (params.name) urlObj.searchParams.set('utm_campaign', params.name);
      if (params.term) urlObj.searchParams.set('utm_term', params.term);
      if (params.content) urlObj.searchParams.set('utm_content', params.content);

      setGeneratedUrl(urlObj.toString());
    } catch (e) {
      // Invalid URL
      setGeneratedUrl('');
    }
  }, [params]);

  // Handlers
  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Add to history if new
    const newItem: HistoryItem = {
      ...params,
      id: Date.now().toString(),
      timestamp: Date.now(),
      fullUrl: generatedUrl
    };

    setHistory(prev => {
      // Avoid duplicates at top of list
      if (prev.length > 0 && prev[0].fullUrl === newItem.fullUrl) return prev;
      return [newItem, ...prev].slice(0, 50); // Keep last 50
    });
  };

  const handleReset = () => {
    setParams(DEFAULTS);
  };

  const handleHistoryRestore = (item: HistoryItem) => {
    setParams({
      url: item.url,
      source: item.source,
      medium: item.medium,
      name: item.name,
      term: item.term,
      content: item.content
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (confirm('Clear all history?')) {
      setHistory([]);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Link2 className="text-violet-400" />
          UTM Generator
        </h1>
        <p className="text-slate-400 mt-1">Campaign URL Builder</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parameters</h3>
               <button onClick={handleReset} className="text-slate-500 hover:text-white transition-colors" title="Reset Form">
                 <RotateCcw size={16} />
               </button>
            </div>

            <div className="space-y-4">
              {/* Website URL */}
              <div>
                 <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Website URL <span className="text-red-500">*</span></label>
                 <input 
                   type="text" 
                   value={params.url}
                   onChange={(e) => setParams({...params, url: e.target.value})}
                   placeholder="https://dewey.beer"
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-violet-500 outline-none transition-colors"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Source <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={params.source}
                      onChange={(e) => setParams({...params, source: e.target.value})}
                      placeholder="google, newsletter"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-violet-500 outline-none transition-colors"
                    />
                 </div>
                 <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Medium <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={params.medium}
                      onChange={(e) => setParams({...params, medium: e.target.value})}
                      placeholder="cpc, banner, email"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-violet-500 outline-none transition-colors"
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Campaign Name <span className="text-red-500">*</span></label>
                 <input 
                   type="text" 
                   value={params.name}
                   onChange={(e) => setParams({...params, name: e.target.value})}
                   placeholder="spring_sale, launch_promo"
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-violet-500 outline-none transition-colors"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Term (Optional)</label>
                    <input 
                      type="text" 
                      value={params.term}
                      onChange={(e) => setParams({...params, term: e.target.value})}
                      placeholder="running+shoes"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-violet-500 outline-none transition-colors"
                    />
                 </div>
                 <div>
                    <label className="block text-xs text-slate-500 font-bold uppercase mb-1">Content (Optional)</label>
                    <input 
                      type="text" 
                      value={params.content}
                      onChange={(e) => setParams({...params, content: e.target.value})}
                      placeholder="logolink, textlink"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-violet-500 outline-none transition-colors"
                    />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & History */}
        <div className="lg:col-span-5 space-y-6">
           
           {/* Result Card */}
           <div className="bg-slate-900 border border-violet-500/30 rounded-xl p-6 shadow-xl shadow-violet-900/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Link2 size={100} />
              </div>
              
              <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Generated URL</h3>
              
              <div className="bg-slate-950 rounded-lg p-4 mb-4 border border-white/5 break-all font-mono text-sm text-slate-300 min-h-[80px]">
                  {generatedUrl || <span className="text-slate-600 italic">Fill in the required fields...</span>}
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={handleCopy}
                   disabled={!generatedUrl}
                   className={`flex-1 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
                      !generatedUrl 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : copied 
                           ? 'bg-green-600 hover:bg-green-500'
                           : 'bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/20'
                   }`}
                 >
                    {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy URL</>}
                 </button>
              </div>
           </div>

           {/* History */}
           <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <History size={16} /> Recent Links
                 </h3>
                 {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Clear All</button>
                 )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {history.length === 0 && (
                    <div className="text-center py-8 text-slate-600 italic text-sm border border-dashed border-slate-800 rounded-lg">
                       No history yet.
                    </div>
                 )}
                 {history.map(item => (
                    <div key={item.id} className="group bg-slate-950/50 border border-white/5 hover:border-violet-500/30 rounded-lg p-3 transition-colors">
                       <div className="flex justify-between items-start mb-1">
                          <div className="text-white font-medium truncate w-full pr-2" title={item.url}>{item.url}</div>
                          <span className="text-[10px] text-slate-600 flex-shrink-0 whitespace-nowrap">{new Date(item.timestamp).toLocaleDateString()}</span>
                       </div>
                       <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mb-2">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">src: {item.source}</span>
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">med: {item.medium}</span>
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">cmp: {item.name}</span>
                       </div>
                       <div className="flex gap-2 border-t border-white/5 pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleHistoryRestore(item)}
                            className="text-xs flex items-center gap-1 text-violet-400 hover:text-violet-300"
                          >
                             <RotateCcw size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => navigator.clipboard.writeText(item.fullUrl)}
                            className="text-xs flex items-center gap-1 text-slate-400 hover:text-white ml-auto"
                          >
                             <Copy size={12} /> Copy
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

        </div>

      </div>
    </div>
  );
};

export default UTMGenerator;