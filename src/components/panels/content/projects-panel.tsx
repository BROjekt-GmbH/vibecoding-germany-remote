'use client';

import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Play, Plus, X } from 'lucide-react';
import type { Project, Host } from '@/types';
import { HostSelector } from '../shared/host-selector';
import { usePanelManager } from '@/lib/stores/panel-manager';
import { useFileBrowser } from '@/lib/stores/file-browser';

export function ProjectsPanel() {
  const [hostId, setHostId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog-State fuer neues Projekt
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPath, setCreatePath] = useState('');
  const [createHostId, setCreateHostId] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Panel-Manager und File-Browser fuer "In Dateien oeffnen"
  const openPanel = usePanelManager((s) => s.openPanel);
  const setFilesHostId = useFileBrowser((s) => s.setHostId);
  const browseTo = useFileBrowser((s) => s.browse);

  // Hosts laden (fuer Hostname-Anzeige)
  useEffect(() => {
    fetch('/api/hosts')
      .then((res) => res.json())
      .then((data: Host[]) => setHosts(data))
      .catch(() => {/* Fehler ignorieren */});
  }, []);

  // Projekte laden — nach Host gefiltert oder alle
  const fetchProjects = useCallback(async (hId: string) => {
    setLoading(true);
    setProjects([]);
    try {
      const url = hId
        ? `/api/projects?hostId=${encodeURIComponent(hId)}`
        : '/api/projects';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // API gibt entweder Array direkt oder { projects: [...] }
        setProjects(Array.isArray(data) ? data : (data.projects ?? []));
      }
    } catch {/* Fehler ignorieren */}
    finally { setLoading(false); }
  }, []);

  // Bei Host-Wechsel neu laden
  useEffect(() => {
    fetchProjects(hostId);
  }, [hostId, fetchProjects]);

  // Hostnamen aus ID aufloesen
  const getHostName = (hId: string): string => {
    const host = hosts.find((h) => h.id === hId);
    return host ? host.name : hId;
  };

  // Projekt im Datei-Browser oeffnen
  const openInFiles = (project: Project) => {
    setFilesHostId(project.hostId);
    browseTo(project.path);
    openPanel('files');
  };

  // Zur Projekt-Detailseite navigieren (Connect)
  const connectToProject = (project: Project) => {
    window.location.href = `/projects/${project.id}`;
  };

  // Neues Projekt anlegen
  const handleCreate = async () => {
    if (!createName.trim() || !createPath.trim() || !createHostId) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          path: createPath.trim(),
          hostId: createHostId,
          description: createDesc.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setCreateError(err?.error || 'Fehler beim Anlegen');
        return;
      }
      // Dialog schliessen, Liste neu laden
      setShowCreate(false);
      setCreateName('');
      setCreatePath('');
      setCreateHostId('');
      setCreateDesc('');
      fetchProjects(hostId);
    } catch {
      setCreateError('Verbindungsfehler');
    } finally {
      setCreating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 4,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '6px 8px',
    minHeight: 30,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 3,
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
        }}
      >
        {/* Host-Filter + Neues Projekt */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <HostSelector
              value={hostId}
              onChange={setHostId}
            />
          </div>
          {hostId && (
            <button
              onClick={() => setHostId('')}
              title="Filter zuruecksetzen — alle Hosts anzeigen"
              style={{
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 11,
                padding: '4px 8px',
                minHeight: 32,
                whiteSpace: 'nowrap',
              }}
            >
              Alle
            </button>
          )}
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateError('');
              setCreateName('');
              setCreatePath('');
              setCreateHostId(hostId);
              setCreateDesc('');
            }}
            title="Neues Projekt anlegen"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              color: 'var(--cyan)',
              cursor: 'pointer',
              padding: '4px 8px',
              minHeight: 32,
              minWidth: 32,
            }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Dialog: Neues Projekt */}
      {showCreate && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          {/* Dialog-Header */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              Neues Projekt
            </span>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Formular */}
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={labelStyle}>Name</div>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Mein Projekt"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div>
              <div style={labelStyle}>Pfad</div>
              <input
                type="text"
                value={createPath}
                onChange={(e) => setCreatePath(e.target.value)}
                placeholder="/home/user/projects/mein-projekt"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <div style={labelStyle}>Host</div>
              <HostSelector
                value={createHostId}
                onChange={setCreateHostId}
              />
            </div>

            <div>
              <div style={labelStyle}>Beschreibung (optional)</div>
              <input
                type="text"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Kurze Beschreibung…"
                style={inputStyle}
              />
            </div>

            {createError && (
              <div style={{ fontSize: 11, color: 'var(--red, #f87171)' }}>
                {createError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '6px 12px',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim() || !createPath.trim() || !createHostId}
                style={{
                  background: 'var(--cyan-glow, rgba(34,211,238,0.1))',
                  border: '1px solid var(--cyan-dim, rgba(34,211,238,0.3))',
                  borderRadius: 4,
                  color: 'var(--cyan, #22d3ee)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '6px 12px',
                  opacity: (creating || !createName.trim() || !createPath.trim() || !createHostId) ? 0.4 : 1,
                }}
              >
                {creating ? 'Anlegen…' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projektliste */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
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

        {!loading && projects.length === 0 && (
          <div
            style={{
              padding: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Keine Projekte gefunden
          </div>
        )}

        {projects.map((project) => (
          <div
            key={project.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '8px 10px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {/* Projektinfos */}
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
                {project.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--cyan)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                }}
                title={project.path}
              >
                {project.path}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                {getHostName(project.hostId)}
                {project.description && (
                  <span style={{ marginLeft: 6, color: 'var(--text-secondary)' }}>
                    — {project.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connect-Button */}
            <button
              onClick={() => connectToProject(project)}
              title="Verbinden — Session starten"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--cyan-glow, rgba(34,211,238,0.1))',
                border: '1px solid var(--cyan-dim, rgba(34,211,238,0.3))',
                borderRadius: 3,
                color: 'var(--cyan, #22d3ee)',
                cursor: 'pointer',
                padding: 6,
                minWidth: 32,
                minHeight: 44,
                flexShrink: 0,
              }}
            >
              <Play size={13} />
            </button>

            {/* Dateien-Button */}
            <button
              onClick={() => openInFiles(project)}
              title="Im Datei-Browser oeffnen"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 6,
                minWidth: 32,
                minHeight: 44,
                flexShrink: 0,
              }}
            >
              <FolderOpen size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
