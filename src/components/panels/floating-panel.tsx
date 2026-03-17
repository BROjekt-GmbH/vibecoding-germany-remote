'use client';

import { useRef, type ReactNode } from 'react';
import { Rnd } from 'react-rnd';
import { Minus, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePanelManager } from '@/lib/stores/panel-manager';
import type { PanelId, PanelState } from '@/types/panels';
import { PANEL_DEFAULTS } from '@/types/panels';

// ─── Hover-Handler-Helfer ────────────────────────────────────────────────────

function applyHoverStyles(el: HTMLButtonElement, bg: string, color: string) {
  el.style.background = bg;
  el.style.color = color;
}

function onBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  applyHoverStyles(e.currentTarget, 'var(--bg-overlay)', 'var(--text-secondary)');
}

function onBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  applyHoverStyles(e.currentTarget, 'transparent', 'var(--text-muted)');
}

function onCloseEnter(e: React.MouseEvent<HTMLButtonElement>) {
  applyHoverStyles(e.currentTarget, 'var(--red-glow)', 'var(--red)');
}

function onCloseLeave(e: React.MouseEvent<HTMLButtonElement>) {
  applyHoverStyles(e.currentTarget, 'transparent', 'var(--text-muted)');
}

// ─── PanelHeader ────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  id: PanelId;
  title: string;
  icon: ReactNode;
  maximized: boolean;
  isMobile: boolean;
}

function PanelHeader({ id, title, icon, maximized, isMobile }: PanelHeaderProps) {
  const { minimize, maximize, restore, closePanel } = usePanelManager();

  // Touch-Target-Groesse: mindestens 44px auf Mobile (WCAG 2.5.5)
  const btnSize = isMobile ? 'w-11 h-11' : 'w-5 h-5';
  const iconSize = isMobile ? 14 : 12;

  function handleMinimize(e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    minimize(id);
  }

  function handleMaxRestore(e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    if (maximized) {
      restore(id);
    } else {
      maximize(id);
    }
  }

  function handleClose(e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    closePanel(id);
  }

  return (
    <div
      className="panel-drag-handle flex items-center gap-2 select-none"
      style={{
        padding: isMobile ? '10px 12px' : '7px 10px',
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        borderRadius: isMobile ? '12px 12px 0 0' : '3px 3px 0 0',
        cursor: 'grab',
        flexShrink: 0,
      }}
    >
      {/* Symbol + Titel */}
      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span
        className="flex-1 truncate"
        style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
      >
        {title}
      </span>

      {/* Steuerungs-Buttons */}
      <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
        {/* Minimieren */}
        <button
          onClick={handleMinimize}
          onTouchEnd={handleMinimize}
          className={cn(btnSize, 'flex items-center justify-center rounded transition-colors')}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={onBtnEnter}
          onMouseLeave={onBtnLeave}
          title="Minimieren"
          aria-label="Panel minimieren"
        >
          <Minus size={iconSize} />
        </button>

        {/* Maximieren / Wiederherstellen */}
        <button
          onClick={handleMaxRestore}
          onTouchEnd={handleMaxRestore}
          className={cn(btnSize, 'flex items-center justify-center rounded transition-colors')}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={onBtnEnter}
          onMouseLeave={onBtnLeave}
          title={maximized ? 'Wiederherstellen' : 'Maximieren'}
          aria-label={maximized ? 'Panel wiederherstellen' : 'Panel maximieren'}
        >
          {maximized ? <Minimize2 size={iconSize} /> : <Maximize2 size={iconSize} />}
        </button>

        {/* Schliessen */}
        <button
          onClick={handleClose}
          onTouchEnd={handleClose}
          className={cn(btnSize, 'flex items-center justify-center rounded transition-colors')}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={onCloseEnter}
          onMouseLeave={onCloseLeave}
          title="Schliessen"
          aria-label="Panel schliessen"
        >
          <X size={iconSize} />
        </button>
      </div>
    </div>
  );
}

// ─── FloatingPanel ───────────────────────────────────────────────────────────

interface FloatingPanelProps {
  panel: PanelState;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export function FloatingPanel({ panel, title, icon, children }: FloatingPanelProps) {
  const isMobile = useIsMobile();
  const { movePanel, resizePanel, bringToFront, closePanel } = usePanelManager();
  const backdropRef = useRef<HTMLDivElement>(null);

  const defaults = PANEL_DEFAULTS[panel.id];

  if (!panel.open || panel.minimized) return null;

  // ─── Mobile: Bottom-Sheet ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 animate-fade-in"
        style={{ zIndex: panel.zIndex }}
      >
        {/* Hintergrund-Overlay */}
        <div
          ref={backdropRef}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => closePanel(panel.id)}
        />

        {/* Bottom-Sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col animate-fade-in"
          style={{
            maxHeight: '85vh',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px 12px 0 0',
            // Oberhalb der Bottom-Tab-Bar
            marginBottom: 'var(--bottom-bar-height)',
          }}
        >
          {/* Drag-Handle-Indikator */}
          <div className="flex justify-center pt-2 pb-1" style={{ flexShrink: 0 }}>
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-strong)',
              }}
            />
          </div>

          <PanelHeader
            id={panel.id}
            title={title}
            icon={icon}
            maximized={panel.maximized}
            isMobile={true}
          />

          {/* Inhalt */}
          <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ─── Desktop: Maximiert ──────────────────────────────────────────────────
  if (panel.maximized) {
    return (
      <div
        className="fixed animate-fade-in flex flex-col"
        style={{
          top: 'var(--header-height)',
          left: 'var(--sidebar-width)',
          right: 0,
          bottom: 0,
          zIndex: panel.zIndex,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
        onMouseDown={() => bringToFront(panel.id)}
      >
        <PanelHeader
          id={panel.id}
          title={title}
          icon={icon}
          maximized={true}
          isMobile={false}
        />
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {children}
        </div>
      </div>
    );
  }

  // ─── Desktop: Schwebend / Resizable ─────────────────────────────────────
  return (
    <Rnd
      position={{ x: panel.position.x, y: panel.position.y }}
      size={{ width: panel.size.width, height: panel.size.height }}
      minWidth={defaults.minSize.width}
      minHeight={defaults.minSize.height}
      style={{ zIndex: panel.zIndex, pointerEvents: 'auto' }}
      dragHandleClassName="panel-drag-handle"
      onMouseDown={() => bringToFront(panel.id)}
      onDragStop={(_e, d) => {
        movePanel(panel.id, d.x, d.y);
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        resizePanel(panel.id, ref.offsetWidth, ref.offsetHeight);
        movePanel(panel.id, position.x, position.y);
      }}
      enableResizing={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, topLeft: true, bottomRight: true, bottomLeft: true,
      }}
    >
      <div
        className="flex flex-col w-full h-full animate-fade-in"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <PanelHeader
          id={panel.id}
          title={title}
          icon={icon}
          maximized={false}
          isMobile={false}
        />
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {children}
        </div>
      </div>
    </Rnd>
  );
}
