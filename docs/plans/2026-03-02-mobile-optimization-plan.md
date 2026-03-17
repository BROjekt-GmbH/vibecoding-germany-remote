# Mobile-Optimierung Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Die gesamte Remote Team Dashboard App soll vollstaendig auf Smartphones nutzbar sein — Bottom Tab Bar, Fullscreen Terminal, Tab-basierte Team-Detail-Seite.

**Architecture:** Responsive Breakpoint bei `md` (768px). Unter 768px greift Mobile-Layout (Bottom Tabs, versteckte Sidebar, kompakter Header). Desktop bleibt unveraendert. Ein `useIsMobile()` Hook fuer JS-seitige Logik, CSS Custom Properties fuer Layout-Werte.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4 (CSS-basierte Config), Lucide Icons, xterm.js

---

### Task 1: useIsMobile Hook erstellen

**Files:**
- Create: `src/hooks/use-mobile.ts`

**Step 1: Hook schreiben**

```ts
// src/hooks/use-mobile.ts
'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-mobile.ts
git commit -m "feat: useIsMobile Hook fuer responsive Breakpoint-Erkennung"
```

---

### Task 2: CSS Custom Properties und Viewport Meta

**Files:**
- Modify: `src/app/globals.css:4-46` (`:root` Block)
- Modify: `src/app/layout.tsx:7-10` (Metadata/Viewport Export)

**Step 1: CSS Custom Properties ergaenzen**

In `src/app/globals.css`, nach `--header-height: 52px;` (Zeile 45) folgendes einfuegen:

```css
  --bottom-bar-height: 0px;
  --header-height-mobile: 44px;
  --bottom-bar-height-mobile: 56px;
```

Dann nach dem `:root { ... }` Block (nach Zeile 46) einen Media Query Block einfuegen:

```css
@media (max-width: 767px) {
  :root {
    --header-height: 44px;
    --sidebar-width: 0px;
    --bottom-bar-height: 56px;
  }

  /* Inputs mindestens 16px damit iOS nicht auto-zoomt */
  .input, input, select, textarea {
    font-size: 16px !important;
  }
}
```

**Step 2: Viewport Meta in layout.tsx**

In `src/app/layout.tsx`, nach dem `metadata` Export (Zeile 10) folgendes einfuegen:

```ts
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

**Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: Mobile CSS Custom Properties + Viewport Meta konfiguriert"
```

---

### Task 3: Bottom Tab Bar Komponente erstellen

**Files:**
- Create: `src/components/layout/bottom-tab-bar.tsx`

**Step 1: Komponente schreiben**

```tsx
// src/components/layout/bottom-tab-bar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, Terminal, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const tabs = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Hosts', path: '/hosts', icon: Server },
  { label: 'Terminal', path: '/terminal', icon: Terminal },
  { label: 'Teams', path: '/teams', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Nicht rendern auf Desktop oder wenn im Terminal-Fullscreen
  if (!isMobile || pathname.startsWith('/terminal/')) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t"
      style={{
        height: 'var(--bottom-bar-height)',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.path ||
          (tab.path !== '/' && pathname.startsWith(tab.path));
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
              isActive
                ? 'text-[var(--cyan)]'
                : 'text-[var(--text-muted)]'
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] leading-none">{tab.label}</span>
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: 'var(--cyan)' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/bottom-tab-bar.tsx
git commit -m "feat: BottomTabBar Komponente fuer Mobile-Navigation"
```

---

### Task 4: Sidebar auf Mobile verstecken

**Files:**
- Modify: `src/components/layout/sidebar.tsx:44-51` (aside Element)

**Step 1: `hidden md:flex` Klasse hinzufuegen**

Die `<aside>` className aendern — `'flex flex-col'` ersetzen durch `'hidden md:flex flex-col'`:

