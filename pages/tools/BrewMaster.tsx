import React, { useState, useEffect, useMemo } from 'react';
import { 
  Beer, 
  Droplet, 
  Scale, 
  Thermometer, 
  Timer, 
  FlaskConical, 
  ArrowDown, 
  Percent, 
  ExternalLink,
  Plus,
  Trash2,
  Waves,
  Pipette,
  Activity,
  Zap,
  Calculator,
  Snowflake,
  Wind
} from 'lucide-react';

// --- Types & Interfaces ---

interface EquipmentProfile {
  systemName: string;
  batchSizeGal: number;
  brewhouseEfficiency: number; // 0-100
  grainAbsorptionGalPerLb: number;
  boilOffRateGalPerHr: number;
  trubLossGal: number;
  mashTunDeadspaceGal: number;
}

interface Fermentable {
  id: string;
  name: string;
  weightLb: number;
  ppg: number;
  lovibond: number;
}

interface HopAddition {
  id: string;
  name: string;
  weightOz: number;
  alphaAcid: number;
  timeMin: number; // 0 for whirlpool
  type: 'boil' | 'whirlpool' | 'dry';
  whirlpoolTempF?: number;
}

interface WaterProfile {
  ca: number;
  mg: number;
  na: number;
  cl: number;
  so4: number;
  hco3: number;
}

interface SaltAdditions {
  gypsum: number; // CaSO4
  cacl2: number;  // CaCl2
  epsom: number;  // MgSO4
  salt: number;   // NaCl
  bakingSoda: number; // NaHCO3
  chalk: number;  // CaCO3
}

interface YeastProfile {
  type: 'ale' | 'lager' | 'hybrid';
  form: 'liquid' | 'dry';
  cellsPerPack: number; // Billions
  packs: number;
  viability: number; // %
  targetPitchRate: number; // M cells / mL / P
}

interface FermentationStep {
  id: string;
  name: string;
  tempF: number;
  days: number;
}

interface KegConfig {
  tempF: number;
  co2Vol: number;
  lineResistance: number; // PSI/ft (3 for 3/16" ID)
  heightRiseFt: number; // ft
}

interface RecipeContext {
  name: string;
  style: string;
  batchSizeGal: number;
  efficiency: number;
  grainBill: Fermentable[];
  hopSchedule: HopAddition[];
  measuredOG?: number;
  measuredFG?: number;
  
  // Phase 2 Data
  sourceWater: WaterProfile;
  salts: SaltAdditions;
  yeast: YeastProfile;
  fermentationSchedule: FermentationStep[];
  kegConfig: KegConfig;
}

// --- Defaults ---

const DEFAULT_EQUIPMENT: EquipmentProfile = {
  systemName: 'Default System',
  batchSizeGal: 5.5,
  brewhouseEfficiency: 72,
  grainAbsorptionGalPerLb: 0.125,
  boilOffRateGalPerHr: 1.0,
  trubLossGal: 0.5,
  mashTunDeadspaceGal: 0.0
};

const DEFAULT_RECIPE: RecipeContext = {
  name: 'New Recipe',
  style: 'American IPA',
  batchSizeGal: 5.5,
  efficiency: 72,
  grainBill: [
    { id: '1', name: '2-Row', weightLb: 10, ppg: 37, lovibond: 1.8 },
    { id: '2', name: 'Crystal 40', weightLb: 0.5, ppg: 34, lovibond: 40 }
  ],
  hopSchedule: [
    { id: '1', name: 'Citra', weightOz: 1, alphaAcid: 12, timeMin: 60, type: 'boil' },
    { id: '2', name: 'Mosaic', weightOz: 2, alphaAcid: 11.5, timeMin: 0, type: 'whirlpool', whirlpoolTempF: 170 }
  ],
  sourceWater: { ca: 5, mg: 2, na: 8, cl: 10, so4: 10, hco3: 15 }, // Soft / RO-ish
  salts: { gypsum: 0, cacl2: 0, epsom: 0, salt: 0, bakingSoda: 0, chalk: 0 },
  yeast: { type: 'ale', form: 'liquid', cellsPerPack: 100, packs: 1, viability: 95, targetPitchRate: 0.75 },
  fermentationSchedule: [
    { id: '1', name: 'Primary', tempF: 67, days: 10 },
    { id: '2', name: 'Cold Crash', tempF: 38, days: 2 }
  ],
  kegConfig: { tempF: 38, co2Vol: 2.4, lineResistance: 2.2, heightRiseFt: 1 } // 2.2 is typical for 3/16 barrier tubing
};

