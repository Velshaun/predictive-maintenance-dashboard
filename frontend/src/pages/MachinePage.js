import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMachine, getMachineLogs, predict, getAIInsight } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import StatusBadge from '../components/StatusBadge';

const Tab = ({ label, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? '#fff' : 'transparent',
    color: active ? '#0f172a' : '#64748b',
    fontWeight: active ? 600 : 500, fontSize: 13,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px #e2e8f0' : 'none',
    transition: 'all 0.12s',
  }}>
    <span style={{ color: active ? '#3b82f6' : 'currentColor' }}>{icon}</span>
    {label}
  </button>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{value || '—'}</span>
  </div>
);

export default function MachinePage() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [logs, setLogs] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [insight, setInsight] = useState('');
  const [tab, setTab] = useState('overview');
  const [predicting, setPredicting] = useState(false);
  const [readings] = useState([
    { time: '00:00', temp: 68, vib: 0.3, pres: 28 },
    { time: '04:00', temp: 71, vib: 0.35, pres: 29 },
    { time: '08:00', temp: 75, vib: 0.4, pres: 30 },
    { time: '12:00', temp: 79, vib: 0.5, pres: 31 },
    { time: '16:00', temp: 77, vib: 0.45, pres: 30 },
    { time: '20:00', temp: 73, vib: 0.38, pres: 29 },
    { time: '24:00', temp: 70, vib: 0.32, pres: 28 },
  ]);

  useEffect(() => {
    getMachine(id).then(r => setMachine(r.data));
    getMachineLogs(id).then(r => setLogs(r.data));
  }, [id]);

  const handlePredict = async () => {
    setPredicting(true);
    const latest = readings[readings.length - 1];
    try {
      const res = await predict({ machine_id: Number(id), temperature: latest.temp, vibration: latest.vib, pressure: latest.pres, runtime_hours: 100 });
      setPrediction(res.data);
      const insightRes = await getAIInsight({ machine_name: machine.name, machine_type: machine.machine_type, temperature: latest.temp, vibration: latest.vib, pressure: latest.pres, runtime_hours: 100, days_until_service: res.data.days_until_service, status: res.data.status, recent_logs: logs.map(l => l.description) });
      setInsight(insightRes.data.insight);
    } finally {
      setPredicting(false);
    }
  };

  if (!machine) return (
    <div style={{ padding: '40px 32px', color: '#64748b', fontSize: 14 }}>Loading machine…</div>
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: '#94a3b8' }}>
        <Link to="/" style={{ color: '#64748b', fontWeight: 500, textDecoration: 'none' }}>Dashboard</Link>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{machine.name}</span>
      </div>

      {/* Machine header */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
        padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6',
            }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/>
                <rect x="2" y="17" width="20" height="4" rx="1"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>
                {machine.name}
              </h2>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {machine.machine_type} · {machine.location}
              </div>
            </div>
          </div>
          <StatusBadge status={prediction?.status || machine.status} />
        </div>

        {/* Quick info */}
        <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          {[
            { label: 'Machine ID', value: `#${machine.id}` },
            { label: 'Type', value: machine.machine_type },
            { label: 'Location', value: machine.location },
            { label: 'Last Serviced', value: machine.last_serviced ? new Date(machine.last_serviced).toLocaleDateString() : 'Never' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        <Tab label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')}
          icon={<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
        <Tab label="Logs" active={tab === 'logs'} onClick={() => setTab('logs')}
          icon={<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} />
        <Tab label="Predict" active={tab === 'predict'} onClick={() => setTab('predict')}
          icon={<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>} />
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sensor Readings — Last 24h</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Temperature (°C) and Vibration (g) over time</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={readings} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp (°C)" />
              <Line type="monotone" dataKey="vib" stroke="#3b82f6" strokeWidth={2} dot={false} name="Vibration (g)" />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            {[
              { label: 'Avg Temperature', value: '73°C', color: '#ef4444' },
              { label: 'Avg Vibration', value: '0.38 g', color: '#3b82f6' },
              { label: 'Avg Pressure', value: '29.3 bar', color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Logs ── */}
      {tab === 'logs' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Maintenance History</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>{logs.length} log{logs.length !== 1 ? 's' : ''} recorded</p>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
              No maintenance logs yet.
            </div>
          ) : (
            <div>
              {logs.map((l, i) => (
                <div key={l.id} style={{
                  display: 'flex', gap: 16, paddingBottom: 16,
                  marginBottom: i < logs.length - 1 ? 16 : 0,
                  borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', marginTop: 4, flexShrink: 0 }} />
                    {i < logs.length - 1 && <div style={{ width: 1, flex: 1, background: '#e2e8f0', marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{l.description}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
                      {l.technician && <span>👤 {l.technician}</span>}
                      {l.cost && <span>💰 ${l.cost}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Predict ── */}
      {tab === 'predict' && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>AI-Powered Failure Prediction</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Analyzes sensor readings to predict service needs and generate maintenance insights.
            </p>
            <button onClick={handlePredict} disabled={predicting} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: predicting ? '#e2e8f0' : '#3b82f6',
              color: predicting ? '#94a3b8' : 'white',
              border: 'none', padding: '10px 20px', borderRadius: 8,
              fontWeight: 600, fontSize: 14, cursor: predicting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {predicting ? 'Analyzing…' : 'Run Prediction'}
            </button>
          </div>

          {prediction && (
            <div>
              {/* Result card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 28px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Prediction Result</h3>
                  <StatusBadge status={prediction.status} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Days Until Service</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-1.5px' }}>{prediction.days_until_service}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>days remaining</div>
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Confidence Score</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#3b82f6', letterSpacing: '-1.5px' }}>
                      {prediction.confidence !== undefined ? `${Math.round(prediction.confidence * 100)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>model confidence</div>
                  </div>
                </div>
              </div>

              {/* AI Insight */}
              {insight && (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
                  border: '1px solid #bfdbfe', borderRadius: 14,
                  padding: '24px 28px', boxShadow: '0 1px 4px rgba(59,130,246,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18a1 1 0 0 1-2 0v-1.07A8 8 0 0 1 4 9h1a7 7 0 0 0 14 0h1a8 8 0 0 1-7 7.93zM13 10V6a1 1 0 0 0-2 0v4a1 1 0 0 0 2 0z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>AI Maintenance Insight</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Powered by Claude</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: '#1e3a5f', lineHeight: 1.7, margin: 0 }}>{insight}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
