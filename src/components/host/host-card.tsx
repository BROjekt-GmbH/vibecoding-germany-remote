'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Server, Terminal, ArrowRight, RefreshCw, FolderOpen } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import type { Host } from '@/types';

interface HostCardProps {
  host: Host;
  isOnline: boolean;
  sessionCount: number;
}

export function HostCard({ host, isOnline, sessionCount }: HostCardProps) {
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectResult, setReconnectResult] = useState<'success' | 'error' | null>(null);
  const router = useRouter();

  const handleOpenTerminal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/terminal?hostId=${encodeURIComponent(host.id)}`);
  };

  const handleOpenFiles = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/files?hostId=${encodeURIComponent(host.id)}`);
  };


  const handleReconnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReconnecting(true);
    setReconnectResult(null);

    try {
      const res = await fetch(`/api/hosts/${host.id}/test`, { method: 'POST' });
      const data = await res.json();
      setReconnectResult(data.success ? 'success' : 'error');
    } catch {
      setReconnectResult('error');
    } finally {
      setReconnecting(false);
      setTimeout(() => setReconnectResult(null), 3000);
    }
  };

  return (
    <div
      className="panel hover:border-[#2d3f52] transition-all duration-200 group relative overflow-hidden"
      style={{
        ...(isOnline && {
          boxShadow: '0 0 20px rgba(52, 211, 153, 0.04)',
        }),
      }}
    >
      {/* Status strip */}
      <div
        className="h-[3px] rounded-t-[5px]"
        style={{
          background: isOnline
            ? 'linear-gradient(90deg, var(--green) 0%, var(--cyan) 50%, transparent 100%)'
            : 'var(--border-subtle)',
        }}
      />

      <div className="px-4 pt-3 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center"
              style={{
                background: isOnline ? 'rgba(52, 211, 153, 0.08)' : 'var(--bg-elevated)',
                border: `1px solid ${isOnline ? 'rgba(52, 211, 153, 0.15)' : 'var(--border-default)'}`,
              }}
            >
              <Server
                size={15}
                className={isOnline ? 'text-[#34d399]' : 'text-[#4a5a6e]'}
                style={isOnline ? { filter: 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.4))' } : undefined}
              />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-[#c8d6e5]">{host.name}</h3>
              <p className="text-[11px] text-[#4a5a6e]">{host.hostname}:{host.port}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${isOnline ? 'active' : 'offline'}`} />
            <span
              className={`text-label ${isOnline ? 'text-[#34d399]' : 'text-[#4a5a6e]'}`}
            >
              {isOnline ? 'online' : 'offline'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <Terminal size={11} className="text-[#4a5a6e]" />
            <span className="text-[12px] text-[#8a9bb0]">{sessionCount} sessions</span>
          </div>
        </div>

        {/* Reconnect Button (nur wenn offline) */}
        {!isOnline && (
          <div className="mb-3">
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{
                background: reconnectResult === 'success' ? 'rgba(52, 211, 153, 0.15)' : reconnectResult === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${reconnectResult === 'success' ? 'rgba(52, 211, 153, 0.3)' : reconnectResult === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-default)'}`,
                color: reconnectResult === 'success' ? '#34d399' : reconnectResult === 'error' ? '#ef4444' : '#8a9bb0',
              }}
            >
              {reconnecting ? (
                <>
                  <Spinner size="sm" />
                  Verbinde...
                </>
              ) : reconnectResult === 'success' ? (
                'Verbunden!'
              ) : reconnectResult === 'error' ? (
                'Verbindung fehlgeschlagen'
              ) : (
                <>
                  <RefreshCw size={10} />
                  Reconnect
                </>
              )}
            </button>
          </div>
        )}

        {/* Schnellaktionen — erscheinen beim Hover */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.preventDefault()}
        >
          <button
            type="button"
            title="Terminal oeffnen"
            onClick={handleOpenTerminal}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[#4a5a6e] hover:text-[#22d3ee] hover:bg-[#111519] transition-all duration-150"
          >
            <Terminal size={13} />
          </button>
          <button
            type="button"
            title="Dateien oeffnen"
            onClick={handleOpenFiles}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[#4a5a6e] hover:text-[#22d3ee] hover:bg-[#111519] transition-all duration-150"
          >
            <FolderOpen size={13} />
          </button>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#1a2028]">
          <span className="text-[11px] text-[#2d3f52]">
            {isOnline ? 'last seen just now' : `last seen ${formatRelativeTime(host.lastSeen)}`}
          </span>
          <Link
            href={`/hosts/${host.id}`}
            className="flex items-center gap-1 text-[11px] text-[#4a5a6e] hover:text-[#22d3ee] transition-colors"
          >
            Open <ArrowRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  );
}
