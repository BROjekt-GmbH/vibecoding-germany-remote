'use client';

import { useRef, useCallback } from 'react';

interface TerminalKeysToolbarProps {
  onKey: (data: string) => void;
}

const keys = [
  { label: 'ESC', data: '\x1b' },
  { label: 'TAB', data: '\t' },
  { label: '\u2191', data: '\x1b[A' },
  { label: '\u2193', data: '\x1b[B' },
  { label: '\u2190', data: '\x1b[D' },
  { label: '\u2192', data: '\x1b[C' },
  { label: 'C-c', data: '\x03' },
  { label: 'C-d', data: '\x04' },
  { label: 'C-z', data: '\x1a' },
  { label: 'C-l', data: '\x0c' },
];

const DEBOUNCE_MS = 80;

export function TerminalKeysToolbar({ onKey }: TerminalKeysToolbarProps) {
  const lastFireRef = useRef(0);

  const fireKey = useCallback(
    (data: string) => {
      const now = Date.now();
      if (now - lastFireRef.current < DEBOUNCE_MS) return;
      lastFireRef.current = now;
      onKey(data);
    },
    [onKey],
  );

  return (
    <div
      className="flex items-center gap-1 px-2 shrink-0 w-full"
      style={{
        height: '52px',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {keys.map((key) => (
        <button
          key={key.label}
          onTouchStart={(e) => {
            e.preventDefault();
            fireKey(key.data);
          }}
          onClick={() => fireKey(key.data)}
          className="flex-1 h-10 rounded text-[13px] font-medium transition-colors active:brightness-125"
          style={{
            minHeight: '40px',
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
