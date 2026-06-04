import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Create the shared axios instance.
// Default timeout is intentionally omitted here so requests do not fail
// silently when the backend is slow to start in development.
// The Settings page applies any saved overrides at runtime via api.defaults.*
export const api = axios.create({
  baseURL: API_BASE,
});

// ── Cache-busting interceptor ────────────────────────────────────────────
// Append a timestamp query param (?_t=<ms>) to every GET request so the
// browser cache and Vercel's edge CDN can never return a stale 304 response.
api.interceptors.request.use(config => {
  if (!config.method || config.method.toLowerCase() === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

// ── Stale-while-revalidate response cache ────────────────────────────────
// Successful GET responses that return an array are stored in sessionStorage
// for up to CACHE_TTL_MS.  Pages hydrate from this cache on mount so they
// render instantly on repeat visits while the background fetch completes.
const CACHE_TTL_MS   = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX   = 'api_cache_';

export function getCached(urlPath) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + urlPath);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL_MS ? data : null;
  } catch { return null; }
}

api.interceptors.response.use(response => {
  if (
    response.config.method?.toLowerCase() === 'get' &&
    Array.isArray(response.data) &&
    response.data.length > 0
  ) {
    // Strip the ?_t= cache-buster before using as the cache key
    const key = CACHE_PREFIX + (response.config.url || '').replace(/\?.*$/, '');
    try {
      sessionStorage.setItem(key, JSON.stringify({ data: response.data, ts: Date.now() }));
    } catch { /* sessionStorage may be full or unavailable */ }
  }
  return response;
});

export const getMachines             = ()     => api.get('/api/machines/');
export const getMachine              = (id)   => api.get(`/api/machines/${id}`);
export const createMachine           = (data) => api.post('/api/machines/', data);
// Soft-delete / restore / permanent delete
export const softDeleteMachine       = (id)   => api.delete(`/api/machines/${id}`);
export const restoreMachine          = (id)   => api.post(`/api/machines/${id}/restore`);
export const permanentDeleteMachine  = (id)   => api.delete(`/api/machines/${id}/permanent`);
export const getDeletedMachines      = ()     => api.get('/api/machines/deleted');
export const getMachineLogs     = (id)   => api.get(`/api/machines/${id}/logs`);
export const addLog             = (data) => api.post('/api/machines/logs', data);
// Prediction endpoints
export const runPrediction      = (machineId) => api.post(`/api/predictions/run/${machineId}`);
export const predict            = (data) => api.post('/api/predictions/predict', data);
export const getMachineStatus   = (id)   => api.get(`/api/predictions/status/${id}`);
export const getMachineReadings = (id)   => api.get(`/api/predictions/${id}`);
export const trainModel         = ()     => api.post('/api/predictions/train');
export const getAllLogs          = ()     => api.get('/api/logs/');
export const getAIInsight       = (data) => api.post('/api/ai/insight', data);
