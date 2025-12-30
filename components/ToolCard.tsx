import React from 'react';
import { Link } from './Layout';
import { ArrowRight, Lock, ExternalLink, FlaskConical } from 'lucide-react';
import { InternalTool } from '../types';
import { DynamicIcon } from './Icons';

interface ToolCardProps {
  tool: InternalTool;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const isPlanned = tool.status === 'planned';

  const Content = () => (
    <div className={`relative h-full bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 flex flex-col ${!isPlanned ? 'hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10' : 'opacity-70 cursor-not-allowed'}`}>
      
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg bg-white/5 border border-white/5 ${tool.color}`}>
            <DynamicIcon name={tool.iconName} className="w-6 h-6" />
        </div>
        {isPlanned && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">
            Planned
          </span>
        )}
        {tool.status === 'development' && (
           <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full border border-amber-500/20">
           Dev
         </span>
        )}
        {tool.status === 'beta' && (
           <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20 flex items-center gap-1">
           <FlaskConical size={10} /> Beta
         </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-medium text-white">
          {tool.name}
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          {tool.description}
        </p>
      </div>

      <div className="mt-6 flex items-center text-sm font-medium">
        {isPlanned ? (
            <div className="flex items-center text-slate-600">
                <Lock size={14} className="mr-2" />
                <span>Coming Soon</span>
            </div>
        ) : (
            <div className="flex items-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                <span>{tool.externalUrl ? 'Open Tool' : 'Launch Tool'}</span>
                {tool.externalUrl ? (
                    <ExternalLink size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                ) : (
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                )}
            </div>
        )}
      </div>
    </div>
  );

  if (isPlanned) {
    return <div className="h-full"><Content /></div>;
  }

  if (tool.externalUrl) {
    return (
      <a 
        href={tool.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block h-full"
      >
        <Content />
      </a>
    );
  }

  if (!tool.path) return null;

  return (
    <Link to={tool.path} className="group block h-full">
      <Content />
    </Link>
  );
};

export default ToolCard;