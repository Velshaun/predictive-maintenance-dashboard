import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV = [
  {
    label: 'Dashboard', path: '/',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: 'Machines', path: '/machines',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/>
        <rect x="2" y="17" width="20" height="4" rx="1"/>
        <circle cx="6" cy="5.5" r="1" fill="currentColor" stroke="none"/>
        <circle cx="6" cy="12.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'Predictions', path: '/predictions',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    label: 'Settings', path: '/settings',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/machines': 'Machines',
  '/predictions': 'Predictions',
  '/settings': 'Settings',
};

const NAME_KEY = 'maintainiq_user_name';

/* ── Name Modal ── */
function NameModal({ onSave }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input after mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '32px 28px', width: '100%', maxWidth: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        animation: 'pageFadeIn 0.2s ease forwards',
      }}>
        {/* Logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, background: '#3b82f6', borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Welcome to MaintainIQ
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            What's your name? We'll use it to personalise your experience.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter your name…"
            value={value}
            onChange={e => setValue(e.target.value)}
            maxLength={50}
            style={{
              width: '100%', height: 44, padding: '0 14px',
              border: '1.5px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, color: '#0f172a', background: '#fff',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.12s',
              marginBottom: 12,
            }}
            onFocus={e => (e.target.style.borderColor = '#3b82f6')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
          <button
            type="submit"
            disabled={!value.trim()}
            style={{
              width: '100%', height: 44, borderRadius: 10, border: 'none',
              background: value.trim() ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : '#f1f5f9',
              color: value.trim() ? '#fff' : '#94a3b8',
              fontWeight: 700, fontSize: 14, cursor: value.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              boxShadow: value.trim() ? '0 4px 12px rgba(59,130,246,0.35)' : 'none',
            }}
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path);
  const title = PAGE_TITLES[pathname] || 'Machine Detail';

  /* ── Mobile sidebar state ── */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── User name state ── */
  const [userName, setUserName] = useState(() => {
    try { return localStorage.getItem(NAME_KEY) || null; }
    catch { return null; }
  });
  const [showNameModal, setShowNameModal] = useState(() => {
    try { return !localStorage.getItem(NAME_KEY); }
    catch { return false; }
  });

  /* Close sidebar on route change */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /* Prevent body scroll when sidebar is open on mobile */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleSaveName = (name) => {
    try { localStorage.setItem(NAME_KEY, name); } catch {}
    setUserName(name);
    setShowNameModal(false);
  };

  /* Derive avatar initial from name */
  const avatarInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <>
      {/* ── Name Modal (first visit) — blocks all content until name is entered ── */}
      {showNameModal && (
        <>
          <NameModal onSave={handleSaveName} />
          {/* Full-screen content blocker so nothing is visible behind the modal */}
          <div style={{
            position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9998,
          }} />
        </>
      )}

      <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

        {/* ── Mobile overlay backdrop ── */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
              zIndex: 40, display: 'none',
            }}
            className="mobile-overlay"
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
          style={{
            width: 240, background: '#0f172a', display: 'flex',
            flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 50,
          }}
        >

          {/* Logo */}
          <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, background: '#3b82f6', borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>MaintainIQ</div>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Platform</div>
              </div>
              {/* Mobile close button inside sidebar */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="sidebar-close-btn"
                style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  color: '#475569', cursor: 'pointer', padding: 4,
                  display: 'none', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6,
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
            <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '6px 10px 8px' }}>
              Navigation
            </div>
            {NAV.map(item => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                    color: active ? '#f1f5f9' : '#64748b',
                    background: active ? '#1e3a5f' : 'transparent',
                    fontWeight: active ? 600 : 500,
                    fontSize: 14, transition: 'all 0.12s',
                    borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
                    minHeight: 44, /* touch-friendly */
                  }}
                >
                  <span style={{ color: active ? '#3b82f6' : '#475569', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>{avatarInitial}</div>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName || 'Administrator'}
                </div>
                <div style={{ color: '#475569', fontSize: 11 }}>Administrator</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Column ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Header */}
          <header style={{
            height: 60, background: '#ffffff', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Hamburger — visible on mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="hamburger-btn"
                style={{
                  background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer',
                  color: '#64748b', padding: '7px 8px', borderRadius: 8,
                  display: 'none', alignItems: 'center', justifyContent: 'center',
                  minWidth: 36, minHeight: 36,
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>{title}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Notification bell */}
              <button style={{
                background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer',
                color: '#64748b', padding: '7px 8px', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 36, minHeight: 36,
                transition: 'all 0.12s',
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </button>
              {/* Divider */}
              <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                border: '2px solid #e2e8f0',
              }}>{avatarInitial}</div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
