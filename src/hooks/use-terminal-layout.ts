'use client';

import { useState, useCallback } from 'react';

// Verfuegbare Layout-Typen fuer das Terminal-Grid
export type TerminalLayout = 'single' | 'split-h' | 'split-v' | 'quad' | 'ide';

export interface LayoutSlot {
  id: string;         // Slot-ID: slot-0, slot-1, etc.
  tabId: string | null; // Zugewiesener Terminal-Tab oder null (leer)
}

export interface TerminalLayoutState {
  layout: TerminalLayout;
  slots: LayoutSlot[];
  setLayout: (layout: TerminalLayout) => void;
  assignTab: (slotId: string, tabId: string) => void;
  removeTab: (slotId: string) => void;
  broadcastMode: boolean;
  setBroadcastMode: (on: boolean) => void;
}

// Anzahl der Slots pro Layout
const SLOT_COUNT: Record<TerminalLayout, number> = {
  single: 1,
  'split-h': 2,
  'split-v': 2,
  quad: 4,
  ide: 1,
};

// Erstellt leere Slots fuer ein gegebenes Layout
function createSlots(count: number): LayoutSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slot-${i}`,
    tabId: null,
  }));
}

// Passt bestehende Slot-Zuweisungen an neues Layout an (erhalt so viele wie moeglich)
function migrateSlots(
  currentSlots: LayoutSlot[],
  newCount: number
): LayoutSlot[] {
  const newSlots = createSlots(newCount);
  for (let i = 0; i < newCount; i++) {
    if (currentSlots[i]) {
      newSlots[i] = { id: `slot-${i}`, tabId: currentSlots[i].tabId };
    }
  }
  return newSlots;
}

const STORAGE_KEY = 'terminal-layout';

export function useTerminalLayout(
  initialLayout: TerminalLayout = 'single'
): TerminalLayoutState {
  // Layout aus localStorage laden (falls vorhanden)
  const [layout, setLayoutState] = useState<TerminalLayout>(() => {
    if (typeof window === 'undefined') return initialLayout;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (
      stored === 'single' ||
      stored === 'split-h' ||
      stored === 'split-v' ||
      stored === 'quad' ||
      stored === 'ide'
    ) {
      return stored;
    }
    return initialLayout;
  });

  const [slots, setSlots] = useState<LayoutSlot[]>(() => {
    const count = SLOT_COUNT[
      (() => {
        if (typeof window === 'undefined') return initialLayout;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (
          stored === 'single' ||
          stored === 'split-h' ||
          stored === 'split-v' ||
          stored === 'quad'
        ) {
          return stored;
        }
        return initialLayout;
      })()
    ];
    return createSlots(count);
  });

  const [broadcastMode, setBroadcastModeState] = useState(false);

  // Layout aendern und bestehende Zuweisungen migrieren
  const setLayout = useCallback((newLayout: TerminalLayout) => {
    setLayoutState(newLayout);
    localStorage.setItem(STORAGE_KEY, newLayout);
    const newCount = SLOT_COUNT[newLayout];
    setSlots((prev) => migrateSlots(prev, newCount));
  }, []);

  // Tab einem Slot zuweisen
  const assignTab = useCallback((slotId: string, tabId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, tabId } : slot
      )
    );
  }, []);

  // Tab aus einem Slot entfernen
  const removeTab = useCallback((slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, tabId: null } : slot
      )
    );
  }, []);

  const setBroadcastMode = useCallback((on: boolean) => {
    setBroadcastModeState(on);
  }, []);

  return {
    layout,
    slots,
    setLayout,
    assignTab,
    removeTab,
    broadcastMode,
    setBroadcastMode,
  };
}
