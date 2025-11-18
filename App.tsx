import React from 'react';
import Layout, { HashRouter, Routes, Route, Navigate } from './components/Layout';
import Home from './pages/Home';
import Tools from './pages/Tools';
import PizzaCalculator from './pages/tools/PizzaCalculator';
import FleetLog from './pages/tools/FleetLog';
import BrewMaster from './pages/tools/BrewMaster';
import BigCommerceColorTool from './pages/tools/BigCommerceColorTool';
import UTMGenerator from './pages/tools/UTMGenerator';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          
          {/* Workbench Tools */}
          <Route path="/tools/pizza" element={<PizzaCalculator />} />
          <Route path="/tools/fleet" element={<FleetLog />} />
          <Route path="/tools/brewing" element={<BrewMaster />} />
          
          {/* Web Dev Tools */}
          <Route path="/tools/bc-colors" element={<BigCommerceColorTool />} />
          <Route path="/tools/utm-generator" element={<UTMGenerator />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;