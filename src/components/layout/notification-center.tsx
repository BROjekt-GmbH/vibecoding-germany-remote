'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import type { AlertEvent } from '@/types';

// Schwelle fuer "Frueher"-Sektion (5 Minuten)
const EARLIER_THRESHOLD_MS = 5 * 60 * 1000;

// Severity-Farben fuer den linken Border-Streifen
const SEVERITY_COLOR: Record<AlertEvent['severity'], string> = {
  info: '#22d3ee',
  warning: '#fbbf24',
  error: '#f87171',
  success: '#34d399',
};

// Relative Zeit — kompakt
function formatTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  return `${Math.floor(diffMin / 60)}h`;
}

/**
 * Glocken-Icon mit Badge im Header.
 * Zeigt ein Dropdown mit chronologischer Notification-Liste.
 * Keine DB-Persistenz — alles in React State (via useNotifications).
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Alle Hosts ueberwachen — leeres Array = kein Host-Filter (globaler Subscribe)
  // In der Praxis wuerden hostIds von aussen kommen; fuer v1 reicht der globale Socket
  const { notifications, unreadCount, markAllRead, markRead, loadMore, hasMore } = useNotifications([]);

  // Re-Render-Tick damit formatTime() relative Zeiten aktualisiert (alle 30s)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Dropdown schliessen wenn ausserhalb geklickt
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  function handleItemClick(notification: AlertEvent) {
    markRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    markAllRead();
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger: Glocken-Icon */}
      <button
        onClick={handleToggle}
        className={cn(
          'relative flex items-center justify-center w-7 h-7 rounded-sm',
          'hover:bg-white/5 transition-colors',
          open && 'bg-white/5',
        )}
        aria-label="Benachrichtigungen"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell
          size={15}
          style={{ color: unreadCount > 0 ? '#22d3ee' : '#4a5a6e' }}
        />
        {/* Badge fuer ungelesene Notifications */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold leading-none"
            style={{
              background: '#f87171',
              fontSize: 9,
              minWidth: 14,
              height: 14,
              padding: '0 3px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown-Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 rounded-sm z-50"
          style={{
            background: '#0b0e11',
            border: '1px solid #1a2028',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid #1a2028' }}
          >
            <span className="text-[11px] font-medium tracking-wider uppercase" style={{ color: '#4a5a6e' }}>
              Benachrichtigungen
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] hover:opacity-80 transition-opacity"
                style={{ color: '#22d3ee' }}
              >
                <CheckCheck size={11} />
                Alle gelesen
              </button>
            )}
          </div>

          {/* Notification-Liste */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell size={20} className="mx-auto mb-2" style={{ color: '#2d3f52' }} />
                <p className="text-[11px]" style={{ color: '#4a5a6e' }}>
                  Keine neuen Benachrichtigungen
                </p>
                <p className="text-[10px] mt-1" style={{ color: '#2d3f52' }}>
                  Alerts erscheinen hier automatisch
                </p>
              </div>
            ) : (
              <NotificationList
                notifications={notifications}
                onItemClick={handleItemClick}
                onLoadMore={loadMore}
                hasMore={hasMore}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Liste mit "Frueher"-Trennung und "Mehr laden" ---

interface NotificationListProps {
  notifications: AlertEvent[];
  onItemClick: (notification: AlertEvent) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

function NotificationList({ notifications, onItemClick, onLoadMore, hasMore }: NotificationListProps) {
  const [now, setNow] = useState(0);
  useEffect(() => { queueMicrotask(() => setNow(Date.now())); }, [notifications]);
  const recentItems: AlertEvent[] = [];
  const earlierItems: AlertEvent[] = [];

  for (const n of notifications) {
    if (now === 0 || now - n.timestamp < EARLIER_THRESHOLD_MS) {
      recentItems.push(n);
    } else {
      earlierItems.push(n);
    }
  }

  return (
    <>
      {recentItems.map((n) => (
        <NotificationItem key={n.id} notification={n} onClick={onItemClick} />
      ))}

      {earlierItems.length > 0 && (
        <>
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{ borderTop: '1px solid #1a2028', borderBottom: '1px solid #1a2028' }}
          >
            <span className="text-[9px] font-medium tracking-wider uppercase" style={{ color: '#2d3f52' }}>
              Frueher
            </span>
            <div className="flex-1 h-px" style={{ background: '#1a2028' }} />
          </div>
          {earlierItems.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={onItemClick} />
          ))}
        </>
      )}

      {hasMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-[10px] font-medium hover:bg-[#111519] transition-colors flex items-center justify-center gap-1"
          style={{ color: '#4a5a6e', borderTop: '1px solid #1a2028' }}
        >
          <Loader2 size={10} className="opacity-50" />
          Mehr laden
        </button>
      )}
    </>
  );
}

// --- Internes Item ---

interface NotificationItemProps {
  notification: AlertEvent;
  onClick: (notification: AlertEvent) => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const borderColor = SEVERITY_COLOR[notification.severity];
  const isUnread = !notification.read;

  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        'w-full text-left px-3 py-2.5 border-l-2 transition-colors',
        notification.link ? 'cursor-pointer' : 'cursor-default',
        'hover:bg-[#111519]',
      )}
      style={{
        borderLeftColor: borderColor,
        background: isUnread ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderBottom: '1px solid #111519',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] font-medium leading-tight mb-0.5 truncate"
            style={{ color: isUnread ? '#c8d6e5' : '#8a9bb0' }}
          >
            {notification.title}
          </div>
          <div
            className="text-[10px] leading-snug"
            style={{ color: '#4a5a6e' }}
          >
            {notification.message}
          </div>
        </div>
        <div
          className="flex-shrink-0 text-[9px] mt-0.5"
          style={{ color: '#2d3f52' }}
        >
          {formatTime(notification.timestamp)}
        </div>
      </div>
      {/* Ungelesen-Indikator */}
      {isUnread && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: borderColor }}
        />
      )}
    </button>
  );
}
