'use client';

import { useEffect, useState } from 'react';
import type { Host } from '@/types';

interface HostSelectorProps {
  value: string;
  onChange: (hostId: string) => void;
}

export function HostSelector({ value, onChange }: HostSelectorProps) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/hosts')
      .then((res) => res.json())
      .then((data: Host[]) => {
        setHosts(data);
        // Ersten Online-Host vorauswaehlen falls kein Wert gesetzt
        if (!value) {
          const firstOnline = data.find((h) => h.isOnline);
          if (firstOnline) onChange(firstOnline.id);
        }
      })
      .catch(() => {/* Fehler ignorieren — leere Liste bleibt */})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      style={{
        width: '100%',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 4,
        color: 'var(--text-primary)',
        fontSize: 12,
        padding: '6px 8px',
        minHeight: 32,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234a5a6e' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        paddingRight: 24,
      }}
    >
      {loading && <option value="">Laden…</option>}
      {!loading && hosts.length === 0 && (
        <option value="">Keine Hosts verfuegbar</option>
      )}
      {hosts.map((host) => (
        <option key={host.id} value={host.id}>
          {host.isOnline ? '● ' : '○ '}{host.name}
        </option>
      ))}
    </select>
  );
}