```tsx
    <aside
      className={cn(
        'fixed left-0 top-[var(--header-height)] bottom-0 z-20 hidden md:flex flex-col',
        'border-r border-[#1a2028] bg-[#060809]',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[52px]' : 'w-[var(--sidebar-width)]'
      )}
    >
```

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: Sidebar auf Mobile ausblenden (hidden md:flex)"
```

---

### Task 5: Layout.tsx — Bottom Tab Bar einbinden + Mobile Padding

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Import und Einbindung**

Import hinzufuegen:

```ts
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
```

Im `<body>` nach `<Sidebar />` und vor `<main>`:

```tsx
<BottomTabBar />
```

**Step 2: Main padding anpassen**

Das `<main>` style-Objekt erweitern — `paddingBottom` hinzufuegen:

```tsx
<main
  style={{
    paddingTop: 'var(--header-height)',
    paddingLeft: 'var(--sidebar-width)',
    paddingBottom: 'var(--bottom-bar-height)',
    minHeight: '100vh',
    background: 'var(--bg-base)',
  }}
>
```

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: BottomTabBar in Layout eingebunden + Mobile Padding"
```

---

### Task 6: Terminal Spezial-Tasten Toolbar

**Files:**
- Create: `src/components/terminal/terminal-keys-toolbar.tsx`

**Step 1: Komponente schreiben**

```tsx
// src/components/terminal/terminal-keys-toolbar.tsx
'use client';

interface TerminalKeysToolbarProps {
  onKey: (data: string) => void;
}

const keys = [
  { label: 'ESC', data: '\x1b' },
  { label: 'TAB', data: '\t' },
  { label: 'CTRL', data: null, modifier: true },
  { label: '↑', data: '\x1b[A' },
  { label: '↓', data: '\x1b[B' },
  { label: '←', data: '\x1b[D' },
  { label: '→', data: '\x1b[C' },
  { label: 'CTRL+C', data: '\x03' },
  { label: 'CTRL+D', data: '\x04' },
  { label: 'CTRL+Z', data: '\x1a' },
  { label: 'CTRL+L', data: '\x0c' },
];

export function TerminalKeysToolbar({ onKey }: TerminalKeysToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 overflow-x-auto shrink-0"
      style={{
        height: '40px',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {keys.filter(k => !k.modifier).map((key) => (
        <button
          key={key.label}
          onTouchStart={(e) => {
            e.preventDefault();
            if (key.data) onKey(key.data);
          }}
          onClick={() => {
            if (key.data) onKey(key.data);
          }}
          className="shrink-0 px-2.5 h-7 rounded text-[11px] font-medium transition-colors"
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/terminal/terminal-keys-toolbar.tsx
git commit -m "feat: Terminal-Spezial-Tasten-Toolbar fuer Mobile (ESC, Pfeiltasten, CTRL+C etc.)"
```

---

### Task 7: Terminal Fullscreen auf Mobile

**Files:**
- Modify: `src/app/terminal/[sessionId]/page.tsx`
- Modify: `src/components/terminal/terminal-view.tsx`

**Step 1: Terminal-Page Mobile-Fullscreen**

In `src/app/terminal/[sessionId]/page.tsx`:

Import hinzufuegen:

```ts
import { useIsMobile } from '@/hooks/use-mobile';
import { TerminalKeysToolbar } from '@/components/terminal/terminal-keys-toolbar';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
```

In der Funktion `TerminalPage`, direkt nach den useState-Hooks:

```ts
const isMobile = useIsMobile();
const router = useRouter();
```

Einen Ref fuer den aktiven Terminal Socket hinzufuegen (fuer die Keys Toolbar). Dafuer brauchen wir eine Callback-Ref. Wir aendern den Ansatz: Die TerminalView bekommt eine `onSendData` Callback-Prop.

Den TerminalView-State erweitern:

```ts
const [sendData, setSendData] = useState<((data: string) => void) | null>(null);
```

Das `<div>` Wrapper-Style aendern — auf Mobile kein Sidebar/Header-Offset:

```tsx
<div
  className="flex flex-col overflow-hidden"
  style={{
    position: 'fixed',
    top: isMobile ? 0 : 'var(--header-height)',
    left: isMobile ? 0 : 'var(--sidebar-width)',
    right: 0,
    bottom: 0,
  }}
>
```

Vor den `<TerminalTabs>` auf Mobile einen Close-Button einfuegen:

```tsx
{isMobile && (
  <div
    className="flex items-center justify-between px-3 shrink-0"
    style={{ height: '36px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
  >
    <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Terminal</span>
    <button
      onClick={() => router.push('/terminal')}
      className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
    >
      <X size={16} />
    </button>
  </div>
)}
```

