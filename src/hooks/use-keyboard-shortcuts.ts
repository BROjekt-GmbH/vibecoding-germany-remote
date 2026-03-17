'use client';

import { useEffect } from 'react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import { useCommandPalette } from '@/lib/stores/command-palette';
import type { PanelId } from '@/types/panels';

// Mapping Ctrl+1..4 auf Panel-IDs
const SHORTCUT_PANELS: Record<string, PanelId> = {
  '1': 'files',
  '2': 'terminal-mini',
};

// Prueft ob der Fokus in einem Eingabefeld liegt
function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts() {
  const { togglePanel, minimizeAll, panels, closePanel } = usePanelManager();
  const commandPalette = useCommandPalette();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping()) return;

      // Ctrl+B — Sidebar umschalten
      if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        const stored = localStorage.getItem('sidebar-collapsed');
        const next = stored !== 'true';
        localStorage.setItem('sidebar-collapsed', String(next));
        // Sidebar liest localStorage beim naechsten Render; Event ausloesen
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
        return;
      }

      // Ctrl+1..4 — Panel umschalten
      if (e.ctrlKey && !e.shiftKey && SHORTCUT_PANELS[e.key]) {
        e.preventDefault();
        togglePanel(SHORTCUT_PANELS[e.key]);
        return;
      }

      // Ctrl+Shift+M — alle Panels minimieren
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        minimizeAll();
        return;
      }

      // Escape — Command Palette schliessen oder oberstes Panel schliessen
      if (e.key === 'Escape') {
        if (commandPalette.open) {
          commandPalette.setOpen(false);
          return;
        }
        // Oberstes offenes, nicht-minimiertes Panel finden (hoechster zIndex)
        const topPanel = Object.values(panels)
          .filter((p) => p.open && !p.minimized)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        if (topPanel) {
          closePanel(topPanel.id);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel, minimizeAll, closePanel, panels, commandPalette]);
}
