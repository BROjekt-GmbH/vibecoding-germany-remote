'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AlertHistoryItem } from '@/types';
import { HostSelector } from '../shared/host-selector';

// Severity-Farben
const SEVERITY_COLOR: Record<string, string> = {
  info:    'var(--cyan)',
  warning: 'var(--amber)',
  error:   'var(--red)',
  success: 'var(--green)',
};

// Severity-Label auf Deutsch
const SEVERITY_LABEL: Record<string, string> = {
  info:    'Info',
  warning: 'Warnung',
  error:   'Fehler',
  success: 'Erfolg',
};

// Zeitstempel leserlich formatieren
function formatTime(ts: string): string {
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
    return date.toLocaleDateString('de-DE', {
      day:   '2-digit',
      month: '2-digit',
      year:  '2-digit',
      hour:  '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export function HistoryPanel() {
  const [hostId, setHostId] = useState('');
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  // Verlauf laden
  const fetchAlerts = useCallback(async (hId: string) => {
    setLoading(true);
    try {
      // Versuche /api/notifications (haelt alertHistory-Daten)
      const res = await fetch('/api/notifications?limit=50');
      if (!res.ok) {
        setApiAvailable(false);
        return;
      }
      setApiAvailable(true);
      const data = await res.json();
      const all: AlertHistoryItem[] = data.alerts ?? [];
      // Nach Host filtern wenn ausgewaehlt
      const filtered = hId
        ? all.filter((a) => a.hostId === hId)
        : all;
      // Neueste zuerst
      setAlerts(filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(hostId);
  }, [hostId, fetchAlerts]);

  // API nicht verfuegbar — Platzhalter anzeigen
  if (apiAvailable === false) {
    return (
      <div
        style={{
          padding: 24,
          color: 'var(--text-muted)',
          fontSize: 12,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Verlauf</div>
        in Entwicklung
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <HostSelector value={hostId} onChange={setHostId} />
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
        {loading && (
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

        {!loading && alerts.length === 0 && (
          <div
            style={{
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Keine Eintraege vorhanden
          </div>
        )}

        {alerts.map((alert) => {
          const color = SEVERITY_COLOR[alert.severity] ?? 'var(--text-secondary)';
          const label = SEVERITY_LABEL[alert.severity] ?? alert.severity;

          return (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                gap: 8,
                padding: '7px 10px',
                borderBottom: '1px solid var(--border-subtle)',
                // Gelesene Eintraege leicht gedaempft
                opacity: alert.readAt ? 0.6 : 1,
              }}
            >
              {/* Zeitlinie-Punkt */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  paddingTop: 3,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Nachricht */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Typ-Badge + Zeitstempel */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {label}
                  </span>
                  {alert.type && alert.type !== alert.severity && (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {alert.type}
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(alert.createdAt)}
                  </span>
                </div>

                {/* Meldungstext */}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {alert.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
