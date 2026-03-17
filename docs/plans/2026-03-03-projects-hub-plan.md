# Projects Hub — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Projects wird zum zentralen Schnellstart-Hub — Projekt anklicken, bestehende tmux-Session attachen oder neue starten, mit Live-Anzeige von Sessions und Claude Teams.

**Architecture:** Erweiterung des bestehenden tmux-Polling um `pane_current_path`, neuer Matching-Layer der Projekte mit Sessions/Teams verknuepft, neue Detail-Seite `/projects/[id]` mit Live-WebSocket-Updates, und Aufwertung der Projekt-Liste mit Live-Badges.

**Tech Stack:** Next.js 15 App Router, socket.io, ssh2 via execOnHost, Drizzle ORM, Tailwind CSS 4

---

### Task 1: tmux-Command fuer Pane-Pfade

**Files:**
- Modify: `src/lib/tmux/commands.ts:9-30`
- Test: `src/__tests__/tmux-commands.test.ts`

**Step 1: Failing Test schreiben**

In `src/__tests__/tmux-commands.test.ts` am Ende einfuegen:

```typescript
describe('listPanePaths', () => {
  it('returns a valid tmux command string', () => {
    const cmd = tmuxCommands.listPanePaths();
    expect(cmd).toContain('tmux list-panes -a');
    expect(cmd).toContain('#{session_name}');
    expect(cmd).toContain('#{pane_current_path}');
  });
});
```

**Step 2: Test ausfuehren, Fehlschlag bestaetigen**

Run: `npx vitest run src/__tests__/tmux-commands.test.ts`
Expected: FAIL — `tmuxCommands.listPanePaths is not a function`

**Step 3: Implementierung**

In `src/lib/tmux/commands.ts` neue Methode im `tmuxCommands`-Objekt einfuegen:

```typescript
listPanePaths: () =>
  `bash -lc 'tmux list-panes -a -F "#{session_name}|||#{pane_current_path}" 2>/dev/null || echo ""'`,
```

Dazu `newSession` erweitern, um ein optionales Startverzeichnis zu unterstuetzen:

```typescript
newSession: (name: string, startDir?: string) =>
  startDir
    ? `bash -lc 'tmux new-session -d -s ${JSON.stringify(name)} -c ${JSON.stringify(startDir)}'`
    : `bash -lc 'tmux new-session -d -s ${JSON.stringify(name)}'`,
```

**Step 4: Test ausfuehren, Erfolg bestaetigen**

Run: `npx vitest run src/__tests__/tmux-commands.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/tmux/commands.ts src/__tests__/tmux-commands.test.ts
git commit -m "feat: tmux-Command fuer Pane-Pfade und Session mit Startverzeichnis"
```

---

### Task 2: Parser fuer Pane-Pfade

**Files:**
- Modify: `src/lib/tmux/parser.ts`
- Test: `src/__tests__/tmux-parser.test.ts`

**Step 1: Failing Test schreiben**

In `src/__tests__/tmux-parser.test.ts` am Ende einfuegen:

```typescript
import { parsePanePaths } from '../lib/tmux/parser';

describe('parsePanePaths', () => {
  it('returns empty map for empty output', () => {
    expect(parsePanePaths('')).toEqual(new Map());
    expect(parsePanePaths('   ')).toEqual(new Map());
  });

  it('parses single session with one pane', () => {
    const output = 'main|||/home/user/project';
    const result = parsePanePaths(output);
    expect(result.get('main')).toEqual(['/home/user/project']);
  });

  it('groups multiple panes per session', () => {
    const output = 'main|||/home/user/project\nmain|||/home/user/other\nwork|||/tmp';
    const result = parsePanePaths(output);
    expect(result.get('main')).toEqual(['/home/user/project', '/home/user/other']);
    expect(result.get('work')).toEqual(['/tmp']);
  });

  it('deduplicates paths within a session', () => {
    const output = 'main|||/home/user/project\nmain|||/home/user/project';
    const result = parsePanePaths(output);
    expect(result.get('main')).toEqual(['/home/user/project']);
  });
});
```

