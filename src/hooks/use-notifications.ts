'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AlertEvent } from '@/types';
import { useToast } from '@/components/layout/toast';

// Maximale Anzahl gespeicherter Notifications (FIFO)
const MAX_NOTIFICATIONS = 50;

// Payload-Typ des Socket-Events
interface NotificationsAlertPayload {
  hostId: string;
  alerts: AlertEvent[];
}

export interface UseNotificationsResult {
  notifications: AlertEvent[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  loadMore: () => void;
  hasMore: boolean;
}

/**
 * Zentraler Hook fuer das Notification-System.
 *
 * - Subscribed auf 'notifications:alert' Socket-Events fuer alle hostIds
 * - Verwaltet Notification-Liste (max 50, FIFO — neueste zuerst)
 * - Triggert Toasts fuer neue Alerts
 * - Triggert Browser-Push wenn das Tab im Hintergrund ist
 *
 * @param hostIds - Liste der Host-IDs die ueberwacht werden sollen
 */
export function useNotifications(hostIds: string[]): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AlertEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const { addToast } = useToast();

  // Stabile Referenz auf hostIds um useEffect nicht bei jedem Render neu zu starten
  const hostIdsRef = useRef<string[]>(hostIds);
  useEffect(() => {
    hostIdsRef.current = hostIds;
  }, [hostIds]);

  useEffect(() => {
    const socket = io('/updates', {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Host-Raeume subscriben nach (Re-)Connect
      for (const hostId of hostIdsRef.current) {
        socket.emit('subscribe:host', hostId);
      }
    });

    socket.on('notifications:alert', (payload: NotificationsAlertPayload) => {
      const { alerts } = payload;
      if (!alerts || alerts.length === 0) return;

      // Notifications zur Liste hinzufuegen (neueste zuerst, max MAX_NOTIFICATIONS)
      setNotifications((prev) => {
        const combined = [...alerts, ...prev];
        return combined.slice(0, MAX_NOTIFICATIONS);
      });

      // Toast und Browser-Push fuer jede neue Notification
      for (const alert of alerts) {
        // Toast anzeigen
        addToast({
          type: alert.type,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          timestamp: alert.timestamp,
          link: alert.link,
        });

        // Browser-Push wenn Tab im Hintergrund
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted' &&
          document.hidden
        ) {
          try {
            new Notification(alert.title, {
              body: alert.message,
              icon: '/apple-touch-icon.png',
            });
          } catch {
            // Browser-Push nicht kritisch — Fehler ignorieren
          }
        }
      }
    });

    // Persistierte Alerts aus DB laden
    fetch('/api/notifications?read=false&limit=50')
      .then(r => r.json())
      .then(data => {
        if (data.alerts?.length) {
          setNotifications(prev => {
            // DB-Alerts hinten anfuegen, Duplikate vermeiden
            const existingIds = new Set(prev.map(n => n.id));
            const newAlerts = (data.alerts as Record<string, unknown>[])
              .filter((a) => !existingIds.has(a.id as string))
              .map((a) => ({
                id: a.id as string,
                type: a.type as AlertEvent['type'],
                title: (a.message as string).split(': ')[0] ?? 'Alert',
                message: (a.message as string).split(': ').slice(1).join(': ') ?? '',
                severity: a.severity as AlertEvent['severity'],
                timestamp: new Date(a.createdAt as string).getTime(),
                read: !!a.readAt,
                link: (a.metadata as Record<string, unknown>)?.link as string | undefined,
              }));
            return [...prev, ...newAlerts].slice(0, MAX_NOTIFICATIONS);
          });
        }
      })
      .catch(() => {}); // DB nicht verfuegbar = kein Problem

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Intentionally keine hostIds Abhaengigkeit — Re-Subscribe passiert via connect-Event und separaten useEffect
  }, [addToast]);

  // Neu subscriben wenn sich hostIds aendern
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    for (const hostId of hostIds) {
      socket.emit('subscribe:host', hostId);
    }
  }, [hostIds]);

  // Pagination fuer aeltere Alerts aus der DB
  const [offset, setOffset] = useState(MAX_NOTIFICATIONS);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(() => {
    fetch(`/api/notifications?limit=${MAX_NOTIFICATIONS}&offset=${offset}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.alerts?.length) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newAlerts = (data.alerts as Record<string, unknown>[])
              .filter((a) => !existingIds.has(a.id as string))
              .map((a) => ({
                id: a.id as string,
                type: a.type as AlertEvent['type'],
                title: (a.message as string).split(': ')[0] ?? 'Alert',
                message: (a.message as string).split(': ').slice(1).join(': ') ?? '',
                severity: a.severity as AlertEvent['severity'],
                timestamp: new Date(a.createdAt as string).getTime(),
                read: !!a.readAt,
                link: (a.metadata as Record<string, unknown>)?.link as string | undefined,
              }));
            return [...prev, ...newAlerts];
          });
          setOffset((prev) => prev + MAX_NOTIFICATIONS);
          if (data.alerts.length < MAX_NOTIFICATIONS) {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }
      })
      .catch(() => {});
  }, [offset]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    // DB-Persist fire-and-forget
    fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // DB-Persist fire-and-forget
    fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, markRead, loadMore, hasMore };
}