Vor dem schliessenden `</div>` (nach der Toolbar, vor dem Session-Picker-Dialog), die Mobile Keys Toolbar einfuegen:

```tsx
{isMobile && activeTab && sendData && (
  <TerminalKeysToolbar onKey={sendData} />
)}
```

**Step 2: TerminalView onSendData Callback**

In `src/components/terminal/terminal-view.tsx`:

Interface erweitern:

```ts
export interface TerminalViewProps {
  hostId: string;
  sessionName: string;
  pane?: string;
  fontSize?: number;
  fontFamily?: string;
  className?: string;
  onSendData?: (sendFn: (data: string) => void) => void;
}
```

In der Funktion, Props destrukturieren mit `onSendData`.

Nach `socket.on('terminal:ready', ...)` (Zeile ~71), `onSendData` Callback aufrufen:

```ts
socket.on('terminal:ready', () => {
  setConnected(true);
  setConnecting(false);
  if (fitAddon) fitAddon.fit();
  socket.emit('terminal:resize', { cols: terminal.cols, rows: terminal.rows });
  // Expose send function for mobile keys toolbar
  onSendData?.((data: string) => {
    if (connectedRef.current) {
      socket.emit('terminal:data', { data });
    }
  });
});
```

Container `touch-action` setzen — im Style-Objekt des containerRef `div`:

```tsx
touchAction: 'manipulation',
```

**Step 3: TerminalView in Page mit Callback verbinden**

In `src/app/terminal/[sessionId]/page.tsx`, die TerminalView Nutzung erweitern:

```tsx
<TerminalView
  key={activeTab.id}
  hostId={activeTab.hostId}
  sessionName={activeTab.sessionName}
  pane={activeTab.pane}
  fontSize={isMobile ? 12 : fontSize}
  className="flex-1 min-h-0"
  onSendData={(fn) => setSendData(() => fn)}
/>
```

Auf Mobile die Desktop-Toolbar ausblenden:

```tsx
{!isMobile && activeTab && (
  <TerminalToolbar ... />
)}
```

**Step 4: Commit**

```bash
git add src/app/terminal/[sessionId]/page.tsx src/components/terminal/terminal-view.tsx
git commit -m "feat: Terminal Fullscreen auf Mobile mit Spezial-Tasten-Toolbar"
```

---

### Task 8: Team-Detail Tabs auf Mobile

**Files:**
- Create: `src/components/team/team-tabs.tsx`
- Modify: `src/app/teams/[teamId]/page.tsx`

**Step 1: TeamTabs Komponente erstellen**

```tsx
// src/components/team/team-tabs.tsx
'use client';

import { cn } from '@/lib/utils';

interface TeamTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon: React.ReactNode }[];
}

export function TeamTabs({ activeTab, onTabChange, tabs }: TeamTabsProps) {
  return (
    <div
      className="flex border-b shrink-0"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] transition-colors relative',
            activeTab === tab.id
              ? 'text-[var(--cyan)]'
              : 'text-[var(--text-muted)]'
          )}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <span
              className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
              style={{ background: 'var(--cyan)' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Team-Detail-Page zu Client Component umbauen**

Die Seite `src/app/teams/[teamId]/page.tsx` ist aktuell ein Server Component. Wir muessen sie in ein Layout mit Client-interaktivem Teil umbauen.

Neues Client-Wrapper erstellen — oder besser: den Tab-Teil als separaten Client Component extrahieren:

Create: `src/components/team/team-detail-content.tsx`

```tsx
// src/components/team/team-detail-content.tsx
'use client';

import { useState } from 'react';
import { Users, CheckSquare, MessageSquare } from 'lucide-react';
import { AgentList } from '@/components/team/agent-list';
import { TaskBoard } from '@/components/team/task-board';
import { MessagePanel } from '@/components/chat/message-panel';
import { TeamTabs } from '@/components/team/team-tabs';
import { useIsMobile } from '@/hooks/use-mobile';

interface TeamDetailContentProps {
  hostId: string;
  teamName: string;
  team: { members: Array<{ status: string; name: string; agentType: string; model?: string }> };
  tasks: Array<{ status: string; subject: string; owner?: string; blockedBy?: string[] }>;
}

