# Mega Feature Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Erweiterung des Remote Team Dashboards um 14 Features in 4 Wellen — von read-only Monitoring zu interaktiver Plattform mit File-Browser, Analytics, Theme-System, Shared Terminal und mehr.

**Architecture:** Wellen-basierte Umsetzung. Welle 1 legt DB-Schema und Backend-Grundlagen. Welle 2 baut neue Seiten/APIs. Welle 3 poliert UX. Welle 4 bringt Collaboration-Features. Innerhalb jeder Welle koennen Tasks parallel bearbeitet werden.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Drizzle ORM + PostgreSQL 16, socket.io 4, ssh2, xterm.js, Tailwind CSS 4, Zustand, Zod

**Sprache:** Alle Commits, Docs und Kommunikation auf Deutsch.

**Wichtig:** NIEMALS selbst committen — immer Scribe spawnen.

---

## Welle 1 — Foundation

---

### Task 1: DB-Schema-Erweiterungen

**Files:**
- Modify: `src/lib/db/schema.ts` (nach Zeile 50)
- Create: neue Drizzle-Migration via `npm run db:generate`

**Step 1: Neue Tabellen in Schema definieren**

In `src/lib/db/schema.ts` nach der `terminalTabs`-Tabelle (Zeile 50) einfuegen:

```typescript
// Alert-History — persistente Benachrichtigungen
export const alertHistory = pgTable('alert_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // host_offline | team_complete | agent_status
  severity: text('severity').notNull(), // info | warning | error | success
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Task-History — Snapshots von Claude-Task-Aenderungen
export const taskHistory = pgTable('task_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  teamName: text('team_name').notNull(),
  externalTaskId: text('external_task_id').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull(),
  owner: text('owner'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Session-Templates — gespeicherte tmux-Layouts
export const sessionTemplates = pgTable('session_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userLogin: text('user_login').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  layout: jsonb('layout').$type<{
    panes: Array<{ index: number; width: number; height: number; command?: string }>
    splits: string // z.B. "horizontal" | "vertical" | "grid"
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Host-Gruppen — Kategorisierung von Hosts
export const hostGroups = pgTable('host_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

Ausserdem `hosts`-Tabelle erweitern — `groupId` Spalte hinzufuegen (Zeile ~16):

```typescript
groupId: uuid('group_id').references(() => hostGroups.id, { onDelete: 'set null' }),
```

**Step 2: Migration generieren und ausfuehren**

```bash
npm run db:generate
npm run db:migrate
```

**Step 3: Types aktualisieren**

In `src/types/index.ts` (nach Zeile 143) neue Interfaces hinzufuegen:

```typescript
export interface AlertHistoryItem {
  id: string
  hostId: string | null
  type: string
  severity: 'info' | 'warning' | 'error' | 'success'
  message: string
  metadata: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface TaskHistoryItem {
  id: string
  hostId: string
  teamName: string
  externalTaskId: string
  subject: string
  status: string
  owner: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface SessionTemplate {
  id: string
  userLogin: string
  name: string
  description: string | null
  layout: {
    panes: Array<{ index: number; width: number; height: number; command?: string }>
    splits: string
  }
  createdAt: string
  updatedAt: string
}

export interface HostGroup {
  id: string
  name: string
  color: string
  position: number
  createdAt: string
}
```

`Host`-Interface erweitern (Zeile ~14):
```typescript
groupId: string | null
```

**Step 4: Commit via Scribe**

```
feat: DB-Schema um alertHistory, taskHistory, sessionTemplates, hostGroups erweitert
```

---

### Task 2: SSH-Agent-Forwarding

**Files:**
- Modify: `src/lib/ssh/pool.ts:38-86` (createConnection Methode)

**Step 1: Agent-Support in createConnection einbauen**

In `src/lib/ssh/pool.ts`, `createConnection()` — dort wo die SSH-Config gebaut wird, eine Fallunterscheidung fuer `authMethod === 'agent'` hinzufuegen:

```typescript
// In createConnection(), wo die connect-Config gebaut wird:
const connectConfig: ConnectConfig = {
  host: hostConfig.hostname,
  port: hostConfig.port,
  username: hostConfig.username,
  keepaliveInterval: 30000,
}

if (hostConfig.authMethod === 'agent') {
  connectConfig.agent = process.env.SSH_AUTH_SOCK
} else {
  // Bestehende Key-Logik
  const key = hostConfig.privateKeyEnv
    ? process.env[hostConfig.privateKeyEnv]
    : hostConfig.privateKey
  if (key) connectConfig.privateKey = key
}
```

**Step 2: Test — Host mit authMethod 'agent' anlegen**

Ueber die UI einen Host mit Auth-Method "SSH Agent" erstellen und Verbindungstest durchfuehren.

**Step 3: Commit via Scribe**

```
feat: SSH-Agent-Forwarding fuer authMethod 'agent' implementiert
```

---

### Task 3: Team-Messages Backend

**Files:**
- Modify: `src/lib/claude/poller.ts:41-134` (pollHost — Messages extrahieren)
- Modify: `src/lib/claude/types.ts` (Message-Type hinzufuegen)
- Create: `src/app/api/hosts/[id]/teams/[name]/messages/route.ts`
- Modify: `src/lib/socket/updates.ts` (teams:messages Event)
- Modify: `src/components/chat/message-panel.tsx` (Daten-Anbindung)

**Step 1: Message-Typ definieren**

In `src/lib/claude/types.ts` (nach Zeile 29):

```typescript
export interface ClaudeMessage {
  id: string
  from: string
  to: string | 'broadcast'
  content: string
  timestamp: string
  teamName: string
}
```

`HostTeamState` erweitern:
```typescript
export interface HostTeamState {
  hostId: string
  teams: ClaudeTeam[]
  tasks: Map<string, ClaudeTask[]>
  messages: Map<string, ClaudeMessage[]> // NEU
  timestamp: number
}
```

**Step 2: Poller erweitern — Messages aus Team-Config lesen**

In `src/lib/claude/poller.ts`, innerhalb von `pollHost()` nach dem Task-Parsing (ca. Zeile 74):

```typescript
// Messages aus ~/.claude/teams/{name}/messages/ lesen (falls vorhanden)
const messagesMap = new Map<string, ClaudeMessage[]>()
for (const teamName of teamNames) {
  try {
    const msgOutput = await sshPool.exec(hostId, `cat ~/.claude/teams/${teamName}/messages/*.json 2>/dev/null || true`)
    if (msgOutput.trim()) {
      const messages = msgOutput.trim().split('\n')
        .filter(line => line.startsWith('{'))
        .map(line => {
          try { return JSON.parse(line) } catch { return null }
        })
        .filter(Boolean) as ClaudeMessage[]
      messagesMap.set(teamName, messages)
    }
  } catch {
    // Messages sind optional
  }
}
```

**Step 3: API-Endpunkt erstellen**

Neue Datei `src/app/api/hosts/[id]/teams/[name]/messages/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getCachedTeamState } from '@/lib/claude/poller'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  await requireUser()
  const { id: hostId, name: teamName } = await params

