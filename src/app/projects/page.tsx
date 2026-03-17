'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { FolderOpen, Plus, Terminal, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DirectoryBrowser } from '@/components/project/directory-browser';
import type { Project, Host, TmuxSession } from '@/types';

interface ProjectWithStatus {
  project: Project;
  sessions: TmuxSession[];
}

function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export default function ProjectsPage() {
  const [projectStatuses, setProjectStatuses] = useState<ProjectWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Create-Dialog State
  const [showCreate, setShowCreate] = useState(false);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formHostId, setFormHostId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok || signal?.aborted) return;
      const projects: Project[] = await res.json();
      if (!Array.isArray(projects) || signal?.aborted) return;

      setProjectStatuses(projects.map(p => ({ project: p, sessions: [] })));
      setLoading(false);

      for (const project of projects) {
        if (signal?.aborted) break;
        try {
          const sr = await fetchWithTimeout(`/api/projects/${project.id}/status`);
          if (sr.ok && !signal?.aborted) {
            const data = await sr.json();
            setProjectStatuses(prev =>
              prev.map(ps => ps.project.id === project.id ? data : ps)
            );
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadProjects(ctrl.signal);
    const interval = setInterval(() => loadProjects(ctrl.signal), 10000);
    return () => { ctrl.abort(); clearInterval(interval); };
  }, [loadProjects]);

  const openCreateDialog = async () => {
    setFormName('');
    setFormPath('');
    setFormHostId('');
    setFormDesc('');
    setFormError('');
    setShowCreate(true);
    // Hosts laden fuer Dropdown
    try {
      const res = await fetch('/api/hosts');
      if (res.ok) {
        const data = await res.json();
        setHosts(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!formHostId) { setFormError('Host ist erforderlich'); return; }
    if (!formPath.trim()) { setFormError('Verzeichnis ist erforderlich'); return; }
    if (!formName.trim()) { setFormError('Name ist erforderlich'); return; }

    setFormError('');
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          path: formPath.trim(),
          hostId: formHostId,
          description: formDesc.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Fehler beim Erstellen');
        setCreating(false);
        return;
      }
      setShowCreate(false);
      loadProjects();
    } catch {
      setFormError('Verbindungsfehler');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <div className="text-label text-[#4a5a6e] mb-1 flex items-center gap-1.5">
            <FolderOpen size={10} />
            PROJECTS
          </div>
          <h1 className="text-xl font-medium text-[#c8d6e5]">Projects</h1>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateDialog}>
          <Plus size={13} />
          Projekt erstellen
        </Button>
      </div>

      {projectStatuses.length === 0 ? (
        <div className="panel p-12 flex flex-col items-center text-center animate-fade-in stagger-1">
          <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <FolderOpen size={20} className="text-[#2d3f52]" />
          </div>
          <h2 className="text-sm font-medium text-[#8a9bb0]">Noch keine Projekte</h2>
          <p className="text-[12px] text-[#4a5a6e] mt-1 max-w-xs">
            Erstelle ein Projekt, um einen Repository-Pfad auf einem Remote-Host zu verknuepfen.
          </p>
          <Button variant="primary" size="sm" onClick={openCreateDialog} className="mt-4">
            <Plus size={13} />
            Projekt erstellen
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projectStatuses.map(({ project, sessions }, i) => {
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`panel p-4 hover:border-[#2d3f52] transition-colors group animate-fade-in stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-sm flex items-center justify-center mt-0.5 shrink-0"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                      <FolderOpen size={14} className="text-[#fbbf24]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-medium text-[#c8d6e5]">{project.name}</h3>
                      <p className="text-[11px] text-[#4a5a6e] mt-0.5 font-mono">{project.path}</p>
                      {project.description && (
                        <p className="text-[12px] text-[#8a9bb0] mt-1">{project.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {sessions.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-[#22d3ee]">
                            <Terminal size={10} />
                            {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[#2d3f52] group-hover:text-[#4a5a6e] group-hover:translate-x-0.5 transition-all mt-2" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {/* Create Project Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Neues Projekt erstellen">
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="flex flex-col gap-4">
          {/* 1. Host waehlen */}
          <div className="flex flex-col gap-1">
            <label className="text-label">HOST</label>
            <select
              value={formHostId}
              onChange={(e) => {
                setFormHostId(e.target.value);
                setFormPath('');
                setFormName('');
              }}
              className="input"
              autoFocus
            >
              <option value="">Host waehlen...</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.hostname}){h.isOnline ? '' : ' — offline'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Verzeichnis-Browser (nach Host-Auswahl) */}
          {formHostId && (
            <div className="flex flex-col gap-1">
              <label className="text-label">PROJEKT-VERZEICHNIS</label>
              {formPath ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[#1a2028]" style={{ background: 'var(--bg-overlay)' }}>
                  <FolderOpen size={12} className="text-[#fbbf24] shrink-0" />
                  <code className="text-[12px] text-[#c8d6e5] truncate flex-1">{formPath}</code>
                  <button
                    type="button"
                    onClick={() => { setFormPath(''); setFormName(''); }}
                    className="text-[11px] text-[#4a5a6e] hover:text-[#8a9bb0] transition-colors shrink-0"
                  >
                    Aendern
                  </button>
                </div>
              ) : (
                <DirectoryBrowser
                  hostId={formHostId}
                  onSelect={(path) => {
                    setFormPath(path);
                    // Name aus letztem Verzeichnis-Segment vorschlagen
                    const dirName = path.split('/').filter(Boolean).pop() ?? '';
                    if (!formName && dirName) setFormName(dirName);
                  }}
                />
              )}
            </div>
          )}

          {/* 3. Name (auto-fill vom Verzeichnis) */}
          {formPath && (
            <Input
              label="NAME"
              placeholder="z.B. mein-projekt"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          )}

          {/* 4. Beschreibung */}
          {formPath && (
            <Input
              label="BESCHREIBUNG (OPTIONAL)"
              placeholder="Kurze Beschreibung..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          )}

          {formError && <p className="text-[11px] text-[#f87171]">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creating || !formPath}>
              {creating ? <Spinner size="sm" /> : <Plus size={12} />}
              Erstellen
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
