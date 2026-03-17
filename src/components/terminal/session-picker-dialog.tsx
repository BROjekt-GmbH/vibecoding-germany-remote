'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Server, Terminal, Plus, LayoutTemplate, Trash2 } from 'lucide-react';
import type { SessionTemplate } from '@/types';
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
  const [activeTab, setActiveTab] = useState<'sessions' | 'templates'>('sessions');
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedHost(null);
    setSessions([]);
    setShowCreate(false);
    setNewName('');
    setError('');
    setActiveTab('sessions');
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

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/terminal/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data.templates) ? data.templates : []);
      }
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  }, []);

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/terminal/templates/${id}`, { method: 'DELETE' });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTabSwitch = (tab: 'sessions' | 'templates') => {
    setActiveTab(tab);
    if (tab === 'templates' && templates.length === 0) loadTemplates();
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
      {/* Tab-Switcher */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => handleTabSwitch('sessions')}
          className={`px-3 py-1.5 text-[12px] transition-colors ${activeTab === 'sessions' ? 'text-[#22d3ee] border-b-2 border-[#22d3ee]' : 'text-[#4a5a6e] hover:text-[#c8d6e5]'}`}
        >
          <Terminal size={12} className="inline mr-1.5 -mt-0.5" />Sessions
        </button>
        <button
          onClick={() => handleTabSwitch('templates')}
          className={`px-3 py-1.5 text-[12px] transition-colors ${activeTab === 'templates' ? 'text-[#22d3ee] border-b-2 border-[#22d3ee]' : 'text-[#4a5a6e] hover:text-[#c8d6e5]'}`}
        >
          <LayoutTemplate size={12} className="inline mr-1.5 -mt-0.5" />Templates
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {loadingTemplates ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Spinner size="sm" />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade Templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Keine Templates vorhanden.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-sm transition-colors hover:bg-[#111519] group"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      if (!selectedHost) return;
                      onSelect(selectedHost.id, selectedHost.name, tpl.name);
                    }}
                    disabled={!selectedHost}
                  >
                    <LayoutTemplate size={12} className="inline mr-2 text-[#22d3ee]" />
                    <span className="text-[12px] text-[#c8d6e5]">{tpl.name}</span>
                    {tpl.description && (
                      <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>{tpl.description}</span>
                    )}
                  </button>
                  <button
                    onClick={() => deleteTemplate(tpl.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#4a5a6e] hover:text-[#f87171] transition-all"
                    title="Template loeschen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {!selectedHost && templates.length > 0 && (
            <p className="text-[11px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              Waehle zuerst einen Host im Sessions-Tab, um ein Template anzuwenden.
            </p>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Spinner size="sm" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade Hosts...</span>
        </div>
      ) : activeTab === 'sessions' && hosts.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Keine Hosts konfiguriert.
        </p>
      ) : activeTab === 'sessions' ? (
        <div className="flex flex-col gap-4">
          {/* Host-Karten */}
          <div className="grid grid-cols-2 gap-2">
            {hosts.map((host) => (
              <button
                key={host.id}
                onClick={() => handleSelectHost(host)}
                disabled={!host.isOnline}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-sm text-left transition-colors ${
                  selectedHost?.id === host.id
                    ? 'ring-1 ring-[#22d3ee] bg-[#0b0e11]'
                    : host.isOnline
                      ? 'hover:bg-[#0b0e11] cursor-pointer'
                      : 'opacity-40 cursor-default'
                }`}
                style={{ border: '1px solid var(--border-default)' }}
              >
                <Server size={13} className={host.isOnline ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#c8d6e5] truncate">{host.name}</p>
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
              <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
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
                        className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors group ${
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
                          <Terminal size={12} className="text-[#22d3ee]" />
                          <div className="flex-1">
                            <span className="text-[12px] text-[#c8d6e5]">{session.name}</span>
                            <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>
                              {session.windows} Window{session.windows !== 1 ? 's' : ''}
                            </span>
                            {alreadyOpen && (
                              <span className="text-[11px] ml-2 text-[#22d3ee]">· geöffnet</span>
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
                  className="flex items-center gap-2 px-3 py-2 mt-2 w-full rounded-sm text-left transition-colors hover:bg-[#111519]"
                  style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}
                >
                  <Plus size={12} />
                  <span className="text-[12px]">Neue Session erstellen</span>
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
      ) : null}
    </Dialog>
  );
}
