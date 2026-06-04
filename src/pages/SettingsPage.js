import React, { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api';

const LS_KEY      = 'maintainiq_settings';
const LS_META_KEY = 'maintainiq_settings_meta';

const DEFAULTS = {
  apiBaseUrl:           '',
  requestTimeout:       10000,
  criticalThreshold:    7,
  warningThreshold:     30,
  notificationsEnabled: false,
  notificationEmail:    '',
  alertOnCritical:      true,
  alertOnWarning:       true,
  alertOnMachineDown:   true,
};

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function loadLastSaved() {
  try {
    const raw = localStorage.getItem(LS_META_KEY);
    return raw ? JSON.parse(raw).lastSaved : null;
  } catch { return null; }
}

/* ─────────────────────────────────────────────────────────────
   Reusable section card
   ───────────────────────────────────────────────────────────── */
function Section({ id, icon, title, description, children, onSave, saving, saved }) {
  return (
    <div id={id} style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#475569', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{description}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 24px' }}>
        {children}

        {onSave && (
          <div style={{
            marginTop: 22, paddingTop: 20, borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: saving ? '#f1f5f9' : '#0f172a',
                color: saving ? '#94a3b8' : '#fff',
                fontWeight: 600, fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {saving ? (
                <>
                  <svg className="spin" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save changes
                </>
              )}
            </button>

            {saved && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: '#15803d',
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved to local storage
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Field wrapper
   ───────────────────────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 600,
        color: '#374151', marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Text / number input
   ───────────────────────────────────────────────────────────── */
function Input({ value, onChange, type = 'text', placeholder = '', min, max, suffix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', height: 38, padding: '0 12px',
          borderRadius: 8, border: `1px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
          fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
          transition: 'border-color 0.12s, box-shadow 0.12s',
          paddingRight: suffix ? 48 : 12,
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute', right: 10, fontSize: 12,
          color: '#94a3b8', fontWeight: 500, pointerEvents: 'none',
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Toggle switch
   ───────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange, label, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid #f8fafc',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-label={label}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? '#3b82f6' : '#e2e8f0',
          position: 'relative', transition: 'background 0.18s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.18s ease',
        }} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Threshold slider (range + number input combo)
   ───────────────────────────────────────────────────────────── */
function ThresholdSlider({ label, value, onChange, min = 1, max = 90, color, description }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 8,
      }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number" value={value} min={min} max={max}
            onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
            style={{
              width: 56, height: 30, textAlign: 'center', borderRadius: 7,
              border: `1px solid ${color}44`, background: `${color}10`,
              color, fontWeight: 800, fontSize: 14, outline: 'none',
            }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>days</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer', height: 4 }}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#cbd5e1', marginTop: 3,
      }}>
        <span>{min}d</span><span>{max}d</span>
      </div>
      {description && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{description}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Read-only info row
   ───────────────────────────────────────────────────────────── */
function InfoRow({ label, value, mono = false, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 0', borderBottom: '1px solid #f8fafc',
    }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            background: '#f0fdf4', color: '#15803d',
            border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px',
          }}>
            {badge}
          </span>
        )}
        <span style={{
          fontSize: 13, fontWeight: 600, color: '#0f172a',
          fontFamily: mono ? "'Fira Code', 'Courier New', monospace" : 'inherit',
          background: mono ? '#f8fafc' : 'none',
          padding: mono ? '2px 8px' : 0,
          borderRadius: mono ? 5 : 0,
          border: mono ? '1px solid #e2e8f0' : 'none',
          maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value || '—'}
        </span>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   Settings Page
   ═════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const [cfg, setCfg]           = useState(load);
  const [lastSaved, setLastSaved] = useState(loadLastSaved);

  /* Use a ref so async callbacks always read the latest cfg
     without needing cfg in every useCallback dependency array  */
  const cfgRef = useRef(cfg);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  /* Section save states */
  const [savedApi,    setSavedApi]    = useState(false);
  const [savedNotif,  setSavedNotif]  = useState(false);
  const [savingApi,   setSavingApi]   = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  /* API connection test states */
  const [testing,    setTesting]    = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'success' | 'error'

  /* Helper: brief setter by key */
  const set = (key) => (val) => setCfg(c => ({ ...c, [key]: val }));

  /* Helper: flash a "saved" indicator for 2.5 s */
  const flash = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  /* Stable persist — reads from ref so it never goes stale */
  const persist = useCallback(() => {
    const current = cfgRef.current;
    localStorage.setItem(LS_KEY, JSON.stringify(current));
    const now = new Date().toISOString();
    localStorage.setItem(LS_META_KEY, JSON.stringify({ lastSaved: now }));
    setLastSaved(now);
    /* Notify other components / tabs */
    window.dispatchEvent(new Event('maintainiq:settings-updated'));
  }, []);

  /* Save API section — also applies changes to the axios instance */
  const saveApi = useCallback(async () => {
    setSavingApi(true);
    setTestStatus(null);
    await new Promise(r => setTimeout(r, 400));
    persist();
    /* Apply immediately so all subsequent API calls use the new URL */
    const current = cfgRef.current;
    api.defaults.baseURL = current.apiBaseUrl || '';
    api.defaults.timeout = current.requestTimeout;
    setSavingApi(false);
    flash(setSavedApi);
  }, [persist]);

  /* Save Notifications section */
  const saveNotif = useCallback(async () => {
    setSavingNotif(true);
    await new Promise(r => setTimeout(r, 400));
    persist();
    setSavingNotif(false);
    flash(setSavedNotif);
  }, [persist]);

  /* Test the configured (or default) backend URL */
  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const base = cfgRef.current.apiBaseUrl || window.location.origin;
      const res  = await fetch(`${base}/api/machines/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      setTestStatus(res.ok ? 'success' : 'error');
    } catch {
      setTestStatus('error');
    } finally {
      setTesting(false);
    }
  }, []);

  /* Reset everything */
  const resetAll = () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_META_KEY);
    setCfg({ ...DEFAULTS });
    setLastSaved(null);
    setTestStatus(null);
    api.defaults.baseURL = '';
    api.defaults.timeout = DEFAULTS.requestTimeout;
  };

  /* Change critical threshold and auto-clamp warning so it stays above */
  const setCritical = (val) => {
    setCfg(c => ({
      ...c,
      criticalThreshold: val,
      warningThreshold: Math.max(c.warningThreshold, val + 1),
    }));
  };

  /* Format last-saved timestamp for display */
  const lastSavedLabel = lastSaved
    ? new Date(lastSaved).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  /* Static environment / build info */
  const envInfo = {
    apiUrl:    process.env.REACT_APP_API_URL || window.location.origin,
    nodeEnv:   process.env.NODE_ENV || 'production',
    react:     React.version,
    app:       '1.0.0',
    buildDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    backend:   'FastAPI + SQLAlchemy',
    ml:        'RandomForest + IsolationForest (scikit-learn)',
    database:  'PostgreSQL (Amazon RDS)',
    infra:     'EKS (Kubernetes) · Terraform',
  };

  /* Quick-nav sections */
  const NAV_SECTIONS = [
    { id: 'settings-api',         label: 'API Configuration' },
    { id: 'settings-notifications', label: 'Notifications'   },
    { id: 'settings-environment', label: 'Environment'       },
  ];

  /* ── Shared button-hover helper ───────────────────────────── */
  const navHover  = e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; };
  const navUnhover = e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; };
  const testHover  = e => { if (!testing) { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; } };
  const testUnhover = e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = testing ? '#94a3b8' : '#374151'; };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="page-content" style={{ padding: '28px 32px', maxWidth: 800 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div className="settings-header-row" style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 14,
        }}>
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 800, color: '#0f172a',
              letterSpacing: '-0.4px', marginBottom: 5,
            }}>
              Application Settings
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 520 }}>
              Configure API connectivity, alert thresholds, and view environment details.
              All settings are persisted locally in your browser.
            </p>
          </div>

          {/* Last-saved badge */}
          {lastSavedLabel && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600, color: '#15803d',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 20, padding: '5px 11px',
              whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 20,
            }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved {lastSavedLabel}
            </div>
          )}
        </div>

        {/* Quick-nav anchor pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {NAV_SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onMouseEnter={navHover}
              onMouseLeave={navUnhover}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 13px', borderRadius: 20,
                border: '1px solid #e2e8f0', background: '#fff',
                fontSize: 12, fontWeight: 600, color: '#475569',
                textDecoration: 'none', transition: 'all 0.12s',
              }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ══ 1. API CONFIGURATION ══════════════════════════════ */}
      <Section
        id="settings-api"
        title="API Configuration"
        description="Connection settings for the backend prediction API."
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        }
        onSave={saveApi}
        saving={savingApi}
        saved={savedApi}
      >
        <Field
          label="API Base URL"
          hint="Leave blank to use the same origin (recommended for production). Set to e.g. http://localhost:8000 for local dev."
        >
          <Input
            value={cfg.apiBaseUrl}
            onChange={set('apiBaseUrl')}
            placeholder="http://localhost:8000  (leave blank for same-origin)"
          />
        </Field>

        <Field
          label="Request Timeout"
          hint="Maximum time in milliseconds to wait for API responses before showing an error."
        >
          <Input
            type="number"
            value={cfg.requestTimeout}
            onChange={set('requestTimeout')}
            min={1000} max={60000}
            suffix="ms"
          />
        </Field>

        {/* ── Connection tester ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <button
            onClick={testConnection}
            disabled={testing}
            onMouseEnter={testHover}
            onMouseLeave={testUnhover}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#fff',
              color: testing ? '#94a3b8' : '#374151',
              fontWeight: 600, fontSize: 12,
              cursor: testing ? 'not-allowed' : 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {testing ? (
              <>
                <svg className="spin" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/>
                </svg>
                Testing…
              </>
            ) : (
              <>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Test Connection
              </>
            )}
          </button>

          {testStatus === 'success' && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: '#15803d',
            }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              API reachable
            </span>
          )}

          {testStatus === 'error' && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: '#dc2626',
            }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9"  y1="9" x2="15" y2="15"/>
              </svg>
              Cannot reach API — check URL or start the backend
            </span>
          )}
        </div>
      </Section>

      {/* ══ 2. NOTIFICATION THRESHOLDS ═══════════════════════ */}
      <Section
        id="settings-notifications"
        title="Notification Thresholds"
        description="Configure when to alert based on predicted days until service."
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        }
        onSave={saveNotif}
        saving={savingNotif}
        saved={savedNotif}
      >
        <ThresholdSlider
          label="Critical Alert Threshold"
          value={cfg.criticalThreshold}
          onChange={setCritical}
          min={1} max={30}
          color="#ef4444"
          description="Machines with fewer days than this will be flagged as Critical (red)."
        />

        <ThresholdSlider
          label="Warning Alert Threshold"
          value={cfg.warningThreshold}
          onChange={set('warningThreshold')}
          min={cfg.criticalThreshold + 1} max={90}
          color="#eab308"
          description="Machines with fewer days than this (but above critical) will be flagged as Service Soon (yellow)."
        />

        {/* Threshold guardrail hint */}
        {cfg.warningThreshold <= cfg.criticalThreshold && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8, marginBottom: 12,
            background: '#fef2f2', border: '1px solid #fecaca',
            fontSize: 12, color: '#dc2626', fontWeight: 500,
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Warning threshold must be greater than the critical threshold.
          </div>
        )}

        {/* Alert toggles */}
        <div style={{ marginTop: 4 }}>
          <Toggle
            label="Enable Notifications"
            sub="Show in-app alerts when machines cross thresholds"
            checked={cfg.notificationsEnabled}
            onChange={set('notificationsEnabled')}
          />
          <Toggle
            label="Alert — Critical machines"
            sub={`Trigger when predicted service < ${cfg.criticalThreshold} days`}
            checked={cfg.alertOnCritical}
            onChange={set('alertOnCritical')}
          />
          <Toggle
            label="Alert — Service Soon"
            sub={`Trigger when predicted service < ${cfg.warningThreshold} days`}
            checked={cfg.alertOnWarning}
            onChange={set('alertOnWarning')}
          />
          <Toggle
            label="Alert — Machine downtime"
            sub="Trigger when a machine status changes to unknown"
            checked={cfg.alertOnMachineDown}
            onChange={set('alertOnMachineDown')}
          />
        </div>

        {/* Conditional email field */}
        {cfg.notificationsEnabled && (
          <div style={{ marginTop: 16 }}>
            <Field
              label="Notification Email"
              hint="Alerts will be routed to this address when notifications are enabled."
            >
              <Input
                value={cfg.notificationEmail}
                onChange={set('notificationEmail')}
                placeholder="ops@example.com"
                type="email"
              />
            </Field>
          </div>
        )}

        {/* Live threshold preview */}
        <div style={{
          marginTop: 16, padding: '14px 16px',
          background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
          }}>
            Current threshold preview
          </div>
          <div className="threshold-preview-row" style={{ display: 'flex', gap: 10 }}>
            {[
              {
                tag: 'Critical',
                label: `≤ ${cfg.criticalThreshold} days`,
                color: '#ef4444', bg: '#fef2f2', border: '#fecaca',
              },
              {
                tag: 'Service Soon',
                label: `${cfg.criticalThreshold + 1}–${cfg.warningThreshold} days`,
                color: '#a16207', bg: '#fefce8', border: '#fde68a',
              },
              {
                tag: 'Operational',
                label: `> ${cfg.warningThreshold} days`,
                color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
              },
            ].map(({ tag, label, color, bg, border }) => (
              <div key={tag} style={{
                flex: 1, background: bg, border: `1px solid ${border}`,
                borderRadius: 8, padding: '10px 12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>{tag}</div>
                <div style={{ fontSize: 11, color, opacity: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══ 3. ENVIRONMENT INFO ══════════════════════════════ */}
      <Section
        id="settings-environment"
        title="Environment & Build Info"
        description="Runtime environment, stack details, and infrastructure overview. Read-only."
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        }
      >
        {/* Runtime */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4,
        }}>
          Runtime
        </div>
        <InfoRow label="API URL"         value={envInfo.apiUrl}   mono badge="live" />
        <InfoRow label="Environment"     value={envInfo.nodeEnv}  mono />
        <InfoRow label="React version"   value={`v${envInfo.react}`} mono />
        <InfoRow label="App version"     value={`v${envInfo.app}`}   mono />
        <InfoRow label="Build date"      value={envInfo.buildDate} />

        {/* Stack */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.6px',
          marginTop: 18, marginBottom: 4,
        }}>
          Stack
        </div>
        <InfoRow label="Backend framework" value={envInfo.backend}  />
        <InfoRow label="ML models"         value={envInfo.ml}       />
        <InfoRow label="Database"          value={envInfo.database} />
        <InfoRow label="Infrastructure"    value={envInfo.infra}    />

        {/* Storage info + reset */}
        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Stored in{' '}
            <code style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
              localStorage
            </code>{' '}
            under key{' '}
            <code style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
              {LS_KEY}
            </code>
          </span>

          <button
            onClick={resetAll}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid #fecaca', background: '#fff',
              color: '#ef4444', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.12s',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.47"/>
            </svg>
            Reset to defaults
          </button>
        </div>
      </Section>
    </div>
  );
}
