import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, Clock, Settings, Info, Flame, Pizza, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- Types & Interfaces ---

interface DoughStyle {
  id: string;
  name: string;
  tf: number; // Thickness Factor (oz/sq in)
  hydration: { min: number; max: number; default: number };
  salt: { default: number };
  oil: { default: number };
  sugar: { default: number };
  yeast: { default: number };
  fermentation: {
    roomMin: number;
    roomMax: number;
    roomDefault: number;
    coldMin: number;
    coldMax: number;
    coldDefault: number;
    ballingTime: number; // hours before bake
  };
  bake: { temp: string; time: string; note?: string };
}

// --- Constants / Styles Data ---

const STYLES: Record<string, DoughStyle> = {
  thin: {
    id: 'thin',
    name: 'Thin Crust (Bar Style)',
    tf: 0.07,
    hydration: { min: 50, max: 60, default: 56 },
    salt: { default: 2.0 },
    oil: { default: 2.0 },
    sugar: { default: 1.0 },
    yeast: { default: 0.4 },
    fermentation: { roomMin: 2, roomMax: 24, roomDefault: 4, coldMin: 0, coldMax: 48, coldDefault: 24, ballingTime: 2 },
    bake: { temp: '600°F', time: '4-6 mins' }
  },
  ny_street: {
    id: 'ny_street',
    name: 'NY Street',
    tf: 0.085,
    hydration: { min: 58, max: 65, default: 62 },
    salt: { default: 2.5 },
    oil: { default: 1.5 },
    sugar: { default: 2.0 },
    yeast: { default: 0.5 },
    fermentation: { roomMin: 2, roomMax: 6, roomDefault: 3, coldMin: 24, coldMax: 72, coldDefault: 48, ballingTime: 4 },
    bake: { temp: '650°F', time: '6-8 mins' }
  },
  medium: {
    id: 'medium',
    name: 'Takeout Pizza',
    tf: 0.10,
    hydration: { min: 60, max: 65, default: 62 },
    salt: { default: 2.0 },
    oil: { default: 3.0 },
    sugar: { default: 2.0 },
    yeast: { default: 0.5 },
    fermentation: { roomMin: 2, roomMax: 8, roomDefault: 3, coldMin: 0, coldMax: 48, coldDefault: 24, ballingTime: 2 },
    bake: { temp: '550°F', time: '10-12 mins' }
  },
  neapolitan: {
    id: 'neapolitan',
    name: 'Neapolitan',
    tf: 0.075, // Light
    hydration: { min: 60, max: 75, default: 65 },
    salt: { default: 3.0 },
    oil: { default: 0 },
    sugar: { default: 0 },
    yeast: { default: 0.2 },
    fermentation: { roomMin: 8, roomMax: 24, roomDefault: 12, coldMin: 0, coldMax: 72, coldDefault: 24, ballingTime: 6 },
    bake: { temp: '850°F+', time: '60-90 secs' }
  },
  detroit: {
    id: 'detroit',
    name: 'Detroit / Sicilian',
    tf: 0.13,
    hydration: { min: 65, max: 75, default: 70 },
    salt: { default: 2.5 },
    oil: { default: 1.0 }, // Often low oil in dough, lots in pan
    sugar: { default: 1.0 },
    yeast: { default: 0.6 },
    fermentation: { roomMin: 2, roomMax: 6, roomDefault: 4, coldMin: 12, coldMax: 48, coldDefault: 24, ballingTime: 0 }, // Pan proofing handled differently usually
    bake: { temp: '500°F', time: '12-15 mins' }
  }
};

// --- Components ---

