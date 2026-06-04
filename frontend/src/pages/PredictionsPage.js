import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { getMachines, runPrediction, trainModel } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { Sk } from '../components/Skeleton';

/* ── localStorage key ────────────────────────────────────────────────── */
const STORAGE_KEY = 'pm_prediction_results';

/* ── Helpers ─────────────────────────────────────────────────────────── */
const anomalyPct = (raw) => {
  if (raw == null) return null;
  return Math.max(0, Math.min(100, Math.round((0.5 - raw) * 100)));
};

const barColor = (days) => {
  if (days == null) return '#e2e8f0';
  if (days <= 7)   return '#ef4444';
  if (days <= 30)  return '#eab308';
  return '#22c55e';
};

/* ── Sub-components ──────────────────────────────────────────────────── */
const AnomalyPill = ({ score }) => {
  const pct = anomalyPct(score);
  if (pct == null) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
  const color = pct >= 60 ? '#ef4444' : pct >= 35 ? '#eab308' : '#22c55e';
  const bg    = pct >= 60 ? '#fef2f2' : pct >= 35 ? '#fefce8' : '#f0fdf4';
  const bar   = pct >= 60 ? '#fecaca' : pct >= 35 ? '#fde68a' : '#bbf7d0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: bar, minWidth: 60, maxWidth: 80 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, background: bg, borderRadius: 4, padding: '1px 6px', minWidth: 32, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: '#64748b' }}>{d.type}</div>
      <div style={{ marginTop: 6, fontWeight: 800, fontSize: 16, color: barColor(d.days) }}>
        {d.days != null ? `${d.days} days` : 'Not predicted yet'}
      </div>
      {d.predictedStatus && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
          Predicted: <strong style={{ color: '#0f172a' }}>{d.predictedStatus}</strong>
        </div>
      )}
    </div>
  );
};

