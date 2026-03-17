'use client';

import { useEffect } from 'react';
import { useCommandPalette } from '@/lib/stores/command-palette';

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
  const commandPalette = useCommandPalette();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping()) return;

      // Escape — Command Palette schliessen
      if (e.key === 'Escape') {
        if (commandPalette.open) {
          commandPalette.setOpen(false);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPalette]);
}
