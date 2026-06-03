import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MachinePage from './pages/MachinePage';
import MachinesPage from './pages/MachinesPage';
import PredictionsPage from './pages/PredictionsPage';

/* Wraps page content with fade-in transition on route change */
function AnimatedRoutes() {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter" style={{ height: '100%' }}>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/machines' element={<MachinesPage />} />
        <Route path='/predictions' element={<PredictionsPage />} />
        <Route path='/machine/:id' element={<MachinePage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
