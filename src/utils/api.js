import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Create the shared axios instance.
// Default timeout is intentionally omitted here so requests do not fail
// silently when the backend is slow to start in development.
// The Settings page applies any saved overrides at runtime via api.defaults.*
export const api = axios.create({
  baseURL: API_BASE,
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
