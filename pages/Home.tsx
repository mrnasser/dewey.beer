import React from 'react';
import GreetingWidget from '../components/GreetingWidget';
import ServiceCard from '../components/ServiceCard';
import ToolCard from '../components/ToolCard';
import { HOSTED_SERVICES, INTERNAL_TOOLS } from '../constants';
import { Server, Wrench, Terminal } from 'lucide-react';

const Home: React.FC = () => {
  const workbenchTools = INTERNAL_TOOLS.filter(t => t.category === 'workbench');
  const webDevTools = INTERNAL_TOOLS.filter(t => t.category === 'web-dev');

  return (
    <div className="animate-fade-in">
      <GreetingWidget />

      <div className="space-y-12">
        {/* Hosted Services Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
             <Server className="text-indigo-500" size={20} />
             <h2 className="text-xl font-semibold text-white">Hosted Services</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOSTED_SERVICES.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        {/* Workbench Section */}
        {workbenchTools.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
               <Wrench className="text-emerald-500" size={20} />
               <h2 className="text-xl font-semibold text-white">Workbench</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {workbenchTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        {/* Web Development Section */}
        {webDevTools.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
               <Terminal className="text-pink-500" size={20} />
               <h2 className="text-xl font-semibold text-white">Web Development</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {webDevTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;