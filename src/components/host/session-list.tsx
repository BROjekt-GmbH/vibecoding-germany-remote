'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { Terminal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { TmuxSession, SessionsStatePayload } from '@/types';

interface SessionListProps {
  hostId: string;
  initialSessions?: TmuxSession[];
}

export function SessionList({ hostId, initialSessions = [] }: SessionListProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<TmuxSession[]>(initialSessions);
  const [loading, setLoading] = useState(initialSessions.length === 0);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = () => {
      fetch(`/api/hosts/${hostId}/sessions`)
        .then((r) => r.json())
        .then((data: TmuxSession[]) => {
          setSessions(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    if (initialSessions.length === 0) fetchSessions();

    const socket = io('/updates');
    socket.on('sessions:state', (payload: SessionsStatePayload) => {
      if (payload.hostId === hostId) {
        setSessions(payload.sessions);
      }
    });

    return () => { socket.disconnect(); };
  }, [hostId, initialSessions.length]);

  const handleCreate = async () => {
    const name = newName.trim() || `session-${sessions.length + 1}`;
    setError('');
    setCreating(true);

    try {
      const res = await fetch(`/api/hosts/${hostId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler beim Erstellen');
        setCreating(false);
        return;
      }

      setShowNewSession(false);
      setNewName('');
      setCreating(false);
      router.push(`/terminal/${encodeURIComponent(hostId)}?session=${encodeURIComponent(name)}`);
    } catch {
      setError('Verbindungsfehler');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[#4a5a6e] text-sm">
        <Spinner size="sm" />
        Discovering sessions...
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[#4a5a6e]">
          {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setShowNewSession(true); setError(''); setNewName(''); }}
        >
          <Plus size={12} />
          Neue Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-[#4a5a6e] text-sm">No active tmux sessions.</p>
          <p className="text-[11px] text-[#2d3f52] mt-1">Start a tmux session on the remote host to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <div key={session.name} className="panel-elevated px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-sm"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
                >
                  <Terminal size={13} className="text-[#22d3ee]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#c8d6e5]">{session.name}</p>
                  <p className="text-[11px] text-[#4a5a6e]">
                    {session.windows} window{session.windows !== 1 ? 's' : ''}
                    {session.attached && (
                      <span className="ml-2 text-[#34d399]">· attached</span>
                    )}
                  </p>
                </div>
              </div>

              <Link
                href={`/terminal/${encodeURIComponent(hostId)}?session=${encodeURIComponent(session.name)}`}
                className="btn btn-ghost text-[12px]"
              >
                <Terminal size={12} />
                Open
              </Link>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={showNewSession}
        onClose={() => setShowNewSession(false)}
        title="Neue tmux Session"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="flex flex-col gap-4"
        >
          <Input
            label="SESSION NAME"
            placeholder={`session-${sessions.length + 1}`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            error={error}
            autoFocus
          />
          <p className="text-[12px] text-[#4a5a6e]">
            Erlaubt: a-z, A-Z, 0-9, _ und -. Leer lassen für Standardname.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowNewSession(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creating}>
              {creating ? <Spinner size="sm" /> : <Plus size={12} />}
              Erstellen
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
