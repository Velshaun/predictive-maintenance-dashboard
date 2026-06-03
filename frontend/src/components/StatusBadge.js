import React from 'react';

const colors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
const labels = { green: 'Good', yellow: 'Service Soon', red: 'Critical' };

export default function StatusBadge({ status }) {
  const color = colors[status] || colors.green;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: color + '22',
        border: `1.5px solid ${color}`,
        borderRadius: 20,
        padding: '3px 12px',
        fontWeight: 600,
        color: color,
        fontSize: 13,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {labels[status] || 'Unknown'}
    </span>
  );
}
