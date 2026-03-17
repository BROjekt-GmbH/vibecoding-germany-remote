'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlertEvent } from '@/types';

// Maximale Anzahl gleichzeitig sichtbarer Toasts
const MAX_VISIBLE_TOASTS = 3;

// Auto-dismiss nach 5 Sekunden
const AUTO_DISMISS_MS = 5000;

// Severity-Farben (Border-Farbe)
const SEVERITY_BORDER: Record<AlertEvent['severity'], string> = {
  info: '#22d3ee',
  warning: '#fbbf24',
  error: '#f87171',
  success: '#34d399',
};

// Interner Toast-Typ mit generierter ID
interface ToastEntry extends Omit<AlertEvent, 'id' | 'read'> {
  id: string;
}

// Context-Typ
interface ToastContextValue {
  addToast: (toast: Omit<AlertEvent, 'id' | 'read'>) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

// Eindeutige ID generieren
function generateToastId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Provider — verwaltet Toast-Liste und stellt addToast bereit */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const addToast = useCallback((toast: Omit<AlertEvent, 'id' | 'read'>) => {
    const entry: ToastEntry = { ...toast, id: generateToastId() };
    setToasts((prev) => {
      // Maximal MAX_VISIBLE_TOASTS gleichzeitig — aelteste entfernen
      const next = [...prev, entry];
      if (next.length > MAX_VISIBLE_TOASTS) {
        return next.slice(next.length - MAX_VISIBLE_TOASTS);
      }
      return next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/** Hook fuer Komponenten die Toasts auslösen möchten */
export function useToast() {
  return useContext(ToastContext);
}

// --- Interne Komponenten ---

interface ToastContainerProps {
  toasts: ToastEntry[];
  onRemove: (id: string) => void;
}

/** Rendert den Toast-Stack oben rechts */
function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Benachrichtigungen"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastEntry;
  onRemove: (id: string) => void;
}

/** Einzelner Toast — slide-in von rechts, auto-dismiss nach 5s */
function ToastItem({ toast, onRemove }: ToastItemProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borderColor = SEVERITY_BORDER[toast.severity];

  // Slide-in nach Mount triggern
  useEffect(() => {
    // Kleines Delay damit die CSS-Transition greift
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss nach AUTO_DISMISS_MS
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      // Kurz warten bis Slide-out-Animation fertig
      setTimeout(() => onRemove(toast.id), 300);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onRemove]);

  function handleClick() {
    if (toast.link) {
      router.push(toast.link);
    }
    onRemove(toast.id);
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  }

  return (
    <div
      role="alert"
      onClick={toast.link ? handleClick : undefined}
      className={cn(
        'pointer-events-auto w-80 rounded-lg shadow-lg shadow-black/50',
        'transition-all duration-300 ease-out',
        toast.link && 'cursor-pointer',
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
      )}
      style={{
        background: '#0b0e11',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 12px ${borderColor}20`,
      }}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Severity-Indikator (linker Streifen) */}
        <div
          className="mt-0.5 w-1 h-1 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: borderColor, width: 6, height: 6 }}
        />

        {/* Inhalt */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[12px] font-medium leading-none mb-1 truncate"
            style={{ color: '#c8d6e5' }}
          >
            {toast.title}
          </div>
          <div
            className="text-[11px] leading-snug"
            style={{ color: '#8a9bb0' }}
          >
            {toast.message}
          </div>
        </div>

        {/* Schliessen-Button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-0.5 rounded-sm hover:bg-white/5 transition-colors"
          aria-label="Benachrichtigung schliessen"
        >
          <X size={12} style={{ color: '#4a5a6e' }} />
        </button>
      </div>
    </div>
  );
}