  const state = getCachedTeamState(hostId)
  if (!state) {
    return NextResponse.json({ messages: [] })
  }

  const messages = state.messages?.get(teamName) ?? []
  return NextResponse.json({ messages })
}
```

**Step 4: Socket.io Event emittieren**

In `src/lib/socket/updates.ts` bzw. in der Poller-Emit-Logik: neben `teams:state` auch `teams:messages` emittieren:

```typescript
updatesNamespace.to(`host:${hostId}`).emit('teams:messages', {
  hostId,
  teamName,
  messages: state.messages?.get(teamName) ?? [],
})
```

**Step 5: MessagePanel anbinden**

In `src/components/chat/message-panel.tsx` (Zeile 34): Der Fetch-Endpunkt existiert schon als Placeholder. Sicherstellen dass er auf die neue API zeigt und Socket-Events verarbeitet.

**Step 6: Commit via Scribe**

```
feat: Team-Messages Backend mit API, Socket.io und Poller-Integration
```

---

### Task 4: Notification-Persistence

**Files:**
- Modify: `src/lib/notifications/alerts.ts:69-185` (DB-Writes hinzufuegen)
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`
- Create: `src/app/api/notifications/read-all/route.ts`
- Modify: `src/components/layout/notification-center.tsx` (API-Anbindung)

**Step 1: Alert-DB-Write in evaluateAlerts() einbauen**

In `src/lib/notifications/alerts.ts`, import hinzufuegen:

```typescript
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
```

An jeder Stelle wo ein Alert erstellt wird (Zeilen 96-108, 138-148, 168-179), zusaetzlich:

```typescript
// Nach dem Alert-Objekt erstellt wurde:
await db.insert(alertHistory).values({
  hostId: alert.hostId ?? null,
  type: alert.type,
  severity: alert.severity,
  message: alert.message,
  metadata: { teamName, agentName, ...relevantData },
})
```

**Step 2: API-Endpunkte erstellen**

