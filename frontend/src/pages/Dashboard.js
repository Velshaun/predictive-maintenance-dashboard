import React, { useEffect, useState } from 'react';
import { getMachines } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    getMachines().then(res => setMachines(res.data));
  }, []);

  const counts = {
    green: machines.filter(m => m.status === 'green').length,
    yellow: machines.filter(m => m.status === 'yellow').length,
    red: machines.filter(m => m.status === 'red').length,
  };

  return (
    <div style={{ padding: 32, fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Maintenance Dashboard
      </h1>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[
          ['Operational', counts.green, '#22c55e'],
          ['Service Soon', counts.yellow, '#eab308'],
          ['Critical', counts.red, '#ef4444'],
        ].map(([label, count, color]) => (
          <div
            key={label}
            style={{
              background: color + '18',
              border: `1px solid ${color}`,
              borderRadius: 12,
              padding: '16px 24px',
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color }}>{count}</div>
            <div style={{ color: '#666', fontSize: 13 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Machine cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {machines.map(m => (
          <Link to={`/machine/${m.id}`} key={m.id} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, color: '#111' }}>{m.name}</h3>
                <StatusBadge status={m.status} />
              </div>
              <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>
                {m.machine_type} — {m.location}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
