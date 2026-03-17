'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { cn } from '@/lib/utils';

type Status = 'connecting' | 'connected' | 'disconnected';

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>('connecting');
  const [activeSessions, setActiveSessions] = useState(0);

  useEffect(() => {
    const socket = io('/updates', { reconnectionDelay: 2000 });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));

    socket.on('sessions:state', (payload: { sessions: unknown[] }) => {
      setActiveSessions(payload.sessions?.length ?? 0);
    });

    return () => { socket.disconnect(); };
  }, []);

  const label = status === 'connected' ? 'LIVE' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'status-dot',
            status === 'connected' ? 'active' : status === 'connecting' ? 'idle' : 'offline'
          )}
        />
        <span
          className={cn('text-label', {
            'text-[#34d399]': status === 'connected',
            'text-[#fbbf24]': status === 'connecting',
            'text-[#4a5a6e]': status === 'disconnected',
          })}
        >
          {label}
        </span>
      </div>
      {status === 'connected' && activeSessions > 0 && (
        <>
          <span className="text-[#2d3f52] text-[10px]">·</span>
          <span className="text-label text-[#4a5a6e]">
            {activeSessions} session{activeSessions !== 1 ? 's' : ''}
          </span>
        </>
      )}
    </div>
  );
}
