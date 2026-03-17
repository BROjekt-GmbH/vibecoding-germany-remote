'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Server, Terminal, Plus, Trash2 } from 'lucide-react';
import type { Host, TmuxSession } from '@/types';

interface SessionPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (hostId: string, hostName: string, sessionName: string, pane?: string) => void;
  existingTabs: Array<{ hostId: string; sessionName: string; pane: string }>;
}

export function SessionPickerDialog({ open, onClose, onSelect, existingTabs }: SessionPickerDialogProps) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [sessions, setSessions] = useState<TmuxSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [killingSession, setKillingSession] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setLoading(true);
      setSelectedHost(null);
      setSessions([]);
      setShowCreate(false);
      setNewName('');
      setError('');
    });
    fetch('/api/hosts')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setHosts(Array.isArray(data) ? data : []))
      .catch(() => setHosts([]))
      .finally(() => setLoading(false));
  }, [open]);

  const loadSessions = useCallback(async (hostId: string) => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/hosts/${hostId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoadingSessions(false);
  }, []);

  const handleSelectHost = (host: Host) => {
    setSelectedHost(host);
    setShowCreate(false);
    setError('');
    loadSessions(host.id);
  };

  const isTabOpen = (hostId: string, sessionName: string, pane = '0') =>
    existingTabs.some((t) => t.hostId === hostId && t.sessionName === sessionName && t.pane === pane);

  const handleCreateSession = async () => {
    if (!selectedHost) return;
    const name = newName.trim();
    if (!name) { setError('Name erforderlich'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/hosts/${selectedHost.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Fehler');
        setCreating(false);
        return;
      }
      onSelect(selectedHost.id, selectedHost.name, name);
      setNewName('');
      setShowCreate(false);
    } catch {
      setError('Verbindungsfehler');
    }
    setCreating(false);
  };

  const handleKillSession = async (sessionName: string) => {
    if (!selectedHost) return;
    setKillingSession(sessionName);
    try {
      const res = await fetch(
        `/api/hosts/${selectedHost.id}/sessions/${encodeURIComponent(sessionName)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.name !== sessionName));
      }
    } catch { /* ignore */ }
    setKillingSession(null);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Neue Session verbinden">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Spinner size="sm" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade Hosts...</span>
        </div>
      ) : hosts.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Keine Hosts konfiguriert.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Host-Karten */}
          <div className="grid grid-cols-2 gap-2">
            {hosts.map((host) => (
              <button
                key={host.id}
                onClick={() => handleSelectHost(host)}
                disabled={!host.isOnline}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-left transition-all duration-150 ${
                  selectedHost?.id === host.id
                    ? 'ring-1 ring-[#22d3ee] bg-[#0a1a2a]'
                    : host.isOnline
                      ? 'hover:bg-[#0b0e11] hover:border-[#2d3f52] cursor-pointer'
                      : 'opacity-40 cursor-default'
                }`}
                style={{ border: `1px solid ${selectedHost?.id === host.id ? 'rgba(34, 211, 238, 0.2)' : 'var(--border-default)'}` }}
              >
                <Server size={13} className={host.isOnline ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#c8d6e5] truncate">{host.name}</p>
                  <Badge variant={host.isOnline ? 'online' : 'offline'} className="mt-0.5">
                    {host.isOnline ? 'online' : 'offline'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          {/* Sessions des gewählten Hosts */}
          {selectedHost && (
            <div>
              <p className="text-[12px] uppercase tracking-wider mb-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                Sessions auf {selectedHost.name}
              </p>

              {loadingSessions ? (
                <div className="flex items-center justify-center gap-1.5 py-3">
                  <Spinner size="sm" />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Lade...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {sessions.map((session) => {
                    const alreadyOpen = isTabOpen(selectedHost.id, session.name);
                    const isKilling = killingSession === session.name;
                    return (
                      <div
                        key={session.name}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md transition-colors group ${
                          alreadyOpen
                            ? 'opacity-40'
                            : 'hover:bg-[#111519]'
                        }`}
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        <button
                          onClick={() => onSelect(selectedHost.id, selectedHost.name, session.name)}
                          disabled={alreadyOpen}
                          className="flex items-center gap-3 flex-1 text-left cursor-pointer disabled:cursor-default"
                        >
                          <Terminal size={13} className="text-[#22d3ee]" />
                          <div className="flex-1">
                            <span className="text-[13px] text-[#c8d6e5]">{session.name}</span>
                            <span className="text-[12px] ml-2" style={{ color: 'var(--text-muted)' }}>
                              {session.windows} Window{session.windows !== 1 ? 's' : ''}
                            </span>
                            {alreadyOpen && (
                              <span className="text-[12px] ml-2 text-[#22d3ee]">· geöffnet</span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => handleKillSession(session.name)}
                          disabled={isKilling}
                          title={`Session ${session.name} beenden`}
                          className="opacity-0 group-hover:opacity-100 text-[#4a5a6e] hover:text-[#f87171] transition-all disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {sessions.length === 0 && (
                    <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
                      Keine aktiven Sessions
                    </p>
                  )}
                </div>
              )}

              {/* Neue Session erstellen */}
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-3 py-2.5 mt-2 w-full rounded-md text-left transition-all duration-150 hover:bg-[#111519] hover:border-[#2d3f52]"
                  style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}
                >
                  <Plus size={12} />
                  <span className="text-[13px]">Neue Session erstellen</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleCreateSession(); }}
                  className="flex items-center gap-2 mt-2"
                >
                  <Input
                    placeholder="session-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    error={error}
                    autoFocus
                    className="flex-1"
                  />
                  <Button variant="primary" size="sm" type="submit" disabled={creating}>
                    {creating ? <Spinner size="sm" /> : 'Erstellen'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
