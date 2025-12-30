import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Car, 
  Truck, 
  Thermometer, 
  Server, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  CalendarClock, 
  Plus, 
  History, 
  Droplet, 
  Gauge,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  ArrowUpRight,
  FlaskConical
} from 'lucide-react';
import { DynamicIcon } from '../../components/Icons';

// --- Types ---

type AssetType = 'vehicle' | 'house' | 'homelab' | 'tool' | 'appliance';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  subType?: string;
  location?: string;
  status: 'active' | 'storage' | 'sold';
  make?: string;
  model?: string;
  year?: string;
  serial?: string;
  metadata: Record<string, string>; // e.g., VIN, Engine Code, OS
  purchaseDate?: string;
  currentUsage: number; // Miles or Hours
  usageUnit: 'miles' | 'hours' | 'cycles' | 'none';
  imageColor: string; // Tailwind color class for icon bg
  iconName: string;
}

interface MaintenanceLog {
  id: string;
  assetId: string;
  date: string;
  type: 'routine' | 'repair' | 'mod' | 'inspection';
  description: string;
  usageAtTime?: number;
  costParts: number;
  costLabor: number;
  notes?: string;
  performedBy: 'diy' | 'shop';
  shopName?: string;
}

interface ServiceRule {
  id: string;
  assetId: string;
  name: string; // "Oil Change"
  type: 'time' | 'usage' | 'both';
  intervalMonths?: number;
  intervalUsage?: number;
  oneTimeDueUsage?: number; // For "break-in" services
}

// --- Seed Data ---

const SEED_ASSETS: Asset[] = [
  {
    id: '1',
    name: '1976 Corvette',
    type: 'vehicle',
    subType: 'Car',
    make: 'Chevrolet',
    model: 'Corvette Stingray',
    year: '1976',
    status: 'active',
    metadata: { Engine: '350 SBC (XE262H)', Trans: 'TH350', VIN: '1Z37L6S4XXXXX' },
    currentUsage: 62300,
    usageUnit: 'miles',
    imageColor: 'bg-red-500/20 text-red-500',
    iconName: 'Car'
  },
  {
    id: '2',
    name: '2024 Canyon AT4',
    type: 'vehicle',
    subType: 'Truck',
    make: 'GMC',
    model: 'Canyon',
    year: '2024',
    status: 'active',
    metadata: { Engine: '2.7L Turbo', Trim: 'AT4' },
    currentUsage: 8500,
    usageUnit: 'miles',
    imageColor: 'bg-slate-500/20 text-slate-400',
    iconName: 'Truck'
  },
  {
    id: '3',
    name: 'Furnace',
    type: 'house',
    subType: 'HVAC',
    make: 'Carrier',
    location: 'Basement',
    status: 'active',
    metadata: { Filter: '16x25x1', BTU: '80,000' },
    currentUsage: 0,
    usageUnit: 'none',
    imageColor: 'bg-orange-500/20 text-orange-500',
    iconName: 'Thermometer'
  },
  {
    id: '4',
    name: 'Main Server',
    type: 'homelab',
    location: 'Rack A',
    status: 'active',
    metadata: { OS: 'Ubuntu 22.04', CPU: 'i5-12600K', RAM: '64GB' },
    currentUsage: 0,
    usageUnit: 'none',
    imageColor: 'bg-indigo-500/20 text-indigo-500',
    iconName: 'Server'
  }
];

const SEED_RULES: ServiceRule[] = [
  { id: 'r1', assetId: '1', name: 'Oil Change', type: 'both', intervalMonths: 12, intervalUsage: 3000 },
  { id: 'r2', assetId: '1', name: 'Diff Fluid Break-in', type: 'usage', oneTimeDueUsage: 62800 }, // Due at 62800
  { id: 'r3', assetId: '2', name: 'Oil Change', type: 'both', intervalMonths: 12, intervalUsage: 7500 },
  { id: 'r4', assetId: '2', name: 'Tire Rotation', type: 'usage', intervalUsage: 7500 },
  { id: 'r5', assetId: '3', name: 'Filter Replacement', type: 'time', intervalMonths: 3 },
  { id: 'r6', assetId: '4', name: 'OS Updates & Reboot', type: 'time', intervalMonths: 1 },
];

