'use client';

import { useState, useEffect } from 'react';
import { Server, Plus } from 'lucide-react';
import Link from 'next/link';
import { HostCard } from '@/components/host/host-card';
import { Spinner } from '@/components/ui/spinner';
import { useHostStatus } from '@/hooks/use-host-status';
import type { Host, TmuxSession } from '@/types';

interface HostCounts {
  sessionCount: number;
}

function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export default function HostsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [counts, setCounts] = useState<Record<string, HostCounts>>({});
  const [loading, setLoading] = useState(true);
  const { getIsOnline } = useHostStatus();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/hosts');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const hostList: Host[] = Array.isArray(data) ? data : [];
        setHosts(hostList);
        setLoading(false);

        // Counts im Hintergrund nachladen
        for (const host of hostList) {
          if (!host.isOnline || cancelled) {
            if (!cancelled) setCounts((prev) => ({ ...prev, [host.id]: { sessionCount: 0 } }));
            continue;
          }
          loadCounts(host.id, cancelled);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadCounts = async (hostId: string, isCancelled: boolean) => {
      let sessionCount = 0;

      try {
        const sessRes = await fetchWithTimeout(`/api/hosts/${hostId}/sessions`).catch(() => null);

        if (sessRes?.ok) {
          const sd = await sessRes.json();
          const sessions: TmuxSession[] = Array.isArray(sd) ? sd : [];
          sessionCount = sessions.length;
        }
      } catch { /* ignore */ }

      if (!isCancelled) {
        setCounts((prev) => ({ ...prev, [hostId]: { sessionCount } }));
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <div className="text-label text-[#4a5a6e] mb-1 flex items-center gap-1.5">
            <Server size={10} />
            SSH HOSTS
          </div>
          <h1 className="text-xl font-medium text-[#c8d6e5]">Hosts</h1>
        </div>
        <Link href="/settings#add-host" className="btn btn-primary">
          <Plus size={13} />
          Add Host
        </Link>
      </div>

      {/* Host grid */}
      {loading ? (
        <div className="panel p-12 flex items-center justify-center gap-2 animate-fade-in stagger-1">
          <Spinner size="sm" />
          <span className="text-[#4a5a6e] text-sm">Lade Hosts...</span>
        </div>
      ) : hosts.length === 0 ? (
        <div className="panel p-12 flex flex-col items-center text-center animate-fade-in stagger-1">
          <div
            className="w-12 h-12 rounded-sm flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <Server size={20} className="text-[#2d3f52]" />
          </div>
          <h2 className="text-sm font-medium text-[#8a9bb0]">No hosts configured</h2>
          <p className="text-[12px] text-[#4a5a6e] mt-1 max-w-xs">
            Add an SSH host to start managing tmux sessions.
          </p>
          <Link href="/settings" className="btn btn-primary mt-4">
            <Plus size={13} />
            Add your first host
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hosts.map((host, i) => (
            <div key={host.id} className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
              <HostCard
                host={host}
                isOnline={getIsOnline(host.id, host.isOnline)}
                sessionCount={counts[host.id]?.sessionCount ?? 0}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
