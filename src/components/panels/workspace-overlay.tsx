'use client';

import { useEffect } from 'react';
import { PanelContainer } from './panel-container';
import { MinimizedBar } from './minimized-bar';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { usePanelManager } from '@/lib/stores/panel-manager';

// Zusammenfuehrender Client-Wrapper fuer das floating Panel-System und Command Palette
export function WorkspaceOverlay() {
  useKeyboardShortcuts();

  const hydrate = usePanelManager((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <PanelContainer />
      <MinimizedBar />
      <CommandPalette />
    </>
  );
}