**Step 2: Test ausfuehren, Fehlschlag bestaetigen**

Run: `npx vitest run src/__tests__/tmux-parser.test.ts`
Expected: FAIL — `parsePanePaths is not a function` oder `not exported`

**Step 3: Implementierung**

In `src/lib/tmux/parser.ts` einfuegen:

```typescript
/** Parsed `tmux list-panes -a -F "#{session_name}|||#{pane_current_path}"` Output.
 *  Gibt Map<sessionName, uniquePaths[]> zurueck. */
export function parsePanePaths(output: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!output.trim()) return result;

  for (const line of output.trim().split('\n')) {
    const sepIdx = line.indexOf('|||');
    if (sepIdx === -1) continue;
    const session = line.slice(0, sepIdx);
    const path = line.slice(sepIdx + 3);
    if (!session || !path) continue;

    const paths = result.get(session) ?? [];
    if (!paths.includes(path)) {
      paths.push(path);
    }
    result.set(session, paths);
  }
  return result;
}
```

**Step 4: Test ausfuehren, Erfolg bestaetigen**

Run: `npx vitest run src/__tests__/tmux-parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/tmux/parser.ts src/__tests__/tmux-parser.test.ts
git commit -m "feat: Parser fuer tmux Pane-Pfade"
```

---

### Task 3: TmuxSession-Typ erweitern + panePaths in Session-API einbauen

**Files:**
- Modify: `src/lib/tmux/types.ts:1-7`
- Modify: `src/types/index.ts:17-23`
- Modify: `src/app/api/hosts/[id]/sessions/route.ts`

**Step 1: TmuxSession-Typ erweitern**

In `src/lib/tmux/types.ts`, `panePaths` hinzufuegen:

```typescript
export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
  activity: string;
  panePaths: string[];  // aktuelle Arbeitsverzeichnisse aller Panes
}
```

In `src/types/index.ts`, dasselbe Feld hinzufuegen:

```typescript
export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
  activity?: string;
  panePaths?: string[];  // optional fuer Abwaertskompatibilitaet
}
```

**Step 2: Session-API erweitern**

In `src/app/api/hosts/[id]/sessions/route.ts` die GET-Methode erweitern — nach `parseSessions` auch `listPanePaths` ausfuehren und mergen:

```typescript
import { parseSessions, parsePanePaths } from '@/lib/tmux/parser';
import { tmuxCommands } from '@/lib/tmux/commands';

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;

    const [sessOutput, paneOutput] = await Promise.all([
      execOnHost(id, tmuxCommands.listSessions()),
      execOnHost(id, tmuxCommands.listPanePaths()),
    ]);

    const sessions = parseSessions(sessOutput);
    const panePaths = parsePanePaths(paneOutput);

    const enriched = sessions.map(s => ({
      ...s,
      panePaths: panePaths.get(s.name) ?? [],
    }));

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    // ... bestehende Fehlerbehandlung
  }
}
```

**Step 3: POST erweitern fuer Startverzeichnis**

In derselben Datei die POST-Methode erweitern:

```typescript
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const startDir = typeof body.startDir === 'string' ? body.startDir.trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: 'Session name is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (!SESSION_NAME_RE.test(name)) {
      return NextResponse.json({ error: 'Session name may only contain a-z, A-Z, 0-9, _ and -', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    // startDir validieren: muss absoluter Pfad sein, kein Shell-Escaping-Risiko
    if (startDir && !startDir.startsWith('/')) {
      return NextResponse.json({ error: 'startDir must be an absolute path', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await execOnHost(id, tmuxCommands.newSession(name, startDir));
    return NextResponse.json({ success: true, name }, { status: 201 });
  } catch (err: unknown) {
    // ... bestehende Fehlerbehandlung
  }
}
```

**Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: Keine Fehler (panePaths ist optional im shared type)

**Step 5: Parser-Test aktualisieren**

In `src/__tests__/tmux-parser.test.ts` den bestehenden `parseSessions`-Test anpassen — die bestehenden Tests muessen weiterhin passen, da `panePaths` erst in der API hinzugefuegt wird, nicht im Parser.

Run: `npx vitest run src/__tests__/tmux-parser.test.ts`
Expected: PASS (keine Aenderungen noetig — parseSessions gibt weiterhin Sessions ohne panePaths zurueck)

**Step 6: Commit**

```bash
git add src/lib/tmux/types.ts src/types/index.ts src/app/api/hosts/\\[id\\]/sessions/route.ts
git commit -m "feat: TmuxSession um panePaths erweitert, Session-API liefert Pane-Pfade mit"
```

---

### Task 4: Projekt-Matching Utility

**Files:**
- Create: `src/lib/projects/matching.ts`
- Create: `src/__tests__/project-matching.test.ts`

**Step 1: Failing Test schreiben**

Neue Datei `src/__tests__/project-matching.test.ts`:

```typescript
import { matchSessionsToProject, matchTeamsToProject } from '../lib/projects/matching';
import type { TmuxSession } from '../lib/tmux/types';
import type { ClaudeTeam } from '../lib/claude/types';

describe('matchSessionsToProject', () => {
  const projectPath = '/home/user/Projects/remote-team';

  it('returns empty array when no sessions match', () => {
    const sessions: TmuxSession[] = [
      { name: 'other', windows: 1, attached: false, created: '0', activity: '0', panePaths: ['/tmp'] },
    ];
    expect(matchSessionsToProject(projectPath, sessions)).toEqual([]);
  });

  it('matches session with exact path', () => {
    const sessions: TmuxSession[] = [
      { name: 'dev', windows: 2, attached: true, created: '0', activity: '0', panePaths: ['/home/user/Projects/remote-team'] },
    ];
    const result = matchSessionsToProject(projectPath, sessions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('dev');
  });

  it('matches session with subdirectory path (prefix match)', () => {
    const sessions: TmuxSession[] = [
      { name: 'dev', windows: 1, attached: false, created: '0', activity: '0', panePaths: ['/home/user/Projects/remote-team/src'] },
    ];
    expect(matchSessionsToProject(projectPath, sessions)).toHaveLength(1);
  });

  it('does not match partial directory names', () => {
    const sessions: TmuxSession[] = [
      { name: 'dev', windows: 1, attached: false, created: '0', activity: '0', panePaths: ['/home/user/Projects/remote-team-v2'] },
    ];
    expect(matchSessionsToProject(projectPath, sessions)).toEqual([]);
  });

  it('matches when any pane is in project directory', () => {
    const sessions: TmuxSession[] = [
      { name: 'dev', windows: 2, attached: false, created: '0', activity: '0', panePaths: ['/tmp', '/home/user/Projects/remote-team/src'] },
    ];
    expect(matchSessionsToProject(projectPath, sessions)).toHaveLength(1);
  });
});

describe('matchTeamsToProject', () => {
  const projectPath = '/home/user/Projects/remote-team';

  it('returns empty array when no teams have matching name', () => {
    const teams: ClaudeTeam[] = [
      { name: 'other-project', hostId: 'h1', members: [] },
    ];
    expect(matchTeamsToProject(projectPath, teams)).toEqual([]);
  });

  // Claude Teams haben keinen expliziten Pfad — Matching basiert auf
  // Namenskonvention: Team-Name enthaelt den Projektnamen
  // z.B. Projekt "remote-team" matched Team "remote-team" oder "remote-team-webapp"
  it('matches team whose name starts with project directory name', () => {
    const teams: ClaudeTeam[] = [
      { name: 'remote-team', hostId: 'h1', members: [] },
    ];
    expect(matchTeamsToProject(projectPath, teams)).toHaveLength(1);
  });
});
```

