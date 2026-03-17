'use client';

import { FolderOpen, Terminal, FolderKanban, Server, Clock } from 'lucide-react';
import { FloatingPanel } from './floating-panel';
import { usePanelManager } from '@/lib/stores/panel-manager';
import type { PanelId } from '@/types/panels';
import { FilesPanel } from './content/files-panel';

import { TerminalMiniPanel } from './content/terminal-mini-panel';
import { ProjectsPanel } from './content/projects-panel';
import { HostStatusPanel } from './content/host-status-panel';
import { HistoryPanel } from './content/history-panel';

// Konfiguration aller Panel-Typen
const PANEL_CONFIG: Array<{
  id: PanelId;
  title: string;
  icon: React.ReactNode;
}> = [
  { id: 'files',         title: 'Dateien',     icon: <FolderOpen size={14} /> },
  { id: 'terminal-mini', title: 'Terminal',     icon: <Terminal size={14} /> },
  { id: 'projects',      title: 'Projekte',     icon: <FolderKanban size={14} /> },
  { id: 'host-status',   title: 'Host-Status',  icon: <Server size={14} /> },
  { id: 'history',       title: 'Verlauf',      icon: <Clock size={14} /> },
];

// Platzhalter fuer noch nicht implementierte Panel-Inhalte
function PanelPlaceholder({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: 16,
        color: 'var(--text-muted)',
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
      {' '}— Inhalt folgt in Phase 5.
    </div>
  );
}

// Weiterleitung auf den richtigen Inhalt je Panel-Typ
function PanelContent({ id, title }: { id: PanelId; title: string }) {
  switch (id) {
    case 'files':         return <FilesPanel />;
    case 'terminal-mini': return <TerminalMiniPanel />;
    case 'projects':      return <ProjectsPanel />;
    case 'host-status':   return <HostStatusPanel />;
    case 'history':       return <HistoryPanel />;
    default:              return <PanelPlaceholder title={title} />;
  }
}

export function PanelContainer() {
  const panels = usePanelManager((state) => state.panels);

  // Pruefen ob mindestens ein Panel offen und nicht minimiert ist
  const hasVisiblePanel = Object.values(panels).some(
    (p) => p.open && !p.minimized,
  );

  if (!hasVisiblePanel) return null;

  return (
    <div
      className="fixed"
      style={{
        // Unterhalb des Headers, oberhalb der Statusleiste
        top: 'var(--header-height)',
        left: 0,
        right: 0,
        bottom: 'var(--bottom-bar-height)',
        // Kein Abfangen von Events am Container selbst
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      {PANEL_CONFIG.map((config) => {
        const panel = panels[config.id];

        return (
          <FloatingPanel
            key={config.id}
            panel={panel}
            title={config.title}
            icon={config.icon}
          >
            <PanelContent id={config.id} title={config.title} />
          </FloatingPanel>
        );
      })}
    </div>
  );
}
