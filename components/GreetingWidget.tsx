import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { generateDailyVibe } from '../services/geminiService';
import WeatherWidget from './WeatherWidget';

const GreetingWidget: React.FC = () => {
  const [message, setMessage] = useState<string>("Initializing system...");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    // Set formatted date
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    setDateStr(now.toLocaleDateString('en-US', options));

    // Fetch AI vibe
    const fetchVibe = async () => {
      const vibe = await generateDailyVibe();
      setMessage(vibe);
    };

    fetchVibe();
  }, []);

  return (
    <div className="mb-10 animate-fade-in">
      <div className="flex flex-col gap-4">
        
        {/* Top Row: Date and Weather */}
        <div className="flex items-center justify-between">
            <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                {dateStr}
            </h2>
            <WeatherWidget />
        </div>

        {/* Main Content Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Welcome Home
            </h1>
            
            <div className="max-w-md">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <Sparkles size={14} />
                    <span className="text-xs font-bold uppercase tracking-wide">System Status</span>
                </div>
                <p className="text-slate-300 text-sm md:text-base border-l-2 border-indigo-500/50 pl-3 italic">
                    "{message}"
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GreetingWidget;