# Floating Workspace — Implementierungsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Intuitivere Bedienung der Remote Team Dashboard App durch Floating Panels, Command Palette (Ctrl+K) und kontextuelle Aktionen — ohne Seitenwechsel.

**Architecture:** Drei neue UX-Layer ueber der bestehenden App: (1) Panel-Manager als Zustand-Store verwaltet bis zu 7 Floating Panels (draggable, resizable), (2) Command Palette via `cmdk` Bibliothek fuer Power-User Schnellzugriff, (3) Quick-Action-Bar im Header mit Toggle-Buttons. Auf Mobile werden Panels zu Bottom-Sheets. Die bestehenden Seiten bleiben unveraendert.

**Tech Stack:** React 19, Zustand 5, cmdk (Command Palette), react-rnd (Drag/Resize), Tailwind CSS 4, Framer Motion (Animationen), bestehende CSS-Variablen.

**WICHTIG — Mobile First:** Viel Arbeit findet am Handy statt. Alle Komponenten MUESSEN zuerst fuer Mobile designed werden (Bottom-Sheets statt Floating Panels, Touch-Targets >= 44px, Swipe-Gesten). Desktop ist die Erweiterung, nicht umgekehrt.

**Design-Dokument:** `docs/plans/2026-03-05-floating-workspace-design.md`

---

## Phase 1: Fundament (Panel-Manager + FloatingPanel)

### Task 1: Abhaengigkeiten installieren

**Files:**
- Modify: `package.json`

**Step 1: cmdk und react-rnd installieren**

Run: `npm install cmdk react-rnd`

**Step 2: Verify installation**

