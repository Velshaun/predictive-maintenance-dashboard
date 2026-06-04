import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MachinePage from './pages/MachinePage';
import MachinesPage from './pages/MachinesPage';
import PredictionsPage from './pages/PredictionsPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './utils/api';

/* ── Error boundary — catches any unhandled render exceptions and shows
   the error text so we can diagnose production-only crashes instead of
   silently displaying a white screen. Remove once stable in production. ── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px', fontFamily: 'monospace', fontSize: '13px',
          background: '#fff', color: '#dc2626', minHeight: '100vh',
        }}>
          <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '16px' }}>
            ⚠️ MaintainIQ — Runtime Error (please report this)
          </div>
          <pre style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px',
            border: '1px solid #fecaca', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ marginTop: '12px', color: '#6b7280', whiteSpace: 'pre-wrap',
            wordBreak: 'break-all', fontSize: '11px' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#dc2626',
              color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      <ErrorBoundary>
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
