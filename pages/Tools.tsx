import React from 'react';
import { INTERNAL_TOOLS } from '../constants';
import ToolCard from '../components/ToolCard';
import { Wrench, Terminal } from 'lucide-react';

const Tools: React.FC = () => {
  const workbenchTools = INTERNAL_TOOLS.filter(t => t.category === 'workbench');
  const webDevTools = INTERNAL_TOOLS.filter(t => t.category === 'web-dev');

  return (
    <div className="animate-fade-in">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Wrench className="text-indigo-400" />
                The Workshop
            </h1>
            <p className="text-slate-400 mt-2 text-lg">
                Custom built utilities powered by React & Gemini.
            </p>
        </div>

        <div className="space-y-12">
            {/* Workbench Section */}
            <section>
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
                    <Wrench className="text-indigo-500" size={20} />
                    <h2 className="text-xl font-semibold text-white">Workbench</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workbenchTools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                    ))}
                </div>
            </section>

            {/* Web Development Section */}
            <section>
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
                    <Terminal className="text-pink-500" size={20} />
                    <h2 className="text-xl font-semibold text-white">Web Development</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {webDevTools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                    ))}
                </div>
            </section>
        </div>
    </div>
  );
};

export default Tools;