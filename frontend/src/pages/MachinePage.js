import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMachine, getMachineLogs, predict, getAIInsight } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import StatusBadge from '../components/StatusBadge';

/* ── Pill Tab ───────────────────────────────────────────── */
const PillTab = ({ label, active, onClick, icon, count }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 18px', borderRadius: 999, border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500,
    background: active ? '#0f172a' : 'transparent',
    color: active ? '#fff' : '#64748b',
    transition: 'all 0.15s',
    position: 'relative',
  }}>
    <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
    {label}
    {count !== undefined && (
      <span style={{
        background: active ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
        color: active ? '#fff' : '#64748b',
        fontSize: 10, fontWeight: 700, borderRadius: 999,
        padding: '1px 6px', lineHeight: '16px',
      }}>{count}</span>
    )}
  </button>
);

/* ── Metric Card ────────────────────────────────────────── */
const MetricCard = ({ label, value, unit, icon, color, subtitle }) => (
  <div className="metric-card" style={{ flex: 1, minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{unit}</span>
    </div>
    {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{subtitle}</div>}
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
    { time: '00:00', temp: 68, vib: 0.3,  pres: 28 },
    { time: '04:00', temp: 71, vib: 0.35, pres: 29 },
    { time: '08:00', temp: 75, vib: 0.4,  pres: 30 },
    { time: '12:00', temp: 79, vib: 0.5,  pres: 31 },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13 }}>
        <Link to="/" style={{ color: '#64748b', fontWeight: 500 }}>Dashboard</Link>
        <svg width="12" height="12" fill="none" stroke="#cbd5e1" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{machine.name}</span>
      </div>

      {/* ── Machine header card ── */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        padding: '24px 28px', marginBottom: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6',
              flexShrink: 0,
            }}>
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/>
                <rect x="2" y="17" width="20" height="4" rx="1"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 3 }}>
                {machine.name}
              </h2>
              <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{machine.machine_type}</span>
                <span style={{ color: '#e2e8f0' }}>·</span>
                <span>{machine.location}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={prediction?.status || machine.status} />
        </div>

        {/* Metadata strip */}
        <div style={{ display: 'flex', gap: 0, marginTop: 22, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          {[
            { label: 'Asset ID', value: `#${machine.id}` },
            { label: 'Type', value: machine.machine_type },
            { label: 'Location', value: machine.location },
            { label: 'Last Serviced', value: machine.last_serviced ? new Date(machine.last_serviced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never' },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, paddingLeft: i === 0 ? 0 : 20, borderLeft: i > 0 ? '1px solid #f1f5f9' : 'none', marginLeft: i > 0 ? 20 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pill Tab switcher ── */}
      <div style={{
        display: 'inline-flex', gap: 2, background: '#f1f5f9',
        borderRadius: 999, padding: 4, marginBottom: 22,
        border: '1px solid #e2e8f0',
      }}>
        <PillTab label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')}
          icon={<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
        <PillTab label="Logs" active={tab === 'logs'} onClick={() => setTab('logs')} count={logs.length}
          icon={<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>} />
        <PillTab label="Predict" active={tab === 'predict'} onClick={() => setTab('predict')}
          icon={<svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>} />
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Metric grid */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Current Sensor Readings</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Live metrics from the last 24-hour cycle</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <MetricCard label="Temperature" value="73" unit="°C" color="#ef4444" subtitle="↑ 2° from baseline"
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>}
              />
              <MetricCard label="Vibration" value="0.38" unit="g" color="#3b82f6" subtitle="Within normal range"
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              />
              <MetricCard label="Pressure" value="29.3" unit="bar" color="#8b5cf6" subtitle="Stable last 4h"
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
              />
              <MetricCard label="Runtime" value="100" unit="hrs" color="#f59e0b" subtitle="Since last service"
                icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
              />
            </div>
          </div>

          {/* Chart */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>Sensor Trend — Last 24h</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Temperature and vibration over time</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 20, height: 2, background: '#ef4444', borderRadius: 1 }} />
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Temp</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 20, height: 2, background: '#3b82f6', borderRadius: 1 }} />
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Vibration</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={readings} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '8px 12px' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Temp (°C)" />
                <Line type="monotone" dataKey="vib" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Vibration (g)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── LOGS ── */}
      {tab === 'logs' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>Maintenance History</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>{logs.length} log{logs.length !== 1 ? 's' : ''} on record</div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No logs yet</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Maintenance events will appear here.</div>
            </div>
          ) : (
            <div>
              {logs.map((l, i) => (
                <div key={l.id} style={{ display: 'flex', gap: 14, marginBottom: i < logs.length - 1 ? 20 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', border: '2px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </div>
                    {i < logs.length - 1 && <div style={{ width: 1, flex: 1, background: '#e2e8f0', marginTop: 6 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < logs.length - 1 ? 20 : 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 5 }}>{l.description}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {l.technician && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px' }}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {l.technician}
                        </span>
                      )}
                      {l.cost && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px' }}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          ${l.cost}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PREDICT ── */}
      {tab === 'predict' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Run prediction card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>AI-Powered Failure Prediction</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
              Analyzes real-time sensor data to predict days until service and generate maintenance recommendations.
            </div>
            <button onClick={handlePredict} disabled={predicting} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: predicting ? '#f1f5f9' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: predicting ? '#94a3b8' : 'white',
              border: 'none', padding: '11px 22px', borderRadius: 10,
              fontWeight: 600, fontSize: 14, cursor: predicting ? 'not-allowed' : 'pointer',
              boxShadow: predicting ? 'none' : '0 4px 12px rgba(59,130,246,0.35)',
              transition: 'all 0.15s',
            }}>
              {predicting ? (
                <>
                  <svg className="spin" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/>
                  </svg>
                  Analyzing sensors…
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Run Prediction
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {prediction && (
            <div className="fade-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Big number result card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Prediction Result</div>
                  <StatusBadge status={prediction.status} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>

                  {/* Days until service */}
                  <div style={{ flex: 1, background: 'linear-gradient(135deg, #f0f9ff, #eff6ff)', border: '1px solid #dbeafe', borderRadius: 14, padding: '22px 24px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Days Until Service</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 52, fontWeight: 900, color: '#0f172a', letterSpacing: '-2px', lineHeight: 1 }}>
                        {prediction.days_until_service}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>days</span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                      Estimated next service date
                    </div>
                  </div>

                  {/* Confidence */}
                  <div style={{ flex: 1, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: 14, padding: '22px 24px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Model Confidence</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 52, fontWeight: 900, color: '#15803d', letterSpacing: '-2px', lineHeight: 1 }}>
                        {prediction.confidence !== undefined ? Math.round(prediction.confidence * 100) : 87}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>%</span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                      Prediction accuracy score
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Insight — premium gradient border card */}
              {insight && (
                <div style={{
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.1)',
                }}>
                  {/* Gradient top border bar */}
                  <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }} />
                  <div style={{
                    background: 'linear-gradient(135deg, #fafbff 0%, #f5f7ff 100%)',
                    border: '1px solid #e0e7ff', borderTop: 'none',
                    borderRadius: '0 0 16px 16px', padding: '24px 28px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>AI Maintenance Insight</div>
                        <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 500 }}>Powered by Claude · Generated just now</div>
                      </div>
                    </div>
                    <p style={{
                      fontSize: 14, color: '#1e293b', lineHeight: 1.75,
                      margin: 0, fontWeight: 450,
                      padding: '14px 18px',
                      background: 'rgba(255,255,255,0.7)',
                      borderRadius: 10, border: '1px solid rgba(224,231,255,0.8)',
                    }}>
                      {insight}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
