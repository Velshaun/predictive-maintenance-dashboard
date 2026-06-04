import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Create the shared axios instance.
// Default timeout is intentionally omitted here so requests do not fail
// silently when the backend is slow to start in development.
// The Settings page applies any saved overrides at runtime via api.defaults.*
export const api = axios.create({
  baseURL: API_BASE,
});

// ── Cache-busting interceptor ────────────────────────────────────────────────
// Append a timestamp query param (?_t=<ms>) to every GET request so the
// browser cache and Vercel's edge CDN can never return a stale 304 response.
api.interceptors.request.use(config => {
  if (!config.method || config.method.toLowerCase() === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

// ── Stale-while-revalidate response cache ────────────────────────────────────
// Successful GET responses are stored in localStorage (persists across page
// reloads and tabs) for up to CACHE_TTL_MS.  Pages hydrate from this cache
// on mount so they render instantly on repeat visits while the background
// fetch completes.
//
// localStorage is preferred over sessionStorage because:
//   • It survives full page reloads (F5) — the single biggest cold-start hit
//   • It is shared across tabs, so opening a new tab is also fast
//   • 5 MB limit is plenty for our JSON payloads
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'pmd_cache_';   // pmd = predictive-maintenance-dashboard

export function getCached(urlPath) {
  try {
    // Check localStorage first (new prefix), then fall back to the legacy
    // sessionStorage entries written by the old api.js (old prefix).
    const raw =
      localStorage.getItem(CACHE_PREFIX + urlPath) ||
      sessionStorage.getItem('api_cache_' + urlPath);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL_MS ? data : null;
  } catch { return null; }
}

function _setCache(urlPath, data) {
  const payload = JSON.stringify({ data, ts: Date.now() });
  try {
    localStorage.setItem(CACHE_PREFIX + urlPath, payload);
  } catch {
    // localStorage full or unavailable — fall back to sessionStorage
    try { sessionStorage.setItem('api_cache_' + urlPath, payload); } catch { /* ignore */ }
  }
}

// Cache both array AND object responses (the dashboard aggregate returns an object).
api.interceptors.response.use(response => {
  if (response.config.method?.toLowerCase() === 'get') {
    const d = response.data;
    const isCacheable =
      Array.isArray(d)
        ? d.length > 0
        : (d !== null && typeof d === 'object');
    if (isCacheable) {
      const key = (response.config.url || '').replace(/\?.*$/, '');
      _setCache(key, d);
    }
  }
  return response;
});

// ── API helpers ──────────────────────────────────────────────────────────────
export const getMachines             = ()     => api.get('/api/machines/');
export const getMachine              = (id)   => api.get(`/api/machines/${id}`);
export const createMachine           = (data) => api.post('/api/machines/', data);
// Soft-delete / restore / permanent delete
export const softDeleteMachine       = (id)   => api.delete(`/api/machines/${id}`);
export const restoreMachine          = (id)   => api.post(`/api/machines/${id}/restore`);
export const permanentDeleteMachine  = (id)   => api.delete(`/api/machines/${id}/permanent`);
export const getDeletedMachines      = ()     => api.get('/api/machines/deleted');
export const getMachineLogs          = (id)   => api.get(`/api/machines/${id}/logs`);
export const addLog                  = (data) => api.post('/api/machines/logs', data);
// Prediction endpoints
export const runPrediction      = (machineId) => api.post(`/api/predictions/run/${machineId}`);
export const predict            = (data) => api.post('/api/predictions/predict', data);
export const getMachineStatus   = (id)   => api.get(`/api/predictions/status/${id}`);
// Optional ?limit=N cap — defaults to all readings when omitted
export const getMachineReadings = (id, limit) =>
  api.get(`/api/predictions/${id}${limit != null ? `?limit=${limit}` : ''}`);
export const trainModel         = ()     => api.post('/api/predictions/train');
export const getAllLogs          = ()     => api.get('/api/logs/');
export const getAIInsight       = (data) => api.post('/api/ai/insight', data);
