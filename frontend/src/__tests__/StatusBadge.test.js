/**
 * Unit tests for <StatusBadge />
 *
 * Verifies that every status value renders the correct label and that the
 * size prop switches between compact ('sm') and normal ('md') dot dimensions.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from '../components/StatusBadge';

// ---------------------------------------------------------------------------
// Label rendering per status
// ---------------------------------------------------------------------------

describe('StatusBadge — label', () => {
  test('renders "Operational" for status="green"', () => {
    render(<StatusBadge status="green" />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  test('renders "Service Soon" for status="yellow"', () => {
    render(<StatusBadge status="yellow" />);
    expect(screen.getByText('Service Soon')).toBeInTheDocument();
  });

  test('renders "Critical" for status="red"', () => {
    render(<StatusBadge status="red" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  test('renders "Unknown" for status="unknown"', () => {
    render(<StatusBadge status="unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  test('falls back to "Unknown" for an unrecognised status', () => {
    render(<StatusBadge status="offline" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  test('falls back to "Unknown" when status is omitted', () => {
    render(<StatusBadge />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Size prop
// ---------------------------------------------------------------------------

describe('StatusBadge — size prop', () => {
  test('defaults to "md" size (dot 7 × 7)', () => {
    const { container } = render(<StatusBadge status="green" />);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveStyle({ width: '7px', height: '7px' });
  });

  test('renders smaller dot when size="sm" (6 × 6)', () => {
    const { container } = render(<StatusBadge status="green" size="sm" />);
    const dot = container.querySelector('span > span');
    expect(dot).toHaveStyle({ width: '6px', height: '6px' });
  });
});

// ---------------------------------------------------------------------------
// Correct colours per status (spot-check dot background)
// ---------------------------------------------------------------------------

describe('StatusBadge — colours', () => {
  const CASES = [
    { status: 'green',   dot: 'rgb(34, 197, 94)',   text: 'rgb(21, 128, 61)'  },
    { status: 'yellow',  dot: 'rgb(234, 179, 8)',    text: 'rgb(161, 98, 7)'   },
    { status: 'red',     dot: 'rgb(239, 68, 68)',    text: 'rgb(185, 28, 28)'  },
    { status: 'unknown', dot: 'rgb(148, 163, 184)',  text: 'rgb(100, 116, 139)'},
  ];

  CASES.forEach(({ status, dot, text }) => {
    test(`status="${status}" uses the correct dot colour`, () => {
      const { container } = render(<StatusBadge status={status} />);
      const dotEl = container.querySelector('span > span');
      expect(dotEl).toHaveStyle({ background: dot });
    });

    test(`status="${status}" uses the correct text colour`, () => {
      const { container } = render(<StatusBadge status={status} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ color: text });
    });
  });
});
