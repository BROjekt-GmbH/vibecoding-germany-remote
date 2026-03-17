'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { TerminalView } from '@/components/terminal/terminal-view';
import { HostSelector } from '../shared/host-selector';

export function TerminalMiniPanel() {
  const [hostId, setHostId] = useState('');
  const [sessionName, setSessionName] = useState('main');
  const [connected, setConnected] = useState(false);
  // Gespeicherte Werte fuer aktive Terminal-Verbindung
  const [activeHostId, setActiveHostId] = useState('');
  const [activeSession, setActiveSession] = useState('');

  const handleConnect = () => {
    if (!hostId || !sessionName.trim()) return;
    setActiveHostId(hostId);
    setActiveSession(sessionName.trim());
    setConnected(true);
  };

  const handleHostChange = (hId: string) => {
    setHostId(hId);
    // Bestehende Verbindung trennen bei Host-Wechsel
    if (connected) {
      setConnected(false);
      setActiveHostId('');
      setActiveSession('');
    }
  };

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
          flexShrink: 0,
        }}
      >
        <HostSelector value={hostId} onChange={handleHostChange} />

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Session-Eingabe */}
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
            placeholder="Session-Name"
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontSize: 12,
              padding: '5px 8px',
              minHeight: 30,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          {/* Verbinden-Button */}
          <button
            onClick={handleConnect}
            disabled={!hostId || !sessionName.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: connected
                ? 'var(--bg-elevated)'
                : 'var(--cyan-glow)',
              border: `1px solid ${connected ? 'var(--green-dim)' : 'var(--cyan-dim)'}`,
              borderRadius: 4,
              color: connected ? 'var(--green)' : 'var(--cyan)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '5px 10px',
              minHeight: 30,
              minWidth: 90,
              justifyContent: 'center',
              fontFamily: 'inherit',
              opacity: (!hostId || !sessionName.trim()) ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <Play size={11} />
            {connected ? 'Verbunden' : 'Verbinden'}
          </button>
        </div>
      </div>

      {/* Terminal-Bereich */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!connected ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            {!hostId
              ? 'Bitte einen Host auswaehlen'
              : 'Session-Name eingeben und Verbinden klicken'
            }
          </div>
        ) : (
          <TerminalView
            hostId={activeHostId}
            sessionName={activeSession}
            fontSize={13}
            visible={true}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}