Run: `npm ls cmdk react-rnd`
Expected: Both packages listed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: cmdk und react-rnd als Abhaengigkeiten hinzugefuegt"
```

---

### Task 2: Panel-Manager Zustand Store

**Files:**
- Create: `src/lib/stores/panel-manager.ts`
- Create: `src/types/panels.ts`

**Step 1: Panel-Typen definieren**

Create `src/types/panels.ts`:

```typescript
export type PanelId = 'files' | 'logs' | 'teams' | 'terminal-mini' | 'projects' | 'host-status' | 'history';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface PanelState {
  id: PanelId;
  open: boolean;
  position: PanelPosition;
  size: PanelSize;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface PanelDefaults {
  position: PanelPosition;
  size: PanelSize;
  minSize: PanelSize;
}

export const PANEL_DEFAULTS: Record<PanelId, PanelDefaults> = {
  files:          { position: { x: 60, y: 80 },  size: { width: 420, height: 500 }, minSize: { width: 300, height: 300 } },
  logs:           { position: { x: 120, y: 100 }, size: { width: 500, height: 400 }, minSize: { width: 300, height: 200 } },
  teams:          { position: { x: 180, y: 80 },  size: { width: 400, height: 450 }, minSize: { width: 280, height: 300 } },
  'terminal-mini':{ position: { x: 100, y: 120 }, size: { width: 560, height: 350 }, minSize: { width: 400, height: 250 } },
  projects:       { position: { x: 140, y: 90 },  size: { width: 420, height: 400 }, minSize: { width: 300, height: 250 } },
  'host-status':  { position: { x: 200, y: 100 }, size: { width: 380, height: 350 }, minSize: { width: 280, height: 250 } },
  history:        { position: { x: 160, y: 110 }, size: { width: 440, height: 450 }, minSize: { width: 300, height: 300 } },
};
```

**Step 2: Zustand Store erstellen**

Create `src/lib/stores/panel-manager.ts`:

```typescript
import { create } from 'zustand';
import type { PanelId, PanelState, PanelPosition, PanelSize } from '@/types/panels';
import { PANEL_DEFAULTS } from '@/types/panels';

const ALL_PANEL_IDS: PanelId[] = ['files', 'logs', 'teams', 'terminal-mini', 'projects', 'host-status', 'history'];
const MAX_OPEN_PANELS = 4;

function createDefaultPanel(id: PanelId): PanelState {
  const defaults = PANEL_DEFAULTS[id];
  return {
    id,
    open: false,
    position: { ...defaults.position },
    size: { ...defaults.size },
    minimized: false,
    maximized: false,
    zIndex: 100,
  };
}

interface PanelManagerState {
  panels: Record<PanelId, PanelState>;
  nextZIndex: number;

  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  togglePanel: (id: PanelId) => void;
  movePanel: (id: PanelId, pos: PanelPosition) => void;
  resizePanel: (id: PanelId, size: PanelSize) => void;
  bringToFront: (id: PanelId) => void;
  minimize: (id: PanelId) => void;
  maximize: (id: PanelId) => void;
  restore: (id: PanelId) => void;
  closeAll: () => void;
  minimizeAll: () => void;
  getOpenPanels: () => PanelState[];
}

export const usePanelManager = create<PanelManagerState>((set, get) => {
  const initialPanels = {} as Record<PanelId, PanelState>;
  for (const id of ALL_PANEL_IDS) {
    initialPanels[id] = createDefaultPanel(id);
  }

  return {
    panels: initialPanels,
    nextZIndex: 101,

    openPanel: (id) => set((state) => {
      const openCount = Object.values(state.panels).filter(p => p.open && !p.minimized).length;
      if (state.panels[id].open) {
        // Already open — bring to front and un-minimize
        return {
          panels: {
            ...state.panels,
            [id]: { ...state.panels[id], minimized: false, zIndex: state.nextZIndex },
          },
          nextZIndex: state.nextZIndex + 1,
        };
      }
      if (openCount >= MAX_OPEN_PANELS) return state; // Limit reached
      return {
        panels: {
          ...state.panels,
          [id]: { ...state.panels[id], open: true, minimized: false, zIndex: state.nextZIndex },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),

    closePanel: (id) => set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], open: false, minimized: false, maximized: false },
      },
    })),

    togglePanel: (id) => {
      const panel = get().panels[id];
      if (panel.open) {
        get().closePanel(id);
      } else {
        get().openPanel(id);
      }
    },

    movePanel: (id, pos) => set((state) => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], position: pos } },
    })),

    resizePanel: (id, size) => set((state) => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], size } },
    })),

    bringToFront: (id) => set((state) => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], zIndex: state.nextZIndex } },
      nextZIndex: state.nextZIndex + 1,
    })),

    minimize: (id) => set((state) => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], minimized: true } },
    })),

    maximize: (id) => set((state) => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], maximized: true, minimized: false, zIndex: state.nextZIndex } },
      nextZIndex: state.nextZIndex + 1,
    })),

    restore: (id) => set((state) => ({
      panels: { ...state.panels, [id]: { ...state.panels[id], maximized: false, minimized: false, zIndex: state.nextZIndex } },
      nextZIndex: state.nextZIndex + 1,
    })),

    closeAll: () => set((state) => {
      const panels = { ...state.panels };
      for (const id of ALL_PANEL_IDS) {
        panels[id] = { ...panels[id], open: false, minimized: false, maximized: false };
      }
      return { panels };
    }),

    minimizeAll: () => set((state) => {
      const panels = { ...state.panels };
      for (const id of ALL_PANEL_IDS) {
        if (panels[id].open) {
          panels[id] = { ...panels[id], minimized: true };
        }
      }
      return { panels };
    }),

    getOpenPanels: () => Object.values(get().panels).filter(p => p.open),
  };
});
```

**Step 3: Typen in types/index.ts exportieren**

Modify `src/types/index.ts` (oder `src/types/panels.ts` direkt) — sicherstellen, dass der Import-Pfad `@/types/panels` funktioniert.

**Step 4: Commit**

```bash
git add src/types/panels.ts src/lib/stores/panel-manager.ts
git commit -m "feat: Panel-Manager Zustand Store mit 7 Panel-Typen"
```

---

### Task 3: FloatingPanel Basis-Komponente

**Files:**
- Create: `src/components/panels/floating-panel.tsx`

**Step 1: FloatingPanel Komponente erstellen**

Create `src/components/panels/floating-panel.tsx`:

```typescript
'use client';

