# Multi-Session Terminal Tabs — Implementierungsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mehrere SSH-Sessions gleichzeitig auf einer `/terminal`-Seite offen halten — über verschiedene Hosts hinweg, persistent in PostgreSQL.

**Architecture:** Single-Page Tab Manager auf `/terminal`. Alle Terminal-Instanzen bleiben gleichzeitig gemountet (aktiver Tab `display:block`, Rest `display:none`). Tabs werden in einer neuen `terminal_tabs` DB-Tabelle persistiert und beim nächsten Besuch wiederhergestellt. Neuer Session-Picker-Dialog zeigt alle Hosts mit deren tmux-Sessions.

**Tech Stack:** Next.js 15 (App Router), React 19, Drizzle ORM, PostgreSQL 16, socket.io, xterm.js, Tailwind CSS 4

---

## Task 1: DB-Schema — `terminal_tabs` Tabelle

**Files:**
- Modify: `src/lib/db/schema.ts` (neue Tabelle hinzufügen, Zeile 38)

**Step 1: Schema erweitern**

In `src/lib/db/schema.ts` nach der `preferences`-Tabelle die neue `terminalTabs`-Tabelle hinzufügen:

```typescript
export const terminalTabs = pgTable('terminal_tabs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLogin: text('user_login').notNull(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  sessionName: text('session_name').notNull(),
  pane: text('pane').notNull().default('0'),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Step 2: Migration generieren**

Run: `npx drizzle-kit generate`
Expected: Neue Migration in `src/lib/db/migrations/`

**Step 3: Migration anwenden**

Run: `npx drizzle-kit push`
Expected: Tabelle `terminal_tabs` in PostgreSQL erstellt

**Step 4: Commit**

```
feat: DB-Schema für terminal_tabs Tabelle
```

---

## Task 2: API-Routen für Tab-Verwaltung

**Files:**
- Create: `src/app/api/terminal/tabs/route.ts`
- Create: `src/app/api/terminal/tabs/[id]/route.ts`
- Create: `src/app/api/terminal/tabs/reorder/route.ts`

**Step 1: GET + POST Route erstellen**

Datei `src/app/api/terminal/tabs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { terminalTabs, hosts } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';

// GET: Alle Tabs des Users laden (mit Host-Name)
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({
        id: terminalTabs.id,
        hostId: terminalTabs.hostId,
        hostName: hosts.name,
        sessionName: terminalTabs.sessionName,
        pane: terminalTabs.pane,
        position: terminalTabs.position,
        isActive: terminalTabs.isActive,
      })
      .from(terminalTabs)
      .leftJoin(hosts, eq(terminalTabs.hostId, hosts.id))
      .where(eq(terminalTabs.userLogin, user.login))
      .orderBy(asc(terminalTabs.position));

    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Neuen Tab erstellen
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { hostId, sessionName, pane = '0' } = body;

    if (!hostId || !sessionName) {
      return NextResponse.json({ error: 'hostId and sessionName required' }, { status: 400 });
    }

    // Position = nächste freie
    const existing = await db
      .select({ position: terminalTabs.position })
      .from(terminalTabs)
      .where(eq(terminalTabs.userLogin, user.login))
      .orderBy(asc(terminalTabs.position));

    const nextPos = existing.length > 0
      ? existing[existing.length - 1].position + 1
      : 0;

    // Alle anderen Tabs deaktivieren
    await db
      .update(terminalTabs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(terminalTabs.userLogin, user.login));

    // Neuen Tab erstellen (aktiv)
    const [tab] = await db
      .insert(terminalTabs)
      .values({
        userLogin: user.login,
        hostId,
        sessionName,
        pane,
        position: nextPos,
        isActive: true,
      })
      .returning();

    // Host-Name nachladen
    const [host] = await db
      .select({ name: hosts.name })
      .from(hosts)
      .where(eq(hosts.id, hostId))
      .limit(1);

    return NextResponse.json({
      ...tab,
      hostName: host?.name ?? 'Unknown',
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: DELETE + PATCH Route erstellen**

Datei `src/app/api/terminal/tabs/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { terminalTabs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// DELETE: Tab entfernen
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    await db
      .delete(terminalTabs)
      .where(and(eq(terminalTabs.id, id), eq(terminalTabs.userLogin, user.login)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Tab aktualisieren (isActive, position)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    // Wenn dieser Tab aktiv wird, alle anderen deaktivieren
    if (body.isActive) {
      await db
        .update(terminalTabs)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(terminalTabs.userLogin, user.login));
    }

    const [updated] = await db
      .update(terminalTabs)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(terminalTabs.id, id), eq(terminalTabs.userLogin, user.login)))
      .returning();

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 3: Reorder Route erstellen**

Datei `src/app/api/terminal/tabs/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { terminalTabs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';

// PUT: Batch-Reorder aller Tabs
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body: { ids: string[] } = await req.json();

    if (!Array.isArray(body.ids)) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    // Update positions according to array order
    await Promise.all(
      body.ids.map((id, index) =>
        db
          .update(terminalTabs)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(terminalTabs.id, id), eq(terminalTabs.userLogin, user.login)))
      )
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 4: Commit**

```
feat: API-Routen für Terminal-Tab-Verwaltung (CRUD + Reorder)
```

---

## Task 3: TerminalTab-Typ erweitern

**Files:**
- Modify: `src/components/terminal/terminal-tabs.tsx` (TerminalTab Interface, Zeile 6-12)

**Step 1: Interface erweitern**

Das bestehende `TerminalTab` Interface in `terminal-tabs.tsx` erweitern:

```typescript
export interface TerminalTab {
  id: string;
  hostId: string;
  hostName: string;     // NEU: Anzeige-Name des Hosts
  sessionName: string;
  pane: string;         // war optional, jetzt required mit default '0'
  label: string;
  position: number;     // NEU: Sortierung
  isActive: boolean;    // NEU: aus DB
}
```

**Step 2: Tab-Label mit Host-Name anzeigen**

In der Tab-Rendering-Logik (`terminal-tabs.tsx`, Zeile 51) den Label-Text anpassen, damit der Host-Name sichtbar ist:

```typescript
<span className="max-w-[120px] truncate">{tab.hostName}:{tab.sessionName}</span>
```

Statt `{tab.label}`.

**Step 3: Commit**

```
refactor: TerminalTab-Interface um hostName, position, isActive erweitern
```

---

## Task 4: SessionPickerDialog — Multi-Host Session-Auswahl

**Files:**
- Create: `src/components/terminal/session-picker-dialog.tsx`

**Step 1: Dialog-Komponente erstellen**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Server, Terminal, Plus } from 'lucide-react';
import type { Host, TmuxSession } from '@/types';

interface SessionPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (hostId: string, hostName: string, sessionName: string, pane?: string) => void;
  existingTabs: Array<{ hostId: string; sessionName: string; pane: string }>;
}

