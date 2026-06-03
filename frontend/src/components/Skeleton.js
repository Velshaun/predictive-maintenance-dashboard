import React from 'react';

/* Single skeleton block */
export function Sk({ w = '100%', h = 16, r = 8, style = {} }) {
  return (
    <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
  );
}

/* Skeleton for a stat card */
export function StatCardSkeleton() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <Sk w={38} h={38} r={10} />
        <Sk w={52} h={20} r={999} />
      </div>
      <Sk w={52} h={32} r={6} style={{ marginBottom: 8 }} />
      <Sk w={90} h={11} r={6} style={{ marginBottom: 4 }} />
      <Sk w={70} h={10} r={6} />
    </div>
  );
}

/* Skeleton for a machine card */
export function MachineCardSkeleton() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <Sk w={40} h={40} r={10} />
        <Sk w={80} h={22} r={999} />
      </div>
      <Sk w="65%" h={15} r={6} style={{ marginBottom: 8 }} />
      <Sk w="80%" h={12} r={6} style={{ marginBottom: 18 }} />
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', justifyContent: 'space-between' }}>
        <Sk w={100} h={11} r={6} />
        <Sk w={36} h={11} r={6} />
      </div>
    </div>
  );
}

/* Skeleton for machine detail header */
export function MachineHeaderSkeleton() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 22 }}>
        <Sk w={54} h={54} r={14} />
        <div style={{ flex: 1 }}>
          <Sk w="40%" h={20} r={6} style={{ marginBottom: 8 }} />
          <Sk w="28%" h={13} r={6} />
        </div>
        <Sk w={90} h={24} r={999} />
      </div>
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, display: 'flex', gap: 20 }}>
        {[80, 100, 90, 110].map((w, i) => (
          <div key={i} style={{ flex: 1 }}>
            <Sk w={50} h={10} r={4} style={{ marginBottom: 8 }} />
            <Sk w={w} h={14} r={6} />
          </div>
        ))}
      </div>
    </div>
  );
}