// --- Math Helper Functions ---

const calculateGravity = (grains: Fermentable[], efficiency: number, volume: number) => {
  const totalPoints = grains.reduce((acc, grain) => acc + (grain.weightLb * grain.ppg), 0);
  const potentialPoints = totalPoints * (efficiency / 100);
  const pointsPerGal = volume > 0 ? potentialPoints / volume : 0;
  const og = 1 + (pointsPerGal / 1000);
  return { og, points: pointsPerGal };
};

const calculateABV = (og: number, fg: number) => {
  return (og - fg) * 131.25;
};

const calculateIBU = (hops: HopAddition[], og: number, volume: number) => {
  // Tinseth Formula
  let totalIBU = 0;
  
  hops.forEach(hop => {
    if (hop.type === 'dry') return;
    
    const bignessFactor = 1.65 * Math.pow(0.000125, (og - 1));
    const boilTimeFactor = (1 - Math.exp(-0.04 * hop.timeMin)) / 4.15;
    let utilization = bignessFactor * boilTimeFactor;

    // Whirlpool adjustment (Rough approximation)
    if (hop.type === 'whirlpool') {
       const temp = hop.whirlpoolTempF || 200;
       const tempFactor = temp > 180 ? 0.5 : temp > 160 ? 0.2 : 0.05;
       utilization = bignessFactor * ((1 - Math.exp(-0.04 * 20)) / 4.15) * tempFactor; // Assume 20m WP
    }

    const alphaAcidUnits = hop.alphaAcid * hop.weightOz;
    const ibu = (alphaAcidUnits * utilization * 74.9) / volume;
    totalIBU += ibu;
  });

  return totalIBU;
};

const calculateSRM = (grains: Fermentable[], volume: number) => {
  const mcu = grains.reduce((acc, g) => acc + (g.weightLb * g.lovibond), 0) / volume;
  return 1.4922 * Math.pow(mcu, 0.6859);
};

const calculateWaterChemistry = (source: WaterProfile, salts: SaltAdditions, totalWaterGal: number) => {
  // Salt effects in PPM for 1 gram in 1 gallon (Approximations)
  // Gypsum (CaSO4): 60 Ca, 147 SO4
  // CaCl2: 72 Ca, 128 Cl
  // Epsom (MgSO4): 24 Mg, 98 SO4
  // Salt (NaCl): 104 Na, 160 Cl
  // Baking Soda (NaHCO3): 72 Na, 184 HCO3
  // Chalk (CaCO3): 105 Ca, 158 HCO3 (Needs acid to dissolve effectively, often ignored in simple calcs but included here)

  if (totalWaterGal <= 0) return source;

  const ppm = (val: number, grams: number) => (val * grams) / totalWaterGal;

  return {
    ca: source.ca + ppm(60, salts.gypsum) + ppm(72, salts.cacl2) + ppm(105, salts.chalk),
    mg: source.mg + ppm(24, salts.epsom),
    na: source.na + ppm(104, salts.salt) + ppm(72, salts.bakingSoda),
    cl: source.cl + ppm(128, salts.cacl2) + ppm(160, salts.salt),
    so4: source.so4 + ppm(147, salts.gypsum) + ppm(98, salts.epsom),
    hco3: source.hco3 + ppm(184, salts.bakingSoda) + ppm(158, salts.chalk)
  };
};

// --- Components ---

