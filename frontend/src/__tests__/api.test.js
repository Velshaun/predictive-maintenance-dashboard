/**
 * Unit tests for src/utils/api.js
 *
 * Verifies that:
 *   - The exported axios instance has the correct default baseURL
 *   - Every helper function exists and is callable
 *   - Each helper hits the right HTTP method + path (via axios-mock-adapter)
 */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  api,
  getMachines,
  getMachine,
  createMachine,
  getMachineLogs,
  addLog,
  predict,
  getMachineStatus,
  getMachineReadings,
  trainModel,
  getAllLogs,
  getAIInsight,
} from '../utils/api';

// ---------------------------------------------------------------------------
// Helpers — install/uninstall mock adapter around each test
// ---------------------------------------------------------------------------
let mock;
beforeEach(() => { mock = new MockAdapter(api); });
afterEach(() => { mock.restore(); });

// ---------------------------------------------------------------------------
// Instance defaults
// ---------------------------------------------------------------------------

describe('api axios instance', () => {
  test('is an axios instance', () => {
    expect(axios.isAxiosError).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
  });

  test('baseURL defaults to empty string (same-origin)', () => {
    // When REACT_APP_API_URL is not set, baseURL should be '' or undefined
    const base = api.defaults.baseURL;
    expect(base === '' || base === undefined).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Every export is a function
// ---------------------------------------------------------------------------

describe('api helper exports', () => {
  const fns = {
    getMachines,
    getMachine,
    createMachine,
    getMachineLogs,
    addLog,
    predict,
    getMachineStatus,
    getMachineReadings,
    trainModel,
    getAllLogs,
    getAIInsight,
  };

  Object.entries(fns).forEach(([name, fn]) => {
    test(`${name} is a function`, () => {
      expect(typeof fn).toBe('function');
    });
  });
});

// ---------------------------------------------------------------------------
// HTTP method + path assertions
// ---------------------------------------------------------------------------

describe('api helper HTTP calls', () => {
  test('getMachines() → GET /api/machines/', async () => {
    mock.onGet('/api/machines/').reply(200, []);
    const res = await getMachines();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('getMachine(5) → GET /api/machines/5', async () => {
    mock.onGet('/api/machines/5').reply(200, { id: 5, name: 'Boiler' });
    const res = await getMachine(5);
    expect(res.data.id).toBe(5);
  });

  test('createMachine(data) → POST /api/machines/', async () => {
    const payload = { name: 'New Pump', machine_type: 'Pump', location: 'Zone A' };
    mock.onPost('/api/machines/').reply(200, { id: 1, ...payload });
    const res = await createMachine(payload);
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('New Pump');
  });

  test('getMachineLogs(3) → GET /api/machines/3/logs', async () => {
    mock.onGet('/api/machines/3/logs').reply(200, []);
    const res = await getMachineLogs(3);
    expect(res.status).toBe(200);
  });

  test('addLog(data) → POST /api/machines/logs', async () => {
    const log = { machine_id: 1, description: 'Oil change', technician: 'Joe', cost: 100 };
    mock.onPost('/api/machines/logs').reply(200, { id: 1, ...log });
    const res = await addLog(log);
    expect(res.data.description).toBe('Oil change');
  });

  test('predict(data) → POST /api/predictions/predict', async () => {
    const payload = { machine_id: 1, temperature: 70, vibration: 3, pressure: 80, runtime_hours: 100 };
    mock.onPost('/api/predictions/predict').reply(200, { machine_id: 1, status: 'green' });
    const res = await predict(payload);
    expect(res.data.status).toBe('green');
  });

  test('getMachineStatus(7) → GET /api/predictions/status/7', async () => {
    mock.onGet('/api/predictions/status/7').reply(200, { machine_id: 7 });
    const res = await getMachineStatus(7);
    expect(res.data.machine_id).toBe(7);
  });

  test('getMachineReadings(2) → GET /api/predictions/2', async () => {
    mock.onGet('/api/predictions/2').reply(200, []);
    const res = await getMachineReadings(2);
    expect(res.status).toBe(200);
  });

  test('trainModel() → POST /api/predictions/train', async () => {
    mock.onPost('/api/predictions/train').reply(200, { status: 'trained' });
    const res = await trainModel();
    expect(res.data.status).toBe('trained');
  });

  test('getAllLogs() → GET /api/logs/', async () => {
    mock.onGet('/api/logs/').reply(200, []);
    const res = await getAllLogs();
    expect(res.status).toBe(200);
  });

  test('getAIInsight(data) → POST /api/ai/insight', async () => {
    mock.onPost('/api/ai/insight').reply(200, { insight: 'All good' });
    const res = await getAIInsight({ machine_id: 1 });
    expect(res.data.insight).toBe('All good');
  });
});
