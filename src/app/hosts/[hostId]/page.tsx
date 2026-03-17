'use client';

import { use, useState, useEffect } from 'react';
import { Server, Terminal, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SessionList } from '@/components/host/session-list';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useHostStatus } from '@/hooks/use-host-status';
import type { Host } from '@/types';

interface Props {
  params: Promise<{ hostId: string }>;
}

export default function HostDetailPage({ params }: Props) {
  const { hostId } = use(params);
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { getIsOnline } = useHostStatus();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/hosts/${hostId}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setHost(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [hostId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-16 gap-2 text-[#4a5a6e]">
          <Spinner size="sm" />
          <span className="text-sm">Lade Host...</span>
        </div>
      </div>
    );
  }

  if (notFound || !host) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link
          href="/hosts"
          className="flex items-center gap-1.5 text-[12px] text-[#4a5a6e] hover:text-[#8a9bb0] mb-5 transition-colors"
        >
          <ArrowLeft size={12} />
          All hosts
        </Link>
        <div className="panel p-12 text-center">
          <p className="text-sm text-[#4a5a6e]">Host nicht gefunden.</p>
        </div>
      </div>
    );
  }

  const isOnline = getIsOnline(host.id, host.isOnline);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/hosts"
        className="flex items-center gap-1.5 text-[12px] text-[#4a5a6e] hover:text-[#8a9bb0] mb-5 transition-colors animate-fade-in"
      >
        <ArrowLeft size={12} />
        All hosts
      </Link>

      {/* Host header */}
      <div className="panel p-4 mb-4 animate-fade-in stagger-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            >
              <Server size={18} className={isOnline ? 'text-[#34d399]' : 'text-[#4a5a6e]'} />
            </div>
            <div>
              <h1 className="text-lg font-medium text-[#c8d6e5]">{host.name}</h1>
              <p className="text-[12px] text-[#4a5a6e]">
                {host.username}@{host.hostname}:{host.port}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'online' : 'offline'}>
              {isOnline ? 'online' : 'offline'}
            </Badge>
          </div>
        </div>
      </div>

      {/* tmux Sessions */}
      <div className="panel p-4 animate-fade-in stagger-2">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={13} className="text-[#22d3ee]" />
          <h2 className="text-label">TMUX SESSIONS</h2>
        </div>
        <SessionList hostId={hostId} />
      </div>
    </div>
  );
}
