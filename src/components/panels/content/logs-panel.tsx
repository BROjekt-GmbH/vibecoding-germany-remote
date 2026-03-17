'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';
import { HostSelector } from '../shared/host-selector';

interface LogFile {
  name: string;
  size: number;
  date: string;
}

// Dateigrösse lesbar formatieren
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Datum leserlich formatieren
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function LogsPanel() {
  const [hostId, setHostId] = useState('');
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [logContent, setLogContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { socketRef, connected } = useSocket('/logs');

  // Log-Dateiliste laden
  const fetchLogList = useCallback(async (hId: string) => {
    if (!hId) return;
    setLoadingList(true);
    setLogFiles([]);
    try {
      const res = await fetch(`/api/hosts/${hId}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogFiles(data.files ?? []);
      }
    } catch {/* Fehler ignorieren */}
    finally { setLoadingList(false); }
  }, []);

  // Host-Wechsel
  const handleHostChange = (hId: string) => {
    // Aktuelle Datei schliessen
    if (activeFile && socketRef.current) {
      socketRef.current.emit('logs:unsubscribe');
    }
    setActiveFile(null);
    setLogContent('');
    setHostId(hId);
    fetchLogList(hId);
  };

  // Log-Datei oeffnen
  const openLogFile = async (filename: string) => {
    if (!hostId) return;
    setActiveFile(filename);
    setLogContent('');
    setLoadingContent(true);

    try {
      const res = await fetch(`/api/hosts/${hostId}/logs/${encodeURIComponent(filename)}?lines=200`);
      if (res.ok) {
        const data = await res.json();
        setLogContent(data.content ?? '');
      }
    } catch {/* Fehler ignorieren */}
    finally { setLoadingContent(false); }

    // Live-Tail abonnieren
    if (socketRef.current && connected) {
      socketRef.current.emit('logs:subscribe', { hostId, filename });
    }
  };

  // Zurueck zur Dateiliste
  const closeLogFile = () => {
    if (socketRef.current) {
      socketRef.current.emit('logs:unsubscribe');
    }
    setActiveFile(null);
    setLogContent('');
  };

  // Socket-Events fuer Live-Tail
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleData = ({ content, append }: { content: string; append: boolean }) => {
      if (append) {
        setLogContent((prev) => prev + content);
      } else {
        setLogContent(content);
      }
    };

    socket.on('logs:data', handleData);
    return () => { socket.off('logs:data', handleData); };
  }, [socketRef, connected]);

  // Neu abonnieren nach Reconnect
  useEffect(() => {
    if (connected && activeFile && socketRef.current) {
      socketRef.current.emit('logs:subscribe', { hostId, filename: activeFile });
    }
  }, [connected, activeFile, hostId, socketRef]);

  // Auto-scroll ans Ende
  useEffect(() => {
    if (logContent) {
      logEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [logContent]);

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
        <HostSelector value={hostId} onChange={handleHostChange} />

        {/* Aktive Datei + Zurueck-Button */}
        {activeFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={closeLogFile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 11,
                padding: '3px 7px',
                minHeight: 26,
              }}
            >
              <ArrowLeft size={11} />
              Zurueck zur Liste
            </button>
            <span
              style={{
                flex: 1,
                fontSize: 11,
                color: 'var(--cyan)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeFile}
            </span>
            {connected && (
              <span style={{ fontSize: 10, color: 'var(--green)', flexShrink: 0 }}>
                Live
              </span>
            )}
          </div>
        )}

        {/* Dateiliste aktualisieren */}
        {!activeFile && hostId && (
          <button
            onClick={() => fetchLogList(hostId)}
            disabled={loadingList}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              alignSelf: 'flex-end',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '3px 7px',
              minHeight: 26,
            }}
          >
            <RefreshCw size={11} style={{ opacity: loadingList ? 0.4 : 1 }} />
            Aktualisieren
          </button>
        )}
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Kein Host gewaehlt */}
        {!hostId && (
          <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            Bitte einen Host auswaehlen
          </div>
        )}

        {/* Dateiliste */}
        {hostId && !activeFile && (
          <div style={{ height: '100%', overflow: 'auto', padding: '4px 0' }}>
            {loadingList && (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                Laden…
              </div>
            )}
            {!loadingList && logFiles.length === 0 && (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                Keine Log-Dateien gefunden
              </div>
            )}
            {logFiles.map((f) => (
              <button
                key={f.name}
                onClick={() => openLogFile(f.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 12,
                  minHeight: 36,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--cyan)',
                  }}
                >
                  {f.name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                  {formatDate(f.date)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                  {formatSize(f.size)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Log-Inhalt */}
        {hostId && activeFile && (
          <div style={{ height: '100%', overflow: 'auto', padding: '6px 0' }}>
            {loadingContent && (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                Laden…
              </div>
            )}
            {!loadingContent && (
              <pre
                style={{
                  fontFamily: "'MesloLGS NF', 'Fira Code', monospace",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  padding: '0 10px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0,
                }}
              >
                {logContent || '(Keine Daten)'}
              </pre>
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
