/**
 * Unit tests for src/utils/api.js
 *
 * Verifies that:
 *   - The exported axios instance has the correct default baseURL
 *   - Every helper function exists and is callable
 *   - Each helper hits the right HTTP method + path (via axios-mock-adapter)
 *
 * Covers: machines, soft-delete/restore/permanent-delete, predictions,
 *         run-prediction, training, logs, and AI insights.
 */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  api,
  getMachines,
  getMachine,
  createMachine,
  softDeleteMachine,
  restoreMachine,
  permanentDeleteMachine,
  getDeletedMachines,
  getMachineLogs,
  addLog,
  runPrediction,
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
    expect(typeof api.delete).toBe('function');
  });

  test('baseURL defaults to empty string (same-origin) when REACT_APP_API_URL is not set', () => {
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
    softDeleteMachine,
    restoreMachine,
    permanentDeleteMachine,
    getDeletedMachines,
    getMachineLogs,
    addLog,
    runPrediction,
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
// HTTP method + path assertions — machine CRUD
// ---------------------------------------------------------------------------

describe('machine CRUD calls', () => {
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
});

// ---------------------------------------------------------------------------
// Soft delete / restore / permanent delete
// ---------------------------------------------------------------------------

describe('soft delete / restore / permanent delete calls', () => {
  test('softDeleteMachine(3) → DELETE /api/machines/3', async () => {
    mock.onDelete('/api/machines/3').reply(200, { message: 'Machine 3 soft-deleted', deleted_at: '2026-01-01T00:00:00' });
    const res = await softDeleteMachine(3);
    expect(res.status).toBe(200);
    expect(res.data.message).toMatch(/soft-deleted|deleted/i);
  });

  test('restoreMachine(3) → POST /api/machines/3/restore', async () => {
    mock.onPost('/api/machines/3/restore').reply(200, { id: 3, is_deleted: false });
    const res = await restoreMachine(3);
    expect(res.status).toBe(200);
    expect(res.data.is_deleted).toBe(false);
  });

  test('permanentDeleteMachine(3) → DELETE /api/machines/3/permanent', async () => {
    mock.onDelete('/api/machines/3/permanent').reply(200, { message: 'Machine 3 permanently deleted' });
    const res = await permanentDeleteMachine(3);
    expect(res.status).toBe(200);
    expect(res.data.message).toMatch(/deleted/i);
  });

  test('getDeletedMachines() → GET /api/machines/deleted', async () => {
    mock.onGet('/api/machines/deleted').reply(200, []);
    const res = await getDeletedMachines();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Log calls
// ---------------------------------------------------------------------------

describe('log calls', () => {
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

  test('getAllLogs() → GET /api/logs/', async () => {
    mock.onGet('/api/logs/').reply(200, []);
    const res = await getAllLogs();
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Prediction calls
// ---------------------------------------------------------------------------

describe('prediction calls', () => {
  test('runPrediction(4) → POST /api/predictions/run/4', async () => {
    mock.onPost('/api/predictions/run/4').reply(200, {
      machine_id: 4, days_until_service: 42, status: 'green', anomaly_score: 0.12,
    });
    const res = await runPrediction(4);
    expect(res.status).toBe(200);
    expect(res.data.machine_id).toBe(4);
    expect(res.data.days_until_service).toBe(42);
    expect(res.data.status).toBe('green');
  });

  test('predict(data) → POST /api/predictions/predict', async () => {
    const payload = { machine_id: 1, temperature: 70, vibration: 3, pressure: 80, runtime_hours: 100 };
    mock.onPost('/api/predictions/predict').reply(200, { machine_id: 1, status: 'green' });
    const res = await predict(payload);
    expect(res.data.status).toBe('green');
  });

  test('getMachineStatus(7) → GET /api/predictions/status/7', async () => {
    mock.onGet('/api/predictions/status/7').reply(200, { machine_id: 7, current_status: 'yellow' });
    const res = await getMachineStatus(7);
    expect(res.data.machine_id).toBe(7);
  });

  test('getMachineReadings(2) → GET /api/predictions/2', async () => {
    mock.onGet('/api/predictions/2').reply(200, []);
    const res = await getMachineReadings(2);
    expect(res.status).toBe(200);
  });

  test('trainModel() → POST /api/predictions/train', async () => {
    mock.onPost('/api/predictions/train').reply(200, { status: 'trained', samples: 120 });
    const res = await trainModel();
    expect(res.data.status).toBe('trained');
  });
});

// ---------------------------------------------------------------------------
// AI insights
// ---------------------------------------------------------------------------

describe('AI insight call', () => {
  test('getAIInsight(data) → POST /api/ai/insight', async () => {
    mock.onPost('/api/ai/insight').reply(200, { insight: 'All sensors nominal.' });
    const res = await getAIInsight({ machine_id: 1 });
    expect(res.data.insight).toBe('All sensors nominal.');
  });
});

// ---------------------------------------------------------------------------
// runPrediction result shape validation
// ---------------------------------------------------------------------------

describe('runPrediction response shape', () => {
  test('returns days_until_service in the expected range (7-90)', async () => {
    for (const days of [7, 30, 45, 90]) {
      mock.onPost(`/api/predictions/run/1`).reply(200, {
        machine_id: 1,
        days_until_service: days,
        status: days <= 7 ? 'red' : days <= 30 ? 'yellow' : 'green',
        anomaly_score: 0.05,
        using_fallback: false,
      });
      const res = await runPrediction(1);
      expect(res.data.days_until_service).toBeGreaterThanOrEqual(7);
      expect(res.data.days_until_service).toBeLessThanOrEqual(90);
      mock.reset();
    }
  });

  test('status is one of green, yellow, red, or model_not_trained', async () => {
    mock.onPost('/api/predictions/run/2').reply(200, {
      machine_id: 2, days_until_service: 25, status: 'yellow', anomaly_score: 0.1,
    });
    const res = await runPrediction(2);
    expect(['green', 'yellow', 'red', 'model_not_trained']).toContain(res.data.status);
  });
});