**Step 2: Test ausfuehren, Fehlschlag bestaetigen**

Run: `npx vitest run src/__tests__/project-matching.test.ts`
Expected: FAIL — Module not found

**Step 3: Implementierung**

Neue Datei `src/lib/projects/matching.ts`:

```typescript
import type { TmuxSession } from '../tmux/types';
import type { ClaudeTeam } from '../claude/types';

/** Prueft ob ein Pane-Pfad zum Projektpfad gehoert (Prefix-Match mit Verzeichnisgrenze). */
function pathBelongsToProject(projectPath: string, panePath: string): boolean {
  if (panePath === projectPath) return true;
  // Prefix-Match: panePath muss mit projectPath + '/' beginnen
  return panePath.startsWith(projectPath + '/');
}

/** Gibt alle Sessions zurueck, die mindestens einen Pane im Projektverzeichnis haben. */
export function matchSessionsToProject(
  projectPath: string,
  sessions: TmuxSession[],
): TmuxSession[] {
  return sessions.filter(s =>
    s.panePaths.some(p => pathBelongsToProject(projectPath, p))
  );
}

/** Gibt alle Claude Teams zurueck, deren Name zum Projektverzeichnisnamen passt.
 *  Matching: Team-Name beginnt mit dem letzten Verzeichnissegment des Projektpfads. */
export function matchTeamsToProject(
  projectPath: string,
  teams: ClaudeTeam[],
): ClaudeTeam[] {
  const dirName = projectPath.split('/').pop() ?? '';
  if (!dirName) return [];
  return teams.filter(t => t.name === dirName || t.name.startsWith(dirName + '-'));
}
```

**Step 4: Test ausfuehren, Erfolg bestaetigen**

Run: `npx vitest run src/__tests__/project-matching.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/projects/matching.ts src/__tests__/project-matching.test.ts
git commit -m "feat: Projekt-Matching Utility fuer Sessions und Claude Teams"
```

---

### Task 5: Projekt-API um Live-Daten erweitern

**Files:**
- Create: `src/app/api/projects/[id]/status/route.ts`

**Step 1: Neuen API-Endpunkt erstellen**

Neue Datei `src/app/api/projects/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { tmuxCommands } from '@/lib/tmux/commands';
import { parseSessions, parsePanePaths } from '@/lib/tmux/parser';
import { matchSessionsToProject, matchTeamsToProject } from '@/lib/projects/matching';
import { getCachedTeamState } from '@/lib/claude/poller';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;

    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!result[0]) {
      return NextResponse.json({ error: 'Project not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    const project = result[0];

    // Sessions vom Host holen
    let matchedSessions: ReturnType<typeof matchSessionsToProject> = [];
    try {
      const [sessOutput, paneOutput] = await Promise.all([
        execOnHost(project.hostId, tmuxCommands.listSessions()),
        execOnHost(project.hostId, tmuxCommands.listPanePaths()),
      ]);
      const sessions = parseSessions(sessOutput);
      const panePaths = parsePanePaths(paneOutput);
      const enriched = sessions.map(s => ({
        ...s,
        panePaths: panePaths.get(s.name) ?? [],
      }));
      matchedSessions = matchSessionsToProject(project.path, enriched);
    } catch {
      // Host offline — leere Sessions
    }

    // Claude Teams aus Cache
    const teamState = getCachedTeamState(project.hostId);
    const matchedTeams = teamState
      ? matchTeamsToProject(project.path, teamState.teams)
      : [];
    const matchedTasks = teamState
      ? Object.fromEntries(
          matchedTeams.map(t => [t.name, teamState.tasks.get(t.name) ?? []])
        )
      : {};

    return NextResponse.json({
      project,
      sessions: matchedSessions,
      teams: matchedTeams,
      tasks: matchedTasks,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
```