const CardHeader: React.FC<{ icon: React.ReactNode, title: string, color: string }> = ({ icon, title, color }) => (
  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
    <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
  </div>
);

const NumberInput: React.FC<{ 
  value: number, 
  onChange: (val: number) => void, 
  label?: string, 
  step?: number,
  disabled?: boolean
}> = ({ value, onChange, label, step = 1, disabled }) => (
  <div className="flex flex-col">
    {label && <label className="text-xs text-slate-500 mb-1 uppercase font-bold">{label}</label>}
    <input 
      type="number" 
      value={value} 
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="bg-slate-900/50 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-500 outline-none disabled:opacity-50"
    />
  </div>
);

const BrewMaster: React.FC = () => {
  // -- State --
  const [recipe, setRecipe] = useState<RecipeContext>(DEFAULT_RECIPE);
  const [equipment, setEquipment] = useState<EquipmentProfile>(DEFAULT_EQUIPMENT);
  const [boilTime, setBoilTime] = useState<number>(60);

  // -- Core Calculations --
  const { og, points } = useMemo(() => calculateGravity(recipe.grainBill, recipe.efficiency, recipe.batchSizeGal), [recipe]);
  const fg = recipe.measuredFG || (1 + (og - 1) * 0.25); 
  const abv = calculateABV(og, fg);
  const ibu = useMemo(() => calculateIBU(recipe.hopSchedule, og, recipe.batchSizeGal), [recipe, og]);
  const srm = useMemo(() => calculateSRM(recipe.grainBill, recipe.batchSizeGal), [recipe]);

  // -- Water Volumes --
  const totalGrainWeight = recipe.grainBill.reduce((acc, g) => acc + g.weightLb, 0);
  const absorption = totalGrainWeight * equipment.grainAbsorptionGalPerLb;
  const boilOff = equipment.boilOffRateGalPerHr * (boilTime / 60);
  const preBoilVol = recipe.batchSizeGal + boilOff + equipment.trubLossGal;
  const mashVol = totalGrainWeight * (1.25 / 4); 
  const spargeVol = preBoilVol - mashVol + absorption + equipment.mashTunDeadspaceGal;
  const totalWater = mashVol + spargeVol;

  // -- Water Chemistry --
  const waterProfile = useMemo(() => calculateWaterChemistry(recipe.sourceWater, recipe.salts, totalWater), [recipe.sourceWater, recipe.salts, totalWater]);
  const chlorideSulfateRatio = waterProfile.so4 > 0 ? waterProfile.cl / waterProfile.so4 : 0;
  
  // -- Yeast --
  const plato = (og - 1) * 1000 / 4; // Approximation
  const totalCellsNeededBillions = (recipe.yeast.targetPitchRate * (recipe.batchSizeGal * 3785.41) * plato) / 1000;
  const totalCellsAvailable = recipe.yeast.packs * recipe.yeast.cellsPerPack * (recipe.yeast.viability / 100);
  const yeastDifference = totalCellsAvailable - totalCellsNeededBillions;

  // -- Kegging --
  // Chart approx for CO2 vol -> PSI at Temp: PSI = -16.6999 - 0.0101059 * T + 0.00116512 * T^2 + 0.173354 * T * V + 4.24267 * V - 0.0684226 * V^2
  // Simplified linear approx for UI display: PSI = (V * 15) - (120 - T) * 0.15 ... roughly. 
  // Let's stick to standard Henry's Law approximation or user input. 
  // We will calculate Serving Pressure required for the CO2 Vol at the Temp.
  // P (PSI) = (V * 19.56 * exp(0.0065 * (T-32))) - 14.7 ? No that's complex.
  // Let's just use a standard lookup approximation logic:
  const servingPSI = Math.max(0, (-16.6999 - 0.0101059 * recipe.kegConfig.tempF + 0.00116512 * Math.pow(recipe.kegConfig.tempF, 2) + 0.173354 * recipe.kegConfig.tempF * recipe.kegConfig.co2Vol + 4.24267 * recipe.kegConfig.co2Vol - 0.0684226 * Math.pow(recipe.kegConfig.co2Vol, 2)));
  
  const resistanceNeeded = servingPSI - (recipe.kegConfig.heightRiseFt * 0.5); // 0.5 PSI per ft gravity
  const lineLengthFt = Math.max(0, resistanceNeeded / recipe.kegConfig.lineResistance);


  // -- Handlers --
  const updateGrain = (id: string, field: keyof Fermentable, value: any) => {
    setRecipe(prev => ({
      ...prev,
      grainBill: prev.grainBill.map(g => g.id === id ? { ...g, [field]: value } : g)
    }));
  };

  const addGrain = () => {
    setRecipe(prev => ({
      ...prev,
      grainBill: [...prev.grainBill, { id: Date.now().toString(), name: 'New Grain', weightLb: 0, ppg: 35, lovibond: 2 }]
    }));
  };

  const removeGrain = (id: string) => {
    setRecipe(prev => ({ ...prev, grainBill: prev.grainBill.filter(g => g.id !== id) }));
  };

  const updateHop = (id: string, field: keyof HopAddition, value: any) => {
    setRecipe(prev => ({
      ...prev,
      hopSchedule: prev.hopSchedule.map(h => h.id === id ? { ...h, [field]: value } : h)
    }));
  };

  const addHop = () => {
    setRecipe(prev => ({
      ...prev,
      hopSchedule: [...prev.hopSchedule, { id: Date.now().toString(), name: 'New Hop', weightOz: 1, alphaAcid: 10, timeMin: 60, type: 'boil' }]
    }));
  };

  const removeHop = (id: string) => {
    setRecipe(prev => ({ ...prev, hopSchedule: prev.hopSchedule.filter(h => h.id !== id) }));
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-20 space-y-8">
      
      {/* --- Global Header / Links --- */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/50 border border-amber-500/20 rounded-2xl p-6 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Beer className="text-amber-500" />
            Brew Master
          </h1>
          <p className="text-slate-400 mt-1">Recipe Design & Brew Day Toolkit</p>
        </div>
        <a 
          href="https://web.brewfather.app/tabs/recipes" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20"
        >
           <ExternalLink size={20} />
           Open Brewfather
        </a>
      </div>

      {/* --- Recipe Context Header --- */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Inputs */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                 <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Recipe Name</label>
                 <input 
                    type="text" 
                    value={recipe.name}
                    onChange={(e) => setRecipe({...recipe, name: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none font-medium"
                 />
              </div>
              <div>
                 <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Batch Size (Gal)</label>
                 <input 
                    type="number" 
                    step={0.25}
                    value={recipe.batchSizeGal}
                    onChange={(e) => setRecipe({...recipe, batchSizeGal: parseFloat(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                 />
              </div>
              <div>
                 <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Efficiency (%)</label>
                 <input 
                    type="number" 
                    value={recipe.efficiency}
                    onChange={(e) => setRecipe({...recipe, efficiency: parseFloat(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                 />
              </div>
            </div>

            {/* Live Stats */}
            <div className="lg:col-span-1 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8 pt-4 lg:pt-0">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold">OG</div>
                        <div className="text-xl font-mono text-amber-400">{og.toFixed(3)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold">FG (Est)</div>
                        <div className="text-xl font-mono text-slate-300">{fg.toFixed(3)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold">ABV</div>
                        <div className="text-xl font-mono text-amber-500">{abv.toFixed(1)}%</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold">IBU</div>
                        <div className="text-xl font-mono text-green-400">{Math.round(ibu)}</div>
                    </div>
                </div>
            </div>
         </div>
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

         {/* 1. Gravity Hub (Grain Bill) */}
         <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
            <CardHeader icon={<Scale className="text-white" size={18} />} title="Grain Bill & Gravity" color="text-amber-400" />
            
            <div className="space-y-3 mb-4">
              {recipe.grainBill.map(grain => (
                <div key={grain.id} className="flex items-center gap-2 bg-slate-950/50 p-2 rounded border border-white/5">
                   <input 
                      type="text" 
                      value={grain.name}
                      onChange={(e) => updateGrain(grain.id, 'name', e.target.value)}
                      className="flex-grow bg-transparent text-sm text-white outline-none placeholder-slate-600"
                      placeholder="Grain Name"
                   />
                   <div className="w-20">
                      <NumberInput value={grain.weightLb} onChange={(v) => updateGrain(grain.id, 'weightLb', v)} step={0.1} />
                   </div>
                   <span className="text-xs text-slate-500 w-6">lb</span>
                   <button onClick={() => removeGrain(grain.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <button onClick={addGrain} className="w-full py-2 border border-dashed border-slate-700 text-slate-500 rounded hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm">
              <Plus size={14} /> Add Fermentable
            </button>
            
            <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-white/5 grid grid-cols-3 gap-4 text-center">
               <div>
                  <div className="text-xs text-slate-500">Total Grist</div>
                  <div className="font-medium text-white">{totalGrainWeight.toFixed(2)} lb</div>
               </div>
               <div>
                  <div className="text-xs text-slate-500">Color</div>
                  <div className="font-medium text-amber-700">{srm.toFixed(1)} SRM</div>
               </div>
               <div>
                  <div className="text-xs text-slate-500">Est OG</div>
                  <div className="font-medium text-amber-400">{og.toFixed(3)}</div>
               </div>
            </div>
         </div>

         {/* 2. Mash & Water Calculator */}
         <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
            <CardHeader icon={<Droplet className="text-white" size={18} />} title="Water & Volumes" color="text-blue-400" />
            
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Boil Time (min)</label>
                  <NumberInput value={boilTime} onChange={setBoilTime} step={5} />
               </div>
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Boil Off (Gal/Hr)</label>
                  <NumberInput value={equipment.boilOffRateGalPerHr} onChange={(v) => setEquipment({...equipment, boilOffRateGalPerHr: v})} step={0.1} />
               </div>
            </div>

            <div className="space-y-4 relative">
               <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-3">
                     <Waves size={18} className="text-blue-400" />
                     <span className="text-sm font-medium text-slate-300">Mash Volume</span>
                  </div>
                  <div className="font-mono text-xl text-white">{mashVol.toFixed(2)} <span className="text-sm text-slate-500">gal</span></div>
               </div>
               
               <div className="flex justify-center -my-2 relative z-10">
                  <ArrowDown size={16} className="text-slate-600" />
               </div>

               <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-3">
                     <Waves size={18} className="text-blue-400" />
                     <span className="text-sm font-medium text-slate-300">Sparge Volume</span>
                  </div>
                  <div className="font-mono text-xl text-white">{spargeVol.toFixed(2)} <span className="text-sm text-slate-500">gal</span></div>
               </div>

               <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total Water Needed</span>
                  <span className="text-lg font-bold text-blue-300">{totalWater.toFixed(2)} gal</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Pre-Boil Volume</span>
                  <span className="text-lg font-bold text-amber-200">{preBoilVol.toFixed(2)} gal</span>
               </div>
            </div>
         </div>

         {/* 3. Hop & IBU Calculator */}
         <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-xl p-5">
            <CardHeader icon={<Beer className="text-white" size={18} />} title="Hops & Bitterness" color="text-green-400" />
            
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm mb-4">
                  <thead>
                     <tr className="text-slate-500 border-b border-white/5">
                        <th className="pb-2 font-medium pl-2">Hop Name</th>
                        <th className="pb-2 font-medium w-24">Weight (oz)</th>
                        <th className="pb-2 font-medium w-20">AA %</th>
                        <th className="pb-2 font-medium w-24">Time (min)</th>
                        <th className="pb-2 font-medium w-24">Type</th>
                        <th className="pb-2 w-8"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {recipe.hopSchedule.map(hop => (
                        <tr key={hop.id} className="group">
                           <td className="py-2 pl-2">
                              <input 
                                 type="text" 
                                 value={hop.name}
                                 onChange={(e) => updateHop(hop.id, 'name', e.target.value)}
                                 className="bg-transparent text-white outline-none w-full placeholder-slate-600" 
                              />
                           </td>
                           <td className="py-2"><NumberInput value={hop.weightOz} onChange={(v) => updateHop(hop.id, 'weightOz', v)} step={0.25} /></td>
                           <td className="py-2"><NumberInput value={hop.alphaAcid} onChange={(v) => updateHop(hop.id, 'alphaAcid', v)} step={0.1} /></td>
                           <td className="py-2"><NumberInput value={hop.timeMin} onChange={(v) => updateHop(hop.id, 'timeMin', v)} /></td>
                           <td className="py-2">
                              <select 
                                value={hop.type}
                                onChange={(e) => updateHop(hop.id, 'type', e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-300 text-xs outline-none"
                              >
                                 <option value="boil">Boil</option>
                                 <option value="whirlpool">Whirlpool</option>
                                 <option value="dry">Dry Hop</option>
                              </select>
                           </td>
                           <td className="py-2 text-right">
                              <button onClick={() => removeHop(hop.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            
            <div className="flex items-center justify-between">
               <button onClick={addHop} className="px-4 py-2 border border-dashed border-slate-700 text-slate-500 rounded hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2 text-sm">
                 <Plus size={14} /> Add Hop
               </button>
               <div className="flex items-center gap-6">
                  <div className="text-right">
                     <div className="text-xs text-slate-500 uppercase font-bold">BU:GU Ratio</div>
                     <div className="text-lg font-mono text-slate-300">{(ibu / ((og - 1) * 1000)).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                     <div className="text-xs text-slate-500 uppercase font-bold">Total IBU</div>
                     <div className="text-2xl font-mono text-green-400 font-bold">{Math.round(ibu)}</div>
                  </div>
               </div>
            </div>
         </div>

         {/* 4. Water Chemistry */}
         <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
             <CardHeader icon={<Pipette className="text-white" size={18} />} title="Water Chemistry" color="text-cyan-400" />
             
             {/* Source Profile */}
             <div className="mb-4">
                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Source Water (PPM)</label>
                <div className="grid grid-cols-6 gap-2">
                   {Object.entries(recipe.sourceWater).map(([ion, val]) => (
                      <div key={ion} className="text-center">
                         <input 
                           type="number" 
                           value={val}
                           onChange={(e) => setRecipe({...recipe, sourceWater: {...recipe.sourceWater, [ion]: parseFloat(e.target.value)}})}
                           className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-center text-xs text-slate-300"
                         />
                         <span className="text-[10px] text-slate-500 uppercase mt-1 block">{ion}</span>
                      </div>
                   ))}
                </div>
             </div>

             {/* Additions */}
             <div className="mb-6">
                <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Additions (Grams)</label>
                <div className="grid grid-cols-3 gap-3">
                   <div><NumberInput label="Gypsum" value={recipe.salts.gypsum} onChange={(v) => setRecipe({...recipe, salts: {...recipe.salts, gypsum: v}})} /></div>
                   <div><NumberInput label="CaCl2" value={recipe.salts.cacl2} onChange={(v) => setRecipe({...recipe, salts: {...recipe.salts, cacl2: v}})} /></div>
                   <div><NumberInput label="Epsom" value={recipe.salts.epsom} onChange={(v) => setRecipe({...recipe, salts: {...recipe.salts, epsom: v}})} /></div>
                   <div><NumberInput label="Salt" value={recipe.salts.salt} onChange={(v) => setRecipe({...recipe, salts: {...recipe.salts, salt: v}})} /></div>
                   <div><NumberInput label="Baking Soda" value={recipe.salts.bakingSoda} onChange={(v) => setRecipe({...recipe, salts: {...recipe.salts, bakingSoda: v}})} /></div>
                   <div><NumberInput label="Chalk" value={recipe.salts.chalk} onChange={(v) => setRecipe({...recipe, salts: {...recipe.salts, chalk: v}})} /></div>
                </div>
             </div>

             {/* Result */}
             <div className="bg-slate-950 p-4 rounded-lg border border-white/5">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-xs text-slate-500 uppercase font-bold">Total Water Profile</span>
                   <span className="text-xs text-cyan-400">Ratio {chlorideSulfateRatio.toFixed(1)} (Cl:SO4)</span>
                </div>
                <div className="grid grid-cols-6 gap-1 text-center">
                    {Object.entries(waterProfile).map(([ion, val]) => (
                        <div key={ion} className="bg-slate-900 rounded py-1">
                           <div className="text-sm font-bold text-white">{Math.round(val)}</div>
                           <div className="text-[9px] text-slate-500 uppercase">{ion}</div>
                        </div>
                    ))}
                </div>
             </div>
         </div>

         {/* 5. Yeast & Starter */}
         <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
            <CardHeader icon={<Activity className="text-white" size={18} />} title="Yeast Pitch" color="text-purple-400" />
            
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Yeast Type</label>
                  <select 
                     value={recipe.yeast.type}
                     onChange={(e) => setRecipe({...recipe, yeast: {...recipe.yeast, type: e.target.value as any}})}
                     className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white text-sm outline-none"
                  >
                     <option value="ale">Ale</option>
                     <option value="lager">Lager</option>
                     <option value="hybrid">Hybrid</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Target Rate</label>
                  <NumberInput value={recipe.yeast.targetPitchRate} onChange={(v) => setRecipe({...recipe, yeast: {...recipe.yeast, targetPitchRate: v}})} step={0.05} />
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Pack Size (B)</label>
                  <NumberInput value={recipe.yeast.cellsPerPack} onChange={(v) => setRecipe({...recipe, yeast: {...recipe.yeast, cellsPerPack: v}})} />
               </div>
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Pack Count</label>
                  <NumberInput value={recipe.yeast.packs} onChange={(v) => setRecipe({...recipe, yeast: {...recipe.yeast, packs: v}})} />
               </div>
               <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Viability %</label>
                  <NumberInput value={recipe.yeast.viability} onChange={(v) => setRecipe({...recipe, yeast: {...recipe.yeast, viability: v}})} />
               </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-white/5">
               <div className="flex justify-between mb-2">
                  <span className="text-slate-400 text-sm">Cells Needed</span>
                  <span className="text-white font-mono">{Math.round(totalCellsNeededBillions)} Billion</span>
               </div>
               <div className="flex justify-between mb-3">
                   <span className="text-slate-400 text-sm">Cells Available</span>
                   <span className="text-white font-mono">{Math.round(totalCellsAvailable)} Billion</span>
               </div>
               <div className={`text-center p-2 rounded font-bold text-sm ${yeastDifference >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {yeastDifference >= 0 ? 'Pitch Rate Sufficient' : `Underpitch: Need ${Math.abs(Math.round(yeastDifference))}B more`}
               </div>
            </div>
         </div>

         {/* 6. Fermentation Schedule */}
         <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
             <CardHeader icon={<Thermometer className="text-white" size={18} />} title="Fermentation Profile" color="text-red-400" />
             
             <div className="space-y-3 mb-4">
                {recipe.fermentationSchedule.map((step, idx) => (
                   <div key={step.id} className="flex items-center gap-3 bg-slate-950/50 p-3 rounded border border-white/5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-orange-500 opacity-50"></div>
                      <div className="flex-grow">
                         <input 
                           type="text" 
                           value={step.name} 
                           onChange={(e) => {
                              const newSched = [...recipe.fermentationSchedule];
                              newSched[idx].name = e.target.value;
                              setRecipe({...recipe, fermentationSchedule: newSched});
                           }}
                           className="bg-transparent text-white font-medium outline-none w-full"
                         />
                         <div className="text-xs text-slate-500">Step {idx + 1}</div>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-16">
                            <NumberInput value={step.tempF} onChange={(v) => {
                               const newSched = [...recipe.fermentationSchedule];
                               newSched[idx].tempF = v;
                               setRecipe({...recipe, fermentationSchedule: newSched});
                            }} />
                          </div>
                          <span className="text-xs text-slate-500">°F</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-16">
                            <NumberInput value={step.days} onChange={(v) => {
                               const newSched = [...recipe.fermentationSchedule];
                               newSched[idx].days = v;
                               setRecipe({...recipe, fermentationSchedule: newSched});
                            }} />
                          </div>
                          <span className="text-xs text-slate-500">Days</span>
                      </div>
                      <button 
                        onClick={() => setRecipe({...recipe, fermentationSchedule: recipe.fermentationSchedule.filter(s => s.id !== step.id)})}
                        className="text-slate-600 hover:text-red-400"
                      >
                         <Trash2 size={16}/>
                      </button>
                   </div>
                ))}
             </div>
             
             <button 
               onClick={() => setRecipe({...recipe, fermentationSchedule: [...recipe.fermentationSchedule, { id: Date.now().toString(), name: 'New Step', tempF: 68, days: 3 }]})}
               className="w-full py-2 border border-dashed border-slate-700 text-slate-500 rounded hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
             >
                <Plus size={14} /> Add Step
             </button>

             {/* Visual Timeline */}
             <div className="mt-6 flex h-2 rounded-full bg-slate-800 overflow-hidden">
                {recipe.fermentationSchedule.map((step, idx) => (
                   <div 
                     key={step.id} 
                     style={{ width: `${(step.days / recipe.fermentationSchedule.reduce((a,b) => a + b.days, 0)) * 100}%` }}
                     className={`h-full ${idx % 2 === 0 ? 'bg-red-500' : 'bg-red-700'} hover:opacity-80 transition-opacity`}
                     title={`${step.name}: ${step.days} days`}
                   />
                ))}
             </div>
             <div className="flex justify-between text-xs text-slate-500 mt-2">
                 <span>Start</span>
                 <span>Total: {recipe.fermentationSchedule.reduce((a,b) => a + b.days, 0)} Days</span>
             </div>
         </div>

         {/* 7. Keg Balancing */}
         <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
             <CardHeader icon={<Zap className="text-white" size={18} />} title="Keg Balancing" color="text-yellow-400" />
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Beer Temp (°F)</label>
                    <NumberInput value={recipe.kegConfig.tempF} onChange={(v) => setRecipe({...recipe, kegConfig: {...recipe.kegConfig, tempF: v}})} />
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Target CO2 Vol</label>
                    <NumberInput value={recipe.kegConfig.co2Vol} step={0.1} onChange={(v) => setRecipe({...recipe, kegConfig: {...recipe.kegConfig, co2Vol: v}})} />
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Line Resistance</label>
                    <NumberInput value={recipe.kegConfig.lineResistance} step={0.1} onChange={(v) => setRecipe({...recipe, kegConfig: {...recipe.kegConfig, lineResistance: v}})} />
                    <span className="text-[10px] text-slate-500">~2.2 for 3/16" barrier</span>
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Tap Height Rise (ft)</label>
                    <NumberInput value={recipe.kegConfig.heightRiseFt} onChange={(v) => setRecipe({...recipe, kegConfig: {...recipe.kegConfig, heightRiseFt: v}})} />
                 </div>
             </div>

             <div className="bg-slate-950 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                 <div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Required Pressure</div>
                    <div className="text-2xl font-bold text-yellow-400">{servingPSI.toFixed(1)} PSI</div>
                 </div>
                 <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold">Line Length</div>
                    <div className="text-2xl font-bold text-white">{lineLengthFt.toFixed(1)} ft</div>
                 </div>
             </div>
             <p className="text-xs text-slate-500 mt-3 italic">
                Based on achieving balanced resistance at the tap.
             </p>
         </div>

      </div>

    </div>
  );
};

export default BrewMaster;