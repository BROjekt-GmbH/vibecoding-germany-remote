import { create } from 'zustand';
import type { PanelId, PanelState } from '@/types/panels';
import { PANEL_DEFAULTS } from '@/types/panels';

// Gespeichertes Panel-State-Format
interface SavedPanelEntry {
  position: { x: number; y: number };
  size: { width: number; height: number };
  open: boolean;
}

// Debounce-Timer fuer savePanelState
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function savePanelState(panels: Record<PanelId, PanelState>) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const payload: Record<string, SavedPanelEntry> = {};
    for (const [id, p] of Object.entries(panels) as [PanelId, PanelState][]) {
      payload[id] = { position: p.position, size: p.size, open: p.open };
    }
    fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { panels: payload } }),
    }).catch(() => {
      // Fehler beim Speichern — still ignorieren, kein kritischer Pfad
    });
  }, 500);
}

export async function loadPanelState(): Promise<Partial<Record<PanelId, SavedPanelEntry>> | null> {
  try {
    const res = await fetch('/api/preferences');
    if (!res.ok) return null;
    const data = await res.json();
    const panels = data?.settings?.panels;
    if (panels && typeof panels === 'object') {
      return panels as Partial<Record<PanelId, SavedPanelEntry>>;
    }
    return null;
  } catch {
    return null;
  }
}

// Maximale Anzahl gleichzeitig geoeffneter Panels
const MAX_OPEN_PANELS = 4;

// Basis-Z-Index fuer Panels
const BASE_Z_INDEX = 100;

interface PanelManagerState {
  panels: Record<PanelId, PanelState>;

  // Panel oeffnen (respektiert MAX_OPEN_PANELS)
  openPanel: (id: PanelId) => void;

  // Panel schliessen
  closePanel: (id: PanelId) => void;

  // Panel umschalten (oeffnen/schliessen)
  togglePanel: (id: PanelId) => void;

  // Panel verschieben (Drag)
  movePanel: (id: PanelId, x: number, y: number) => void;

  // Panel groesse aendern (Resize)
  resizePanel: (id: PanelId, width: number, height: number) => void;

  // Panel in den Vordergrund bringen
  bringToFront: (id: PanelId) => void;

  // Panel minimieren
  minimize: (id: PanelId) => void;

  // Panel maximieren
  maximize: (id: PanelId) => void;

  // Panel wiederherstellen (aus minimiert/maximiert)
  restore: (id: PanelId) => void;

  // Alle Panels schliessen
  closeAll: () => void;

  // Alle Panels minimieren
  minimizeAll: () => void;

  // Liste der offenen, nicht-minimierten Panels
  getOpenPanels: () => PanelState[];

  // Gespeicherten Zustand laden und anwenden
  hydrate: () => Promise<void>;
}

// Initialen Zustand aus PANEL_DEFAULTS aufbauen
function buildInitialPanels(): Record<PanelId, PanelState> {
  const panelIds: PanelId[] = [
    'files', 'terminal-mini', 'projects', 'host-status', 'history',
  ];

  return panelIds.reduce((acc, id, index) => {
    const defaults = PANEL_DEFAULTS[id];
    acc[id] = {
      id,
      open: false,
      position: { ...defaults.position },
      size: { ...defaults.size },
      minimized: false,
      maximized: false,
      zIndex: BASE_Z_INDEX + index,
    };
    return acc;
  }, {} as Record<PanelId, PanelState>);
}

// Naechsten freien Z-Index berechnen
function getNextZIndex(panels: Record<PanelId, PanelState>): number {
  const zIndices = Object.values(panels).map((p) => p.zIndex);
  return Math.max(...zIndices) + 1;
}

// Anzahl offener Panels zaehlen
function countOpenPanels(panels: Record<PanelId, PanelState>): number {
  return Object.values(panels).filter((p) => p.open).length;
}