const InputPercent = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 0.1,
  disabled = false
}: { 
  label: string, 
  value: number, 
  onChange: (val: number) => void,
  min?: number,
  max?: number,
  step?: number,
  disabled?: boolean
}) => (
  <div className={`flex flex-col space-y-1 ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex justify-between text-xs text-slate-400">
      <span>{label}</span>
      <span>{value.toFixed(1)}%</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed accent-indigo-500 hover:accent-indigo-400 transition-all"
    />
  </div>
);

const PizzaCalculator: React.FC = () => {
  // -- State --
  const [selectedStyleId, setSelectedStyleId] = useState<string>('ny_street');
  const [diameter, setDiameter] = useState<number>(16);
  const [count, setCount] = useState<number>(2);
  const [roomTempHours, setRoomTempHours] = useState<number>(3);
  const [coldFermentHours, setColdFermentHours] = useState<number>(48);
  const [targetDate, setTargetDate] = useState<string>('');
  const [customMode, setCustomMode] = useState<boolean>(false);

  // Ingredients State
  const [hydration, setHydration] = useState<number>(62);
  const [salt, setSalt] = useState<number>(2.5);
  const [oil, setOil] = useState<number>(1.5);
  const [sugar, setSugar] = useState<number>(2.0);
  const [yeast, setYeast] = useState<number>(0.5);

  const cardRef = useRef<HTMLDivElement>(null);

  // -- Effect: Initialize Date --
  useEffect(() => {
    // Default to next Friday 6 PM
    const d = new Date();
    d.setDate(d.getDate() + (5 + 7 - d.getDay()) % 7);
    d.setHours(18, 0, 0, 0);
    setTargetDate(d.toISOString().slice(0, 16));
  }, []);

  // -- Effect: Update Defaults on Style Change --
  useEffect(() => {
    const style = STYLES[selectedStyleId];
    if (!customMode) {
      setHydration(style.hydration.default);
      setSalt(style.salt.default);
      setOil(style.oil.default);
      setSugar(style.sugar.default);
      setYeast(style.yeast.default);
      setRoomTempHours(style.fermentation.roomDefault);
      setColdFermentHours(style.fermentation.coldDefault);
    }
  }, [selectedStyleId, customMode]);

  // -- Effect: Auto-Adjust Hydration --
  useEffect(() => {
    if (customMode) return;
    const style = STYLES[selectedStyleId];
    
    // Base hydration
    let calcHydration = style.hydration.default;

    // Adjust for Cold Ferment: +0.5% per 12h over min
    const coldDiff = Math.max(0, coldFermentHours - style.fermentation.coldMin);
    calcHydration += (coldDiff / 12) * 0.5;

    // Adjust for Room Ferment: +0.25% per 1h over min
    const roomDiff = Math.max(0, roomTempHours - style.fermentation.roomMin);
    calcHydration += (roomDiff) * 0.25;

    // Clamp
    calcHydration = Math.min(style.hydration.max, Math.max(style.hydration.min, calcHydration));
    
    // Round to 1 decimal
    setHydration(Math.round(calcHydration * 10) / 10);

  }, [roomTempHours, coldFermentHours, selectedStyleId, customMode]);

  // -- Logic: Calculations --
  const style = STYLES[selectedStyleId];
  
  // 1. Dough Weight (oz -> g)
  // Area = pi * r^2. r = diameter/2.
  const radius = diameter / 2;
  const area = Math.PI * Math.pow(radius, 2);
  const singleDoughWeightOz = area * style.tf;
  const singleDoughWeightG = singleDoughWeightOz * 28.3495;
  const totalDoughWeightG = singleDoughWeightG * count;

  // 2. Baker's Math
  const totalPercent = 100 + hydration + salt + oil + sugar + yeast;
  const flourG = totalDoughWeightG / (totalPercent / 100);
  
  const ingredients = {
    flour: Math.round(flourG),
    water: Math.round(flourG * (hydration / 100)),
    salt: Math.round(flourG * (salt / 100)),
    oil: Math.round(flourG * (oil / 100)),
    sugar: Math.round(flourG * (sugar / 100)),
    yeast: Math.round(flourG * (yeast / 100) * 10) / 10 // Preserve decimal for small yeast amounts
  };

  // 3. Timeline
  const bakeDate = new Date(targetDate);
  const ballDate = new Date(bakeDate.getTime() - (style.fermentation.ballingTime * 60 * 60 * 1000));
  const coldStartDate = new Date(ballDate.getTime() - (coldFermentHours * 60 * 60 * 1000));
  const startMixDate = new Date(coldStartDate.getTime() - (roomTempHours * 60 * 60 * 1000));

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  // -- Handlers --
  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { 
        scale: 2,
        backgroundColor: '#0f172a' 
      });
      const dataURL = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `pizza_recipe_${selectedStyleId}_${diameter}in.png`;
      link.href = dataURL;
      link.click();
    } catch (err) {
      console.error("Error generating image:", err);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Pizza className="text-orange-500" />
            Dough Math
          </h1>
          <p className="text-slate-400 mt-1">Baker's math & fermentation scheduler</p>
        </div>
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Export Card</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Base Settings */}
          <section className="bg-slate-900/50 border border-white/10 rounded-xl p-5 space-y-5">
             <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
               <Settings size={14} /> Configuration
             </h3>
             
             <div>
                <label className="block text-sm text-slate-400 mb-2">Style</label>
                <div className="relative">
                  <select 
                    value={selectedStyleId}
                    onChange={(e) => setSelectedStyleId(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-lg p-2.5 appearance-none border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(STYLES).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-slate-400 mb-2">Size (in)</label>
                 <input 
                   type="number" 
                   value={diameter}
                   onChange={(e) => setDiameter(Number(e.target.value))}
                   className="w-full bg-slate-800 text-white rounded-lg p-2 border border-white/10 focus:border-indigo-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm text-slate-400 mb-2">Count</label>
                 <input 
                   type="number" 
                   value={count}
                   onChange={(e) => setCount(Number(e.target.value))}
                   className="w-full bg-slate-800 text-white rounded-lg p-2 border border-white/10 focus:border-indigo-500 outline-none"
                 />
               </div>
             </div>
             
             <div>
               <label className="block text-sm text-slate-400 mb-2">Target Bake Time</label>
               <div className="relative">
                 <input 
                    type="datetime-local"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-lg p-2 pl-10 border border-white/10 focus:border-indigo-500 outline-none [color-scheme:dark]" 
                 />
                 <Calendar className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
               </div>
             </div>
          </section>

          {/* Fermentation Settings */}
          <section className="bg-slate-900/50 border border-white/10 rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
               <Clock size={14} /> Fermentation
             </h3>

            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm text-slate-300 mb-1">
                    <span>Room Temp (Bulk)</span>
                    <span>{roomTempHours} hrs</span>
                  </div>
                  <input 
                    type="range" 
                    min={style.fermentation.roomMin} 
                    max={style.fermentation.roomMax}
                    value={roomTempHours}
                    onChange={(e) => setRoomTempHours(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
               </div>
               <div>
                  <div className="flex justify-between text-sm text-slate-300 mb-1">
                    <span>Cold Ferment (Fridge)</span>
                    <span>{coldFermentHours} hrs</span>
                  </div>
                  <input 
                    type="range" 
                    min={style.fermentation.coldMin} 
                    max={style.fermentation.coldMax}
                    value={coldFermentHours}
                    onChange={(e) => setColdFermentHours(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
               </div>
            </div>
          </section>

          {/* Ingredients Settings */}
          <section className="bg-slate-900/50 border border-white/10 rounded-xl p-5 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Flame size={14} /> Formula
                </h3>
                <button 
                  onClick={() => setCustomMode(!customMode)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${customMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                >
                  {customMode ? 'Custom' : 'Auto'}
                </button>
             </div>

             <div className="space-y-3">
                <InputPercent label="Hydration" value={hydration} onChange={setHydration} disabled={!customMode} min={40} max={90} step={0.5} />
                <InputPercent label="Salt" value={salt} onChange={setSalt} disabled={!customMode} min={0} max={5} />
                <InputPercent label="Oil" value={oil} onChange={setOil} disabled={!customMode} min={0} max={10} />
                <InputPercent label="Sugar" value={sugar} onChange={setSugar} disabled={!customMode} min={0} max={10} />
                <InputPercent label="Yeast" value={yeast} onChange={setYeast} disabled={!customMode} min={0} max={2} step={0.05} />
             </div>
          </section>

        </div>

        {/* Right Column: Preview / Recipe Card */}
        <div className="lg:col-span-8">
           <div ref={cardRef} className="bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              
              {/* Background Decorative */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-orange-500 font-bold tracking-wider text-sm uppercase">Recipe Card</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">{style.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {count} x {diameter}" Pizzas • {Math.round(singleDoughWeightG)}g per ball
                    </p>
                 </div>
                 <div className="text-right hidden sm:block">
                    <div className="text-2xl font-bold text-indigo-400">{hydration}%</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Hydration</div>
                 </div>
              </div>

              {/* Ingredients Table */}
              <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                 <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider border-b border-white/5 pb-2">Ingredients</h3>
                    <div className="space-y-3 text-sm">
                       <div className="flex justify-between text-white font-medium">
                          <span>Flour (100%)</span>
                          <span>{ingredients.flour} g</span>
                       </div>
                       <div className="flex justify-between text-indigo-300">
                          <span>Water ({hydration}%)</span>
                          <span>{ingredients.water} g</span>
                       </div>
                       <div className="flex justify-between text-slate-400">
                          <span>Salt ({salt}%)</span>
                          <span>{ingredients.salt} g</span>
                       </div>
                       {oil > 0 && (
                         <div className="flex justify-between text-slate-400">
                            <span>Oil ({oil}%)</span>
                            <span>{ingredients.oil} g</span>
                         </div>
                       )}
                       {sugar > 0 && (
                         <div className="flex justify-between text-slate-400">
                            <span>Sugar ({sugar}%)</span>
                            <span>{ingredients.sugar} g</span>
                         </div>
                       )}
                       <div className="flex justify-between text-amber-400 font-medium">
                          <span>Yeast ({yeast}%)</span>
                          <span>{ingredients.yeast} g</span>
                       </div>
                       
                       <div className="border-t border-white/10 pt-2 mt-2 flex justify-between text-white font-bold">
                          <span>Total Weight</span>
                          <span>{Math.round(totalDoughWeightG)} g</span>
                       </div>
                    </div>
                 </div>

                 {/* Timeline Visual */}
                 <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider border-b border-white/5 pb-2">Schedule</h3>
                    
                    <div className="flex-1 flex flex-col justify-between relative space-y-4">
                        {/* Vertical Line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/10 z-0"></div>

                        <div className="relative z-10 flex items-center gap-4">
                           <div className="w-4 h-4 rounded-full bg-slate-700 border-2 border-slate-500"></div>
                           <div>
                              <div className="text-xs text-slate-400 uppercase">Mix Dough</div>
                              <div className="text-white font-medium">{formatDate(startMixDate)}</div>
                           </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-4">
                           <div className="w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500"></div>
                           <div>
                              <div className="text-xs text-emerald-400 uppercase">Into Fridge</div>
                              <div className="text-white font-medium">{formatDate(coldStartDate)}</div>
                              <div className="text-[10px] text-slate-500">After {roomTempHours}h Room Temp</div>
                           </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-4">
                           <div className="w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-500"></div>
                           <div>
                              <div className="text-xs text-blue-400 uppercase">Ball Dough</div>
                              <div className="text-white font-medium">{formatDate(ballDate)}</div>
                              <div className="text-[10px] text-slate-500">After {coldFermentHours}h Cold</div>
                           </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-4">
                           <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                           <div>
                              <div className="text-xs text-orange-400 uppercase font-bold">Bake Time</div>
                              <div className="text-white font-bold text-lg">{formatDate(bakeDate)}</div>
                           </div>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Footer / Oven Specs */}
              <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center text-xs text-slate-500 relative z-10">
                 <div className="flex gap-4">
                    <span className="flex items-center gap-1"><Flame size={12}/> {style.bake.temp}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {style.bake.time}</span>
                    {style.bake.note && <span>• {style.bake.note}</span>}
                 </div>
                 <div className="italic">
                    dewey.beer
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default PizzaCalculator;