import { useCallback, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import type { PanelId } from '@/types/panels';
import { PANEL_DEFAULTS } from '@/types/panels';

interface FloatingPanelProps {
  id: PanelId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function FloatingPanel({ id, title, icon, children }: FloatingPanelProps) {
  const panel = usePanelManager((s) => s.panels[id]);
  const { closePanel, movePanel, resizePanel, bringToFront, minimize, maximize, restore } = usePanelManager();
  const rndRef = useRef<Rnd | null>(null);

  const handleMouseDown = useCallback(() => {
    bringToFront(id);
  }, [bringToFront, id]);

  if (!panel.open || panel.minimized) return null;

  const minSize = PANEL_DEFAULTS[id].minSize;

  // Maximized: fill main area (below header, right of sidebar)
  if (panel.maximized) {
    return (
      <div
        className="fixed animate-fade-in"
        style={{
          top: 'var(--header-height)',
          left: 'var(--sidebar-width)',
          right: 0,
          bottom: 0,
          zIndex: panel.zIndex,
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={handleMouseDown}
      >
        <PanelHeader
          title={title}
          icon={icon}
          maximized
          onClose={() => closePanel(id)}
          onMinimize={() => minimize(id)}
          onMaximize={() => restore(id)}
        />
        <div className="flex-1 overflow-auto" style={{ background: 'var(--bg-surface)' }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <Rnd
      ref={(c) => { rndRef.current = c; }}
      position={panel.position}
      size={panel.size}
      minWidth={minSize.width}
      minHeight={minSize.height}
      style={{ zIndex: panel.zIndex }}
      className="animate-fade-in"
      bounds="parent"
      dragHandleClassName="panel-drag-handle"
      onDragStop={(_e, d) => movePanel(id, { x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        resizePanel(id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height) });
        movePanel(id, pos);
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="flex flex-col h-full rounded-sm overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.8)',
        }}
      >
        <PanelHeader
          title={title}
          icon={icon}
          maximized={false}
          onClose={() => closePanel(id)}
          onMinimize={() => minimize(id)}
          onMaximize={() => maximize(id)}
        />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </Rnd>
  );
}

// -- Panel Header (Titelleiste) --

interface PanelHeaderProps {
  title: string;
  icon: React.ReactNode;
  maximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

function PanelHeader({ title, icon, maximized, onClose, onMinimize, onMaximize }: PanelHeaderProps) {
  return (
    <div
      className="panel-drag-handle flex items-center justify-between px-3 py-1.5 cursor-move select-none"
      style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
        {icon}
        <span className="font-medium tracking-wide uppercase">{title}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
          title="Minimieren"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMaximize(); }}
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
          title={maximized ? 'Wiederherstellen' : 'Maximieren'}
        >
          {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-glow)] transition-colors"
          title="Schliessen"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: PanelContainer in Layout einbinden**

Create `src/components/panels/panel-container.tsx`:

```typescript
'use client';

import { usePanelManager } from '@/lib/stores/panel-manager';
import { FloatingPanel } from './floating-panel';
import { FolderOpen, ScrollText, Users, Terminal, FolderKanban, Server, Clock } from 'lucide-react';
import type { PanelId } from '@/types/panels';

// Panel-Inhalte — vorerst Platzhalter, spaeter durch echte Komponenten ersetzt
function PanelPlaceholder({ name }: { name: string }) {
  return (
    <div className="p-4 text-[var(--text-muted)] text-[12px]">
      <p>{name} Panel — Inhalt folgt</p>
    </div>
  );
}

const PANEL_CONFIG: { id: PanelId; title: string; icon: React.ReactNode }[] = [
  { id: 'files', title: 'Files', icon: <FolderOpen size={13} /> },
  { id: 'logs', title: 'Logs', icon: <ScrollText size={13} /> },
  { id: 'teams', title: 'Teams', icon: <Users size={13} /> },
  { id: 'terminal-mini', title: 'Terminal', icon: <Terminal size={13} /> },
  { id: 'projects', title: 'Projects', icon: <FolderKanban size={13} /> },
  { id: 'host-status', title: 'Hosts', icon: <Server size={13} /> },
  { id: 'history', title: 'History', icon: <Clock size={13} /> },
];

export function PanelContainer() {
  const panels = usePanelManager((s) => s.panels);
  const hasOpenPanels = Object.values(panels).some(p => p.open && !p.minimized);

  if (!hasOpenPanels) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        top: 'var(--header-height)',
        left: 'var(--sidebar-width)',
        zIndex: 40,
      }}
    >
      <div className="relative w-full h-full pointer-events-auto">
        {PANEL_CONFIG.map(({ id, title, icon }) => (
          <FloatingPanel key={id} id={id} title={title} icon={icon}>
            <PanelPlaceholder name={title} />
          </FloatingPanel>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: MinimizedBar Komponente (minimierte Panels als Tabs unten)**

Create `src/components/panels/minimized-bar.tsx`:

```typescript
'use client';

import { usePanelManager } from '@/lib/stores/panel-manager';
import { FolderOpen, ScrollText, Users, Terminal, FolderKanban, Server, Clock } from 'lucide-react';
import type { PanelId } from '@/types/panels';

const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  files: <FolderOpen size={12} />,
  logs: <ScrollText size={12} />,
  teams: <Users size={12} />,
  'terminal-mini': <Terminal size={12} />,
  projects: <FolderKanban size={12} />,
  'host-status': <Server size={12} />,
  history: <Clock size={12} />,
};

const PANEL_LABELS: Record<PanelId, string> = {
  files: 'Files',
  logs: 'Logs',
  teams: 'Teams',
  'terminal-mini': 'Terminal',
  projects: 'Projects',
  'host-status': 'Hosts',
  history: 'History',
};

export function MinimizedBar() {
  const panels = usePanelManager((s) => s.panels);
  const { restore } = usePanelManager();

  const minimized = Object.values(panels).filter(p => p.open && p.minimized);
  if (minimized.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1 z-50"
      style={{
        left: 'var(--sidebar-width)',
        bottom: 'var(--bottom-bar-height)',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {minimized.map((p) => (
        <button
          key={p.id}
          onClick={() => restore(p.id)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--bg-overlay)] transition-colors"
        >
          {PANEL_ICONS[p.id]}
          <span>{PANEL_LABELS[p.id]}</span>
        </button>
      ))}
    </div>
  );
}
```

**Step 4: In Layout einbinden**

Modify `src/app/layout.tsx` — nach `<BottomTabBar />` einfuegen:

```typescript
import { PanelContainer } from '@/components/panels/panel-container';
import { MinimizedBar } from '@/components/panels/minimized-bar';
```

Im JSX nach `<BottomTabBar />`:
```typescript
<PanelContainer />
<MinimizedBar />
```

**Step 5: Dev-Server starten und pruefen**

Run: `npm run dev`
Expected: App startet ohne Fehler, Panels sind noch nicht sichtbar (noch keine Toggle-Buttons)

**Step 6: Commit**

```bash
git add src/components/panels/
git commit -m "feat: FloatingPanel Basis-Komponente mit Drag/Resize und MinimizedBar"
```

---

## Phase 2: Quick-Action-Bar (Header)

### Task 4: Quick-Action-Bar im Header

**Files:**
- Create: `src/components/layout/quick-action-bar.tsx`
- Modify: `src/components/layout/header.tsx`

**Step 1: QuickActionBar Komponente erstellen**

Create `src/components/layout/quick-action-bar.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { FolderOpen, ScrollText, Users, Terminal, Plus, Search } from 'lucide-react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import type { PanelId } from '@/types/panels';

const PRIMARY_PANELS: { id: PanelId; icon: typeof FolderOpen; label: string }[] = [
  { id: 'files', icon: FolderOpen, label: 'Files' },
  { id: 'logs', icon: ScrollText, label: 'Logs' },
  { id: 'teams', icon: Users, label: 'Teams' },
  { id: 'terminal-mini', icon: Terminal, label: 'Terminal' },
];

const MORE_PANELS: { id: PanelId; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'host-status', label: 'Host-Status' },
  { id: 'history', label: 'History' },
];

interface QuickActionBarProps {
  onOpenCommandPalette: () => void;
}

export function QuickActionBar({ onOpenCommandPalette }: QuickActionBarProps) {
  const panels = usePanelManager((s) => s.panels);
  const { togglePanel } = usePanelManager();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  return (
    <div className="flex items-center gap-0.5">
      {/* Primaere Panel-Buttons */}
      {PRIMARY_PANELS.map(({ id, icon: Icon, label }) => {
        const isActive = panels[id].open;
        return (
          <button
            key={id}
            onClick={() => togglePanel(id)}
            className={`
              relative w-7 h-7 flex items-center justify-center rounded transition-all
              ${isActive
                ? 'text-[var(--cyan)] bg-[var(--cyan-glow)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }
            `}
            title={label}
          >
            <Icon size={14} />
          </button>
        );
      })}

      {/* More-Button */}
      <div ref={moreRef} className="relative">
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`
            w-7 h-7 flex items-center justify-center rounded transition-all
            ${moreOpen
              ? 'text-[var(--cyan)] bg-[var(--cyan-glow)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }
          `}
          title="Mehr Panels"
        >
          <Plus size={14} />
        </button>

        {moreOpen && (
          <div
            className="absolute top-full right-0 mt-1 w-40 py-1 rounded-sm animate-fade-in"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {MORE_PANELS.map(({ id, label }) => {
              const isActive = panels[id].open;
              return (
                <button
                  key={id}
                  onClick={() => { togglePanel(id); setMoreOpen(false); }}
                  className={`
                    w-full px-3 py-1.5 text-left text-[12px] transition-colors
                    ${isActive
                      ? 'text-[var(--cyan)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />

      {/* Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-1.5 px-2 h-7 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
        title="Command Palette (Ctrl+K)"
      >
        <Search size={12} />
        <span className="hidden md:inline">Ctrl+K</span>
      </button>
    </div>
  );
}
```

**Step 2: Header um QuickActionBar erweitern**

Modify `src/components/layout/header.tsx`:

- Header wird zu Client Component (`'use client'` oben)
- Import `QuickActionBar` hinzufuegen
- Zwischen `ConnectionStatus` und rechtem Block einfuegen
- State `commandPaletteOpen` hinzufuegen (vorerst nur als Toggle, Palette kommt in Phase 3)

Aenderungen:

1. `'use client';` als erste Zeile
2. Import: `import { QuickActionBar } from './quick-action-bar';`
3. Import: `import { useState } from 'react';`
4. Innerhalb der Funktion: `const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);`
5. Nach `<ConnectionStatus />` einfuegen:
   ```tsx
   <QuickActionBar onOpenCommandPalette={() => setCmdPaletteOpen(true)} />
   ```

**Step 3: Dev-Server pruefen**

Run: App im Browser oeffnen
Expected: Quick-Action-Bar erscheint im Header mit 4 Icons + [+] + Ctrl+K. Klick auf Icons oeffnet/schliesst Floating Panels.

**Step 4: Commit**

```bash
git add src/components/layout/quick-action-bar.tsx src/components/layout/header.tsx
git commit -m "feat: Quick-Action-Bar im Header mit Panel-Toggle-Buttons"
```

---

## Phase 3: Command Palette

### Task 5: Command Palette mit cmdk

**Files:**
- Create: `src/components/command-palette/command-palette.tsx`
- Create: `src/components/command-palette/use-command-palette.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: CSS fuer cmdk hinzufuegen**

Modify `src/app/globals.css` — am Ende hinzufuegen:

```css
/* Command Palette (cmdk) */
[cmdk-root] {
  width: 100%;
  max-width: 560px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  box-shadow: 0 16px 64px rgba(0,0,0,0.6);
  overflow: hidden;
}
[cmdk-input] {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
}
[cmdk-input]::placeholder {
  color: var(--text-muted);
}
[cmdk-list] {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}
[cmdk-group-heading] {
  padding: 4px 8px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}
[cmdk-item] {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 3px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.1s;
}
[cmdk-item][data-selected='true'] {
  background: var(--bg-overlay);
  color: var(--text-primary);
}
[cmdk-item]:active {
  background: var(--cyan-glow);
}
[cmdk-separator] {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 8px;
}
[cmdk-empty] {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
```

**Step 2: Command Palette Komponente erstellen**

Create `src/components/command-palette/command-palette.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Server, Terminal, Users, FolderOpen, ScrollText,
  Settings, FolderKanban, Clock, Search, Zap,
} from 'lucide-react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import type { PanelId } from '@/types/panels';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { togglePanel } = usePanelManager();

  // Ctrl+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const navigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  const panel = (id: PanelId) => {
    togglePanel(id);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <Command label="Command Palette">
          <Command.Input placeholder="Suche nach Seiten, Panels, Aktionen..." autoFocus />
          <Command.List>
            <Command.Empty>Keine Ergebnisse gefunden.</Command.Empty>

            <Command.Group heading="Navigation">
              <Command.Item onSelect={() => navigate('/')}>
                <LayoutDashboard size={14} /> Dashboard
              </Command.Item>
              <Command.Item onSelect={() => navigate('/hosts')}>
                <Server size={14} /> Hosts
              </Command.Item>
              <Command.Item onSelect={() => navigate('/terminal')}>
                <Terminal size={14} /> Terminal
              </Command.Item>
              <Command.Item onSelect={() => navigate('/teams')}>
                <Users size={14} /> Teams
              </Command.Item>
              <Command.Item onSelect={() => navigate('/files')}>
                <FolderOpen size={14} /> Files
              </Command.Item>
              <Command.Item onSelect={() => navigate('/logs')}>
                <ScrollText size={14} /> Logs
              </Command.Item>
              <Command.Item onSelect={() => navigate('/settings')}>
                <Settings size={14} /> Settings
              </Command.Item>
            </Command.Group>

            <Command.Separator />

            <Command.Group heading="Panels">
              <Command.Item onSelect={() => panel('files')}>
                <FolderOpen size={14} /> Panel: Files oeffnen
              </Command.Item>
              <Command.Item onSelect={() => panel('logs')}>
                <ScrollText size={14} /> Panel: Logs oeffnen
              </Command.Item>
              <Command.Item onSelect={() => panel('teams')}>
                <Users size={14} /> Panel: Teams oeffnen
              </Command.Item>
              <Command.Item onSelect={() => panel('terminal-mini')}>
                <Terminal size={14} /> Panel: Quick Terminal
              </Command.Item>
              <Command.Item onSelect={() => panel('projects')}>
                <FolderKanban size={14} /> Panel: Projects
              </Command.Item>
              <Command.Item onSelect={() => panel('host-status')}>
                <Server size={14} /> Panel: Host-Status
              </Command.Item>
              <Command.Item onSelect={() => panel('history')}>
                <Clock size={14} /> Panel: History
              </Command.Item>
            </Command.Group>

            <Command.Separator />

            <Command.Group heading="Aktionen">
              <Command.Item onSelect={() => { navigate('/terminal'); onOpenChange(false); }}>
                <Zap size={14} /> Neue Terminal-Session starten
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
```

**Step 3: CommandPalette in Layout einbinden**

Modify `src/app/layout.tsx`:

Da `layout.tsx` ein Server Component ist, brauchen wir einen Client-Wrapper.

Create `src/components/panels/workspace-overlay.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { PanelContainer } from './panel-container';
import { MinimizedBar } from './minimized-bar';
import { CommandPalette } from '../command-palette/command-palette';

export function WorkspaceOverlay() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <>
      <PanelContainer />
      <MinimizedBar />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
```

Dann in `layout.tsx` nur `<WorkspaceOverlay />` importieren statt PanelContainer + MinimizedBar einzeln.

**ACHTUNG:** Die `onOpenCommandPalette` Prop im Header muss nun mit dem gleichen State verbunden werden. Loesung: Zustand-Store fuer Command-Palette-State, oder den State nach oben heben.

Einfachste Loesung — eigenen Mini-Store:

Create `src/lib/stores/command-palette.ts`:

```typescript
import { create } from 'zustand';

interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCommandPalette = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
```

Dann in `command-palette.tsx` und `quick-action-bar.tsx` diesen Store nutzen statt Props.

**Step 4: Dev-Server pruefen**

Run: Ctrl+K im Browser druecken
Expected: Command Palette oeffnet sich als Overlay, Suche filtert Eintraege, Enter navigiert

**Step 5: Commit**

```bash
git add src/components/command-palette/ src/lib/stores/command-palette.ts src/components/panels/workspace-overlay.tsx src/app/globals.css
git commit -m "feat: Command Palette mit cmdk — Ctrl+K fuer Navigation und Panel-Toggle"
```

---

## Phase 4: Panel-Inhalte (4 primaere Panels)

### Task 6: Files Panel

**Files:**
- Create: `src/components/panels/content/files-panel.tsx`
- Modify: `src/components/panels/panel-container.tsx`

**Step 1: Files Panel Inhalt erstellen**

Kompakte Version des File-Browsers: File-Tree ohne Editor (Klick auf Datei oeffnet die Files-Seite oder zeigt Vorschau).

Wiederverwendung der bestehenden Komponenten wo moeglich:
- `useFileBrowser` Store direkt nutzen
- Host-Auswahl oben im Panel
- Vereinfachter Tree (nur Navigation, kein Editor)

```typescript
'use client';

import { useEffect } from 'react';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { FolderOpen, File, ChevronUp, RefreshCw } from 'lucide-react';

export function FilesPanel() {
  const { hostId, currentPath, entries, loading, browse, navigateUp, refresh } = useFileBrowser();

  useEffect(() => {
    if (hostId) browse();
  }, [hostId]);

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-[11px]"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button onClick={navigateUp} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <ChevronUp size={14} />
        </button>
        <span className="text-[var(--text-secondary)] truncate flex-1">{currentPath || '~'}</span>
        <button onClick={refresh} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-[var(--text-muted)] text-[12px]">Laden...</div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => entry.isDirectory ? browse(entry.name) : undefined}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
            >
              {entry.isDirectory ? (
                <FolderOpen size={13} className="text-[var(--cyan)] shrink-0" />
              ) : (
                <File size={13} className="text-[var(--text-muted)] shrink-0" />
              )}
              <span className="truncate">{entry.name}</span>
              {!entry.isDirectory && (
                <span className="ml-auto text-[10px] text-[var(--text-dim)]">{entry.size}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: In PanelContainer einbinden**

Modify `src/components/panels/panel-container.tsx` — `PanelPlaceholder` fuer `files` durch `<FilesPanel />` ersetzen.

**Step 3: Commit**

```bash
git add src/components/panels/content/files-panel.tsx src/components/panels/panel-container.tsx
git commit -m "feat: Files-Panel mit File-Tree im Floating Panel"
```

---

### Task 7: Logs Panel

**Files:**
- Create: `src/components/panels/content/logs-panel.tsx`
- Modify: `src/components/panels/panel-container.tsx`

**Step 1: Logs Panel erstellen**

Kompakter Log-Viewer: Zeigt Live-Tail einer Log-Datei via Socket.io.
Wiederverwendung des bestehenden `/logs` Socket-Patterns.

**Step 2: In PanelContainer einbinden**

**Step 3: Commit**

```bash
git add src/components/panels/content/logs-panel.tsx src/components/panels/panel-container.tsx
git commit -m "feat: Logs-Panel mit Live-Tail im Floating Panel"
```

---

### Task 8: Teams Panel

**Files:**
- Create: `src/components/panels/content/teams-panel.tsx`
- Modify: `src/components/panels/panel-container.tsx`

**Step 1: Teams Panel erstellen**

Kompakte Team-Uebersicht: Team-Liste mit Agent-Status und Task-Zaehler.
Nutzt die bestehende Teams-API.

**Step 2: In PanelContainer einbinden**

**Step 3: Commit**

```bash
git add src/components/panels/content/teams-panel.tsx src/components/panels/panel-container.tsx
git commit -m "feat: Teams-Panel mit Team-Liste und Task-Status"
```

---

### Task 9: Terminal-Mini Panel

**Files:**
- Create: `src/components/panels/content/terminal-mini-panel.tsx`
- Modify: `src/components/panels/panel-container.tsx`

**Step 1: Terminal-Mini Panel erstellen**

Einzelnes xterm.js Terminal fuer schnelle Befehle. Nutzt bestehende `useSocket('/terminal')` und Terminal-View Patterns.

Wichtig: Host/Session-Auswahl oben im Panel.

**Step 2: In PanelContainer einbinden**

**Step 3: Commit**

```bash
git add src/components/panels/content/terminal-mini-panel.tsx src/components/panels/panel-container.tsx
git commit -m "feat: Terminal-Mini Panel fuer schnelle SSH-Befehle"
```

---

## Phase 5: Erweiterte Panels

### Task 10: Projects Panel

**Files:**
- Create: `src/components/panels/content/projects-panel.tsx`

Kompakte Projekt-Uebersicht mit Status-Badges. Nutzt `/api/projects`.

---

### Task 11: Host-Status Panel

**Files:**
- Create: `src/components/panels/content/host-status-panel.tsx`

Live-Uebersicht aller Hosts mit Online/Offline-Status. Nutzt `/api/hosts`.

---

### Task 12: History Panel

**Files:**
- Create: `src/components/panels/content/history-panel.tsx`

Aktivitaets-Timeline: Task-History und Alert-History kombiniert. Nutzt `/api/alerts` und `/api/tasks/history`.

---

## Phase 6: Kontextuelle Aktionen

### Task 13: Terminal-Seite Kontext-Aktionen

**Files:**
- Create: `src/components/terminal/terminal-context-menu.tsx`
- Modify: `src/components/terminal/terminal-view.tsx`

Rechtsklick im Terminal-Bereich zeigt Kontextmenue: "Files hier oeffnen", "Logs fuer Host", "Team-Status".
Jede Aktion oeffnet das entsprechende Floating Panel.

---

### Task 14: Dashboard Quick-Actions

**Files:**
- Modify: `src/components/host/host-card.tsx`

Host-Karten bekommen Hover-Overlay mit 3 Quick-Action Buttons: Terminal, Files, Logs.
Klick oeffnet Floating Panel (kein Seitenwechsel).

---

### Task 15: Files-Seite Kontextmenue erweitern

**Files:**
- Modify: `src/components/files/context-menu.tsx`

Bestehende Kontextmenue-Eintraege erweitern um: "Im Terminal oeffnen" (oeffnet Terminal-Mini Panel), "Logs anzeigen" (oeffnet Logs Panel).

---

## Phase 7: Keyboard Shortcuts

### Task 16: Globale Keyboard Shortcuts

**Files:**
- Create: `src/hooks/use-keyboard-shortcuts.ts`
- Modify: `src/components/panels/workspace-overlay.tsx`

```
Ctrl+K — Command Palette
Ctrl+B — Sidebar toggle
Ctrl+1 — Files Panel toggle
Ctrl+2 — Logs Panel toggle
Ctrl+3 — Teams Panel toggle
Ctrl+4 — Terminal-Mini Panel toggle
Escape — Aktives Panel / Palette schliessen
Ctrl+Shift+M — Alle Panels minimieren
```

---

## Phase 8: Mobile Bottom-Sheets

### Task 17: BottomSheet Komponente

**Files:**
- Create: `src/components/panels/bottom-sheet.tsx`
- Modify: `src/components/panels/panel-container.tsx`

Auf Mobile (< 768px): Statt Floating Panels werden Bottom-Sheets verwendet.
Touch-basiert: Drag-Handle zum Hoch-/Runterziehen, Swipe-Down zum Schliessen.
Nur 1 Panel gleichzeitig auf Mobile.

---

## Phase 9: Persistenz

### Task 18: Panel-Positionen in Preferences speichern

**Files:**
- Modify: `src/lib/stores/panel-manager.ts`
- Modify: `src/app/api/preferences/route.ts`

Panel-State (Position, Groesse, offene Panels) wird beim Aendern debounced in `preferences.settings` JSON gespeichert.
Beim App-Start wird der gespeicherte State geladen.

Das `settings` JSONB-Feld in der `preferences`-Tabelle ist bereits vorhanden und wird aktuell als `{}` initialisiert — perfekt fuer Panel-Positionen.

---

## Zusammenfassung

| Phase | Tasks | Beschreibung |
|-------|-------|------------|
| 1 | 1-3 | Fundament: Dependencies, Store, FloatingPanel |
| 2 | 4 | Quick-Action-Bar im Header |
| 3 | 5 | Command Palette (cmdk) |
| 4 | 6-9 | 4 primaere Panel-Inhalte |
| 5 | 10-12 | 3 erweiterte Panel-Inhalte |
| 6 | 13-15 | Kontextuelle Aktionen pro Seite |
| 7 | 16 | Keyboard Shortcuts |
| 8 | 17 | Mobile Bottom-Sheets |
| 9 | 18 | Persistenz |

**Abhaengigkeiten:** Phase 1 ist Voraussetzung fuer alles. Phase 2 + 3 koennen parallel. Phase 4-5 brauchen Phase 1. Phase 6 braucht Phase 4. Phase 7-9 sind unabhaengig voneinander.
