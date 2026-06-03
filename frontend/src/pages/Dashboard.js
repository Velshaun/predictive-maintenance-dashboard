import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMachines } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const StatCard = ({ label, value, icon, accent, delta }) => (
  <div style={{
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '20px 24px', flex: 1, minWidth: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1 }}>
          {value}
        </div>
        {delta !== undefined && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{delta}</div>
        )}
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: accent + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMachines()
      .then(res => setMachines(res.data))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total: machines.length,
    green: machines.filter(m => m.status === 'green').length,
    yellow: machines.filter(m => m.status === 'yellow').length,
    red: machines.filter(m => m.status === 'red').length,
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Total Machines" value={counts.total}
          accent="#3b82f6" delta="All monitored assets"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>}
        />
        <StatCard
          label="Operational" value={counts.green}
          accent="#22c55e" delta="Running normally"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <StatCard
          label="Service Soon" value={counts.yellow}
          accent="#eab308" delta="Requires attention"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
        <StatCard
          label="Critical" value={counts.red}
          accent="#ef4444" delta="Immediate action needed"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>All Machines</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>{counts.total} asset{counts.total !== 1 ? 's' : ''} registered</p>
        </div>
      </div>

      {/* Machine grid */}
      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Loading machines…</div>
      ) : machines.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px dashed #e2e8f0', borderRadius: 12,
          padding: '48px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No machines yet</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Add your first machine via the API to get started.</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {machines.map(m => (
            <Link to={`/machine/${m.id}`} key={m.id} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#93c5fd';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 9,
                    background: '#f1f5f9', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#475569',
                  }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/>
                      <rect x="2" y="17" width="20" height="4" rx="1"/>
                    </svg>
                  </div>
                  <StatusBadge status={m.status} size="sm" />
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{m.machine_type}</span>
                  <span style={{ color: '#cbd5e1' }}>·</span>
                  <span>{m.location}</span>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {m.last_serviced ? `Serviced ${new Date(m.last_serviced).toLocaleDateString()}` : 'Never serviced'}
                  </span>
                  <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