const TD = { padding: '13px 16px', fontSize: 13, color: '#0f172a', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' };
const TH = { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', whiteSpace: 'nowrap' };

/* ══════════════════════════════════════════════════════════════════════ */
export default function PredictionsPage() {
  const [machines, setMachines]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [predictions, setPredictions] = useState({}); // machine_id → result

  const [running, setRunning]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [runError, setRunError]       = useState(null);

  /* ── On mount: load machines + restore persisted predictions ───────── */
  useEffect(() => {
    getMachines()
      .then(r => setMachines(r.data))
      .finally(() => setLoading(false));

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { predictions: savedPreds } = JSON.parse(saved);
        if (savedPreds && Object.keys(savedPreds).length > 0) {
          setPredictions(savedPreds);
        }
      }
    } catch (_) { /* ignore corrupt storage */ }
  }, []);

  /* ── Run Predictions (trains silently first, then predicts all) ─────── */
  const handleRunAll = useCallback(async () => {
    // Re-compute inline so the closure always sees fresh values
    const _allDone = !loading && machines.length > 0 &&
      machines.every(m => predictions[m.id] != null && !predictions[m.id]?.error);
    if (_allDone || running || loading) return;

    setRunning(true);
    setProgress(0);
    setRunError(null);

    // ── Step 1: silent train (user never sees this) ──────────────────
    try {
      await trainModel();
    } catch (e) {
      console.warn('[predictions] training failed, continuing with existing model:', e?.message);
    }

    // ── Step 2: sequential predict for every machine ─────────────────
    // Uses POST /api/predictions/run/{id} — reads latest stored sensor
    // reading from the DB and returns ML output. No extra DB writes.
    const results = {};
    let successCount = 0;

    for (let i = 0; i < machines.length; i++) {
      const m = machines[i];
      try {
        // One call per machine — await before moving to the next
        const predRes = await runPrediction(m.id);
        results[m.id] = predRes.data;
        successCount++;
      } catch (predErr) {
        // Log and continue — never stop the loop for a single failure
        console.error(`[predictions] machine ${m.id} failed:`, predErr?.message);
        results[m.id] = { error: predErr?.response?.data?.detail || 'Prediction failed' };
      }

      // Incrementally update state so chart/table fill in one row at a time
      setPredictions(prev => ({ ...prev, [m.id]: results[m.id] }));
      setProgress(i + 1);
    }

    setRunning(false);

    if (successCount === 0) {
      // Full run failed — predictions state stays empty so button re-enables automatically
      setRunError('All predictions failed. Check that the backend is reachable and try again.');
      return;
    }

    // ── Step 3: persist results to localStorage ───────────────────────
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        predictions: results,
        timestamp:   Date.now(),
      }));
    } catch (_) { /* storage full or unavailable — not critical */ }

    // Refresh machine list so current statuses reflect ML output
    getMachines().then(r => setMachines(r.data));
  }, [machines, predictions, running, loading]);

  /* ── Shared data source for chart AND table ─────────────────────────
     One row per machine, always 10 rows.  Prediction fields are null
     until results arrive (or are restored from localStorage).        */
  const predRows = machines.map(m => {
    const p = predictions[m.id];
    return {
      id:              m.id,
      name:            m.name,
      shortName:       m.name.length > 18 ? m.name.slice(0, 16) + '…' : m.name,
      type:            m.machine_type,
      currentStatus:   m.status,
      days:            p?.days_until_service ?? null,
      predictedStatus: p?.status             ?? null,
      anomalyScore:    p?.anomaly_score       ?? null,
      error:           p?.error               ?? null,
    };
  });

  const hasPredictions = Object.keys(predictions).length > 0;
  // Button is disabled only when ALL current machines already have successful predictions
  const allPredicted   = !loading && machines.length > 0 &&
    machines.every(m => predictions[m.id] != null && !predictions[m.id]?.error);
  const btnDisabled    = running || loading || allPredicted;

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* ── Action bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>

        {/* Single "Run Predictions" button */}
        <div>
          <button
            onClick={handleRunAll}
            disabled={btnDisabled}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 10, border: 'none',
              cursor: btnDisabled ? 'not-allowed' : 'pointer',
              background: allPredicted && !running
                ? '#f1f5f9'
                : running
                  ? '#f1f5f9'
                  : 'linear-gradient(135deg,#2563eb,#3b82f6)',
              color: btnDisabled ? '#94a3b8' : '#fff',
              fontWeight: 600, fontSize: 14,
              boxShadow: btnDisabled ? 'none' : '0 4px 12px rgba(59,130,246,0.35)',
              transition: 'all 0.15s',
              opacity: allPredicted && !running ? 0.65 : 1,
            }}
          >
            {running ? (
              <>
                <svg className="spin" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/>
                </svg>
                Predicting {progress}/{machines.length}…
              </>
            ) : allPredicted ? (
              <>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Predictions Complete
              </>
            ) : (
              <>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Run Predictions
              </>
            )}
          </button>

          {/* Progress bar */}
          {running && (
            <div style={{ marginTop: 8, height: 4, width: 220, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg,#2563eb,#3b82f6)',
                width: `${machines.length ? (progress / machines.length) * 100 : 0}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}

          {/* Error banner — only shown on full failure */}
          {runError && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', gap: 6, maxWidth: 380,
            }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {runError}
            </div>
          )}
        </div>

        {/* Summary chip */}
        {hasPredictions && !running && (
          <div className="fade-slide-up" style={{
            alignSelf: 'center', padding: '8px 16px', borderRadius: 999,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            fontSize: 12, fontWeight: 600, color: '#15803d',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {Object.keys(predictions).length} of {machines.length} machines predicted
          </div>
        )}
      </div>

      {/* ── Bar chart (shared predRows) ─────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
              Days Until Service — All Machines
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {hasPredictions ? 'ML predictions based on latest sensor readings' : 'Run predictions to populate this chart'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 600 }}>
            {[['#ef4444','#fef2f2','≤ 7d (Critical)'],['#eab308','#fefce8','8–30d (Soon)'],['#22c55e','#f0fdf4','> 30d (OK)']].map(([color, bg, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: bg, borderRadius: 6, padding: '4px 8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, padding: '0 8px' }}>
            {[90,140,70,120,80,110,60,130,95,75].map((w, i) => <Sk key={i} w={`${w / 140 * 70}%`} h={22} r={4} />)}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, predRows.length * 36)}>
            <BarChart layout="vertical" data={predRows} margin={{ top: 0, right: 48, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                label={{ value: 'Days Until Service', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis type="category" dataKey="shortName"
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                axisLine={false} tickLine={false} width={148}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
              <ReferenceLine x={7}  stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: '7d',  fill: '#ef4444', fontSize: 10, position: 'top' }} />
              <ReferenceLine x={30} stroke="#eab308" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: '30d', fill: '#eab308', fontSize: 10, position: 'top' }} />
              <Bar dataKey="days" radius={[0, 4, 4, 0]} maxBarSize={24}
                label={{ position: 'right', formatter: v => v != null ? `${v}d` : '', fontSize: 11, fill: '#475569', fontWeight: 600 }}>
                {predRows.map(row => (
                  <Cell key={row.id} fill={barColor(row.days)} fillOpacity={row.days != null ? 1 : 0.18} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Results table (same predRows) ──────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            {loading ? <Sk w={140} h={13} r={4} /> : `${predRows.length} machine${predRows.length !== 1 ? 's' : ''}`}
          </span>
          {hasPredictions && !running && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Results persisted · chart and table share the same data
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Machine</th>
                <th style={TH}>Type</th>
                <th style={TH}>Current Status</th>
                <th style={TH}>Days Until Service</th>
                <th style={TH}>Anomaly Score</th>
                <th style={TH}>Predicted Status</th>
                <th style={{ ...TH, textAlign: 'right' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {[140,100,80,70,120,80,60].map((w, j) => (
                        <td key={j} style={TD}><Sk w={w} h={13} r={4} /></td>
                      ))}
                    </tr>
                  ))
                : predRows.map((row, idx) => {
                    const isPending = running && progress <= idx;
                    const daysColor = row.days != null ? barColor(row.days) : null;
                    return (
                      <tr key={row.id}
                        style={{ transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Machine */}
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                <rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/>
                              </svg>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{row.name}</span>
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ ...TD, color: '#64748b' }}>
                          <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>
                            {row.type}
                          </span>
                        </td>

                        {/* Current status */}
                        <td style={TD}><StatusBadge status={row.currentStatus} /></td>

                        {/* Days until service */}
                        <td style={TD}>
                          {isPending ? (
                            <Sk w={60} h={13} r={4} />
                          ) : row.error ? (
                            <span style={{ fontSize: 11, color: '#ef4444' }}>{row.error}</span>
                          ) : row.days != null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 20, fontWeight: 800, color: daysColor, letterSpacing: '-0.5px' }}>
                                {Math.round(row.days)}
                              </span>
                              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>days</span>
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Anomaly score */}
                        <td style={TD}>
                          {isPending ? <Sk w={100} h={13} r={4} /> : <AnomalyPill score={row.anomalyScore} />}
                        </td>

                        {/* Predicted status */}
                        <td style={TD}>
                          {isPending ? (
                            <Sk w={70} h={22} r={999} />
                          ) : row.predictedStatus && row.predictedStatus !== 'model_not_trained' ? (
                            <StatusBadge status={row.predictedStatus} />
                          ) : row.predictedStatus === 'model_not_trained' ? (
                            <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px' }}>
                              Model not trained
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Detail */}
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <Link to={`/machine/${row.id}`}>
                            <button style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                              background: '#fff', fontSize: 12, fontWeight: 600, color: '#0f172a',
                              cursor: 'pointer', transition: 'all 0.12s',
                            }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0f172a'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                              View
                              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <polyline points="9 18 15 12 9 6"/>
                              </svg>
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
