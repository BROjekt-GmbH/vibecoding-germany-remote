'use client';

import { FolderOpen, Terminal, FolderKanban, Server, Clock } from 'lucide-react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import { useIsMobile } from '@/hooks/use-mobile';
import type { PanelId } from '@/types/panels';

// Symbole je Panel-ID
const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  'files':         <FolderOpen size={14} />,
  'terminal-mini': <Terminal size={14} />,
  'projects':      <FolderKanban size={14} />,
  'host-status':   <Server size={14} />,
  'history':       <Clock size={14} />,
};

// Titel je Panel-ID
const PANEL_TITLES: Record<PanelId, string> = {
  'files':         'Dateien',
  'terminal-mini': 'Terminal',
  'projects':      'Projekte',
  'host-status':   'Host-Status',
  'history':       'Verlauf',
};

export function MinimizedBar() {
  const panels = usePanelManager((state) => state.panels);
  const restore = usePanelManager((state) => state.restore);
  const isMobile = useIsMobile();

  // Nur minimierte Panels anzeigen
  const minimizedPanels = Object.values(panels).filter((p) => p.open && p.minimized);

  if (minimizedPanels.length === 0) return null;

  // Positionierung: oberhalb der Bottom-Tab-Bar auf Mobile, ansonsten direkt am Boden
  return (
    <div
      className="fixed left-0 right-0 flex items-center gap-1 flex-wrap"
      style={{
        bottom: 'var(--bottom-bar-height)',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        padding: isMobile ? '4px 8px' : '2px 8px',
        zIndex: 50,
      }}
    >
      {minimizedPanels.map((panel) => {
        const id = panel.id as PanelId;
        return (
          <button
            key={id}
            onClick={() => restore(id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              // Touch-Targets: Mobile groesser, Desktop kleiner
              padding: isMobile ? '8px 12px' : '4px 8px',
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-default)',
              borderRadius: 3,
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: isMobile ? 44 : undefined,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}
            title={`${PANEL_TITLES[id]} wiederherstellen`}
            aria-label={`${PANEL_TITLES[id]} wiederherstellen`}
          >
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {PANEL_ICONS[id]}
            </span>
            <span>{PANEL_TITLES[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