**Step 2: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/projects/\\[id\\]/status/route.ts
git commit -m "feat: Projekt-Status API mit gematchten Sessions und Claude Teams"
```

---

### Task 6: Projekt-Detail-Seite `/projects/[id]`

**Files:**
- Create: `src/app/projects/[id]/page.tsx`

**Step 1: Detail-Seite erstellen**

Neue Datei `src/app/projects/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { ArrowLeft, Terminal, Users, Play, Plus, FolderOpen, ExternalLink } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Project, TmuxSession, Team, Task, Host } from '@/types';

interface ProjectStatus {
  project: Project & { host?: Host };
  sessions: TmuxSession[];
  teams: Team[];
  tasks: Record<string, Task[]>;
}

function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // Initial fetch + polling
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetchWithTimeout(`/api/projects/${id}/status`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Projekt nicht gefunden' : 'Fehler beim Laden');
          setLoading(false);
          return;
        }
        if (!cancelled) {
          setStatus(await res.json());
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Verbindungsfehler');
          setLoading(false);
        }
      }
    };

    load();

    // Refetch alle 5 Sekunden (Session-Pfade aendern sich)
    const interval = setInterval(load, 5000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  // WebSocket fuer Team-Updates
  useEffect(() => {
    if (!status?.project.hostId) return;

    const socket = io('/updates');
    socket.emit('subscribe:host', status.project.hostId);

    // Bei Team-State-Updates refetchen (einfachster Weg)
    socket.on('teams:state', () => {
      fetchWithTimeout(`/api/projects/${id}/status`)
        .then(r => r.json())
        .then(data => setStatus(data))
        .catch(() => {});
    });

    return () => { socket.disconnect(); };
  }, [id, status?.project.hostId]);

  const handleConnect = (sessionName: string) => {
    if (!status) return;
    router.push(`/terminal/${encodeURIComponent(status.project.hostId)}?session=${encodeURIComponent(sessionName)}`);
  };

  const handleNewSession = async () => {
    if (!status) return;
    setCreating(true);
    const dirName = status.project.path.split('/').pop() ?? 'project';
    const name = `${dirName}-${Date.now().toString(36)}`;

    try {
      const res = await fetch(`/api/hosts/${status.project.hostId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDir: status.project.path }),
      });
      if (res.ok) {
        router.push(`/terminal/${encodeURIComponent(status.project.hostId)}?session=${encodeURIComponent(name)}`);
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/projects" className="text-[12px] text-[#4a5a6e] hover:text-[#22d3ee] flex items-center gap-1 mb-4">
          <ArrowLeft size={12} /> Zurueck
        </Link>
        <div className="panel p-8 text-center">
          <p className="text-[#8a9bb0]">{error || 'Projekt nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  const { project, sessions, teams, tasks } = status;
  const totalTasks = Object.values(tasks).flat();
  const completedTasks = totalTasks.filter(t => t.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 animate-fade-in">
        <div>
          <Link href="/projects" className="text-[12px] text-[#4a5a6e] hover:text-[#22d3ee] flex items-center gap-1 mb-2">
            <ArrowLeft size={12} /> Projects
          </Link>
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-[#fbbf24]" />
            <h1 className="text-xl font-medium text-[#c8d6e5]">{project.name}</h1>
          </div>
          <p className="text-[12px] text-[#4a5a6e] font-mono mt-1">{project.path}</p>
          {project.description && (
            <p className="text-[13px] text-[#8a9bb0] mt-1">{project.description}</p>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => sessions.length > 0 ? handleConnect(sessions[0].name) : handleNewSession()}
          disabled={creating}
        >
          {creating ? <Spinner size="sm" /> : <Play size={12} />}
          {sessions.length > 0 ? 'Connect' : 'Neue Session'}
        </Button>
      </div>

      {/* Aktive Sessions */}
      <div className="panel p-4 mb-4 animate-fade-in stagger-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-label flex items-center gap-1.5">
            <Terminal size={10} />
            AKTIVE SESSIONS
          </h2>
          <span className="text-[11px] text-[#4a5a6e]">{sessions.length} gefunden</span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[13px] text-[#4a5a6e]">Keine aktiven Sessions in diesem Verzeichnis</p>
            <Button variant="ghost" size="sm" onClick={handleNewSession} disabled={creating} className="mt-3">
              {creating ? <Spinner size="sm" /> : <Plus size={12} />}
              Session im Projektverzeichnis starten
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sessions.map(session => (
              <div
                key={session.name}
                className="panel-elevated px-4 py-3 flex items-center justify-between hover:border-[#2d3f52] transition-colors cursor-pointer"
                onClick={() => handleConnect(session.name)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 flex items-center justify-center rounded-sm"
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)' }}
                  >
                    <Terminal size={13} className="text-[#22d3ee]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#c8d6e5]">{session.name}</p>
                    <p className="text-[11px] text-[#4a5a6e]">
                      {session.windows} Window{session.windows !== 1 ? 's' : ''}
                      {session.attached && <span className="ml-1 text-[#34d399]">· attached</span>}
                    </p>
                  </div>
                </div>
                <ExternalLink size={12} className="text-[#2d3f52]" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claude Teams */}
      <div className="panel p-4 animate-fade-in stagger-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-label flex items-center gap-1.5">
            <Users size={10} />
            CLAUDE TEAMS
          </h2>
          <span className="text-[11px] text-[#4a5a6e]">
            {teams.length > 0 ? `${completedTasks}/${totalTasks.length} Tasks` : 'Keine Teams aktiv'}
          </span>
        </div>

        {teams.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[13px] text-[#4a5a6e]">Keine Claude Teams arbeiten in diesem Projekt</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teams.map(team => {
              const teamTasks = tasks[team.name] ?? [];
              const done = teamTasks.filter(t => t.status === 'completed').length;
              return (
                <div key={team.name} className="panel-elevated px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-[#a78bfa]" />
                      <span className="text-[13px] text-[#c8d6e5] font-medium">{team.name}</span>
                    </div>
                    {teamTasks.length > 0 && (
                      <span className="text-[11px] text-[#4a5a6e]">{done}/{teamTasks.length} Tasks</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map(agent => (
                      <Badge
                        key={agent.agentId}
                        variant={agent.status === 'active' ? 'online' : agent.status === 'idle' ? 'warning' : 'offline'}
                      >
                        {agent.name}
                      </Badge>
                    ))}
                  </div>
                  {teamTasks.length > 0 && (
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-overlay)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(done / teamTasks.length) * 100}%`,
                          background: 'var(--green)',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/projects/\\[id\\]/page.tsx
git commit -m "feat: Projekt-Detail-Seite mit Sessions, Claude Teams und Connect-Action"
```

---

### Task 7: Projekt-Liste mit Live-Daten aufwerten

**Files:**
- Modify: `src/app/projects/page.tsx`

**Step 1: Seite von Server Component auf Client Component umbauen**

Die bestehende `src/app/projects/page.tsx` komplett ersetzen mit einer Client Component die Live-Daten zeigt:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderOpen, Plus, Play, Terminal, Users, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Project, Host, TmuxSession, Team, Task } from '@/types';

interface ProjectWithStatus {
  project: Project & { host?: Host };
  sessions: TmuxSession[];
  teams: Team[];
  tasks: Record<string, Task[]>;
}

function fetchWithTimeout(url: string, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projectStatuses, setProjectStatuses] = useState<ProjectWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok || cancelled) return;
        const projects: Project[] = await res.json();
        if (!Array.isArray(projects) || cancelled) return;

        // Projekte sofort anzeigen, Status im Hintergrund laden
        setProjectStatuses(projects.map(p => ({ project: p, sessions: [], teams: [], tasks: {} })));
        setLoading(false);

        // Status fuer jedes Projekt laden
        for (const project of projects) {
          if (cancelled) break;
          try {
            const sr = await fetchWithTimeout(`/api/projects/${project.id}/status`);
            if (sr.ok && !cancelled) {
              const data = await sr.json();
              setProjectStatuses(prev =>
                prev.map(ps => ps.project.id === project.id ? data : ps)
              );
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10000);

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <div className="text-label text-[#4a5a6e] mb-1 flex items-center gap-1.5">
            <FolderOpen size={10} />
            PROJECTS
          </div>
          <h1 className="text-xl font-medium text-[#c8d6e5]">Projects</h1>
        </div>
        <Link href="/settings#add-project" className="btn btn-primary">
          <Plus size={13} />
          Add Project
        </Link>
      </div>

      {projectStatuses.length === 0 ? (
        <div className="panel p-12 flex flex-col items-center text-center animate-fade-in stagger-1">
          <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <FolderOpen size={20} className="text-[#2d3f52]" />
          </div>
          <h2 className="text-sm font-medium text-[#8a9bb0]">Noch keine Projekte</h2>
          <p className="text-[12px] text-[#4a5a6e] mt-1 max-w-xs">
            Erstelle ein Projekt, um einen Repository-Pfad auf einem Remote-Host zu verknuepfen.
          </p>
          <Link href="/settings" className="btn btn-primary mt-4">
            <Plus size={13} />
            Projekt erstellen
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projectStatuses.map(({ project, sessions, teams, tasks }, i) => {
            const totalTasks = Object.values(tasks).flat();
            const completedTasks = totalTasks.filter(t => t.status === 'completed').length;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`panel p-4 hover:border-[#2d3f52] transition-colors group animate-fade-in stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-sm flex items-center justify-center mt-0.5 shrink-0"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                      <FolderOpen size={14} className="text-[#fbbf24]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-medium text-[#c8d6e5]">{project.name}</h3>
                      <p className="text-[11px] text-[#4a5a6e] mt-0.5 font-mono">{project.path}</p>
                      {project.description && (
                        <p className="text-[12px] text-[#8a9bb0] mt-1">{project.description}</p>
                      )}

                      {/* Live-Status Badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {sessions.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-[#22d3ee]">
                            <Terminal size={10} />
                            {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {teams.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-[#a78bfa]">
                            <Users size={10} />
                            {teams.length} Team{teams.length !== 1 ? 's' : ''}
                            {totalTasks.length > 0 && ` (${completedTasks}/${totalTasks.length})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[#2d3f52] group-hover:text-[#4a5a6e] group-hover:translate-x-0.5 transition-all mt-2" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/projects/page.tsx
git commit -m "feat: Projekt-Liste mit Live-Status (Sessions, Claude Teams, Task-Fortschritt)"
```

---

### Task 8: Manueller Smoke Test

**Step 1: Dev-Server starten**

Run: `npm run dev` (oder `tsx watch server/index.ts`)

**Step 2: Testfaelle pruefen**

1. `/projects` — zeigt leere Liste oder bestehende Projekte
2. Projekt anlegen (via Settings oder API): `curl -X POST http://localhost:3000/api/projects -H 'Content-Type: application/json' -d '{"name":"test","path":"/home/user/project","hostId":"<hostId>"}'`
3. `/projects` — Projekt erscheint mit Live-Badges
4. `/projects/<id>` — Detail-Seite zeigt Sessions und Teams
5. Connect-Button fuehrt zum Terminal
6. "Neue Session starten" erstellt Session im Projektverzeichnis

**Step 3: TypeScript + Tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Alles gruen

**Step 4: Finaler Commit (falls noetig)**

Nur wenn nach dem Smoke Test noch Fixes noetig waren.
