'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Terminal,
  Play,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type {
  Project,
  TmuxSession,
  SessionsStatePayload,
} from '@/types';

interface StatusData {
  project: Project;
  sessions: TmuxSession[];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/status`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json: StatusData = await res.json();
      setData(json);
    } catch {
      // network error — keep stale data
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load + 5-second polling
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // WebSocket: subscribe to host updates and refetch on relevant events
  useEffect(() => {
    if (!data?.project.hostId) return;

    const socket = io('/updates');
    socket.emit('subscribe:host', data.project.hostId);

    socket.on('sessions:state', (payload: SessionsStatePayload) => {
      if (payload.hostId === data.project.hostId) {
        fetchStatus();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [data?.project.hostId, fetchStatus]);

  // Connect: attach to first active session or start a new one
  const handleConnect = async () => {
    if (!data) return;
    const { project, sessions } = data;

    if (sessions.length > 0) {
      router.push(
        `/terminal/${encodeURIComponent(project.hostId)}?session=${encodeURIComponent(sessions[0].name)}`
      );
      return;
    }

    // No session — create one in the project directory
    setConnecting(true);
    setConnectError('');
    try {
      const sessionName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const res = await fetch(`/api/hosts/${project.hostId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName, startDir: project.path }),
      });
      if (res.ok) {
        router.push(
          `/terminal/${encodeURIComponent(project.hostId)}?session=${encodeURIComponent(sessionName)}`
        );
      } else {
        const err = await res.json().catch(() => null);
        setConnectError(err?.error || 'Session konnte nicht erstellt werden');
      }
    } catch {
      setConnectError('Verbindungsfehler');
    } finally {
      setConnecting(false);
    }
  };

  // Create a new session in the project directory
  const handleCreateSession = async () => {
    if (!data) return;
    const { project, sessions } = data;

    const name = newSessionName.trim() || `${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${sessions.length + 1}`;
    setCreateError('');
    setCreating(true);

    try {
      const res = await fetch(`/api/hosts/${project.hostId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDir: project.path }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.error || 'Fehler beim Erstellen');
        setCreating(false);
        return;
      }
      setShowNewSession(false);
      setNewSessionName('');
      setCreating(false);
      router.push(
        `/terminal/${encodeURIComponent(project.hostId)}?session=${encodeURIComponent(name)}`
      );
    } catch {
      setCreateError('Verbindungsfehler');
      setCreating(false);
    }
  };

  // --- Render states ---

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-16 gap-2 text-[#4a5a6e]">
          <Spinner size="sm" />
          <span className="text-sm">Lade Projekt...</span>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-[12px] text-[#4a5a6e] hover:text-[#8a9bb0] mb-5 transition-colors"
        >
          <ArrowLeft size={12} />
          Projects
        </Link>
        <div className="panel p-12 text-center">
          <p className="text-sm text-[#4a5a6e]">Projekt nicht gefunden.</p>
        </div>
      </div>
    );
  }

  const { project, sessions } = data;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/projects"
        className="flex items-center gap-1.5 text-[12px] text-[#4a5a6e] hover:text-[#8a9bb0] mb-5 transition-colors animate-fade-in"
      >
        <ArrowLeft size={12} />
        Projects
      </Link>

      {/* Header */}
      <div className="panel p-4 mb-4 animate-fade-in stagger-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            >
              <FolderOpen size={18} className="text-[#fbbf24]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-medium text-[#c8d6e5] leading-tight">{project.name}</h1>
              <p className="text-[12px] text-[#4a5a6e] font-mono mt-0.5 truncate">{project.path}</p>
              {project.description && (
                <p className="text-[12px] text-[#8a9bb0] mt-1">{project.description}</p>
              )}
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            disabled={connecting}
            className="shrink-0 flex items-center gap-1.5"
          >
            {connecting ? <Spinner size="sm" /> : <Play size={12} />}
            Connect
          </Button>
        </div>
        {connectError && (
          <p className="text-[12px] text-red-400 mt-2">{connectError}</p>
        )}
      </div>

      {/* Active Sessions */}
      <div className="panel p-4 mb-4 animate-fade-in stagger-2">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={13} className="text-[#22d3ee]" />
          <h2 className="text-label">AKTIVE SESSIONS</h2>
          <span className="text-[11px] text-[#4a5a6e] ml-auto">
            {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[#4a5a6e] text-sm">Keine aktiven Sessions in diesem Projekt.</p>
            <p className="text-[11px] text-[#2d3f52] mt-1">
              Starte eine neue Session im Projektverzeichnis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sessions.map((session) => (
              <Link
                key={session.name}
                href={`/terminal/${encodeURIComponent(project.hostId)}?session=${encodeURIComponent(session.name)}`}
                className="panel-elevated px-4 py-3 flex items-center justify-between hover:border-[#22d3ee] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 flex items-center justify-center rounded-sm shrink-0"
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
                  >
                    <Terminal size={12} className="text-[#22d3ee]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#c8d6e5] truncate group-hover:text-[#22d3ee] transition-colors">
                      {session.name}
                    </p>
                    <p className="text-[11px] text-[#4a5a6e]">
                      {session.windows} window{session.windows !== 1 ? 's' : ''}
                      {session.attached && (
                        <span className="ml-2 text-[#34d399]">· attached</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-[#4a5a6e] group-hover:text-[#22d3ee] transition-colors shrink-0 ml-2">
                  Attach
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Session button */}
      <div className="animate-fade-in stagger-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowNewSession(true);
            setCreateError('');
            setNewSessionName('');
          }}
          className="flex items-center gap-1.5"
        >
          <Plus size={12} />
          Neue Session starten
        </Button>
      </div>

      {/* New Session dialog */}
      <Dialog
        open={showNewSession}
        onClose={() => setShowNewSession(false)}
        title="Neue tmux Session"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateSession();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="SESSION NAME"
            placeholder={`${project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${sessions.length + 1}`}
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            error={createError}
            autoFocus
          />
          <p className="text-[11px] text-[#4a5a6e]">
            Die Session startet in <code className="text-[#8a9bb0]">{project.path}</code>.
            Leer lassen fuer Standardname.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setShowNewSession(false)}
            >
              Abbrechen
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creating}>
              {creating ? <Spinner size="sm" /> : <Plus size={12} />}
              Erstellen
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
