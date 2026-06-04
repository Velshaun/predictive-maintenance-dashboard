import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MachinePage from './pages/MachinePage';
import MachinesPage from './pages/MachinesPage';
import PredictionsPage from './pages/PredictionsPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './utils/api';

const LS_KEY = 'maintainiq_settings';

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
        <Route path='/settings' element={<SettingsPage />} />
      </Routes>
    </div>
  );
}

function App() {
  // Apply any saved API settings from localStorage once on startup.
  // Doing this here (not in api.js) keeps the module side-effect-free and
  // prevents a stale/bad stored value from breaking the axios instance before
  // the first render runs.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s?.apiBaseUrl === 'string' && s.apiBaseUrl !== '') {
        api.defaults.baseURL = s.apiBaseUrl;
      }
      if (typeof s?.requestTimeout === 'number' && s.requestTimeout > 0) {
        api.defaults.timeout = s.requestTimeout;
      }
    } catch { /* ignore corrupt stored data */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