const SEED_LOGS: MaintenanceLog[] = [
  { 
    id: 'l1', assetId: '1', date: '2024-04-01', type: 'routine', description: 'Oil Change', 
    usageAtTime: 61500, costParts: 45, costLabor: 0, performedBy: 'diy', notes: 'Used Wix 51060, Valvoline VR1 10W-30' 
  },
  { 
    id: 'l2', assetId: '1', date: '2024-05-10', type: 'mod', description: 'Diff Rebuild (3.55 Gears)', 
    usageAtTime: 62300, costParts: 400, costLabor: 500, performedBy: 'shop', shopName: 'Muskegon Brake' 
  },
  {
    id: 'l3', assetId: '3', date: '2024-12-01', type: 'routine', description: 'New Filter',
    costParts: 15, costLabor: 0, performedBy: 'diy', notes: 'MERV 11'
  },
  {
    id: 'l4', assetId: '2', date: '2024-10-15', type: 'routine', description: 'First Oil Change',
    usageAtTime: 4000, costParts: 0, costLabor: 0, performedBy: 'shop', notes: 'Dealer free service'
  }
];

// --- Helper Functions ---

const calculateStatus = (asset: Asset, rule: ServiceRule, logs: MaintenanceLog[]) => {
  // Find last log for this specific rule (simplification: match description or assume "Oil Change" matches rule "Oil Change")
  // In a real app, we'd link logs to rules explicitly or use tags.
  // For this demo, we filter logs where description contains rule name (case insensitive)
  
  const relevantLogs = logs
    .filter(l => l.assetId === asset.id && l.description.toLowerCase().includes(rule.name.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastLog = relevantLogs[0];
  
  let dueDate: Date | null = null;
  let dueUsage: number | null = null;
  let overdue = false;
  let dueSoon = false;

  // Calc Time Due
  if (rule.type === 'time' || rule.type === 'both') {
    if (lastLog) {
      const d = new Date(lastLog.date);
      d.setMonth(d.getMonth() + (rule.intervalMonths || 0));
      dueDate = d;
    } else if (asset.purchaseDate) {
       const d = new Date(asset.purchaseDate);
       d.setMonth(d.getMonth() + (rule.intervalMonths || 0));
       dueDate = d;
    }
  }

  // Calc Usage Due
  if (rule.type === 'usage' || rule.type === 'both') {
    if (rule.oneTimeDueUsage) {
       dueUsage = rule.oneTimeDueUsage;
    } else if (lastLog && lastLog.usageAtTime !== undefined) {
       dueUsage = lastLog.usageAtTime + (rule.intervalUsage || 0);
    }
  }

  // Check Status
  const now = new Date();
  
  // Time Check
  if (dueDate) {
    const diffTime = dueDate.getTime() - now.getTime();
    const daysDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysDue < 0) overdue = true;
    else if (daysDue < 30) dueSoon = true;
  }

  // Usage Check
  if (dueUsage && asset.currentUsage > 0) {
     const diffUsage = dueUsage - asset.currentUsage;
     if (diffUsage < 0) overdue = true;
     else if (diffUsage < 500 && asset.usageUnit === 'miles') dueSoon = true;
  }

  return { dueDate, dueUsage, overdue, dueSoon, lastLog };
};

// --- Components ---

const FleetLog: React.FC = () => {
  // State
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('fleet_assets');
    return saved ? JSON.parse(saved) : SEED_ASSETS;
  });
  const [logs, setLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('fleet_logs');
    return saved ? JSON.parse(saved) : SEED_LOGS;
  });
  const [rules, setRules] = useState<ServiceRule[]>(() => {
    const saved = localStorage.getItem('fleet_rules');
    return saved ? JSON.parse(saved) : SEED_RULES;
  });

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);

  // Persistence
  useEffect(() => { localStorage.setItem('fleet_assets', JSON.stringify(assets)); }, [assets]);
  useEffect(() => { localStorage.setItem('fleet_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('fleet_rules', JSON.stringify(rules)); }, [rules]);

  // Derived Data
  const alerts = useMemo(() => {
    const list: any[] = [];
    assets.forEach(asset => {
      const assetRules = rules.filter(r => r.assetId === asset.id);
      assetRules.forEach(rule => {
        const status = calculateStatus(asset, rule, logs);
        if (status.overdue || status.dueSoon) {
           list.push({ asset, rule, status });
        }
      });
    });
    return list.sort((a, b) => (a.status.overdue === b.status.overdue ? 0 : a.status.overdue ? -1 : 1));
  }, [assets, rules, logs]);

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  // Handlers
  const handleUpdateUsage = (id: string, usage: number) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, currentUsage: usage } : a));
    setShowUsageModal(false);
  };

  const handleAddLog = (log: MaintenanceLog) => {
    setLogs(prev => [log, ...prev]);
    // Optionally update asset usage if log usage is higher
    if (log.usageAtTime && log.usageAtTime > (assets.find(a => a.id === log.assetId)?.currentUsage || 0)) {
      setAssets(prev => prev.map(a => a.id === log.assetId ? { ...a, currentUsage: log.usageAtTime! } : a));
    }
    setShowLogModal(false);
  };

  const handleExport = () => {
     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ assets, logs, rules }, null, 2));
     const downloadAnchorNode = document.createElement('a');
     downloadAnchorNode.setAttribute("href", dataStr);
     downloadAnchorNode.setAttribute("download", "fleet_log_backup.json");
     document.body.appendChild(downloadAnchorNode);
     downloadAnchorNode.click();
     downloadAnchorNode.remove();
  };

  // --- Render ---

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-20">

      {/* Beta Warning */}
      <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-3 text-purple-200">
         <FlaskConical size={20} className="text-purple-400 flex-shrink-0" />
         <div>
            <span className="font-bold text-purple-400 text-sm uppercase tracking-wide block mb-0.5">Beta Preview</span>
            <span className="text-sm text-purple-200/80">This tool is actively being developed. Data structure changes may occur.</span>
         </div>
      </div>
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="text-blue-400" />
            Fleet Log
          </h1>
          <p className="text-slate-400 mt-1">Asset Lifecycle & Maintenance Tracker</p>
        </div>
        <div className="flex gap-3">
           <button onClick={handleExport} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-white/5 hover:bg-slate-700 transition-colors">
             <Download size={18} />
           </button>
           <button onClick={() => setShowUsageModal(true)} className="px-4 py-2 rounded-lg bg-slate-800 text-blue-400 border border-blue-500/20 hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium">
             <Gauge size={18} /> Update Usage
           </button>
           <button onClick={() => setShowLogModal(true)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-blue-900/20">
             <Plus size={18} /> Log Service
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Dashboard / Asset List */}
        <div className="space-y-6">
          
          {/* Alerts Card */}
          {alerts.length > 0 && (
            <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-5 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500"></div>
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <AlertCircle size={16} /> Attention Required
              </h3>
              <div className="space-y-3">
                {alerts.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between group cursor-pointer" onClick={() => setSelectedAssetId(item.asset.id)}>
                    <div>
                       <div className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors">{item.asset.name}</div>
                       <div className="text-slate-400 text-xs">{item.rule.name}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status.overdue ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                       {item.status.overdue ? 'Overdue' : 'Due Soon'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asset List */}
          <div className="space-y-2">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2">My Assets</h3>
             {assets.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between group ${
                    selectedAssetId === asset.id 
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10' 
                      : 'bg-slate-900/50 border-white/5 hover:bg-slate-800 hover:border-white/10'
                  }`}
                >
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${asset.imageColor}`}>
                         <DynamicIcon name={asset.iconName} className="w-5 h-5" />
                      </div>
                      <div>
                         <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{asset.name}</div>
                         <div className="text-xs text-slate-500">
                            {asset.subType || asset.type} • {asset.currentUsage > 0 ? `${asset.currentUsage.toLocaleString()} ${asset.usageUnit}` : asset.location}
                         </div>
                      </div>
                   </div>
                   <ChevronRight size={16} className={`text-slate-600 transition-transform ${selectedAssetId === asset.id ? 'text-blue-400 translate-x-1' : ''}`} />
                </div>
             ))}
          </div>
        </div>

        {/* Right Column: Detail View */}
        <div className="lg:col-span-2">
          {selectedAsset ? (
             <div className="animate-fade-in space-y-6">
                
                {/* Asset Header */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                   <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-20 ${selectedAsset.imageColor.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                   
                   <div className="relative z-10">
                      <div className="flex justify-between items-start">
                         <div>
                            <div className="flex items-center gap-3 mb-2">
                               <h2 className="text-2xl font-bold text-white">{selectedAsset.name}</h2>
                               <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-xs text-slate-400 uppercase tracking-wide">{selectedAsset.year} {selectedAsset.make}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                               {Object.entries(selectedAsset.metadata).map(([key, val]) => (
                                  <span key={key}><span className="text-slate-600">{key}:</span> {val}</span>
                               ))}
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-3xl font-bold text-white font-mono tracking-tight">
                              {selectedAsset.usageUnit !== 'none' ? selectedAsset.currentUsage.toLocaleString() : 'Active'}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">
                              {selectedAsset.usageUnit !== 'none' ? `Current ${selectedAsset.usageUnit}` : 'Status'}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Upcoming Service Rules */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><CalendarClock size={16}/> Scheduled Maintenance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {rules.filter(r => r.assetId === selectedAsset.id).map(rule => {
                        const { overdue, dueSoon, dueDate, dueUsage, lastLog } = calculateStatus(selectedAsset, rule, logs);
                        return (
                           <div key={rule.id} className={`p-4 rounded-xl border bg-slate-900/50 flex flex-col justify-between ${overdue ? 'border-red-500/30 bg-red-500/5' : dueSoon ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/5'}`}>
                              <div className="flex justify-between items-start mb-2">
                                 <span className="font-medium text-white">{rule.name}</span>
                                 {overdue && <AlertCircle size={16} className="text-red-500" />}
                                 {!overdue && !dueSoon && <CheckCircle2 size={16} className="text-emerald-500" />}
                              </div>
                              <div className="text-xs text-slate-400 space-y-1">
                                 {dueDate && <div>Due Date: <span className={overdue ? 'text-red-400' : 'text-slate-300'}>{dueDate.toLocaleDateString()}</span></div>}
                                 {dueUsage && <div>Due Usage: <span className={overdue ? 'text-red-400' : 'text-slate-300'}>{dueUsage.toLocaleString()}</span></div>}
                                 <div className="pt-2 border-t border-white/5 text-slate-500">
                                   Last: {lastLog ? lastLog.date : 'Never'}
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                     {rules.filter(r => r.assetId === selectedAsset.id).length === 0 && (
                        <div className="col-span-2 p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                           No scheduled rules for this asset.
                        </div>
                     )}
                  </div>
                </div>

                {/* History Log */}
                <div>
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><History size={16}/> Maintenance History</h3>
                   <div className="space-y-3">
                      {logs
                        .filter(l => l.assetId === selectedAsset.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(log => (
                          <div key={log.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                             <div className="sm:w-32 flex-shrink-0">
                                <div className="text-sm font-bold text-white">{log.date}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{log.type}</div>
                                {log.usageAtTime && (
                                   <div className="text-xs text-slate-400 mt-1 font-mono">{log.usageAtTime.toLocaleString()} {selectedAsset.usageUnit}</div>
                                )}
                             </div>
                             <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                   <h4 className="font-medium text-indigo-300">{log.description}</h4>
                                   <div className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                      {log.performedBy === 'diy' ? 'DIY' : log.shopName || 'Shop'}
                                   </div>
                                </div>
                                {log.notes && <p className="text-sm text-slate-400 mt-2">{log.notes}</p>}
                                <div className="mt-3 pt-3 border-t border-white/5 flex gap-4 text-xs text-slate-500">
                                   <span>Parts: ${log.costParts}</span>
                                   <span>Labor: ${log.costLabor}</span>
                                   <span className="text-slate-300 font-medium">Total: ${log.costParts + log.costLabor}</span>
                                </div>
                             </div>
                          </div>
                        ))}
                        {logs.filter(l => l.assetId === selectedAsset.id).length === 0 && (
                           <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                              No history logged yet.
                           </div>
                        )}
                   </div>
                </div>

             </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
               <ClipboardList size={48} className="mb-4 text-slate-700" />
               <p className="text-lg font-medium text-slate-400">Select an asset to view details</p>
               <p className="text-sm">Or check the alerts on the dashboard.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- Modals --- */}

      {/* Usage Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Update Usage</h2>
              <div className="space-y-4">
                 {assets.filter(a => a.usageUnit !== 'none').map(asset => (
                    <div key={asset.id} className="flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${asset.imageColor}`}>
                             <DynamicIcon name={asset.iconName} className="w-4 h-4" />
                          </div>
                          <div>
                             <div className="text-sm font-medium text-white">{asset.name}</div>
                             <div className="text-xs text-slate-500">Current: {asset.currentUsage}</div>
                          </div>
                       </div>
                       <input 
                         type="number" 
                         className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm w-28 focus:border-blue-500 outline-none"
                         placeholder="New Value"
                         onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateUsage(asset.id, parseInt(e.currentTarget.value));
                         }}
                         onBlur={(e) => {
                            if (e.target.value) handleUpdateUsage(asset.id, parseInt(e.target.value));
                         }}
                       />
                    </div>
                 ))}
              </div>
              <button onClick={() => setShowUsageModal(false)} className="mt-6 w-full py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">Close</button>
           </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
               <h2 className="text-xl font-bold text-white mb-4">Log Service Entry</h2>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const newLog: MaintenanceLog = {
                     id: Date.now().toString(),
                     assetId: fd.get('assetId') as string,
                     date: fd.get('date') as string,
                     type: fd.get('type') as any,
                     description: fd.get('description') as string,
                     usageAtTime: fd.get('usage') ? Number(fd.get('usage')) : undefined,
                     costParts: Number(fd.get('parts')) || 0,
                     costLabor: Number(fd.get('labor')) || 0,
                     performedBy: fd.get('performedBy') as any,
                     shopName: fd.get('shopName') as string,
                     notes: fd.get('notes') as string,
                  };
                  handleAddLog(newLog);
               }} className="space-y-4">
                  
                  <div>
                     <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Asset</label>
                     <select name="assetId" defaultValue={selectedAssetId || assets[0].id} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white">
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Date</label>
                        <input type="date" name="date" defaultValue={new Date().toISOString().slice(0,10)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white [color-scheme:dark]" />
                     </div>
                     <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Usage (Odo/Hours)</label>
                        <input type="number" name="usage" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Description</label>
                     <input type="text" name="description" placeholder="e.g., Oil Change" required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Type</label>
                        <select name="type" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white">
                           <option value="routine">Routine</option>
                           <option value="repair">Repair</option>
                           <option value="mod">Mod/Upgrade</option>
                           <option value="inspection">Inspection</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Performed By</label>
                        <select name="performedBy" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white">
                           <option value="diy">DIY</option>
                           <option value="shop">Shop</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Shop Name (Optional)</label>
                     <input type="text" name="shopName" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Cost (Parts)</label>
                        <input type="number" name="parts" defaultValue="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                     </div>
                     <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Cost (Labor)</label>
                        <input type="number" name="labor" defaultValue="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Notes</label>
                     <textarea name="notes" rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"></textarea>
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium">Cancel</button>
                     <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium shadow-lg shadow-blue-900/20">Save Entry</button>
                  </div>

               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default FleetLog;