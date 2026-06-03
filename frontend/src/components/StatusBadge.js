import React from 'react';

const CONFIG = {
  green:   { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: '#15803d', label: 'Operational' },
  yellow:  { bg: '#fefce8', border: '#fde68a', dot: '#eab308', text: '#a16207', label: 'Service Soon' },
  red:     { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: '#b91c1c', label: 'Critical' },
  unknown: { bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8', text: '#64748b', label: 'Unknown' },
};

export default function StatusBadge({ status, size = 'md' }) {
  const c = CONFIG[status] || CONFIG.unknown;
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: sm ? 5 : 6,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: sm ? '2px 8px' : '4px 10px',
      fontWeight: 600, color: c.text,
      fontSize: sm ? 11 : 12, letterSpacing: '0.1px', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: sm ? 6 : 7, height: sm ? 6 : 7,
        borderRadius: '50%', background: c.dot,
        display: 'inline-block', flexShrink: 0,
      }} />
      {c.label}
    </span>
  );
}