`src/app/api/notifications/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { desc, isNull, eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  await requireUser()
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('read') === 'false'
  const limit = parseInt(searchParams.get('limit') ?? '50')

  let query = db.select().from(alertHistory).orderBy(desc(alertHistory.createdAt)).limit(limit)
  if (unreadOnly) {
    query = query.where(isNull(alertHistory.readAt))
  }

  const alerts = await query
  return NextResponse.json({ alerts })
}
```

`src/app/api/notifications/[id]/read/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params
  await db.update(alertHistory).set({ readAt: new Date() }).where(eq(alertHistory.id, id))
  return NextResponse.json({ ok: true })
}
```

`src/app/api/notifications/read-all/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { isNull } from 'drizzle-orm'

export async function POST(_req: NextRequest) {
  await requireUser()
  await db.update(alertHistory).set({ readAt: new Date() }).where(isNull(alertHistory.readAt))
  return NextResponse.json({ ok: true })
}
```

**Step 3: Notification-Center an API anbinden**

In `src/components/layout/notification-center.tsx`: statt nur In-Memory-Alerts auch persistierte Alerts per API laden. Badge zeigt Anzahl ungelesener DB-Alerts.

**Step 4: Commit via Scribe**

```
feat: Notification-Persistence mit alertHistory-Tabelle und API-Endpunkten
```

---

### Task 5: Task-History Snapshots

**Files:**
- Modify: `src/lib/claude/poller.ts:136-194` (History-Writes bei Status-Aenderung)
- Modify: `src/lib/claude/activity.ts:57-172` (detectActivityEvents nutzen)

**Step 1: Task-History bei Status-Aenderungen schreiben**

In `src/lib/claude/poller.ts`, innerhalb von `startTeamPoller()` — nach der Delta-Detection (Zeile ~165), wenn `task_status`-Events erkannt werden:

```typescript
import { db } from '@/lib/db'
import { taskHistory } from '@/lib/db/schema'

// Nach detectActivityEvents():
for (const event of activityEvents) {
  if (event.type === 'task_status' && event.taskId) {
    const task = /* finde Task in neuem State */
    await db.insert(taskHistory).values({
      hostId,
      teamName: event.teamName ?? '',
      externalTaskId: event.taskId,
      subject: task?.subject ?? event.message,
      status: event.to ?? '',
      owner: task?.owner ?? null,
      startedAt: event.to === 'in_progress' ? new Date() : undefined,
      completedAt: event.to === 'completed' ? new Date() : undefined,
    }).onConflictDoNothing() // Duplikate vermeiden
  }
}
```

**Step 2: Commit via Scribe**

```
feat: Task-History Snapshots bei Status-Aenderungen in DB schreiben
```

---

## Welle 2 — Neue Seiten & APIs

---

### Task 6: File-Browser

**Files:**
- Create: `src/app/files/page.tsx`
- Create: `src/app/api/hosts/[id]/files/route.ts`
- Create: `src/components/file-browser/file-browser.tsx`
- Create: `src/components/file-browser/file-viewer.tsx`
- Create: `src/components/file-browser/file-editor.tsx`
- Modify: `src/components/layout/sidebar.tsx` (Navigation erweitern)

**Step 1: File-API-Endpunkte erstellen**

`src/app/api/hosts/[id]/files/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { sshPool } from '@/lib/ssh/pool'

const BLOCKED_PATHS = ['/etc/shadow', '/etc/passwd', '.env', 'id_rsa', 'id_ed25519', '.ssh/authorized_keys']

function isPathBlocked(path: string): boolean {
  return BLOCKED_PATHS.some(blocked => path.includes(blocked))
}

// Datei lesen
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
  if (isPathBlocked(path)) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  try {
    const content = await sshPool.exec(id, `cat ${JSON.stringify(path)}`)
    return NextResponse.json({ path, content })
  } catch (err) {
    return NextResponse.json({ error: 'Datei nicht lesbar' }, { status: 404 })
  }
}

// Datei schreiben
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params
  const { path, content } = await req.json()
  if (!path || content === undefined) return NextResponse.json({ error: 'path und content required' }, { status: 400 })
  if (isPathBlocked(path)) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  try {
    // Sichere Methode: base64-encode um Shell-Injection zu vermeiden
    const b64 = Buffer.from(content).toString('base64')
    await sshPool.exec(id, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Schreiben fehlgeschlagen' }, { status: 500 })
  }
}

// Datei loeschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
  if (isPathBlocked(path)) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  try {
    await sshPool.exec(id, `rm ${JSON.stringify(path)}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 })
  }
}

