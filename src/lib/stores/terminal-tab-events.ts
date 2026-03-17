import { create } from 'zustand';

export interface PendingTab {
  hostId: string;
  sessionName: string;
  pane: string;
}

interface TerminalTabEventsState {
  /** Tab, der von extern erstellt wurde und in die Terminal-Seite eingefuegt werden soll */
  pendingTab: PendingTab | null;
  /** Setzt einen pending Tab (z.B. aus dem Files-Panel) */
  requestTab: (tab: PendingTab) => void;
  /** Terminal-Seite konsumiert den pending Tab */
  consumeTab: () => PendingTab | null;
}

export const useTerminalTabEvents = create<TerminalTabEventsState>((set, get) => ({
  pendingTab: null,

  requestTab: (tab) => set({ pendingTab: tab }),

  consumeTab: () => {
    const tab = get().pendingTab;
    if (tab) set({ pendingTab: null });
    return tab;
  },
}));