const tabDefs = [
  { id: 'agents', label: 'Agents', icon: <Users size={12} /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={12} /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={12} /> },
];

export function TeamDetailContent({ hostId, teamName, team, tasks }: TeamDetailContentProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('agents');

  // Desktop: 3-Spalten Grid wie bisher
  if (!isMobile) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 animate-fade-in stagger-2">
          <div className="flex items-center gap-2 mb-3">
            <Users size={12} className="text-[#a78bfa]" />
            <h2 className="text-label">AGENTS</h2>
          </div>
          <AgentList hostId={hostId} teamName={teamName} initialAgents={team.members} />
        </div>
        <div className="panel p-4 animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={12} className="text-[#22d3ee]" />
            <h2 className="text-label">TASKS</h2>
          </div>
          <TaskBoard hostId={hostId} teamName={teamName} initialTasks={tasks} />
        </div>
        <div className="panel p-4 flex flex-col animate-fade-in stagger-4" style={{ maxHeight: '600px' }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={12} className="text-[#34d399]" />
            <h2 className="text-label">MESSAGES</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <MessagePanel hostId={hostId} teamName={teamName} />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Tab-basiert
  return (
    <div className="panel flex flex-col" style={{ minHeight: '400px' }}>
      <TeamTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabDefs} />
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'agents' && (
          <AgentList hostId={hostId} teamName={teamName} initialAgents={team.members} />
        )}
        {activeTab === 'tasks' && (
          <TaskBoard hostId={hostId} teamName={teamName} initialTasks={tasks} />
        )}
        {activeTab === 'messages' && (
          <div className="h-full">
            <MessagePanel hostId={hostId} teamName={teamName} />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Team-Detail-Page anpassen**

In `src/app/teams/[teamId]/page.tsx`, den 3-Spalten Grid Block (Zeilen 97-127) ersetzen:

Imports aendern — `Users, CheckSquare, MessageSquare` entfernen, stattdessen:

```ts
import { TeamDetailContent } from '@/components/team/team-detail-content';
```

(AgentList, TaskBoard, MessagePanel Imports entfernen — die sind jetzt im Content-Component)

Den Grid-Block (Zeilen 97-127) ersetzen durch:

```tsx
<TeamDetailContent
  hostId={hostId}
  teamName={teamName}
  team={team}
  tasks={tasks}
/>
```

**Step 4: Commit**

```bash
git add src/components/team/team-tabs.tsx src/components/team/team-detail-content.tsx src/app/teams/[teamId]/page.tsx
git commit -m "feat: Team-Detail mit Tabs auf Mobile, 3-Spalten auf Desktop"
```

---

### Task 9: Formulare und Dialoge mobilfreundlich

**Files:**
- Modify: `src/components/host/host-form.tsx:107` (Grid)
- Modify: `src/components/ui/dialog.tsx:45-47` (Breite)
- Modify: `src/components/ui/button.tsx` (Touch Targets)

**Step 1: HostForm responsive Grid**

In `src/components/host/host-form.tsx`, beide `grid grid-cols-2` (Zeilen 107 und 124) aendern zu:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

**Step 2: Dialog Mobile-Breite**

In `src/components/ui/dialog.tsx`, den Panel-className (Zeile 46) aendern:

```tsx
'relative z-10 w-full max-w-lg mx-3 md:mx-4 max-h-[90vh] overflow-y-auto panel-elevated animate-fade-in',
```

**Step 3: Button Touch-Targets**

In `src/components/ui/button.tsx`, die Size-Definitionen anpassen — `min-height` hinzufuegen:

```ts
{
  'py-1 px-2 text-[11px] min-h-[36px]': size === 'sm',
  'py-1.5 px-3 text-[13px] min-h-[40px]': size === 'md',
  'py-2 px-4 text-sm min-h-[44px]': size === 'lg',
},
```

**Step 4: Commit**

```bash
git add src/components/host/host-form.tsx src/components/ui/dialog.tsx src/components/ui/button.tsx
git commit -m "feat: Formulare, Dialoge und Buttons mobilfreundlich (Touch-Targets, responsive Grid)"
```

---

### Task 10: Dashboard und Content Padding Mobile

**Files:**
- Modify: `src/app/layout.tsx` (Mobile Content Padding)
- Modify: `src/app/page.tsx` (kleinere Anpassungen)

**Step 1: Content Padding auf Mobile reduzieren**

In `src/app/layout.tsx`, den Content-Wrapper aendern:

```tsx
<div className="p-4 md:p-6">
  {children}
</div>
```

**Step 2: Dashboard Hero kleiner auf Mobile**

In `src/app/page.tsx`, den Hero-Titel responsive machen:

```tsx
<h1 className="text-xl md:text-2xl font-medium text-[#c8d6e5] tracking-tight">
```

**Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: Reduziertes Padding und kleinere Titel auf Mobile"
```

---

### Task 11: Terminal Session-Picker Mobile-Optimierung

**Files:**
- Modify: `src/app/terminal/page.tsx` (Session-Liste)

**Step 1: Pruefen und anpassen**

Die Terminal-Uebersichtsseite (`/terminal/page.tsx`) muss auf Mobile volle Breite nutzen. Pruefen ob dort Grid-Layouts sind die angepasst werden muessen, und Touch-Targets fuer Session-Buttons sicherstellen.

Session-Buttons sollten `min-h-[44px]` haben fuer Touch-Freundlichkeit.

**Step 2: Commit**

```bash
git add src/app/terminal/page.tsx
git commit -m "feat: Terminal Session-Picker mobilfreundlich"
```

---

### Task 12: Abschluss-Test und Polish

**Step 1: Dev Server starten und auf echtem Smartphone testen**

```bash
tsx watch server/index.ts
```

Auf dem Smartphone den Tailscale-Host aufrufen und folgende Flows pruefen:
- [ ] Dashboard laedt korrekt, Bottom Tabs sichtbar
- [ ] Navigation ueber Bottom Tabs funktioniert
- [ ] Sidebar ist nicht sichtbar
- [ ] Host-Liste zeigt Cards in einer Spalte
- [ ] Terminal oeffnen → Fullscreen, Spezial-Tasten sichtbar
- [ ] Terminal Close-Button → zurueck zur Session-Liste
- [ ] Team-Detail zeigt Tabs (Agents/Tasks/Messages)
- [ ] Settings-Formular ist einspaltiges Grid
- [ ] Dialoge nutzen volle Breite
- [ ] Kein ungewollter Zoom bei Input-Fokus
- [ ] Touch-Targets sind alle mindestens 36px hoch

**Step 2: Letzte Korrekturen committen**

```bash
git add -A
git commit -m "fix: Mobile-Polish nach manuellem Test"
```

---

## Zusammenfassung der neuen Dateien

| Datei | Beschreibung |
|---|---|
| `src/hooks/use-mobile.ts` | `useIsMobile()` Hook |
| `src/components/layout/bottom-tab-bar.tsx` | Mobile Bottom Navigation |
| `src/components/terminal/terminal-keys-toolbar.tsx` | Spezial-Tasten fuer Mobile Terminal |
| `src/components/team/team-tabs.tsx` | Tab-Navigation fuer Team-Detail |
| `src/components/team/team-detail-content.tsx` | Client-Wrapper fuer Team-Detail (Mobile Tabs / Desktop Grid) |

## Zusammenfassung der geaenderten Dateien

| Datei | Aenderung |
|---|---|
| `src/app/globals.css` | Mobile CSS Custom Properties + Media Query |
| `src/app/layout.tsx` | Viewport Meta, BottomTabBar, Mobile Padding |
| `src/components/layout/sidebar.tsx` | `hidden md:flex` |
| `src/app/terminal/[sessionId]/page.tsx` | Fullscreen Mobile + Keys Toolbar Integration |
| `src/components/terminal/terminal-view.tsx` | `onSendData` Prop, `touch-action` |
| `src/app/teams/[teamId]/page.tsx` | TeamDetailContent statt inline Grid |
| `src/components/host/host-form.tsx` | Responsive Grid `grid-cols-1 md:grid-cols-2` |
| `src/components/ui/dialog.tsx` | Mobile Breite + max-height + scroll |
| `src/components/ui/button.tsx` | Touch-Target min-height |
| `src/app/page.tsx` | Responsive Titel-Groesse |
