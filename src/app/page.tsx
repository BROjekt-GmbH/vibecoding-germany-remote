'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Server, Terminal, Activity, ArrowRight, Zap } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useHostStatus } from '@/hooks/use-host-status';
import type { Host, TmuxSession } from '@/types';

interface HostSessionData {
  host: Host;
  sessions: TmuxSession[];
  loaded: boolean;
}

function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export default function DashboardPage() {
  const [hostData, setHostData] = useState<HostSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { getIsOnline } = useHostStatus();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/hosts');
        if (!res.ok || cancelled) return;
        const hosts: Host[] = await res.json();
        if (!Array.isArray(hosts) || cancelled) return;

        // Hosts sofort anzeigen (sessions noch leer)
        const initial = hosts.map((host) => ({ host, sessions: [] as TmuxSession[], loaded: false }));
        setHostData(initial);
        setLoading(false);

        // Sessions im Hintergrund nachladen
        for (const host of hosts) {
          if (cancelled) break;
          if (!host.isOnline) {
            setHostData((prev) => prev.map((d) => d.host.id === host.id ? { ...d, loaded: true } : d));
            continue;
          }
          loadSessions(host.id);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadSessions = async (hostId: string) => {
      let sessions: TmuxSession[] = [];
      try {
        const sr = await fetchWithTimeout(`/api/hosts/${hostId}/sessions`);
        if (sr.ok) {
          const sd = await sr.json();
          sessions = Array.isArray(sd) ? sd : [];
        }
      } catch { /* ignore */ }

      if (!cancelled) {
        setHostData((prev) => prev.map((d) =>
          d.host.id === hostId ? { ...d, sessions, loaded: true } : d
        ));
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const totalSessions = hostData.reduce((sum, d) => sum + d.sessions.length, 0);
  const onlineHosts = hostData.filter((d) => getIsOnline(d.host.id, d.host.isOnline)).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2 text-label text-[#4a5a6e] mb-2">
          <Zap size={10} className="text-[#22d3ee]" />
          COMMAND CENTER
        </div>
        <h1 className="text-xl md:text-2xl font-medium text-[#c8d6e5] tracking-tight">
          Remote Team
        </h1>
        <p className="text-[#4a5a6e] text-sm mt-1">
          tmux sessions · SSH hosts
        </p>
      </div>

      {/* Quick nav tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Hosts', path: '/hosts', icon: Server, description: `${onlineHosts} online`, accent: 'var(--cyan)' },
          { label: 'Terminal', path: '/terminal', icon: Terminal, description: `${totalSessions} sessions`, accent: 'var(--green)' },
          { label: 'Projects', path: '/projects', icon: Activity, description: 'Repository sessions', accent: 'var(--amber)' },
        ].map((tile, i) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.path}
              href={tile.path}
              className={`panel p-4 hover:border-[#2d3f52] transition-all duration-200 group animate-fade-in stagger-${i + 1}`}
            >
              <div
                className="w-9 h-9 flex items-center justify-center rounded-sm mb-3"
                style={{ background: `${tile.accent}18`, border: `1px solid ${tile.accent}30` }}
              >
                <Icon size={16} style={{ color: tile.accent }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#c8d6e5]">{tile.label}</p>
                  <p className="text-[11px] text-[#4a5a6e] mt-0.5">{tile.description}</p>
                </div>
                <ArrowRight size={14} className="text-[#2d3f52] group-hover:text-[#4a5a6e] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 panel p-4 animate-fade-in stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-label">ACTIVE SESSIONS</h2>
            <Link href="/terminal" className="text-[11px] text-[#4a5a6e] hover:text-[#22d3ee] transition-colors flex items-center gap-1">
              All sessions <ArrowRight size={10} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[#4a5a6e] text-sm">
              <Spinner size="sm" />
              Lade Hosts...
            </div>
          ) : hostData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <Terminal size={18} className="text-[#2d3f52]" />
              </div>
              <p className="text-sm text-[#4a5a6e]">No active sessions</p>
              <p className="text-[11px] text-[#2d3f52] mt-1">Add an SSH host to get started</p>
              <Link href="/settings" className="btn btn-ghost text-[12px] mt-4">Add SSH Host</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {hostData.map(({ host, sessions, loaded }) => {
                const online = getIsOnline(host.id, host.isOnline);
                return (
                <div key={host.id} className="panel-elevated px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${online ? 'active' : 'offline'}`} />
                      <span className="text-[13px] text-[#c8d6e5] font-medium">{host.name}</span>
                      <Badge variant={online ? 'online' : 'offline'}>
                        {online ? 'online' : 'offline'}
                      </Badge>
                    </div>
                    <Link href={`/hosts/${host.id}`} className="text-[11px] text-[#4a5a6e] hover:text-[#22d3ee] flex items-center gap-1">
                      Details <ArrowRight size={10} />
                    </Link>
                  </div>
                  {!loaded ? (
                    <div className="flex items-center gap-1.5 mt-1 text-[#4a5a6e]">
                      <Spinner size="sm" />
                      <span className="text-[11px]">Lade Sessions...</span>
                    </div>
                  ) : sessions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {sessions.map((s) => (
                        <Link
                          key={s.name}
                          href={`/terminal/${host.id}?session=${encodeURIComponent(s.name)}`}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-[#8a9bb0] hover:text-[#22d3ee] transition-colors"
                          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
                        >
                          <Terminal size={10} />
                          {s.name}
                          <span className="text-[10px] text-[#4a5a6e]">({s.windows}w)</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#4a5a6e] mt-1">Keine aktiven Sessions</p>
                  )}
                </div>
              ); })}
            </div>
          )}
        </div>

        <div className="panel p-4 animate-fade-in stagger-4">
          <h2 className="text-label mb-4">SYSTEM STATUS</h2>
          <div className="space-y-3">
            {[
              { label: 'WebSocket', status: 'operational', color: '#34d399' },
              { label: 'SSH Pool', status: hostData.some((d) => d.host.isOnline) ? 'active' : 'idle', color: hostData.some((d) => d.host.isOnline) ? '#34d399' : '#fbbf24' },
              { label: 'Database', status: 'operational', color: '#34d399' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[12px] text-[#8a9bb0]">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="status-dot" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                  <span className="text-[11px]" style={{ color: item.color }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1a2028]">
            <div className="flex items-center justify-between text-[11px] text-[#4a5a6e]">
              <span>{hostData.length} Hosts</span>
              <span>{onlineHosts} online</span>
              <span>{totalSessions} Sessions</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
