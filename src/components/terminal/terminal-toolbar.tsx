'use client';

import { Maximize2, ZoomIn, ZoomOut, FolderCode } from 'lucide-react';
import { LayoutSelector } from '@/components/terminal/layout-selector';
import type { TerminalLayout } from '@/hooks/use-terminal-layout';

interface TerminalToolbarProps {
  hostName?: string;
  sessionName?: string;
  cols?: number;
  rows?: number;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  // Layout-Steuerung (optional — nur auf Desktop sichtbar)
  layout?: TerminalLayout;
  onLayoutChange?: (layout: TerminalLayout) => void;
  broadcastMode?: boolean;
  onBroadcastModeChange?: (on: boolean) => void;
}

export function TerminalToolbar({
  hostName,
  sessionName,
  cols,
  rows,
  fontSize,
  onFontSizeChange,
  layout,
  onLayoutChange,
  broadcastMode = false,
  onBroadcastModeChange,
}: TerminalToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-3 h-8 border-t border-[#1a2028] shrink-0"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Left: connection info */}
      <div className="flex items-center gap-3 text-[11px] text-[#4a5a6e]">
        {hostName && (
          <span>
            <span className="text-[#2d3f52]">HOST</span>{' '}
            <span className="text-[#8a9bb0]">{hostName}</span>
          </span>
        )}
        {sessionName && (
          <>
            <span className="text-[#2d3f52]">·</span>
            <span>
              <span className="text-[#2d3f52]">SESSION</span>{' '}
              <span className="text-[#8a9bb0]">{sessionName}</span>
            </span>
          </>
        )}
        {cols && rows && (
          <>
            <span className="text-[#2d3f52]">·</span>
            <span className="text-[#2d3f52]">{cols}×{rows}</span>
          </>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
          className="w-6 h-6 flex items-center justify-center rounded text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#111519] transition-colors"
          title="Decrease font size"
        >
          <ZoomOut size={12} />
        </button>
        <span className="text-[10px] text-[#2d3f52] w-7 text-center">{fontSize}px</span>
        <button
          onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
          className="w-6 h-6 flex items-center justify-center rounded text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#111519] transition-colors"
          title="Increase font size"
        >
          <ZoomIn size={12} />
        </button>
        <div className="w-px h-4 bg-[#1a2028] mx-1" />
        <button
          className="w-6 h-6 flex items-center justify-center rounded text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#111519] transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={12} />
        </button>

        {/* IDE-Toggle */}
        {onLayoutChange && (
          <>
            <div className="w-px h-4 bg-[#1a2028] mx-1" />
            <button
              onClick={() => onLayoutChange(layout === 'ide' ? 'single' : 'ide')}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                layout === 'ide'
                  ? 'text-[#22d3ee] bg-[#0a1a2a]'
                  : 'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#111519]'
              }`}
              title={layout === 'ide' ? 'IDE-Modus deaktivieren' : 'IDE-Modus (Terminal + Files)'}
            >
              <FolderCode size={12} />
            </button>
          </>
        )}

        {/* Layout-Selektor — nur wenn Props vorhanden (Desktop) */}
        {layout && onLayoutChange && onBroadcastModeChange && (
          <>
            <div className="w-px h-4 bg-[#1a2028] mx-1" />
            <LayoutSelector
              currentLayout={layout}
              onLayoutChange={onLayoutChange}
              broadcastMode={broadcastMode}
              onBroadcastModeChange={onBroadcastModeChange}
            />
            {/* Broadcast-Badge */}
            {broadcastMode && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
                style={{ background: '#f97316', color: '#030404' }}
              >
                BROADCAST
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