// Neue Datei erstellen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params
  const { path, content } = await req.json()
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
  if (isPathBlocked(path)) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  try {
    const b64 = Buffer.from(content ?? '').toString('base64')
    await sshPool.exec(id, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erstellen fehlgeschlagen' }, { status: 500 })
  }
}
```

**Step 2: File-Browser Seite erstellen**

`src/app/files/page.tsx`: Seite mit Host-Selector oben, links Directory-Tree (basierend auf bestehendem `/api/hosts/[id]/browse`), rechts File-Viewer/Editor.

**Step 3: File-Viewer und Editor Komponenten**

- `file-viewer.tsx`: `<pre>` mit CSS-basiertem Syntax-Highlighting (Zeilennummern, monospace)
- `file-editor.tsx`: Textarea mit Speichern/Abbrechen Buttons

**Step 4: Navigation aktualisieren**

In Sidebar: neuen Link `/files` mit `FileText`-Icon von Lucide hinzufuegen.

**Step 5: Commit via Scribe**

```
feat: File-Browser mit Lesen, Editieren, Erstellen und Loeschen ueber SSH
```

---

### Task 7: Log-Viewer

**Files:**
- Create: `src/app/logs/page.tsx`
- Create: `src/app/api/hosts/[id]/logs/route.ts`
- Create: `src/app/api/hosts/[id]/logs/[filename]/route.ts`
- Create: `src/lib/socket/logs.ts`
- Modify: `server/index.ts` (neuen /logs Namespace registrieren)
- Modify: `src/components/layout/sidebar.tsx` (Navigation)

**Step 1: Log-APIs erstellen**

`src/app/api/hosts/[id]/logs/route.ts` — Log-Dateien auflisten:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { sshPool } from '@/lib/ssh/pool'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireUser()
  const { id } = await params

  try {
    const output = await sshPool.exec(id, 'ls -lt ~/.claude/logs/ 2>/dev/null | head -50')
    const files = output.trim().split('\n')
      .filter(line => line.includes(' '))
      .map(line => {
        const parts = line.trim().split(/\s+/)
        return {
          name: parts[parts.length - 1],
          size: parts[4],
          date: `${parts[5]} ${parts[6]} ${parts[7]}`,
        }
      })
      .filter(f => f.name && f.name !== '.' && f.name !== '..')

    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ files: [] })
  }
}
```

`src/app/api/hosts/[id]/logs/[filename]/route.ts` — Log-Inhalt lesen:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { sshPool } from '@/lib/ssh/pool'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  await requireUser()
  const { id, filename } = await params
  const lines = parseInt(req.nextUrl.searchParams.get('lines') ?? '500')

  // Sicherheit: nur Dateinamen ohne Pfad-Traversal erlauben
  if (filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Ungueltiger Dateiname' }, { status: 400 })
  }

  try {
    const content = await sshPool.exec(id, `tail -n ${lines} ~/.claude/logs/${JSON.stringify(filename)}`)
    return NextResponse.json({ filename, content, lines })
  } catch {
    return NextResponse.json({ error: 'Log nicht lesbar' }, { status: 404 })
  }
}
```

**Step 2: Live-Tail Socket.io Namespace**

`src/lib/socket/logs.ts`:
```typescript
import { Namespace, Socket } from 'socket.io'
import { sshPool } from '@/lib/ssh/pool'

