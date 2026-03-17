'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './use-socket';

export interface HostStatusInfo {
  isOnline: boolean;
  lastSeen: string;
  nextRetryIn?: number;
}

/**
 * Listet auf `host:status` Events vom /updates Namespace.
 * Gibt eine Map<hostId, HostStatusInfo> zurueck und eine Merge-Funktion
 * fuer initiale Daten.
 */
export function useHostStatus() {
  const { socketRef, connected } = useSocket('/updates');
  const [statusMap, setStatusMap] = useState<Map<string, HostStatusInfo>>(new Map());

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handler = (data: { hostId: string; isOnline: boolean; lastSeen: string; nextRetryIn?: number }) => {
      setStatusMap((prev) => {
        const next = new Map(prev);
        next.set(data.hostId, {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
          nextRetryIn: data.nextRetryIn,
        });
        return next;
      });
    };

    s.on('host:status', handler);
    return () => { s.off('host:status', handler); };
  }, [socketRef, connected]);

  /** Hilfsfunktion: isOnline aus Live-Status oder Fallback */
  const getIsOnline = useCallback(
    (hostId: string, fallback: boolean): boolean => {
      const live = statusMap.get(hostId);
      return live !== undefined ? live.isOnline : fallback;
    },
    [statusMap],
  );

  return { statusMap, getIsOnline };
}
