'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TerminalTab } from '@/components/terminal/terminal-tabs';

interface GridSlotProps {
  slotId: string;
  tabId: string | null;
  tabs: TerminalTab[];
  onAssign: (tabId: string) => void;
  onRemove: () => void;
  broadcastMode: boolean;
  children?: React.ReactNode;
}

export function GridSlot({
  slotId,
  tabId,
  tabs,
  onAssign,
  onRemove,
  broadcastMode,
  children,
}: GridSlotProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown schliessen bei Klick ausserhalb
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Leerer Slot — Placeholder mit Tab-Auswahl
  if (tabId === null) {
    return (
      <div
        className="relative flex flex-col items-center justify-center gap-3 h-full"
        style={{
          background: '#060809',
          border: '1px dashed #1a2028',
        }}
        aria-label={`Leerer Terminal-Slot ${slotId}`}
      >
        <Terminal size={20} className="text-[#4a5a6e]" />
        <p className="text-[11px] text-[#4a5a6e]">Kein Terminal zugewiesen</p>

        {/* Tab-Zuweisung Dropdown */}
        {tabs.length > 0 ? (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded text-[11px] transition-colors',
                'border border-[#1a2028] text-[#8a9bb0] hover:text-[#22d3ee] hover:border-[#22d3ee]'
              )}
              style={{ background: '#0b0e11' }}
            >
              Terminal zuweisen
              <ChevronDown size={11} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-56 rounded border border-[#1a2028] z-50 overflow-hidden"
                style={{ background: '#0b0e11' }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onAssign(tab.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#8a9bb0] hover:bg-[#111519] hover:text-[#c8d6e5] transition-colors text-left"
                  >
                    <Terminal size={11} className="text-[#4a5a6e] shrink-0" />
                    <span className="truncate">
                      {tab.hostName}:{tab.sessionName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-[#2d3f52]">Keine offenen Tabs</p>
        )}
      </div>
    );
  }

  // Belegter Slot — Terminal anzeigen mit Broadcast-Rahmen
  return (
    <div
      className={cn(
        'relative h-full',
        broadcastMode && 'ring-1 ring-[#f97316]'
      )}
    >
      {/* Entfernen-Button oben rechts */}
      <button
        onClick={onRemove}
        className={cn(
          'absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center rounded',
          'text-[#4a5a6e] hover:text-[#f87171] hover:bg-[#1a2028] opacity-0 hover:opacity-100',
          'transition-all group-hover:opacity-100'
        )}
        style={{
          // Immer sichtbar per CSS-Hover auf dem Parent
          opacity: undefined,
        }}
        title="Terminal aus Slot entfernen"
        aria-label="Terminal aus Slot entfernen"
      >
        <X size={10} />
      </button>

      {/* Broadcast-Indikator */}
      {broadcastMode && (
        <div
          className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
          style={{ background: '#f97316', color: '#030404' }}
        >
          BROADCAST
        </div>
      )}

      {/* Terminal-Inhalt */}
      {children}
    </div>
  );
}