export function setupLogsNamespace(namespace: Namespace) {
  namespace.on('connection', (socket: Socket) => {
    let tailInterval: NodeJS.Timeout | null = null
    let lastSize = 0

    socket.on('logs:subscribe', async ({ hostId, filename }: { hostId: string; filename: string }) => {
      if (filename.includes('/') || filename.includes('..')) return

      // Initiale Zeilen senden
      try {
        const content = await sshPool.exec(hostId, `tail -n 100 ~/.claude/logs/${JSON.stringify(filename)}`)
        socket.emit('logs:data', { content })
        // Dateigroesse merken
        const sizeOutput = await sshPool.exec(hostId, `stat -c%s ~/.claude/logs/${JSON.stringify(filename)}`)
        lastSize = parseInt(sizeOutput.trim()) || 0
      } catch { /* ignore */ }

      // Poll fuer neue Zeilen alle 2 Sekunden
      tailInterval = setInterval(async () => {
        try {
          const sizeOutput = await sshPool.exec(hostId, `stat -c%s ~/.claude/logs/${JSON.stringify(filename)}`)
          const newSize = parseInt(sizeOutput.trim()) || 0
          if (newSize > lastSize) {
            const diff = newSize - lastSize
            const content = await sshPool.exec(hostId, `tail -c ${diff} ~/.claude/logs/${JSON.stringify(filename)}`)
            socket.emit('logs:data', { content, append: true })
            lastSize = newSize
          }
        } catch { /* ignore */ }
      }, 2000)
    })

    socket.on('logs:unsubscribe', () => {
      if (tailInterval) clearInterval(tailInterval)
    })

    socket.on('disconnect', () => {
      if (tailInterval) clearInterval(tailInterval)
    })
  })
}
```

**Step 3: Namespace in Server registrieren**

In `server/index.ts`: `setupLogsNamespace(io.of('/logs'))` hinzufuegen.

**Step 4: Log-Viewer Seite**

`src/app/logs/page.tsx`: Host-Selector, Log-Datei-Liste links, Log-Inhalt rechts mit Auto-Scroll und Live-Tail Toggle.

**Step 5: Navigation**

Sidebar: Link `/logs` mit `ScrollText`-Icon.

**Step 6: Commit via Scribe**

```
feat: Log-Viewer mit Live-Tail fuer Claude Code Logs ueber SSH
```

---

### Task 8: Interaktive Task-Steuerung

**Files:**
- Create: `src/app/api/hosts/[id]/teams/[name]/tasks/route.ts`
- Create: `src/app/api/hosts/[id]/teams/[name]/tasks/[taskId]/route.ts`
- Modify: `src/components/team/task-board.tsx` (Erstellen/Zuweisen UI)

**Step 1: Task-Write-API erstellen**

`src/app/api/hosts/[id]/teams/[name]/tasks/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { sshPool } from '@/lib/ssh/pool'
import { randomUUID } from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  await requireUser()
  const { id: hostId, name: teamName } = await params
  const { subject, description } = await req.json()

  const taskId = randomUUID().slice(0, 8)
  const task = {
    id: taskId,
    subject,
    description: description ?? '',
    status: 'pending',
    owner: null,
    blockedBy: [],
    blocks: [],
  }

  const json = JSON.stringify(task, null, 2)
  const b64 = Buffer.from(json).toString('base64')

  try {
    await sshPool.exec(hostId, `echo ${JSON.stringify(b64)} | base64 -d > ~/.claude/tasks/${teamName}/${taskId}.json`)
    return NextResponse.json({ task })
  } catch (err) {
    return NextResponse.json({ error: 'Task-Erstellung fehlgeschlagen' }, { status: 500 })
  }
}
```

`src/app/api/hosts/[id]/teams/[name]/tasks/[taskId]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { sshPool } from '@/lib/ssh/pool'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string; taskId: string }> }
) {
  await requireUser()
  const { id: hostId, name: teamName, taskId } = await params
  const updates = await req.json()

  try {
    // Bestehende Task lesen
    const existing = await sshPool.exec(hostId, `cat ~/.claude/tasks/${teamName}/${taskId}.json`)
    const task = JSON.parse(existing)

    // Updates anwenden
    Object.assign(task, updates)

    const json = JSON.stringify(task, null, 2)
    const b64 = Buffer.from(json).toString('base64')
    await sshPool.exec(hostId, `echo ${JSON.stringify(b64)} | base64 -d > ~/.claude/tasks/${teamName}/${taskId}.json`)

    return NextResponse.json({ task })
  } catch (err) {
    return NextResponse.json({ error: 'Task-Update fehlgeschlagen' }, { status: 500 })
  }
}
```

**Step 2: TaskBoard UI erweitern**

In `src/components/team/task-board.tsx`:
- "Neuer Task"-Button oben rechts → Dialog mit Subject + Description Feldern
- Status-Buttons pro Task (pending → in_progress → completed)
- Owner-Dropdown pro Task (Agent-Liste aus Team)

**Step 3: Commit via Scribe**

```
feat: Interaktive Task-Steuerung — Tasks erstellen und zuweisen ueber UI
```

---

### Task 9: Analytics Dashboard

**Files:**
- Create: `src/app/api/analytics/route.ts`
- Create: `src/components/dashboard/analytics-widget.tsx`
- Modify: `src/app/page.tsx:1-227` (Widget einbinden)

**Step 1: Analytics-API**

`src/app/api/analytics/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskHistory } from '@/lib/db/schema'
import { desc, gte, sql, eq, and, count } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  await requireUser()
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('hostId')
  const days = parseInt(searchParams.get('days') ?? '7')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const conditions = [gte(taskHistory.createdAt, since)]
  if (hostId) conditions.push(eq(taskHistory.hostId, hostId))

  // Tasks pro Tag
  const tasksPerDay = await db
    .select({
      date: sql<string>`DATE(${taskHistory.createdAt})`,
      count: count(),
    })
    .from(taskHistory)
    .where(and(...conditions))
    .groupBy(sql`DATE(${taskHistory.createdAt})`)
    .orderBy(sql`DATE(${taskHistory.createdAt})`)

  // Agent-Leaderboard
  const agentLeaderboard = await db
    .select({
      owner: taskHistory.owner,
      completed: count(),
    })
    .from(taskHistory)
    .where(and(...conditions, eq(taskHistory.status, 'completed')))
    .groupBy(taskHistory.owner)
    .orderBy(desc(count()))
    .limit(10)

  // Durchschnittliche Duration (completed Tasks mit startedAt)
  const avgDuration = await db
    .select({
      avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${taskHistory.completedAt} - ${taskHistory.startedAt})))`,
    })
    .from(taskHistory)
    .where(and(
      ...conditions,
      eq(taskHistory.status, 'completed'),
      sql`${taskHistory.startedAt} IS NOT NULL`,
      sql`${taskHistory.completedAt} IS NOT NULL`,
    ))

  return NextResponse.json({
    tasksPerDay,
    agentLeaderboard: agentLeaderboard.filter(a => a.owner),
    avgDurationSeconds: avgDuration[0]?.avg ?? null,
    period: { days, since: since.toISOString() },
  })
}
```

