import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMachines } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { StatCardSkeleton, MachineCardSkeleton } from '../components/Skeleton';

/* ── KPI Stat Card ─────────────────────────────────────── */
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
    {/* Soft background glow */}
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

/* ── Status dot (with pulse for critical/yellow) ────────── */
const StatusDot = ({ status }) => {
  const colors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', unknown: '#94a3b8' };
  const pulse = status === 'red' ? 'pulse-red' : status === 'yellow' ? 'pulse-yellow' : '';
  return (
    <span className={pulse} style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: colors[status] || colors.unknown, flexShrink: 0,
    }} />
  );
};

/* ── Dashboard ──────────────────────────────────────────── */
export default function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getMachines()
      .then(res => setMachines(res.data))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total:  machines.length,
    green:  machines.filter(m => m.status === 'green').length,
    yellow: machines.filter(m => m.status === 'yellow').length,
    red:    machines.filter(m => m.status === 'red').length,
  };

  const filtered = machines.filter(m => {
    const matchStatus = filter === 'all' || m.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.machine_type.toLowerCase().includes(q) || m.location.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* ── KPI Cards (skeleton while loading) ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 32 }}>
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

      {/* ── Section header + Search + Filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
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
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
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

          {/* Filter */}
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
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '56px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* SVG illustration */}
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
            {search || filter !== 'all' ? 'Try adjusting your search or filter.' : 'Add your first machine via the API to get started.'}
          </div>
          {(search || filter !== 'all') && (
            <button onClick={() => { setSearch(''); setFilter('all'); }} style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#fff', fontSize: 13,
              fontWeight: 600, color: '#3b82f6', cursor: 'pointer',
            }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(m => (
            <Link to={`/machine/${m.id}`} key={m.id} style={{ textDecoration: 'none' }}>
              <div className="machine-card">
                {/* Top row: icon + status dot */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#f1f5f9',
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

                {/* Name & meta */}
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.2px' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{m.machine_type}</span>
                  <span style={{ color: '#cbd5e1', fontSize: 16 }}>·</span>
                  <span>{m.location}</span>
                </div>

                {/* Footer */}
                <div style={{
                  marginTop: 16, paddingTop: 14,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {m.last_serviced ? new Date(m.last_serviced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never serviced'}
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
