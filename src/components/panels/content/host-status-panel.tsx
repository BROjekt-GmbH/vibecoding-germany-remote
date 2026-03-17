'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Host } from '@/types';

// Zeitstempel leserlich formatieren
function formatLastSeen(ts: string | null): string {
  if (!ts) return 'Nie gesehen';
  try {
    const date = new Date(ts);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `vor ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `vor ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `vor ${diffH}h`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return ts;
  }
}

export function HostStatusPanel() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Hosts laden
  const fetchHosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hosts');
      if (res.ok) {
        const data = await res.json();
        setHosts(Array.isArray(data) ? data : (data.hosts ?? []));
        setLastRefresh(new Date());
      }
    } catch {/* Fehler ignorieren */}
    finally { setLoading(false); }
  }, []);

  // Initialer Load
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Auto-Refresh alle 10 Sekunden
  useEffect(() => {
    const timer = setInterval(fetchHosts, 10_000);
    return () => clearInterval(timer);
  }, [fetchHosts]);

  const onlineCount = hosts.filter((h) => h.isOnline).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Zusammenfassung */}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>
          <span style={{ color: 'var(--green)' }}>{onlineCount}</span>
          {' '}online
          {hosts.length > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              {' '}/ {hosts.length} gesamt
            </span>
          )}
        </span>

        {/* Letzter Refresh */}
        {lastRefresh && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}

        {/* Manueller Refresh */}
        <button
          onClick={fetchHosts}
          disabled={loading}
          title="Manuell aktualisieren"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 3,
            color: 'var(--text-muted)',
            cursor: loading ? 'default' : 'pointer',
            padding: 6,
            minWidth: 28,
            minHeight: 28,
          }}
        >
          <RefreshCw
            size={11}
            style={{
              opacity: loading ? 0.4 : 1,
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </button>
      </div>

      {/* Host-Liste */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {loading && hosts.length === 0 && (
          <div
            style={{
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Laden…
          </div>
        )}

        {!loading && hosts.length === 0 && (
          <div
            style={{
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Keine Hosts konfiguriert
          </div>
        )}

        {hosts.map((host) => (
          <div
            key={host.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {/* Status-Punkt */}
            <span
              title={host.isOnline ? 'Online' : 'Offline'}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                background: host.isOnline ? 'var(--green)' : 'var(--red)',
                boxShadow: host.isOnline
                  ? '0 0 4px var(--green)'
                  : 'none',
              }}
            />

            {/* Host-Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {host.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  marginTop: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {host.hostname}:{host.port}
              </div>
            </div>

            {/* Letzter Kontakt */}
            <div
              style={{
                fontSize: 10,
                color: host.isOnline ? 'var(--green)' : 'var(--text-muted)',
                flexShrink: 0,
                textAlign: 'right',
              }}
            >
              {host.isOnline ? 'Online' : formatLastSeen(host.lastSeen)}
            </div>
          </div>
        ))}
      </div>

      {/* CSS-Animation fuer Spin — inline keyframes nicht moeglich, daher class via style-tag */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