**Step 2: Analytics-Widget**

`src/components/dashboard/analytics-widget.tsx`:
- CSS-basierte Balkendiagramme (Tasks/Tag)
- Agent-Leaderboard als Rangliste
- Durchschnittliche Task-Duration
- Zeitraum-Filter (Heute, 7 Tage, 30 Tage)

**Step 3: Dashboard einbinden**

In `src/app/page.tsx`: Analytics-Widget unter den Quick-Nav-Tiles einfuegen.

**Step 4: Commit via Scribe**

```
feat: Analytics Dashboard mit Task-Statistiken und Agent-Leaderboard
```

---

### Task 10: Notification-Center Erweiterung

**Files:**
- Modify: `src/components/layout/notification-center.tsx:32-216`
- Modify: `src/hooks/use-notifications.ts:34-130`

**Step 1: Notification-Center an DB anbinden**

In `src/hooks/use-notifications.ts`:
- Beim Mount: `GET /api/notifications?read=false&limit=50` laden
- Badge-Count = Anzahl ungelesener DB-Alerts + Live-Alerts
- "Als gelesen markieren" ruft `PATCH /api/notifications/[id]/read` auf
- "Alle gelesen" ruft `POST /api/notifications/read-all` auf

**Step 2: UI erweitern**

In `src/components/layout/notification-center.tsx`:
- "Alle gelesen"-Button im Dropdown-Header
- Klick auf Alert → `readAt` setzen + Navigation
- Aeltere Alerts unter den Live-Alerts anzeigen (Sektion "Frueher")
- Infinite-Scroll oder "Mehr laden"-Button

**Step 3: Commit via Scribe**

```
feat: Notification-Center mit DB-Persistence und Gelesen-Markierung
```

---

## Welle 3 — UX & Polish

---

### Task 11: Settings-Seite komplett

**Files:**
- Modify: `src/app/settings/page.tsx`
- Create: `src/components/settings/theme-selector.tsx`
- Create: `src/components/settings/terminal-settings.tsx`
- Create: `src/components/settings/shortcut-editor.tsx`

**Step 1: Settings-Seite in Sektionen aufteilen**

- Darstellung: Theme-Selector, Font-Size Slider, Font-Family Dropdown
- Verhalten: Poll-Interval Slider
- Tastenkuerzel: Shortcut-Tabelle (editierbar)
- Alle Aenderungen via `POST /api/preferences` speichern

**Step 2: Komponenten implementieren**

Jede Sektion als eigene Komponente. Alle verwenden `UserPreferences`-Typ und speichern ueber dieselbe API.

**Step 3: Commit via Scribe**

```
feat: Settings-Seite mit Theme, Terminal-Config und Shortcut-Editor
```

---

### Task 12: Dark/Light Theme

**Files:**
- Modify: `src/app/globals.css` (Light-Theme-Variablen)
- Create: `src/hooks/use-theme.ts`
- Modify: `src/components/layout/header.tsx:11-59` (Toggle-Button)
- Modify: `src/app/layout.tsx:26-65` (data-theme Attribut)

**Step 1: Light-Theme CSS-Variablen definieren**

In `src/app/globals.css`, neuer Block:
```css
[data-theme="light"] {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-elevated: #f1f5f9;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-border: #e2e8f0;
  /* ... alle bestehenden Custom Properties invertieren */
}
```

**Step 2: Theme-Hook**

`src/hooks/use-theme.ts`:
```typescript
import { create } from 'zustand'

interface ThemeStore {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
}

export const useTheme = create<ThemeStore>((set) => ({
  theme: 'dark',
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),
}))
```

