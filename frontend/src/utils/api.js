import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

export const api = axios.create({ baseURL: API_BASE });

export const getMachines = () => api.get('/api/machines/');
export const getMachine = (id) => api.get(`/api/machines/${id}`);
export const createMachine = (data) => api.post('/api/machines/', data);
export const getMachineLogs = (id) => api.get(`/api/machines/${id}/logs`);
export const addLog = (data) => api.post('/api/machines/logs', data);
export const predict = (data) => api.post('/api/predictions/predict', data);
export const getAIInsight = (data) => api.post('/api/ai/insight', data);
