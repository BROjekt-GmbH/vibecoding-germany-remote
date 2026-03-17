'use client';

import { useRef, useState, useEffect } from 'react';
import { Grid2x2, Columns2, Rows2, Square, Radio, PanelLeftDashed } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { TerminalLayout } from '@/hooks/use-terminal-layout';

interface LayoutOption {
  value: TerminalLayout;
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    value: 'single',
    label: 'Einzeln',
    description: 'Ein Terminal',
    Icon: Square,
  },
  {
    value: 'split-h',
    label: 'Horizontal',
    description: 'Zwei Terminals nebeneinander',
    Icon: Columns2,
  },
  {
    value: 'split-v',
    label: 'Vertikal',
    description: 'Zwei Terminals uebereinander',
    Icon: Rows2,
  },
  {
    value: 'quad',
    label: 'Quad',
    description: 'Vier Terminals (2x2)',
    Icon: Grid2x2,
  },
  {
    value: 'ide',
    label: 'IDE',
    description: 'Terminal + File-Browser + Editor',
    Icon: PanelLeftDashed,
  },
];

interface LayoutSelectorProps {
  currentLayout: TerminalLayout;
  onLayoutChange: (layout: TerminalLayout) => void;
  broadcastMode: boolean;
  onBroadcastModeChange: (on: boolean) => void;
}

export function LayoutSelector({
  currentLayout,
  onLayoutChange,
  broadcastMode,
  onBroadcastModeChange,
}: LayoutSelectorProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dropdown schliessen beim Klick ausserhalb
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentOption =
    LAYOUT_OPTIONS.find((o) => o.value === currentLayout) ?? LAYOUT_OPTIONS[0];
  const CurrentIcon = currentOption.Icon;

  return (
    <div ref={containerRef} className="relative">
      {/* Toolbar-Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-6 h-6 flex items-center justify-center rounded transition-colors',
          open
            ? 'text-[#22d3ee] bg-[#0a1a2a]'
            : 'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#111519]'
        )}
        title="Terminal-Layout waehlen"
      >
        <CurrentIcon size={12} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-1 w-52 rounded border border-[#1a2028] z-50 overflow-hidden"
          style={{ background: '#0b0e11' }}
        >
          {/* Layout-Optionen */}
          {LAYOUT_OPTIONS
            .filter((option) => !(option.value === 'ide' && isMobile))
            .map((option) => {
            const Icon = option.Icon;
            const isActive = currentLayout === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onLayoutChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors text-left',
                  isActive
                    ? 'text-[#22d3ee] bg-[#0a1a2a]'
                    : 'text-[#8a9bb0] hover:bg-[#111519] hover:text-[#c8d6e5]'
                )}
              >
                <Icon
                  size={13}
                  className={isActive ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'}
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-[10px] text-[#4a5a6e]">
                    {option.description}
                  </span>
                </div>
                {isActive && (
                  <span className="ml-auto text-[10px] text-[#22d3ee]">✓</span>
                )}
              </button>
            );
          })}

          {/* Trennlinie */}
          <div className="border-t border-[#1a2028] mx-2" />

          {/* Broadcast-Mode Toggle */}
          <button
            onClick={() => {
              onBroadcastModeChange(!broadcastMode);
              setOpen(false);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors text-left',
              broadcastMode
                ? 'text-[#f97316] bg-[#1a0a00]'
                : 'text-[#8a9bb0] hover:bg-[#111519] hover:text-[#c8d6e5]'
            )}
          >
            <Radio
              size={13}
              className={broadcastMode ? 'text-[#f97316]' : 'text-[#4a5a6e]'}
            />
            <div className="flex flex-col leading-tight">
              <span className="font-medium">Broadcast</span>
              <span className="text-[10px] text-[#4a5a6e]">
                Eingabe an alle Terminals
              </span>
            </div>
            {broadcastMode && (
              <span className="ml-auto text-[10px] text-[#f97316]">AN</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
