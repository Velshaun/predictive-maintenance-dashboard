import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMachine, getMachineLogs, predict, getAIInsight } from '../utils/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatusBadge from '../components/StatusBadge';

export default function MachinePage() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [logs, setLogs] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [insight, setInsight] = useState('');
  const [tab, setTab] = useState('overview');
  const [readings] = useState([
    { temp: 75, vib: 0.4, pres: 30, runtime: 100 },
  ]);

  useEffect(() => {
    getMachine(id).then(r => setMachine(r.data));
    getMachineLogs(id).then(r => setLogs(r.data));
  }, [id]);

  const handlePredict = async () => {
    const latest = readings[readings.length - 1];

    const res = await predict({
      machine_id: Number(id),
      temperature: latest.temp,
      vibration: latest.vib,
      pressure: latest.pres,
      runtime_hours: latest.runtime,
    });
    setPrediction(res.data);

    const insightRes = await getAIInsight({
      machine_name: machine.name,
      machine_type: machine.machine_type,
      temperature: latest.temp,
      vibration: latest.vib,
      pressure: latest.pres,
      runtime_hours: latest.runtime,
      days_until_service: res.data.days_until_service,
      status: res.data.status,
      recent_logs: logs.map(l => l.description),
    });
    setInsight(insightRes.data.insight);
  };

  if (!machine) return <p>Loading...</p>;

  return (
    <div style={{ padding: 32, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{machine.name}</h1>
        <StatusBadge status={prediction?.status || machine.status} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {['overview', 'logs', 'predict'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: tab === t ? '#2d2d72' : '#f0f0f0',
              color: tab === t ? '#fff' : '#333',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div>
          <p>
            Type: {machine.machine_type} | Location: {machine.location}
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={readings}>
              <XAxis dataKey="runtime" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="temp" stroke="#ef4444" name="Temp (C)" />
              <Line type="monotone" dataKey="vib" stroke="#3b82f6" name="Vibration" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Logs tab */}
      {tab === 'logs' && (
        <div>
          <h3>Maintenance History</h3>
          {logs.map(l => (
            <div
              key={l.id}
              style={{ borderLeft: '3px solid #2d2d72', paddingLeft: 12, marginBottom: 12 }}
            >
              <strong>{l.description}</strong>
              <br />
              <small>
                {l.technician} — ${l.cost}
              </small>
            </div>
          ))}
        </div>
      )}

      {/* Predict tab */}
      {tab === 'predict' && (
        <div>
          <button
            onClick={handlePredict}
            style={{
              background: '#2d2d72',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Run Prediction
          </button>

          {prediction && (
            <div style={{ marginTop: 20 }}>
              <p>
                <strong>Days Until Service:</strong> {prediction.days_until_service}
              </p>
              <StatusBadge status={prediction.status} />

              {insight && (
                <div
                  style={{
                    marginTop: 16,
                    background: '#f0f4ff',
                    borderRadius: 10,
                    padding: 16,
                    borderLeft: '4px solid #2d2d72',
                  }}
                >
                  <strong>AI Insight:</strong>
                  <p style={{ margin: '8px 0 0' }}>{insight}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
