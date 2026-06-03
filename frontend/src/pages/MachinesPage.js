import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMachines } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { Sk } from '../components/Skeleton';

/* ── Status ordering for sort ─────────────────────────────── */
const STATUS_ORDER = { red: 0, yellow: 1, green: 2, unknown: 3 };

/* ── Sort icon ────────────────────────────────────────────── */
const SortIcon = ({ dir }) => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
    style={{ display: 'block', transition: 'transform 0.15s', transform: dir === 'asc' ? 'rotate(180deg)' : 'rotate(0)' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ── Table skeleton row ───────────────────────────────────── */
const SkRow = () => (
  <tr>
    <td style={TD}><Sk w={20} h={13} r={4} /></td>
    <td style={TD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sk w={32} h={32} r={8} />
        <div><Sk w={110} h={13} r={4} style={{ marginBottom: 5 }} /><Sk w={70} h={10} r={4} /></div>
      </div>
    </td>
    <td style={TD}><Sk w={100} h={13} r={4} /></td>
    <td style={TD}><Sk w={120} h={13} r={4} /></td>
    <td style={TD}><Sk w={80} h={22} r={999} /></td>
    <td style={TD}><Sk w={90} h={13} r={4} /></td>
    <td style={TD}><Sk w={60} h={30} r={8} /></td>
  </tr>
);

/* ── Shared cell styles ───────────────────────────────────── */
const TH = {
  padding: '11px 16px', fontSize: 11, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
  borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
  background: '#fafafa',
};
const TD = {
  padding: '14px 16px', fontSize: 13, color: '#0f172a',
  borderBottom: '1px solid #f8fafc', verticalAlign: 'middle',
};

export default function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDir, setSortDir] = useState('desc'); // desc = critical first
  const [sortCol, setSortCol] = useState('status');

  useEffect(() => {
    getMachines()
      .then(r => setMachines(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleColSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const processed = useMemo(() => {
    let result = machines.filter(m => {
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        m.name.toLowerCase().includes(q) ||
        m.machine_type.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });

    result = [...result].sort((a, b) => {
      if (sortCol === 'status') {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortCol === 'name') {
        return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortCol === 'last_serviced') {
        const da = a.last_serviced ? new Date(a.last_serviced) : new Date(0);
        const db = b.last_serviced ? new Date(b.last_serviced) : new Date(0);
        return sortDir === 'asc' ? da - db : db - da;
      }
      return 0;
    });

    return result;
  }, [machines, search, statusFilter, sortCol, sortDir]);

  const counts = {
    total: machines.length,
    green:  machines.filter(m => m.status === 'green').length,
    yellow: machines.filter(m => m.status === 'yellow').length,
    red:    machines.filter(m => m.status === 'red').length,
  };

  const ColHeader = ({ col, label, align = 'left' }) => {
    const active = sortCol === col;
    return (
      <th style={{ ...TH, cursor: 'pointer', userSelect: 'none', textAlign: align }}
        onClick={() => handleColSort(col)}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: active ? '#3b82f6' : '#94a3b8' }}>{label}</span>
          <span style={{ color: active ? '#3b82f6' : '#cbd5e1', opacity: active ? 1 : 0.5 }}>
            <SortIcon dir={active ? sortDir : 'desc'} />
          </span>
        </div>
      </th>
    );
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>

      {/* ── Page title + summary chips ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!loading && [
            { label: 'All', val: 'all', count: counts.total, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Operational', val: 'green', count: counts.green, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Service Soon', val: 'yellow', count: counts.yellow, color: '#a16207', bg: '#fefce8', border: '#fde68a' },
            { label: 'Critical', val: 'red', count: counts.red, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
          ].map(({ label, val, count, color, bg, border }) => (
            <button key={val} onClick={() => setStatusFilter(val)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${statusFilter === val ? border : '#e2e8f0'}`,
              background: statusFilter === val ? bg : '#fff',
              color: statusFilter === val ? color : '#64748b',
              fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: statusFilter === val ? color : '#e2e8f0',
                color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{count}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
            width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" placeholder="Search by name, type, location…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              paddingLeft: 32, paddingRight: search ? 30 : 12, height: 36,
              border: '1px solid #e2e8f0', borderRadius: 8,
              fontSize: 13, color: '#0f172a', background: '#fff',
              outline: 'none', width: 260,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)', transition: 'border-color 0.15s',
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
      </div>

      {/* ── Table card ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Table header row count */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            {loading ? <Sk w={120} h={13} r={4} /> : (
              <>{processed.length} of {counts.total} machine{counts.total !== 1 ? 's' : ''}</>
            )}
          </div>
          {!loading && (search || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); }} style={{
              fontSize: 12, fontWeight: 600, color: '#3b82f6',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              Clear filters ×
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 48 }}>#</th>
                <ColHeader col="name" label="Machine" />
                <th style={TH}>Type</th>
                <th style={TH}>Location</th>
                <ColHeader col="status" label="Status" />
                <ColHeader col="last_serviced" label="Last Serviced" />
                <th style={{ ...TH, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkRow key={i} />)
              ) : processed.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '52px 32px', textAlign: 'center' }}>
                    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
                      <circle cx="28" cy="28" r="20" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2"/>
                      <circle cx="28" cy="28" r="12" fill="#e2e8f0"/>
                      <line x1="43" y1="43" x2="56" y2="56" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="22" y1="28" x2="34" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="28" y1="22" x2="28" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No machines match your filters</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>Try adjusting your search or status filter.</div>
                    <button onClick={() => { setSearch(''); setStatusFilter('all'); }} style={{
                      padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                      background: '#fff', fontSize: 13, fontWeight: 600, color: '#3b82f6', cursor: 'pointer',
                    }}>Clear filters</button>
                  </td>
                </tr>
              ) : (
                processed.map((m, idx) => (
                  <tr key={m.id}
                    style={{ transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Row number */}
                    <td style={{ ...TD, color: '#cbd5e1', fontWeight: 600, fontSize: 12 }}>{idx + 1}</td>

                    {/* Machine name + type */}
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569',
                        }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/>
                            <rect x="2" y="17" width="20" height="4" rx="1"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginBottom: 1 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>ID #{m.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ ...TD, color: '#475569' }}>
                      <span style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 500,
                      }}>
                        {m.machine_type}
                      </span>
                    </td>

                    {/* Location */}
                    <td style={{ ...TD, color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {m.location}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={TD}><StatusBadge status={m.status} /></td>

                    {/* Last serviced */}
                    <td style={{ ...TD, color: '#64748b' }}>
                      {m.last_serviced ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {new Date(m.last_serviced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                            {Math.floor((Date.now() - new Date(m.last_serviced)) / 86400000)} days ago
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>Never serviced</span>
                      )}
                    </td>

                    {/* View button */}
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <Link to={`/machine/${m.id}`}>
                        <button style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid #e2e8f0', background: '#fff',
                          fontSize: 12, fontWeight: 600, color: '#0f172a',
                          transition: 'all 0.12s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0f172a'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          View
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && processed.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Showing {processed.length} of {counts.total} machines
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#64748b', alignItems: 'center' }}>
              <span>Sort:</span>
              <button onClick={() => { setSortCol('status'); setSortDir('desc'); }} style={{
                padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 500,
                background: sortCol === 'status' && sortDir === 'desc' ? '#0f172a' : '#fff',
                color: sortCol === 'status' && sortDir === 'desc' ? '#fff' : '#64748b',
                fontSize: 12, transition: 'all 0.12s',
              }}>Critical first</button>
              <button onClick={() => { setSortCol('status'); setSortDir('asc'); }} style={{
                padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 500,
                background: sortCol === 'status' && sortDir === 'asc' ? '#0f172a' : '#fff',
                color: sortCol === 'status' && sortDir === 'asc' ? '#fff' : '#64748b',
                fontSize: 12, transition: 'all 0.12s',
              }}>Healthy first</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
