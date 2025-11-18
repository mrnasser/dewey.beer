import React, { useState, useEffect, useRef } from 'react';
import { Palette, Terminal, Play, Save, Layers, AlertCircle, CheckCircle2, Lock, Eraser } from 'lucide-react';

// --- Types ---

interface Credentials {
  storeHash: string;
  clientId: string;
  accessToken: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// --- Component ---

const BigCommerceColorTool: React.FC = () => {
  // State: Credentials
  const [creds, setCreds] = useState<Credentials>({
    storeHash: '',
    clientId: '',
    accessToken: ''
  });
  const [isCredsVisible, setIsCredsVisible] = useState(false);

  // State: Inputs
  const [colorInput, setColorInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  
  // State: Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('bc_creds');
    if (saved) {
      try {
        setCreds(JSON.parse(saved));
      } catch (e) { console.error("Failed to parse saved creds"); }
    }
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // --- Helpers ---

  const saveCreds = () => {
    localStorage.setItem('bc_creds', JSON.stringify(creds));
    addLog('Credentials saved to local storage.', 'success');
  };

  const clearCreds = () => {
    localStorage.removeItem('bc_creds');
    setCreds({ storeHash: '', clientId: '', accessToken: '' });
    addLog('Credentials cleared.', 'info');
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const url = `https://api.bigcommerce.com/stores/${creds.storeHash}/v3/${endpoint}`;
    const headers = {
      'X-Auth-Token': creds.accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error (${response.status}): ${err}`);
    }

    return response.json();
  };

  // --- Core Logic ---

  const runScript = async () => {
    if (!creds.storeHash || !creds.accessToken) {
      addLog('Missing credentials. Please configure them first.', 'error');
      return;
    }

    const colorsToCreate = colorInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (colorsToCreate.length === 0) {
      addLog('No colors specified.', 'warning');
      return;
    }

    setIsRunning(true);
    addLog(`Starting batch process for ${colorsToCreate.length} colors...`, 'info');

    try {
      // 1. Find "Colors" Option Set
      addLog('Searching for "Colors" option...', 'info');
      // BC API Pagination handling might be needed for large catalogs, but for options we usually assume it's in first page or we search
      // Using /catalog/options?name=Colors is not directly supported for "exact" match sometimes, but let's try filtering or manual find
      const optionsResp = await apiCall('catalog/options?limit=250');
      const options = optionsResp.data;
      const colorOption = options.find((o: any) => o.display_name === 'Colors' || o.name === 'Colors');

      if (!colorOption) {
        throw new Error('Could not find a Product Option named "Colors"');
      }

      const optionId = colorOption.id;
      addLog(`Found "Colors" Option (ID: ${optionId})`, 'success');

      // 2. Get Existing Values
      addLog('Fetching existing option values...', 'info');
      const valuesResp = await apiCall(`catalog/options/${optionId}/values?limit=250`);
      const existingLabels = new Set(valuesResp.data.map((v: any) => v.label.toLowerCase()));
      addLog(`Found ${existingLabels.size} existing values.`, 'info');

      // 3. Create New Values
      for (const color of colorsToCreate) {
        if (existingLabels.has(color.toLowerCase())) {
          addLog(`Skipping "${color}" - already exists.`, 'warning');
          continue;
        }

        addLog(`Creating "${color}"...`, 'info');
        
        // Create the option value
        await apiCall(`catalog/options/${optionId}/values`, 'POST', {
          label: color,
          sort_order: 0, // Or append to end if we fetched max sort order
          is_default: false,
          value_data: null // For swatches, we might need to update this later or rely on BC defaults
        });

        addLog(`Successfully created "${color}"`, 'success');
      }

      addLog('Batch process complete.', 'success');
      setColorInput('');

    } catch (error: any) {
      addLog(`Critical Error: ${error.message}`, 'error');
      if (error.message.includes('Failed to fetch')) {
         addLog('CORS Error detected. Ensure you are running this in a browser with CORS disabled or using a local proxy.', 'error');
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Palette className="text-pink-400" />
          BigCommerce Color Manager
        </h1>
        <p className="text-slate-400 mt-1">Automated Option Value Creation Tool</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          
          {/* Credentials Card */}
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Lock size={14} /> API Credentials
                </h3>
                <button onClick={() => setIsCredsVisible(!isCredsVisible)} className="text-xs text-blue-400 hover:text-blue-300">
                  {isCredsVisible ? 'Hide' : 'Show'}
                </button>
             </div>

             <div className="space-y-3">
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Store Hash</label>
                   <input 
                     type={isCredsVisible ? "text" : "password"} 
                     value={creds.storeHash}
                     onChange={(e) => setCreds({...creds, storeHash: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:border-pink-500 outline-none"
                     placeholder="e.g. r7ihvq"
                   />
                </div>
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Client ID</label>
                   <input 
                     type={isCredsVisible ? "text" : "password"} 
                     value={creds.clientId}
                     onChange={(e) => setCreds({...creds, clientId: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:border-pink-500 outline-none"
                   />
                </div>
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Access Token</label>
                   <input 
                     type={isCredsVisible ? "text" : "password"} 
                     value={creds.accessToken}
                     onChange={(e) => setCreds({...creds, accessToken: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:border-pink-500 outline-none"
                   />
                </div>
             </div>

             <div className="flex gap-2 mt-4">
                <button onClick={saveCreds} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2 rounded transition-colors">
                   <Save size={14} /> Save
                </button>
                <button onClick={clearCreds} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 text-xs py-2 rounded transition-colors">
                   <Eraser size={14} /> Clear
                </button>
             </div>
          </div>

          {/* Input Card */}
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5 flex flex-col h-[calc(100%-250px)]">
             <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Layers size={14} /> New Colors
             </h3>
             <textarea 
               className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm font-mono focus:border-pink-500 outline-none resize-none"
               placeholder={`Urban Grey\nWhite Oak\nHearthstone`}
               value={colorInput}
               onChange={(e) => setColorInput(e.target.value)}
             />
             <p className="text-xs text-slate-500 mt-2 mb-4">Enter one color name per line.</p>
             
             <button 
               onClick={runScript}
               disabled={isRunning}
               className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
                 isRunning 
                   ? 'bg-slate-700 cursor-wait' 
                   : 'bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-900/20'
               }`}
             >
                {isRunning ? <span className="animate-pulse">Processing...</span> : <><Play size={18} /> Run Automation</>}
             </button>
          </div>

        </div>

        {/* Right Column: Terminal Output */}
        <div className="lg:col-span-2">
           <div className="bg-black/80 border border-white/10 rounded-xl p-0 flex flex-col h-[600px] overflow-hidden font-mono text-sm shadow-2xl">
              <div className="bg-slate-800/50 border-b border-white/5 p-3 flex items-center gap-2">
                 <Terminal size={14} className="text-slate-400" />
                 <span className="text-slate-400 text-xs">Output Console</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-1.5">
                 {logs.length === 0 && (
                    <div className="text-slate-600 italic opacity-50">Ready for input...</div>
                 )}
                 {logs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                       <span className="text-slate-600 flex-shrink-0 select-none">[{log.timestamp}]</span>
                       <span className={`${
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          'text-slate-300'
                       }`}>
                          {log.type === 'success' && '✓ '}
                          {log.type === 'error' && '✗ '}
                          {log.type === 'warning' && '! '}
                          {log.message}
                       </span>
                    </div>
                 ))}
                 <div ref={logsEndRef} />
              </div>
           </div>

           {/* Warning / Note */}
           <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-slate-300">
                 <strong className="text-yellow-500 block mb-1">CORS Limitation Warning</strong>
                 This tool makes requests directly from your browser. The BigCommerce API typically blocks browser requests (CORS). 
                 <br/>
                 To use this tool successfully, you must either:
                 <ul className="list-disc list-inside mt-1 text-slate-400">
                    <li>Run your browser with CORS disabled (e.g. <code>--disable-web-security</code>)</li>
                    <li>Use a local CORS proxy</li>
                    <li>Or self-host this behind a server-side proxy.</li>
                 </ul>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default BigCommerceColorTool;