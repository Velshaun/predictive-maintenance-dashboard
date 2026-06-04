import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getMachines, createMachine,
  softDeleteMachine, restoreMachine, permanentDeleteMachine, addLog,
  getCached,
} from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { Sk } from '../components/Skeleton';

const PRED_KEY    = 'pm_prediction_results';
const DELETED_KEY = 'deleted_machines';

/* ── Status ordering ──────────────────────────────────────── */
const STATUS_ORDER = { red: 0, yellow: 1, green: 2, unknown: 3 };

/* ── Sort icon ────────────────────────────────────────────── */
const SortIcon = ({ dir }) => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
    style={{ display: 'block', transition: 'transform 0.15s', transform: dir === 'asc' ? 'rotate(180deg)' : 'rotate(0)' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ── Wrench icon (lucide-react style) ─────────────────────── */
const WrenchIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

/* ── Wrench button (self-contained hover state) ───────────── */
function ServiceWrenchBtn({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Mark as Serviced"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 10px', borderRadius: 8,
        border: `1px solid ${hovered ? '#0f172a' : '#e2e8f0'}`,
        background: hovered ? '#0f172a' : '#fff',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      <WrenchIcon size={14} color={hovered ? '#fff' : '#0f172a'} />
    </button>
  );
}

/* ── Shared cell styles ───────────────────────────────────── */
const TH = {
  padding: '11px 16px', fontSize: 11, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
  borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#fafafa',
};
const TD = {
  padding: '14px 16px', fontSize: 13, color: '#0f172a',
  borderBottom: '1px solid #f8fafc', verticalAlign: 'middle',
};
const inputStyle = {
  height: 36, width: '100%', padding: '0 10px',
  border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#0f172a', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};

/* ── Skeleton row ─────────────────────────────────────────── */
const SkRow = () => (
  <tr>
    {[140, 100, 120, 80, 90, 80, 40, 80].map((w, i) => (
      <td key={i} style={TD}><Sk w={w} h={13} r={4} /></td>
    ))}
  </tr>
);

/* ── localStorage helpers ─────────────────────────────────── */
function loadDeleted() {
  try { return JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveDeleted(list) {
  try { localStorage.setItem(DELETED_KEY, JSON.stringify(list)); } catch (_) {}
}
function loadPredictions() {
  try { return JSON.parse(localStorage.getItem(PRED_KEY) || '{}'); } catch (_) { return {}; }
}
function savePredictions(data) {
  try { localStorage.setItem(PRED_KEY, JSON.stringify(data)); } catch (_) {}
}

/** Live days-remaining countdown from a service_due_date ISO string. */
function calcCountdown(serviceDueDate, now) {
  if (!serviceDueDate) return { days: null, isOverdue: false };
  const diffMs = new Date(serviceDueDate) - now;
  if (diffMs < 0) return { days: 0, isOverdue: true };
  return { days: Math.ceil(diffMs / 86400000), isOverdue: false };
}

/* ══════════════════════════════════════════════════════════ */
export default function MachinesPage() {
  const [machines, setMachines]       = useState(() => getCached('/api/machines/') || []);
  const [loading, setLoading]         = useState(!getCached('/api/machines/'));
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDir, setSortDir]         = useState('desc');
  const [sortCol, setSortCol]         = useState('status');

  // Add-machine form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm]   = useState({ name: '', machine_type: '', location: '' });
  const [saving, setSaving]     = useState(false);
  const [addError, setAddError] = useState(null);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  // Deleted machines (from localStorage)
  const [deletedList, setDeletedList] = useState(loadDeleted);

  // Restore / permanent delete state
  const [restoringId, setRestoringId]       = useState(null);
  const [permDeletingId, setPermDeletingId] = useState(null);

  // Live countdown clock (ticks every minute)
  const [now, setNow] = useState(Date.now());
  // Mark-as-serviced confirmation modal
  const [serviceModal, setServiceModal] = useState(null);
  // Prediction results from localStorage
  const [predictions, setPredictions] = useState(() => {
    const d = loadPredictions();
    return d?.predictions || {};
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getMachines()
      .then(r => setMachines(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, []);

  /* ── Add machine ─────────────────────────────────────────── */
  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.machine_type.trim() || !addForm.location.trim()) {
      setAddError('All three fields are required.');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      const res = await createMachine(addForm);
      setMachines(prev => [...prev, res.data]);
      setAddForm({ name: '', machine_type: '', location: '' });
      setShowAddForm(false);
    } catch (err) {
      setAddError(err?.response?.data?.detail || 'Failed to add machine.');
    } finally {
      setSaving(false);
    }
  }, [addForm]);

  /* ── Soft delete (confirmed) ─────────────────────────────── */
  const handleConfirmDelete = useCallback(async () => {
    const m = deleteModal;
    if (!m) return;
    setDeleteModal(null);
    setDeletingId(m.id);
    try {
      await softDeleteMachine(m.id);

      const predData = loadPredictions();
      const savedPred = predData?.predictions?.[m.id] ?? null;

      const newEntry = {
        id:           m.id,
        name:         m.name,
        machine_type: m.machine_type,
        location:     m.location,
        status:       m.status,
        deleted_at:   new Date().toISOString(),
        prediction:   savedPred,
      };
      const next = [...deletedList.filter(d => d.id !== m.id), newEntry];
      setDeletedList(next);
      saveDeleted(next);

      if (predData?.predictions) {
        delete predData.predictions[m.id];
        savePredictions(predData);
      }

      setMachines(prev => prev.filter(x => x.id !== m.id));
    } catch (err) {
      alert(`Failed to delete: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setDeletingId(null);
    }
  }, [deleteModal, deletedList]);

  /* ── Restore ─────────────────────────────────────────────── */
  const handleRestore = useCallback(async (entry) => {
    setRestoringId(entry.id);
    try {
      const res = await restoreMachine(entry.id);
      setMachines(prev => [...prev, res.data]);

      if (entry.prediction) {
        const predData = loadPredictions();
        if (!predData.predictions) predData.predictions = {};
        predData.predictions[entry.id] = entry.prediction;
        savePredictions(predData);
      }

      const next = deletedList.filter(d => d.id !== entry.id);
      setDeletedList(next);
      saveDeleted(next);
    } catch (err) {
      alert(`Failed to restore: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setRestoringId(null);
    }
  }, [deletedList]);

  /* ── Permanent delete ────────────────────────────────────── */
  const handlePermanentDelete = useCallback(async (entry) => {
    if (!window.confirm(`Permanently delete "${entry.name}"?\n\nThis cannot be undone.`)) return;
    setPermDeletingId(entry.id);
    try {
      await permanentDeleteMachine(entry.id);
      const next = deletedList.filter(d => d.id !== entry.id);
      setDeletedList(next);
      saveDeleted(next);
      const predData = loadPredictions();
      if (predData?.predictions?.[entry.id]) {
        delete predData.predictions[entry.id];
        savePredictions(predData);
      }
    } catch (err) {
      alert(`Failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setPermDeletingId(null);
    }
  }, [deletedList]);

  /* ── Mark as Serviced ────────────────────────────────────── */
  const confirmMarkServiced = useCallback(async () => {
    if (!serviceModal) return;
    const { id } = serviceModal;
    setServiceModal(null);

    const newDueDate = new Date(Date.now() + 90 * 86400000).toISOString();
    const predData = loadPredictions();
    if (!predData.predictions) predData.predictions = {};
    predData.predictions[id] = {
      ...(predData.predictions[id] || {}),
      days_until_service: 90,
      service_due_date:   newDueDate,
      status:             'green',
      error:              undefined,
    };
    savePredictions(predData);
    setPredictions({ ...predData.predictions });

    try {
      await addLog({
        machine_id:  id,
        description: 'Serviced via MaintainIQ — status reset',
        technician:  'System',
        cost:        0,
      });
    } catch (e) {
      console.warn('Service log failed:', e?.message);
    }
    getMachines().then(r => setMachines(Array.isArray(r.data) ? r.data : []));
  }, [serviceModal]);

  /* ── Sort / filter ───────────────────────────────────────── */
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

    return [...result].sort((a, b) => {
      if (sortCol === 'status') {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortCol === 'name')
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortCol === 'type')
        return sortDir === 'asc' ? a.machine_type.localeCompare(b.machine_type) : b.machine_type.localeCompare(a.machine_type);
      if (sortCol === 'location')
        return sortDir === 'asc' ? a.location.localeCompare(b.location) : b.location.localeCompare(a.location);
      if (sortCol === 'last_serviced') {
        const da = a.last_serviced ? new Date(a.last_serviced) : new Date(0);
        const db = b.last_serviced ? new Date(b.last_serviced) : new Date(0);
        return sortDir === 'asc' ? da - db : db - da;
      }
      if (sortCol === 'days_until_service') {
        const getPredDays = (m) => {
          const p = predictions[m.id];
          if (!p || p.error) return null;
          if (p.service_due_date) {
            const cd = calcCountdown(p.service_due_date, now);
            return cd.isOverdue ? -1 : cd.days;
          }
          return p.days_until_service != null ? Math.round(p.days_until_service) : null;
        };
        const da = getPredDays(a);
        const db = getPredDays(b);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return sortDir === 'asc' ? da - db : db - da;
      }
      return 0;
    });
  }, [machines, search, statusFilter, sortCol, sortDir, predictions, now]);

  const counts = {
    total:  machines.length,
    green:  machines.filter(m => m.status === 'green').length,
    yellow: machines.filter(m => m.status === 'yellow').length,
    red:    machines.filter(m => m.status === 'red').length,
  };

  const ColHeader = ({ col, label, align }) => {
    const active = sortCol === col;
    return (
      <th style={{ ...TH, cursor: 'pointer', userSelect: 'none', textAlign: align || 'left' }} onClick={() => handleColSort(col)}>
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

      {/* ── Delete confirmation modal ────────────────────────── */}
      {deleteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setDeleteModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px',
            maxWidth: 440, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Delete machine?</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>This can be undone from Recently Deleted</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#475569' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{deleteModal.name}</strong>?
              This action can be undone from the <strong>Recently Deleted</strong> section below.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handleConfirmDelete} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(239,68,68,0.28)',
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!loading && [
            { label: 'All',          val: 'all',    count: counts.total,  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Operational',  val: 'green',  count: counts.green,  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Service Soon', val: 'yellow', count: counts.yellow, color: '#a16207', bg: '#fefce8', border: '#fde68a' },
            { label: 'Critical',     val: 'red',    count: counts.red,    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
          ].map(({ label, val, count, color, bg, border }) => (
            <button key={val} onClick={() => setStatusFilter(val)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${statusFilter === val ? border : '#e2e8f0'}`,
              background: statusFilter === val ? bg : '#fff',
              color: statusFilter === val ? color : '#64748b',
              fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
            }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: statusFilter === val ? color : '#e2e8f0', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search name, type, location…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32, paddingRight: search ? 30 : 12, width: 240, height: 36 }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          <button onClick={() => { setShowAddForm(v => !v); setAddError(null); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: showAddForm ? '#f1f5f9' : 'linear-gradient(135deg,#2563eb,#3b82f6)',
            color: showAddForm ? '#475569' : '#fff', fontWeight: 600, fontSize: 13,
            boxShadow: showAddForm ? 'none' : '0 4px 10px rgba(59,130,246,0.30)', transition: 'all 0.15s',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              {showAddForm ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
            </svg>
            {showAddForm ? 'Cancel' : 'Add Machine'}
          </button>
        </div>
      </div>

      {/* ── Add Machine form ──────────────────────────────────── */}
      {showAddForm && (
        <div className="fade-slide-up" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>New Machine</div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[
                { key: 'name',         label: 'Machine Name', placeholder: 'e.g. Compressor Unit 4' },
                { key: 'machine_type', label: 'Machine Type', placeholder: 'e.g. Compressor' },
                { key: 'location',     label: 'Location',     placeholder: 'e.g. Building A, Floor 2' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>{label}</label>
                  <input type="text" placeholder={placeholder} value={addForm[key]}
                    onChange={e => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}
            </div>
            {addError && (
              <div style={{ marginBottom: 12, padding: '7px 12px', borderRadius: 7, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {addError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? '#f1f5f9' : 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: saving ? '#94a3b8' : '#fff', fontWeight: 600, fontSize: 13,
                boxShadow: saving ? 'none' : '0 3px 8px rgba(34,197,94,0.28)', transition: 'all 0.15s',
              }}>
                {saving
                  ? <><svg className="spin" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/></svg>Saving…</>
                  : <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Save Machine</>}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setAddError(null); setAddForm({ name: '', machine_type: '', location: '' }); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Active machines table ─────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            {loading ? <Sk w={120} h={13} r={4} /> : <>{processed.length} of {counts.total} machine{counts.total !== 1 ? 's' : ''}</>}
          </div>
          {!loading && (search || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); }} style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Clear filters ×
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <ColHeader col="name" label="Machine" />
                <ColHeader col="type" label="Type" />
                <ColHeader col="location" label="Location" />
                <ColHeader col="status" label="Status" />
                <ColHeader col="days_until_service" label="Days Until Service" />
                <ColHeader col="last_serviced" label="Last Serviced" />
                <th style={{ ...TH, textAlign: 'center' }}>Service</th>
                <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkRow key={i} />)
              ) : processed.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '52px 32px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No machines match your filters</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>Try adjusting your search or status filter.</div>
                    <button onClick={() => { setSearch(''); setStatusFilter('all'); }} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#3b82f6', cursor: 'pointer' }}>Clear filters</button>
                  </td>
                </tr>
              ) : (
                processed.map((m) => (
                  <tr key={m.id}
                    style={{ transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Machine */}
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginBottom: 1 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>ID #{m.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td style={TD}>
                      <span style={{
                        display: 'inline-block', background: '#f8fafc',
                        border: '1px solid #e2e8f0', borderRadius: 6,
                        padding: '3px 10px', fontSize: 12, fontWeight: 500,
                        color: '#475569', whiteSpace: 'nowrap',
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{m.machine_type}</span>
                    </td>

                    {/* Location */}
                    <td style={{ ...TD, color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {m.location}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={TD}><StatusBadge status={m.status} /></td>

                    {/* Days Until Service — live countdown */}
                    <td style={TD}>
                      {(() => {
                        const p = predictions[m.id];
                        if (!p || p.error) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
                        let days = null; let isOverdue = false;
                        if (p.service_due_date) {
                          const cd = calcCountdown(p.service_due_date, now);
                          days = cd.days; isOverdue = cd.isOverdue;
                        } else if (p.days_until_service != null) {
                          days = Math.round(p.days_until_service);
                        }
                        if (days == null) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>;
                        const color = isOverdue ? '#ef4444' : days <= 7 ? '#ef4444' : days <= 30 ? '#eab308' : '#22c55e';
                        if (isOverdue) return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>0</span>
                            <span style={{ fontSize: 10, color: '#fff', background: '#ef4444', borderRadius: 5, padding: '1px 6px', fontWeight: 700 }}>Overdue</span>
                          </div>
                        );
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{days}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>days</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Last Serviced */}
                    <td style={{ ...TD, color: '#64748b' }}>
                      {m.last_serviced ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(m.last_serviced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{Math.floor((Date.now() - new Date(m.last_serviced)) / 86400000)} days ago</div>
                        </div>
                      ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>Never serviced</span>}
                    </td>

                    {/* Service — wrench icon column */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {predictions[m.id] && !predictions[m.id]?.error ? (
                        <ServiceWrenchBtn
                          onClick={() => setServiceModal({ id: m.id, name: m.name })}
                        />
                      ) : (
                        <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Link to={`/machine/${m.id}`}>
                          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#0f172a', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0f172a'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                            View
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                          </button>
                        </Link>

                        <button onClick={() => setDeleteModal(m)} disabled={deletingId === m.id} title={`Delete ${m.name}`}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: deletingId === m.id ? 'not-allowed' : 'pointer', transition: 'all 0.12s', flexShrink: 0 }}
                          onMouseEnter={e => { if (deletingId !== m.id) { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}>
                          {deletingId === m.id
                            ? <svg className="spin" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/></svg>
                            : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && processed.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Showing {processed.length} of {counts.total} machines</div>
            <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#64748b', alignItems: 'center' }}>
              <span>Sort:</span>
              {[
                { label: 'Critical first', col: 'status', dir: 'desc' },
                { label: 'Healthy first',  col: 'status', dir: 'asc'  },
              ].map(({ label, col, dir }) => (
                <button key={label} onClick={() => { setSortCol(col); setSortDir(dir); }} style={{
                  padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 500, fontSize: 12, transition: 'all 0.12s',
                  background: sortCol === col && sortDir === dir ? '#0f172a' : '#fff',
                  color: sortCol === col && sortDir === dir ? '#fff' : '#64748b',
                }}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Mark as Serviced confirmation modal ──────────────── */}
      {serviceModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setServiceModal(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px',
            maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <WrenchIcon size={20} color="#475569" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Has this equipment been serviced?
              </div>
            </div>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '10px 14px', marginBottom: 22, fontSize: 13, color: '#475569',
            }}>
              Machine: <strong style={{ color: '#0f172a' }}>{serviceModal.name}</strong>
              <div style={{ marginTop: 5, fontSize: 12, color: '#94a3b8' }}>
                Confirming will reset days until service to 90 and log a maintenance entry.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setServiceModal(null)} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={confirmMarkServiced} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(34,197,94,0.28)',
              }}>
                Yes, mark as serviced
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recently Deleted section ──────────────────────────── */}
      {deletedList.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg width="15" height="15" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
              Recently Deleted ({deletedList.length})
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>— machines can be restored or permanently removed</span>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Machine</th>
                    <th style={TH}>Type</th>
                    <th style={TH}>Location</th>
                    <th style={TH}>Last Prediction</th>
                    <th style={TH}>Deleted</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedList.map(entry => {
                    const p = entry.prediction;
                    const isRestoring = restoringId === entry.id;
                    const isPermDeleting = permDeletingId === entry.id;
                    const deletedAgo = entry.deleted_at
                      ? Math.floor((Date.now() - new Date(entry.deleted_at)) / 60000)
                      : null;

                    return (
                      <tr key={entry.id}
                        style={{ transition: 'background 0.12s', background: '#fffbf5' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fffbf5'}
                      >
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#78350f' }}>{entry.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>ID #{entry.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...TD, color: '#92400e' }}>
                          <span style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>{entry.machine_type}</span>
                        </td>
                        <td style={{ ...TD, color: '#92400e', fontSize: 12 }}>{entry.location}</td>
                        <td style={TD}>
                          {p?.days_until_service != null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>{Math.round(p.days_until_service)}</span>
                              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>days</span>
                              {p.status && <StatusBadge status={p.status} />}
                            </div>
                          ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>No prediction saved</span>}
                        </td>
                        <td style={{ ...TD, color: '#92400e', fontSize: 12 }}>
                          {deletedAgo !== null
                            ? deletedAgo < 1 ? 'Just now'
                              : deletedAgo < 60 ? `${deletedAgo}m ago`
                              : deletedAgo < 1440 ? `${Math.floor(deletedAgo / 60)}h ago`
                              : `${Math.floor(deletedAgo / 1440)}d ago`
                            : '—'}
                        </td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => handleRestore(entry)} disabled={isRestoring || isPermDeleting} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                              border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a',
                              fontSize: 12, fontWeight: 600, cursor: isRestoring ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
                            }}
                              onMouseEnter={e => { if (!isRestoring) { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.color = '#fff'; } }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#16a34a'; }}>
                              {isRestoring
                                ? <svg className="spin" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/></svg>
                                : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>}
                              Restore
                            </button>
                            <button onClick={() => handlePermanentDelete(entry)} disabled={isRestoring || isPermDeleting} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                              border: '1px solid #e2e8f0', background: '#fff', color: '#64748b',
                              fontSize: 12, fontWeight: 600, cursor: isPermDeleting ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
                            }}
                              onMouseEnter={e => { if (!isPermDeleting) { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0f172a'; } }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                              {isPermDeleting
                                ? <svg className="spin" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/></svg>
                                : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>}
                              Delete Forever
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