**Step 3: Toggle im Header**

In `src/components/layout/header.tsx`: Sonne/Mond-Icon Button neben dem Notification-Center.

**Step 4: Layout — Theme bei Page-Load anwenden**

In `src/app/layout.tsx`: Preferences laden → `data-theme` auf `<html>` setzen.

**Step 5: Commit via Scribe**

```
feat: Dark/Light Theme Toggle mit CSS Custom Properties
```

---

### Task 13: Global Search / Command Palette

**Files:**
- Create: `src/components/layout/command-palette.tsx`
- Create: `src/hooks/use-command-palette.ts`
- Modify: `src/app/layout.tsx` (CommandPalette mounten)

**Step 1: Command-Palette Komponente**

`src/components/layout/command-palette.tsx`:
- Modal-Dialog, zentriert, mit Suchfeld oben
- Ergebnisse gruppiert: Hosts, Projekte, Teams, Sessions
- Fuzzy-Matching (einfacher includes-Check + toLowerCase)
- Keyboard-Navigation (Pfeiltasten + Enter)
- API-Calls: `/api/hosts`, `/api/projects`, gecachte Team-Daten

**Step 2: Zustand-Store**

`src/hooks/use-command-palette.ts`:
```typescript
import { create } from 'zustand'

export const useCommandPalette = create<{
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))
```

**Step 3: Global Keybinding**

In `src/app/layout.tsx`: `useEffect` mit `Ctrl+K` und `/` Listener.

**Step 4: Commit via Scribe**

```
feat: Command Palette / Global Search mit Ctrl+K
```

---

### Task 14: Keyboard Shortcuts System

**Files:**
- Create: `src/lib/shortcuts.ts` (Shortcut-Registry)
- Create: `src/components/layout/shortcut-overlay.tsx`
- Modify: `src/app/layout.tsx` (Global Listener)

**Step 1: Shortcut-Registry**

`src/lib/shortcuts.ts`:
```typescript
export interface Shortcut {
  key: string // z.B. "ctrl+k", "ctrl+1", "?"
  label: string // z.B. "Command Palette oeffnen"
  action: string // z.B. "command-palette:open"
  category: string // z.B. "Navigation" | "Terminal" | "Allgemein"
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { key: 'ctrl+k', label: 'Command Palette', action: 'command-palette:open', category: 'Navigation' },
  { key: 'ctrl+1', label: 'Tab 1 oeffnen', action: 'terminal:tab:1', category: 'Terminal' },
  { key: 'ctrl+2', label: 'Tab 2 oeffnen', action: 'terminal:tab:2', category: 'Terminal' },
  // ... bis ctrl+9
  { key: 'ctrl+shift+t', label: 'Neuer Terminal Tab', action: 'terminal:new-tab', category: 'Terminal' },
  { key: '?', label: 'Tastenkuerzel anzeigen', action: 'shortcuts:show', category: 'Allgemein' },
  { key: 'escape', label: 'Dialog schliessen', action: 'dialog:close', category: 'Allgemein' },
]
```

**Step 2: Shortcut-Overlay**

`src/components/layout/shortcut-overlay.tsx`: Modal mit Tabelle aller Shortcuts, gruppiert nach Kategorie.

**Step 3: Global Event-Handler**

In `src/app/layout.tsx`: `keydown`-Listener der Shortcuts matcht und Actions dispatcht.

**Step 4: Commit via Scribe**

```
feat: Keyboard Shortcuts System mit konfigurierbaren Tastenkuerzeln
```

---

### Task 15: Host-Gruppen

**Files:**
- Create: `src/app/api/host-groups/route.ts`
- Create: `src/app/api/host-groups/[id]/route.ts`
- Create: `src/components/settings/host-groups-manager.tsx`
- Modify: `src/components/host/host-form.tsx` (Gruppen-Dropdown)
- Modify: `src/app/hosts/page.tsx` (Gruppierte Anzeige)

**Step 1: CRUD-APIs fuer Host-Gruppen**

Standard-REST-Endpunkte: GET (alle), POST (erstellen), PATCH (aktualisieren), DELETE (loeschen).

**Step 2: Settings-Sektion fuer Gruppen**

In Settings-Seite: Neue Sektion "Host-Gruppen" mit CRUD-UI (Name, Farbe-Picker, Reihenfolge).

**Step 3: Host-Form erweitern**

Dropdown "Gruppe" mit allen verfuegbaren Host-Gruppen.

**Step 4: Hosts-Seite gruppieren**

Hosts nach Gruppe sortiert anzeigen. Farbige Section-Header. "Sonstige" fuer ungroupierte Hosts.

