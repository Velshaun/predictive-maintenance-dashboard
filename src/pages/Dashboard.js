import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getMachines, getAllLogs, getMachineReadings } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { Sk, StatCardSkeleton, MachineCardSkeleton } from '../components/Skeleton';

/* ─────────────────────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────────────────────── */
const STATUS_PRIORITY = { red: 0, yellow: 1, green: 2, unknown: 3 };

// Line chart: use status-semantic colors
const TREND_COLOR = { red: '#ef4444', yellow: '#f59e0b', green: '#3b82f6', unknown: '#8b5cf6' };

// Donut slices — `name` matches Recharts' default nameKey so tooltips work correctly
const DONUT_META = [
  { key: 'green',   name: 'Operational', color: '#22c55e' },
  { key: 'yellow',  name: 'Service Soon', color: '#eab308' },
  { key: 'red',     name: 'Critical',     color: '#ef4444' },
  { key: 'unknown', name: 'Unknown',      color: '#94a3b8' },
];

// Bar chart gradient (dark → light blue as cost decreases)
const COST_PALETTE = [
  '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa',
  '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff',
];

/* ─────────────────────────────────────────────────────────────
   Data helpers
   ───────────────────────────────────────────────────────────── */
function getTop3Critical(machines) {
  return [...machines]
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 3) - (STATUS_PRIORITY[b.status] ?? 3))
    .slice(0, 3);
}

/**
 * Build line-chart series data from per-machine readings arrays.
 * Downsamples to every 3rd reading (60 → ~20 pts) for display clarity.
 */
function buildTrendData(top3, readingsArrays) {
  if (!top3.length || !readingsArrays.length) return [];

  const sampled = readingsArrays.map(arr =>
    [...arr]
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
      .filter((_, i) => i % 3 === 0),
  );

  const base = sampled[0] ?? [];
  return base.map((r, idx) => {
    const entry = {
      time: new Date(r.recorded_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', hour12: true,
      }),
    };
    top3.forEach((m, mi) => {
      const val = sampled[mi]?.[idx]?.temperature;
      entry[m.name] = val != null ? +val.toFixed(1) : null;
    });
    return entry;
  });
}

/**
 * Aggregate total maintenance cost per machine from all logs.
 * Returns top-8 sorted by spend descending.
 */
function buildCostData(machines, logs) {
  const nameMap = Object.fromEntries(machines.map(m => [m.id, m.name]));
  const totals  = {};
  logs.forEach(log => {
    const name = nameMap[log.machine_id];
    if (!name || !log.cost) return;
    totals[name] = (totals[name] || 0) + log.cost;
  });
  return Object.entries(totals)
    .map(([name, cost]) => ({ name, cost: Math.round(cost) }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8);
}

/* ─────────────────────────────────────────────────────────────
   Chart card wrapper
   ───────────────────────────────────────────────────────────── */
function ChartCard({ title, subtitle, loading, skH = 240, children, style = {} }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      <div style={{ padding: '18px 22px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, padding: '0 10px 16px' }}>
        {loading
          ? <Sk w="100%" h={skH} r={10} style={{ display: 'block', margin: '0 4px' }} />
          : children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Empty-state placeholder (shown when data is [] but not loading)
   ───────────────────────────────────────────────────────────── */
function ChartEmpty({ message, height = 220 }) {
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <svg width="36" height="36" fill="none" stroke="#e2e8f0" strokeWidth="1.5" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{message}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Custom tooltips
   ───────────────────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
  padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12,
};

function SensorTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 170 }}>
      <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 8, fontSize: 11 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#374151', flex: 1 }}>{p.dataKey}</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.value?.toFixed(1)}°</span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: d } = payload[0];
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: '#374151' }}>{name}</span>
      </div>
      <span style={{ color: '#64748b' }}>{value} machine{value !== 1 ? 's' : ''}</span>
    </div>
  );
}

function CostTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, cost } = payload[0]?.payload ?? {};
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>{name}</div>
      <span style={{ color: '#64748b' }}>Total maintenance: </span>
      <span style={{ fontWeight: 700, color: '#0f172a' }}>${cost?.toLocaleString()}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Chart 1 — Sensor temperature trends (line chart)
   ───────────────────────────────────────────────────────────── */
function SensorTrend({ trendData, top3, loading }) {
  return (
    <ChartCard
      title="Sensor Temperature Trends"
      subtitle={`Last 60 hours — ${top3.length > 0 ? top3.length : '…'} most at-risk machines`}
      loading={loading}
      skH={240}
    >
      {!trendData.length
        ? <ChartEmpty message="No sensor readings available" />
        : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                unit="°"
                domain={['auto', 'auto']}
                width={36}
              />
              <Tooltip content={<SensorTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                formatter={value => (
                  <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>
                )}
              />
              {top3.map(m => (
                <Line
                  key={m.id}
                  type="monotone"
                  dataKey={m.name}
                  stroke={TREND_COLOR[m.status] || '#3b82f6'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   Chart 2 — Fleet status donut
   ───────────────────────────────────────────────────────────── */
function StatusDonut({ machines, loading }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [mousePos, setMousePos]         = useState({ x: 0, y: 0 });

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0, unknown: 0 };
    if (Array.isArray(machines)) {
      machines.forEach(m => {
        if (c[m.status] !== undefined) c[m.status]++;
        else c.unknown++;
      });
    }
    return c;
  }, [machines]);

  const donutData = DONUT_META
    .map(d => ({ ...d, value: counts[d.key] }))
    .filter(d => d.value > 0);

  const total = Array.isArray(machines) ? machines.length : 0;

  return (
    <ChartCard
      title="Fleet Status"
      subtitle="Current health distribution across all assets"
      loading={loading}
      skH={240}
    >
      {!total
        ? <ChartEmpty message="No machines registered yet" />
        : (
          <>
            {/* Donut + center label + floating tooltip */}
            <div
              style={{ position: 'relative', height: 180 }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                    onMouseEnter={(data) => setHoveredSlice(data)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label (absolute overlay) */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 28, fontWeight: 800, color: '#0f172a',
                    lineHeight: 1, letterSpacing: '-1px',
                  }}>{total}</div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 4,
                  }}>assets</div>
                </div>
              </div>

              {/* Custom floating tooltip — follows cursor, never overlaps the donut hole */}
              {hoveredSlice && (
                <div style={{
                  position: 'absolute',
                  left: mousePos.x + 14,
                  top: mousePos.y - 14,
                  pointerEvents: 'none',
                  zIndex: 20,
                  ...TOOLTIP_STYLE,
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: hoveredSlice.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#374151' }}>{hoveredSlice.name}</span>
                  </div>
                  <span style={{ color: '#64748b' }}>
                    {hoveredSlice.value} machine{hoveredSlice.value !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '4px 18px 4px' }}>
              {donutData.map(d => (
                <div key={d.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: d.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{d.value}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                      ({Math.round((d.value / total) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      }
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   Chart 3 — Maintenance cost bar chart
   ───────────────────────────────────────────────────────────── */
function CostBar({ data, loading }) {
  return (
    <ChartCard
      title="Maintenance Costs by Machine"
      subtitle="Cumulative spend from all logged maintenance events (top 8)"
      loading={loading}
      skH={290}
    >
      {!data.length
        ? <ChartEmpty message="No maintenance cost data available" height={290} />
        : (
          <ResponsiveContainer width="100%" height={310}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 55, bottom: 4, left: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v =>
                  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={145}
                tickFormatter={n => n.length > 19 ? n.slice(0, 19) + '…' : n}
              />
              <Tooltip content={<CostTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COST_PALETTE[i] ?? COST_PALETTE[COST_PALETTE.length - 1]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   KPI stat card
   ───────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon, accent, trend, trendLabel, bg }) => (
  <div style={{
    background: bg || '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '20px 22px',
    flex: 1, minWidth: 0,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: -20, right: -20,
      width: 80, height: 80, borderRadius: '50%',
      background: accent + '12', pointerEvents: 'none',
    }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: accent + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        {icon}
      </div>
      {trend !== undefined && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 11, fontWeight: 600,
          color: trend >= 0 ? '#16a34a' : '#dc2626',
          background: trend >= 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${trend >= 0 ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 20, padding: '2px 8px',
        }}>
          {trend >= 0
            ? <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
            : <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          }
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: '-1.2px', lineHeight: 1, marginBottom: 4 }}>
      {value}
    </div>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </div>
    {trendLabel && (
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{trendLabel}</div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Status dot with pulse animation
   ───────────────────────────────────────────────────────────── */
const StatusDot = ({ status }) => {
  const colors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', unknown: '#94a3b8' };
  const pulse  = status === 'red' ? 'pulse-red' : status === 'yellow' ? 'pulse-yellow' : '';
  return (
    <span className={pulse} style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: colors[status] || colors.unknown, flexShrink: 0,
    }} />
  );
};

/* ═════════════════════════════════════════════════════════════
   Dashboard
   ═════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  /* ── Machine grid state ── */
  const [machines, setMachines] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  /* ── Chart state ── */
  const [top3,         setTop3]         = useState([]);
  const [sensorData,   setSensorData]   = useState([]);
  const [costData,     setCostData]     = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  /* ── Fetch all dashboard data ── */
  useEffect(() => {
    let top3Local = [];

    Promise.all([getMachines(), getAllLogs()])
      .then(([machRes, logsRes]) => {
        const mData = Array.isArray(machRes.data) ? machRes.data : [];
        const lData = Array.isArray(logsRes.data) ? logsRes.data : [];

        setMachines(mData);
        setLoading(false);

        // Cost chart only needs machines + logs (already have both)
        setCostData(buildCostData(mData, lData));

        // Pick top 3 most-at-risk for the sensor trend chart
        top3Local = getTop3Critical(mData);
        setTop3(top3Local);

        if (!top3Local.length) {
          setChartsLoading(false);
          return Promise.resolve([]);
        }
        // Fetch sensor readings in parallel
        return Promise.all(top3Local.map(m => getMachineReadings(m.id)));
      })
      .then(responses => {
        if (!responses?.length) return;
        const readingsArrays = responses.map(r => r?.data || []);
        setSensorData(buildTrendData(top3Local, readingsArrays));
        setChartsLoading(false);
      })
      .catch(err => {
        console.warn('Dashboard chart fetch failed:', err?.message);
        setLoading(false);
        setChartsLoading(false);
      });
  }, []);

  /* ── Derived KPI counts ── */
  const counts = useMemo(() => {
    const arr = Array.isArray(machines) ? machines : [];
    return {
      total:  arr.length,
      green:  arr.filter(m => m.status === 'green').length,
      yellow: arr.filter(m => m.status === 'yellow').length,
      red:    arr.filter(m => m.status === 'red').length,
    };
  }, [machines]);

  /* ── Filtered machine list ── */
  const filtered = useMemo(() => {
    if (!Array.isArray(machines)) return [];
    return machines.filter(m => {
      const matchStatus = filter === 'all' || m.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q
        || m.name.toLowerCase().includes(q)
        || m.machine_type.toLowerCase().includes(q)
        || m.location.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [machines, filter, search]);

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        {loading ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard
              label="Total Assets" value={counts.total}
              accent="#3b82f6" trend={12} trendLabel="vs. last month"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>}
            />
            <StatCard
              label="Operational" value={counts.green}
              accent="#22c55e" trend={5} trendLabel="running normally"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            />
            <StatCard
              label="Service Soon" value={counts.yellow}
              accent="#eab308" trend={counts.yellow > 0 ? -8 : 0} trendLabel="requires attention"
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
            <StatCard
              label="Critical" value={counts.red}
              accent="#ef4444" trend={counts.red > 0 ? -15 : 0} trendLabel="immediate action"
              bg={counts.red > 0 ? '#fff8f8' : '#fff'}
              icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
          </>
        )}
      </div>

      {/* ── Analytics charts ── */}
      <div style={{ marginBottom: 32 }}>
        {/* Section header */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
            Analytics Overview
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Live sensor trends, fleet health distribution, and cumulative maintenance cost analysis
          </p>
        </div>

        {/* Row 1: Sensor trend (wider) + Status donut (narrower) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 14,
          marginBottom: 14,
          alignItems: 'start',
        }}>
          <SensorTrend trendData={sensorData} top3={top3} loading={chartsLoading} />
          <StatusDonut  machines={machines}   loading={loading} />
        </div>

        {/* Row 2: Cost bar chart — full width */}
        <CostBar data={costData} loading={chartsLoading} />
      </div>

      {/* ── Machine grid section ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>All Machines</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {filtered.length} of {counts.total} asset{counts.total !== 1 ? 's' : ''}
            {filter !== 'all' || search ? ' shown' : ' registered'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search machines…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 32, paddingRight: 12, height: 36,
                border: '1px solid #e2e8f0', borderRadius: 8,
                fontSize: 13, color: '#0f172a', background: '#fff',
                outline: 'none', width: 200,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e  => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e   => (e.target.style.borderColor = '#e2e8f0')}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', padding: 0,
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Status filter */}
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}
              width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                paddingLeft: 30, paddingRight: 28, height: 36,
                border: '1px solid #e2e8f0', borderRadius: 8,
                fontSize: 13, color: '#0f172a', background: '#fff',
                outline: 'none', cursor: 'pointer', appearance: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="green">Operational</option>
              <option value="yellow">Service Soon</option>
              <option value="red">Critical</option>
              <option value="unknown">Unknown</option>
            </select>
            <svg style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
              width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Machine grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => <MachineCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
          padding: '56px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {search || filter !== 'all' ? (
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
              <circle cx="28" cy="28" r="20" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2"/>
              <circle cx="28" cy="28" r="12" fill="#e2e8f0"/>
              <line x1="43" y1="43" x2="56" y2="56" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
              <line x1="22" y1="28" x2="34" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
              <line x1="28" y1="22" x2="28" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
              <rect x="8" y="12" width="48" height="12" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
              <rect x="8" y="28" width="48" height="12" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
              <rect x="8" y="44" width="48" height="10" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
              <circle cx="16" cy="18" r="3" fill="#cbd5e1"/>
              <circle cx="16" cy="34" r="3" fill="#cbd5e1"/>
              <rect x="24" y="16" width="20" height="3" rx="1.5" fill="#e2e8f0"/>
              <rect x="24" y="32" width="14" height="3" rx="1.5" fill="#e2e8f0"/>
            </svg>
          )}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            {search || filter !== 'all' ? 'No machines match your filters' : 'No machines yet'}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
            {search || filter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Add your first machine via the API to get started.'}
          </div>
          {(search || filter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid #e2e8f0', background: '#fff', fontSize: 13,
                fontWeight: 600, color: '#3b82f6', cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(m => (
            <Link to={`/machine/${m.id}`} key={m.id} style={{ textDecoration: 'none' }}>
              <div className="machine-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569',
                  }}>
                    <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="5" rx="1"/>
                      <rect x="2" y="10" width="20" height="5" rx="1"/>
                      <rect x="2" y="17" width="20" height="4" rx="1"/>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={m.status} />
                    <StatusBadge status={m.status} size="sm" />
                  </div>
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.2px' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{m.machine_type}</span>
                  <span style={{ color: '#cbd5e1', fontSize: 16 }}>·</span>
                  <span>{m.location}</span>
                </div>

                <div style={{
                  marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {m.last_serviced
                      ? new Date(m.last_serviced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Never serviced'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
                    View
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
