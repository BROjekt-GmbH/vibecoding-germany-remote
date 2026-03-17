'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(namespace: string): {
  socketRef: React.RefObject<Socket | null>;
  connected: boolean;
  error: string | null;
} {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = io(namespace, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('connect_error', (err) => {
      setError(err.message);
      setConnected(false);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [namespace]);

  return { socketRef, connected, error };
}
