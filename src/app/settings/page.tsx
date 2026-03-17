'use client';

import { useState, useEffect } from 'react';
import { Settings, Server, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { HostForm } from '@/components/host/host-form';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { Host } from '@/types';

export default function SettingsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHost, setShowAddHost] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);

  const fetchHosts = async () => {
    try {
      const res = await fetch('/api/hosts');
      if (res.ok) {
        const data = await res.json();
        setHosts(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHosts(); }, []);

  const handleDelete = async (hostId: string, hostName: string) => {
    if (!confirm(`Remove host "${hostName}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/hosts/${hostId}`, { method: 'DELETE' });
      setHosts((prev) => prev.filter((h) => h.id !== hostId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="text-label text-[#4a5a6e] mb-1 flex items-center gap-1.5">
          <Settings size={10} />
          SETTINGS
        </div>
        <h1 className="text-xl font-medium text-[#c8d6e5]">Configuration</h1>
      </div>

      {/* SSH Hosts section */}
      <section className="panel animate-fade-in stagger-1">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2028]">
          <div className="flex items-center gap-2">
            <Server size={13} className="text-[#22d3ee]" />
            <h2 className="text-label">SSH HOSTS</h2>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddHost(true)} id="add-host">
            <Plus size={12} />
            Add Host
          </Button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-[#4a5a6e]">
              <Spinner size="sm" />
              Loading hosts...
            </div>
          ) : hosts.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[#4a5a6e] text-sm">No SSH hosts configured.</p>
              <p className="text-[11px] text-[#2d3f52] mt-1">Add a host to connect to remote tmux sessions.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddHost(true)}
                className="mt-3"
              >
                <Plus size={12} />
                Add first host
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {hosts.map((host, i) => (
                <div
                  key={host.id}
                  className={`panel-elevated px-3 py-2.5 flex items-center justify-between animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`status-dot ${host.isOnline ? 'active' : 'offline'}`} />
                    <div>
                      <p className="text-[13px] text-[#c8d6e5]">{host.name}</p>
                      <p className="text-[11px] text-[#4a5a6e]">
                        {host.username}@{host.hostname}:{host.port}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={host.isOnline ? 'online' : 'offline'}>
                      {host.isOnline ? 'online' : 'offline'}
                    </Badge>
                    <Link href={`/hosts/${host.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="View host"
                      >
                        <ArrowRight size={12} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHost(host)}
                      aria-label="Edit host"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(host.id, host.name)}
                      aria-label="Delete host"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Terminal Preferences */}
      <section className="panel animate-fade-in stagger-2 mt-4">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a2028]">
          <Settings size={13} className="text-[#fbbf24]" />
          <h2 className="text-label">TERMINAL PREFERENCES</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#c8d6e5]">Font Size</p>
              <p className="text-[11px] text-[#4a5a6e]">Terminal emulator font size</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#8a9bb0]">14px</span>
              <span className="text-[10px] text-[#2d3f52]">(configurable per session)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#c8d6e5]">Font Family</p>
              <p className="text-[11px] text-[#4a5a6e]">Monospace font for terminal</p>
            </div>
            <span className="text-[12px] text-[#8a9bb0] font-mono">MesloLGS NF</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#c8d6e5]">Poll Interval</p>
              <p className="text-[11px] text-[#4a5a6e]">Team state refresh rate</p>
            </div>
            <span className="text-[12px] text-[#8a9bb0]">2000ms</span>
          </div>
        </div>
      </section>

      {/* Add Host Dialog */}
      <Dialog
        open={showAddHost}
        onClose={() => setShowAddHost(false)}
        title="Add SSH Host"
      >
        <HostForm
          onSuccess={() => {
            setShowAddHost(false);
            fetchHosts();
          }}
          onCancel={() => setShowAddHost(false)}
        />
      </Dialog>

      {/* Edit Host Dialog */}
      <Dialog
        open={Boolean(editingHost)}
        onClose={() => setEditingHost(null)}
        title={`Edit: ${editingHost?.name}`}
      >
        {editingHost && (
          <HostForm
            host={editingHost}
            onSuccess={() => {
              setEditingHost(null);
              fetchHosts();
            }}
            onCancel={() => setEditingHost(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
