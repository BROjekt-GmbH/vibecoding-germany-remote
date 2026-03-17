'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, File, ChevronUp, RefreshCw, Terminal } from 'lucide-react';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { useTerminalTabEvents } from '@/lib/stores/terminal-tab-events';
import { HostSelector } from '../shared/host-selector';
import type { FileEntry } from '@/types';

/** Ordnername zu gueltigem tmux-Session-Namen sanitizen */
function sanitizeSessionName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || 'session';
}

// Dateigrösse lesbar formatieren
function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Pfad-Segmente fuer Breadcrumb aufteilen
function pathSegments(path: string): { label: string; path: string }[] {
  if (!path || path === '/') return [{ label: '/', path: '/' }];
  const parts = path.replace(/^\//, '').split('/');
  const segments: { label: string; path: string }[] = [{ label: '/', path: '/' }];
  let accumulated = '';
  for (const part of parts) {
    accumulated += '/' + part;
    segments.push({ label: part, path: accumulated });
  }
  return segments;
}

export function FilesPanel() {
  const router = useRouter();
  const {
    hostId,
    setHostId,
    currentPath,
    entries,
    loading,
    error,
    browse,
    navigateUp,
    refresh,
  } = useFileBrowser();

  const [creatingSession, setCreatingSession] = useState<string | null>(null);
  const requestTab = useTerminalTabEvents((s) => s.requestTab);

  /** Neue Terminal-Session aus Ordner erstellen und als Tab oeffnen */
  const handleOpenTerminal = async (entry: FileEntry) => {
    if (!hostId || !entry.isDir) return;

    const folderPath = currentPath
      ? (currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name)
      : '/' + entry.name;
    const sessionName = sanitizeSessionName(entry.name);

    setCreatingSession(entry.name);
    try {
      // 1. tmux-Session erstellen (422 = existiert schon — ok)
      const sessRes = await fetch(`/api/hosts/${hostId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName, startDir: folderPath }),
      });
      if (!sessRes.ok && sessRes.status !== 422) return;

      // 2. Event fuer Terminal-Seite setzen — die erstellt den Tab
      requestTab({ hostId, sessionName, pane: '0' });

      // 3. Zur Terminal-Seite navigieren
      router.push('/terminal');
    } finally {
      setCreatingSession(null);
    }
  };

  // Wenn Host gesetzt wird, laedt der Store selbst — kein zusaetzlicher Effect noetig
  // Erster Load wenn hostId bereits vorhanden (z.B. Panel neu geoeffnet)
  useEffect(() => {
    if (hostId && entries.length === 0 && !loading) {
      browse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirs = entries.filter((e) => e.isDir);
  const files = entries.filter((e) => !e.isDir);
  const sorted: FileEntry[] = [...dirs, ...files];

  const segments = pathSegments(currentPath);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <HostSelector value={hostId} onChange={setHostId} />

        {/* Breadcrumb + Aktionen */}
        {hostId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Breadcrumb */}
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {segments.map((seg, i) => (
                <span key={seg.path} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {i > 0 && <span style={{ color: 'var(--text-dim)' }}>/</span>}
                  <button
                    onClick={() => browse(seg.path)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: i === segments.length - 1 ? 'var(--text-secondary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 11,
                      padding: '2px 3px',
                      borderRadius: 2,
                      minHeight: 22,
                    }}
                  >
                    {seg.label}
                  </button>
                </span>
              ))}
            </div>

            {/* Hoch-Button */}
            <button
              onClick={navigateUp}
              disabled={!currentPath || currentPath === '/'}
              title="Uebergeordnetes Verzeichnis"
              style={{
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '3px 5px',
                display: 'flex',
                alignItems: 'center',
                minHeight: 26,
                minWidth: 26,
                justifyContent: 'center',
              }}
            >
              <ChevronUp size={12} />
            </button>

            {/* Aktualisieren-Button */}
            <button
              onClick={refresh}
              disabled={loading}
              title="Aktualisieren"
              style={{
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '3px 5px',
                display: 'flex',
                alignItems: 'center',
                minHeight: 26,
                minWidth: 26,
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={11} style={{ opacity: loading ? 0.4 : 1 }} />
            </button>
          </div>
        )}
      </div>

      {/* Dateiliste */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {!hostId && (
          <div
            style={{
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Bitte einen Host auswaehlen
          </div>
        )}

        {hostId && loading && (
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

        {hostId && !loading && error && (
          <div
            style={{
              padding: '12px 10px',
              color: 'var(--red)',
              fontSize: 12,
            }}
          >
            Fehler: {error}
          </div>
        )}

        {hostId && !loading && !error && sorted.length === 0 && (
          <div
            style={{
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Verzeichnis ist leer
          </div>
        )}

        {hostId && !loading && !error && sorted.map((entry) => (
          <div
            key={entry.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: 32,
            }}
          >
            <button
              onClick={() => {
                if (entry.isDir) {
                  const path = currentPath
                    ? (currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name)
                    : '/' + entry.name;
                  browse(path);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                flex: 1,
                padding: '5px 10px',
                background: 'none',
                border: 'none',
                color: entry.isDir ? 'var(--cyan)' : 'var(--text-primary)',
                cursor: entry.isDir ? 'pointer' : 'default',
                textAlign: 'left',
                fontSize: 12,
                minHeight: 32,
                overflow: 'hidden',
              }}
            >
              {entry.isDir
                ? <FolderOpen size={13} style={{ flexShrink: 0, color: 'var(--amber)' }} />
                : <File size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              }
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.name}
              </span>
              {!entry.isDir && entry.size !== null && (
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {formatSize(entry.size)}
                </span>
              )}
            </button>

            {/* Terminal-Session aus Ordner erstellen */}
            {entry.isDir && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTerminal(entry);
                }}
                disabled={creatingSession === entry.name}
                title={`Terminal in ${entry.name} oeffnen`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: creatingSession === entry.name ? 'var(--cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  opacity: creatingSession === entry.name ? 0.5 : 0.4,
                  transition: 'opacity 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (creatingSession !== entry.name) {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = 'var(--cyan)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (creatingSession !== entry.name) {
                    e.currentTarget.style.opacity = '0.4';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <Terminal size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