export function SessionPickerDialog({ open, onClose, onSelect, existingTabs }: SessionPickerDialogProps) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [sessions, setSessions] = useState<TmuxSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Hosts laden wenn Dialog öffnet
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedHost(null);
    setSessions([]);
    fetch('/api/hosts')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setHosts(Array.isArray(data) ? data : []))
      .catch(() => setHosts([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Sessions laden wenn Host gewählt
  const loadSessions = useCallback(async (hostId: string) => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/hosts/${hostId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoadingSessions(false);
  }, []);

  const handleSelectHost = (host: Host) => {
    setSelectedHost(host);
    setShowCreate(false);
    setError('');
    loadSessions(host.id);
  };

  const isTabOpen = (hostId: string, sessionName: string, pane = '0') =>
    existingTabs.some((t) => t.hostId === hostId && t.sessionName === sessionName && t.pane === pane);

  const handleCreateSession = async () => {
    if (!selectedHost) return;
    const name = newName.trim();
    if (!name) { setError('Name erforderlich'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/hosts/${selectedHost.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Fehler');
        setCreating(false);
        return;
      }
      onSelect(selectedHost.id, selectedHost.name, name);
      setNewName('');
      setShowCreate(false);
    } catch {
      setError('Verbindungsfehler');
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Neue Session verbinden">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Spinner size="sm" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade Hosts...</span>
        </div>
      ) : hosts.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Keine Hosts konfiguriert.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Host-Karten */}
          <div className="grid grid-cols-2 gap-2">
            {hosts.map((host) => (
              <button
                key={host.id}
                onClick={() => handleSelectHost(host)}
                disabled={!host.isOnline}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-sm text-left transition-colors ${
                  selectedHost?.id === host.id
                    ? 'ring-1 ring-[#22d3ee] bg-[#0b0e11]'
                    : host.isOnline
                      ? 'hover:bg-[#0b0e11] cursor-pointer'
                      : 'opacity-40 cursor-default'
                }`}
                style={{ border: '1px solid var(--border-default)' }}
              >
                <Server size={13} className={host.isOnline ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#c8d6e5] truncate">{host.name}</p>
                  <Badge variant={host.isOnline ? 'online' : 'offline'} className="mt-0.5">
                    {host.isOnline ? 'online' : 'offline'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          {/* Sessions des gewählten Hosts */}
          {selectedHost && (
            <div>
              <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Sessions auf {selectedHost.name}
              </p>

              {loadingSessions ? (
                <div className="flex items-center justify-center gap-1.5 py-3">
                  <Spinner size="sm" />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Lade...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {sessions.map((session) => {
                    const alreadyOpen = isTabOpen(selectedHost.id, session.name);
                    return (
                      <button
                        key={session.name}
                        onClick={() => onSelect(selectedHost.id, selectedHost.name, session.name)}
                        disabled={alreadyOpen}
                        className={`flex items-center gap-3 px-3 py-2 rounded-sm text-left transition-colors ${
                          alreadyOpen
                            ? 'opacity-40 cursor-default'
                            : 'hover:bg-[#111519] cursor-pointer'
                        }`}
                        style={{ border: '1px solid var(--border-subtle)' }}
                      >
                        <Terminal size={12} className="text-[#22d3ee]" />
                        <div className="flex-1">
                          <span className="text-[12px] text-[#c8d6e5]">{session.name}</span>
                          <span className="text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>
                            {session.windows} Window{session.windows !== 1 ? 's' : ''}
                          </span>
                          {alreadyOpen && (
                            <span className="text-[11px] ml-2 text-[#22d3ee]">· geöffnet</span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {sessions.length === 0 && (
                    <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
                      Keine aktiven Sessions
                    </p>
                  )}
                </div>
              )}

              {/* Neue Session erstellen */}
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-3 py-2 mt-2 w-full rounded-sm text-left transition-colors hover:bg-[#111519]"
                  style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}
                >
                  <Plus size={12} />
                  <span className="text-[12px]">Neue Session erstellen</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleCreateSession(); }}
                  className="flex items-center gap-2 mt-2"
                >
                  <Input
                    placeholder="session-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    error={error}
                    autoFocus
                    className="flex-1"
                  />
                  <Button variant="primary" size="sm" type="submit" disabled={creating}>
                    {creating ? <Spinner size="sm" /> : 'Erstellen'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
```

**Step 2: Commit**

```
feat: SessionPickerDialog mit Multi-Host-Auswahl
```

---

## Task 5: TerminalView — `visible` Prop hinzufügen

**Files:**
- Modify: `src/components/terminal/terminal-view.tsx` (Props + fit-Logik)

**Step 1: Props erweitern**

In `TerminalViewProps` (Zeile 11-19) neues Prop hinzufügen:

```typescript
export interface TerminalViewProps {
  hostId: string;
  sessionName: string;
  pane?: string;
  fontSize?: number;
  fontFamily?: string;
  className?: string;
  visible?: boolean;        // NEU: ob der Tab sichtbar ist
  onSendData?: (sendFn: (data: string) => void) => void;
}
```

**Step 2: Destructuring anpassen**

In der Funktionssignatur (Zeile 21-29) `visible = true` hinzufügen.

**Step 3: fit() bei visible-Wechsel**

Nach dem bestehenden `useEffect` für die Socket-Verbindung (~Zeile 117) einen neuen Effect hinzufügen:

```typescript
// Re-fit wenn Tab sichtbar wird
useEffect(() => {
  if (visible && fitAddon && ready) {
    // Kleines Delay damit der Container seine Dimensionen hat
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        // Resize-Event ans Server-Ende senden
        if (terminal && socketRef.current) {
          socketRef.current.emit('terminal:resize', {
            cols: terminal.cols,
            rows: terminal.rows,
          });
        }
      } catch { /* ignore */ }
    });
  }
}, [visible, fitAddon, ready, terminal]);
```

**Step 4: Commit**

```
feat: TerminalView mit visible-Prop für Hintergrund-Tabs
```

---

## Task 6: Neue `/terminal`-Seite (TabManager)

**Files:**
- Rewrite: `src/app/terminal/page.tsx` (bestehende Session-Browser-Seite wird zum TabManager)

**Step 1: Bestehende Seite komplett ersetzen**

Die aktuelle `src/app/terminal/page.tsx` (Session-Browser) komplett ersetzen:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { TerminalView } from '@/components/terminal/terminal-view';
import { TerminalTabs, type TerminalTab } from '@/components/terminal/terminal-tabs';
import { TerminalToolbar } from '@/components/terminal/terminal-toolbar';
import { TerminalKeysToolbar } from '@/components/terminal/terminal-keys-toolbar';
import { SessionPickerDialog } from '@/components/terminal/session-picker-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Terminal, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DbTab {
  id: string;
  hostId: string;
  hostName: string | null;
  sessionName: string;
  pane: string;
  position: number;
  isActive: boolean;
}

function dbTabToTab(dt: DbTab): TerminalTab {
  const hostName = dt.hostName ?? 'Unknown';
  return {
    id: dt.id,
    hostId: dt.hostId,
    hostName,
    sessionName: dt.sessionName,
    pane: dt.pane ?? '0',
    label: `${hostName}:${dt.sessionName}`,
    position: dt.position,
    isActive: dt.isActive,
  };
}

export default function TerminalPage() {
  const isMobile = useIsMobile();
  const vpHeight = useVisualViewport();
  const router = useRouter();

  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [sendData, setSendData] = useState<((data: string) => void) | null>(null);
  const [fontSize, setFontSize] = useState(14);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Tabs aus DB laden
  useEffect(() => {
    fetch('/api/terminal/tabs')
      .then((r) => r.ok ? r.json() : [])
      .then((data: DbTab[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setLoading(false);
          setShowPicker(true); // Kein Tab vorhanden → Dialog zeigen
          return;
        }
        const mapped = data.map(dbTabToTab);
        setTabs(mapped);
        const active = mapped.find((t) => t.isActive) ?? mapped[0];
        setActiveTabId(active.id);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setShowPicker(true);
      });
  }, []);

  // Aktiven Tab in DB speichern (debounced)
  useEffect(() => {
    if (!activeTabId) return;
    const timer = setTimeout(() => {
      fetch(`/api/terminal/tabs/${activeTabId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTabId]);

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
  };

  const handleCloseTab = async (id: string) => {
    // Aus DB löschen
    fetch(`/api/terminal/tabs/${id}`, { method: 'DELETE' }).catch(() => {});

    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);

    if (id === activeTabId) {
      if (newTabs.length > 0) {
        const nextIdx = Math.max(0, idx - 1);
        setActiveTabId(newTabs[nextIdx].id);
      } else {
        setActiveTabId(null);
        setShowPicker(true);
      }
    }
  };

  const handleAddTab = () => {
    setShowPicker(true);
  };

  const handleSelectSession = async (hostId: string, hostName: string, sessionName: string, pane = '0') => {
    // Duplikat-Check
    const existing = tabs.find(
      (t) => t.hostId === hostId && t.sessionName === sessionName && t.pane === pane
    );
    if (existing) {
      setActiveTabId(existing.id);
      setShowPicker(false);
      return;
    }

    // In DB erstellen
    try {
      const res = await fetch('/api/terminal/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, sessionName, pane }),
      });
      if (!res.ok) return;
      const dbTab: DbTab = await res.json();
      const newTab = dbTabToTab(dbTab);
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch { /* ignore */ }

    setShowPicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <Spinner size="md" />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade Sessions...</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        position: 'fixed',
        top: isMobile ? 0 : 'var(--header-height)',
        left: isMobile ? 0 : 'var(--sidebar-width)',
        right: 0,
        overscrollBehavior: 'none',
        ...(isMobile && vpHeight != null
          ? { height: vpHeight }
          : { bottom: 0 }),
      }}
    >
      {/* Mobile header */}
      {isMobile && (
        <div
          className="flex items-center justify-between px-3 shrink-0"
          style={{ height: '36px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Terminal</span>
          <button
            onClick={() => router.push('/')}
            className="w-7 h-7 flex items-center justify-center rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tab bar — nur wenn mindestens 1 Tab */}
      {tabs.length > 0 && (
        <TerminalTabs
          tabs={tabs}
          activeTabId={activeTabId ?? ''}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onAddTab={handleAddTab}
        />
      )}

      {/* Terminal-Instanzen: ALLE gemountet, nur aktiver sichtbar */}
      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              display: tab.id === activeTabId ? 'block' : 'none',
              position: 'absolute',
              inset: 0,
            }}
          >
            <TerminalView
              hostId={tab.hostId}
              sessionName={tab.sessionName}
              pane={tab.pane}
              fontSize={isMobile ? 12 : fontSize}
              visible={tab.id === activeTabId}
              className="w-full h-full"
              onSendData={tab.id === activeTabId ? (fn) => setSendData(() => fn) : undefined}
            />
          </div>
        ))}

        {/* Leerer State */}
        {tabs.length === 0 && !showPicker && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="w-16 h-16 rounded-sm flex items-center justify-center"
              style={{ background: 'var(--terminal-bg)', border: '1px solid var(--border-default)' }}
            >
              <Terminal size={24} className="text-[#22d3ee]" style={{ filter: 'drop-shadow(0 0 8px var(--cyan))' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Keine offenen Sessions</p>
            <button
              onClick={() => setShowPicker(true)}
              className="btn btn-primary"
            >
              <Plus size={13} />
              Session verbinden
            </button>
          </div>
        )}
      </div>

      {/* Bottom toolbar — Desktop */}
      {!isMobile && activeTab && (
        <TerminalToolbar
          hostName={activeTab.hostName}
          sessionName={activeTab.sessionName}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
        />
      )}

      {/* Mobile keys toolbar */}
      {isMobile && activeTab && sendData && (
        <TerminalKeysToolbar onKey={sendData} />
      )}

      {/* Session-Picker Dialog */}
      <SessionPickerDialog
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectSession}
        existingTabs={tabs.map((t) => ({ hostId: t.hostId, sessionName: t.sessionName, pane: t.pane }))}
      />
    </div>
  );
}
```

**Step 2: Commit**

```
feat: Terminal-Seite als Multi-Session TabManager mit DB-Persistenz
```

---

## Task 7: Redirect von `/terminal/[sessionId]`

**Files:**
- Modify: `src/app/terminal/[sessionId]/page.tsx` (Redirect)

**Step 1: Seite zu Redirect umbauen**

Die bestehende `[sessionId]/page.tsx` durch einen Redirect ersetzen. Beim Aufruf von `/terminal/<hostId>?session=main` wird ein Tab in der DB angelegt und dann auf `/terminal` weitergeleitet:

```typescript
'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ session?: string; pane?: string }>;
}

export default function TerminalRedirect({ params, searchParams }: Props) {
  const { sessionId: hostId } = use(params);
  const { session: sessionName = 'main', pane = '0' } = use(searchParams);
  const router = useRouter();

  useEffect(() => {
    // Tab in DB anlegen, dann redirect
    fetch('/api/terminal/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId, sessionName, pane }),
    })
      .then(() => router.replace('/terminal'))
      .catch(() => router.replace('/terminal'));
  }, [hostId, sessionName, pane, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Weiterleitung...</span>
    </div>
  );
}
```

**Step 2: Commit**

```
feat: /terminal/[sessionId] leitet auf /terminal um (Abwärtskompatibilität)
```

---

## Task 8: Links im Dashboard aktualisieren

**Files:**
- Modify: `src/app/page.tsx` — Quick Nav Tile "Terminal" Link
- Modify: `src/app/terminal/page.tsx` — bereits erledigt (ist jetzt der TabManager)

**Step 1: Dashboard-Links prüfen und anpassen**

In `src/app/page.tsx` alle Links die auf `/terminal/<hostId>?session=<name>` zeigen so lassen — das Redirect (Task 7) fängt sie auf. Der Quick Nav Tile "Terminal" sollte bereits auf `/terminal` zeigen.

Prüfen ob es andere Stellen gibt die auf die alte Route verlinken (z.B. Session-Chips auf dem Dashboard). Diese können so bleiben, da der Redirect greift.

**Step 2: Commit**

```
chore: Dashboard-Links für neue Terminal-Route verifiziert
```

---

## Task 9: Smoke-Test & Feinschliff

**Step 1: Dev-Server starten**

Run: `tsx watch server/index.ts`

**Step 2: Manuell testen**

1. `/terminal` aufrufen → Dialog sollte erscheinen (keine Tabs vorhanden)
2. Host auswählen → Sessions laden
3. Session anklicken → Tab wird erstellt, Terminal verbindet
4. [+] klicken → Dialog öffnet, anderen Host/Session wählen
5. Zwischen Tabs wechseln → sofort, kein Flackern
6. Seite refreshen → Tabs werden aus DB geladen, letzter aktiver Tab wiederhergestellt
7. Tab schließen → aus DB entfernt
8. Letzten Tab schließen → "Keine Sessions" Anzeige
9. Alten Link `/terminal/<hostId>?session=main` aufrufen → Redirect auf `/terminal`

**Step 3: Commit**

```
fix: Feinschliff nach Smoke-Test (falls nötig)
```

---

## Zusammenfassung der Dateien

| Aktion | Datei |
|--------|-------|
| Modify | `src/lib/db/schema.ts` |
| Create | `src/app/api/terminal/tabs/route.ts` |
| Create | `src/app/api/terminal/tabs/[id]/route.ts` |
| Create | `src/app/api/terminal/tabs/reorder/route.ts` |
| Modify | `src/components/terminal/terminal-tabs.tsx` |
| Create | `src/components/terminal/session-picker-dialog.tsx` |
| Modify | `src/components/terminal/terminal-view.tsx` |
| Rewrite | `src/app/terminal/page.tsx` |
| Rewrite | `src/app/terminal/[sessionId]/page.tsx` |
| Verify | `src/app/page.tsx` |