**Step 5: Commit via Scribe**

```
feat: Host-Gruppen mit Farben und gruppierter Anzeige
```

---

## Welle 4 — Collaboration

---

### Task 16: Session-Templates

**Files:**
- Create: `src/app/api/terminal/templates/route.ts`
- Create: `src/app/api/terminal/templates/[id]/route.ts`
- Create: `src/components/terminal/template-picker.tsx`
- Modify: `src/components/terminal/terminal-toolbar.tsx` (Save-Template Button)
- Modify: `src/components/terminal/session-picker-dialog.tsx` (Template-Auswahl)

**Step 1: Template-APIs**

CRUD-Endpunkte: GET (alle fuer User), POST (erstellen), DELETE (loeschen).

Speichern: Aktuelle tmux-Session Pane-Layout erfassen via `tmux list-panes -t session -F '#{pane_index}:#{pane_width}:#{pane_height}:#{pane_current_command}'`.

Wiederherstellen: Neue Session erstellen, Panes splitten, Befehle senden.

**Step 2: UI-Integration**

- Terminal-Toolbar: "Als Template speichern"-Button
- Session-Picker: Tab "Templates" mit gespeicherten Layouts
- Template-Auswahl erstellt neue Session mit dem gespeicherten Layout

**Step 3: Commit via Scribe**

```
feat: Session-Templates zum Speichern und Wiederherstellen von tmux-Layouts
```

---

### Task 17: Shared Terminal

**Files:**
- Create: `src/app/api/terminal/share/route.ts`
- Create: `src/app/terminal/shared/[token]/page.tsx`
- Modify: `src/lib/socket/terminal.ts` (Share-Logik)
- Modify: `src/components/terminal/terminal-toolbar.tsx` (Share-Button)
- Create: `src/components/terminal/shared-terminal-bar.tsx` (Zuschauer-Anzeige)

**Step 1: Share-Token-API**

`src/app/api/terminal/share/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

// In-Memory Token-Store (TTL 1 Stunde)
const shareTokens = new Map<string, {
  hostId: string
  sessionName: string
  pane: string
  createdBy: string
  expiresAt: number
  viewers: Set<string>
  writable: Set<string>
}>()

// Cleanup abgelaufener Tokens
setInterval(() => {
  const now = Date.now()
  for (const [token, data] of shareTokens) {
    if (data.expiresAt < now) shareTokens.delete(token)
  }
}, 60000)

export { shareTokens }

export async function POST(req: NextRequest) {
  const user = await requireUser()
  const { hostId, sessionName, pane } = await req.json()

  const token = randomUUID()
  shareTokens.set(token, {
    hostId,
    sessionName,
    pane: pane ?? '0:0',
    createdBy: user.login,
    expiresAt: Date.now() + 3600000, // 1 Stunde
    viewers: new Set(),
    writable: new Set(),
  })

  return NextResponse.json({ token, expiresAt: new Date(Date.now() + 3600000).toISOString() })
}
```

**Step 2: Shared-Terminal Seite**

`src/app/terminal/shared/[token]/page.tsx`:
- Token validieren → Terminal-View im read-only Modus oeffnen
- Verbindung ueber speziellen Socket.io-Event `terminal:connect-shared`
- Zeigt Banner oben: "Geteiltes Terminal von [user] — Nur lesen"
- Avatar-Leiste zeigt alle verbundenen Zuschauer

**Step 3: Terminal-Socket erweitern**

In `src/lib/socket/terminal.ts`:
- `terminal:connect-shared` Event: Token pruefen, SSH-Stream auf alle Viewer broadcasten
- `terminal:grant-write` Event: Host kann Schreibrechte an Viewer erteilen
- Viewer mit Schreibrechten koennen `terminal:data` senden

**Step 4: Share-Button in Toolbar**

In `src/components/terminal/terminal-toolbar.tsx`: "Teilen"-Button (Share-Icon) → ruft API auf, zeigt Share-URL in Dialog.

**Step 5: Zuschauer-Leiste**

`src/components/terminal/shared-terminal-bar.tsx`: Kleine Avatare/Initialen der verbundenen User, "Schreibrechte erteilen"-Button fuer Host.

**Step 6: Commit via Scribe**

```
feat: Shared Terminal mit Share-Token, Zuschauer-Modus und Schreibrechte-Vergabe
```

---

## Abschluss

Nach allen 4 Wellen:
- Scribe fuehrt finalen Version-Bump durch (0.6.1 → 1.0.0)
- CHANGELOG.md aktualisieren
- Git-Tag v1.0.0 setzen
- Push