export const usePanelManager = create<PanelManagerState>((set, get) => ({
  panels: buildInitialPanels(),

  openPanel: (id) => {
    const { panels } = get();
    const panel = panels[id];

    // Bereits offen und nicht minimiert — in den Vordergrund
    if (panel.open && !panel.minimized) {
      get().bringToFront(id);
      return;
    }

    // Minimiert — wiederherstellen
    if (panel.open && panel.minimized) {
      get().restore(id);
      return;
    }

    // Limit pruefen
    if (countOpenPanels(panels) >= MAX_OPEN_PANELS) {
      // Aeltestes Panel (niedrigster zIndex) schliessen
      const oldest = Object.values(panels)
        .filter((p) => p.open)
        .sort((a, b) => a.zIndex - b.zIndex)[0];
      if (oldest) {
        set((state) => ({
          panels: {
            ...state.panels,
            [oldest.id]: { ...state.panels[oldest.id], open: false, minimized: false, maximized: false },
          },
        }));
      }
    }

    const nextZ = getNextZIndex(get().panels);
    set((state) => {
      const next = {
        ...state.panels,
        [id]: { ...state.panels[id], open: true, minimized: false, maximized: false, zIndex: nextZ },
      };
      savePanelState(next);
      return { panels: next };
    });
  },

  closePanel: (id) => {
    set((state) => {
      const next = {
        ...state.panels,
        [id]: { ...state.panels[id], open: false, minimized: false, maximized: false },
      };
      savePanelState(next);
      return { panels: next };
    });
  },

  togglePanel: (id) => {
    const { panels } = get();
    const panel = panels[id];

    if (panel.open && !panel.minimized) {
      get().closePanel(id);
    } else {
      get().openPanel(id);
    }
  },

  movePanel: (id, x, y) => {
    set((state) => {
      const next = { ...state.panels, [id]: { ...state.panels[id], position: { x, y } } };
      savePanelState(next);
      return { panels: next };
    });
  },

  resizePanel: (id, width, height) => {
    set((state) => {
      const next = { ...state.panels, [id]: { ...state.panels[id], size: { width, height } } };
      savePanelState(next);
      return { panels: next };
    });
  },

  bringToFront: (id) => {
    const nextZ = getNextZIndex(get().panels);
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], zIndex: nextZ },
      },
    }));
  },

  minimize: (id) => {
    set((state) => {
      const next = { ...state.panels, [id]: { ...state.panels[id], minimized: true, maximized: false } };
      savePanelState(next);
      return { panels: next };
    });
  },

  maximize: (id) => {
    const nextZ = getNextZIndex(get().panels);
    set((state) => {
      const next = {
        ...state.panels,
        [id]: { ...state.panels[id], maximized: true, minimized: false, zIndex: nextZ },
      };
      savePanelState(next);
      return { panels: next };
    });
  },

  restore: (id) => {
    const nextZ = getNextZIndex(get().panels);
    set((state) => {
      const next = {
        ...state.panels,
        [id]: { ...state.panels[id], minimized: false, maximized: false, zIndex: nextZ },
      };
      savePanelState(next);
      return { panels: next };
    });
  },

  closeAll: () => {
    set((state) => {
      const next = { ...state.panels };
      (Object.keys(next) as PanelId[]).forEach((id) => {
        next[id] = { ...next[id], open: false, minimized: false, maximized: false };
      });
      savePanelState(next);
      return { panels: next };
    });
  },

  minimizeAll: () => {
    set((state) => {
      const next = { ...state.panels };
      (Object.keys(next) as PanelId[]).forEach((id) => {
        if (next[id].open && !next[id].minimized) {
          next[id] = { ...next[id], minimized: true, maximized: false };
        }
      });
      savePanelState(next);
      return { panels: next };
    });
  },

  getOpenPanels: () => {
    const { panels } = get();
    return Object.values(panels).filter((p) => p.open && !p.minimized);
  },

  hydrate: async () => {
    const saved = await loadPanelState();
    if (!saved) return;
    set((state) => {
      const next = { ...state.panels };
      (Object.keys(saved) as PanelId[]).forEach((id) => {
        if (!next[id]) return;
        const entry = saved[id];
        if (!entry) return;
        next[id] = {
          ...next[id],
          position: entry.position,
          size: entry.size,
          open: entry.open,
        };
      });
      return { panels: next };
    });
  },
}));
