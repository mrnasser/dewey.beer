import React from 'react';
import { ExternalLink, Lock } from 'lucide-react';
import { ServiceLink } from '../types';
import { DynamicIcon } from './Icons';

interface ServiceCardProps {
  service: ServiceLink;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const isPlanned = service.status === 'planned';

  const Content = () => (
    <div className={`relative h-full bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${!isPlanned ? 'hover:bg-slate-800/50' : 'opacity-60 cursor-not-allowed'}`}>
      
      {!isPlanned && (
        <>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          {/* Decorative accent */}
          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              <ExternalLink size={16} className="text-slate-400" />
          </div>
        </>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-white/5 border border-white/5 ${service.color}`}>
             <DynamicIcon name={service.iconName} className="w-6 h-6" />
          </div>
          {isPlanned && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700 flex items-center gap-1">
              <Lock size={10} /> Coming Soon
            </span>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {service.name}
          </h3>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            {service.description}
          </p>
        </div>
      </div>
    </div>
  );

  if (isPlanned) {
    return <div className="h-full"><Content /></div>;
  }

  return (
    <a 
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block h-full"
    >
      <Content />
    </a>
  );
};

export default ServiceCard;