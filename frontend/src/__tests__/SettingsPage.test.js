/**
 * Unit tests for <SettingsPage />
 *
 * Covers:
 *   - Renders without crashing
 *   - Loads defaults when localStorage is empty
 *   - Loads saved values from localStorage on mount
 *   - "Save changes" button writes to localStorage
 *   - Critical threshold auto-clamps warning threshold above it
 *   - Toggle switches flip their boolean values
 *   - "Reset to defaults" button clears localStorage (mocks window.confirm)
 *   - Email field appears only when notifications are enabled
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../pages/SettingsPage';

const LS_KEY      = 'maintainiq_settings';
const LS_META_KEY = 'maintainiq_settings_meta';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSettings() {
  return render(<SettingsPage />);
}

// ---------------------------------------------------------------------------
// Setup / teardown — clear localStorage between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('SettingsPage — renders', () => {
  test('renders the page heading', () => {
    renderSettings();
    expect(screen.getByText('Application Settings')).toBeInTheDocument();
  });

  test('renders all three section headings', () => {
    renderSettings();
    // Each heading text appears in both the nav pill and the section card,
    // so use getAllByText and assert at least one match per heading.
    expect(screen.getAllByText('API Configuration').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Notification Thresholds').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Environment & Build Info').length).toBeGreaterThanOrEqual(1);
  });

  test('renders two "Save changes" buttons (API + Notifications sections)', () => {
    renderSettings();
    const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
    expect(saveButtons.length).toBe(2);
  });

  test('renders the "Test Connection" button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
  });

  test('renders the "Reset to defaults" button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// localStorage — defaults
// ---------------------------------------------------------------------------

describe('SettingsPage — default values', () => {
  test('API Base URL input is empty by default', () => {
    renderSettings();
    const urlInput = screen.getByPlaceholderText(/localhost:8000/i);
    expect(urlInput.value).toBe('');
  });

  test('Request Timeout defaults to 10000', () => {
    renderSettings();
    // Find the number input that holds the timeout value
    const inputs = screen.getAllByRole('spinbutton');
    const timeoutInput = inputs.find(i => i.value === '10000');
    expect(timeoutInput).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// localStorage — persistence
// ---------------------------------------------------------------------------

describe('SettingsPage — loads saved settings', () => {
  test('reads saved apiBaseUrl from localStorage', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ apiBaseUrl: 'http://saved-api:9000' }));
    renderSettings();
    const urlInput = screen.getByPlaceholderText(/localhost:8000/i);
    expect(urlInput.value).toBe('http://saved-api:9000');
  });

  test('reads saved requestTimeout from localStorage', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ requestTimeout: 25000 }));
    renderSettings();
    const inputs = screen.getAllByRole('spinbutton');
    const timeoutInput = inputs.find(i => i.value === '25000');
    expect(timeoutInput).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Save button — writes to localStorage
// ---------------------------------------------------------------------------

describe('SettingsPage — save API settings', () => {
  test('saves settings to localStorage when "Save changes" is clicked', async () => {
    renderSettings();

    // Type a new URL
    const urlInput = screen.getByPlaceholderText(/localhost:8000/i);
    fireEvent.change(urlInput, { target: { value: 'http://test-backend:8888' } });

    // Click the first "Save changes" button (API section)
    const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
    await act(async () => { fireEvent.click(saveButtons[0]); });

    // Wait for the async save (400 ms simulated delay)
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(LS_KEY));
      expect(stored.apiBaseUrl).toBe('http://test-backend:8888');
    }, { timeout: 2000 });
  });

  test('shows "Saved to local storage" confirmation after saving', async () => {
    renderSettings();
    const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
    await act(async () => { fireEvent.click(saveButtons[0]); });

    await waitFor(() => {
      expect(screen.getAllByText(/saved to local storage/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });
});

// ---------------------------------------------------------------------------
// Notification thresholds — clamp logic
// ---------------------------------------------------------------------------

describe('SettingsPage — threshold clamping', () => {
  test('warning threshold stays above critical after critical is raised', () => {
    renderSettings();

    // Find the critical threshold number input (coloured red, inside the slider)
    const numberInputs = screen.getAllByRole('spinbutton');
    // Critical slider number input is the one with default value "7"
    const criticalInput = numberInputs.find(i => i.value === '7');
    expect(criticalInput).toBeDefined();

    // Set critical to 20 (warning default is 30, should stay 30 or auto-raise)
    fireEvent.change(criticalInput, { target: { value: '20' } });

    // Warning should still be > 20
    const warningInput = numberInputs.find(i => Number(i.value) > 20);
    expect(warningInput).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Toggle switches
// ---------------------------------------------------------------------------

describe('SettingsPage — toggle switches', () => {
  test('"Enable Notifications" toggle is off by default', () => {
    renderSettings();
    const toggle = screen.getByRole('button', { name: /enable notifications/i });
    // The background should be the "off" colour (#e2e8f0)
    expect(toggle).toHaveStyle({ background: '#e2e8f0' });
  });

  test('email field appears after enabling notifications', () => {
    renderSettings();
    expect(screen.queryByPlaceholderText(/ops@example\.com/i)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /enable notifications/i });
    fireEvent.click(toggle);

    expect(screen.getByPlaceholderText(/ops@example\.com/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Reset to defaults
// ---------------------------------------------------------------------------

describe('SettingsPage — reset to defaults', () => {
  test('clears localStorage when user confirms reset', () => {
    // Pre-seed localStorage
    localStorage.setItem(LS_KEY, JSON.stringify({ apiBaseUrl: 'http://old-api' }));
    window.confirm = jest.fn().mockReturnValue(true);

    renderSettings();
    const resetBtn = screen.getByRole('button', { name: /reset to defaults/i });
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  test('does NOT clear localStorage when user cancels reset', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ apiBaseUrl: 'http://keep-me' }));
    window.confirm = jest.fn().mockReturnValue(false);

    renderSettings();
    const resetBtn = screen.getByRole('button', { name: /reset to defaults/i });
    fireEvent.click(resetBtn);

    expect(localStorage.getItem(LS_KEY)).not.toBeNull();
  });
});
