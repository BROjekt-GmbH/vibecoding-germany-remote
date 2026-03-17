# Remote Team Dashboard - Backend Implementation Spec

**Date:** February 27, 2026
**Author:** @architect
**For:** @backend-dev
**Reference:** `docs/architecture.md`

---

## Overview

You are building the backend for Remote Team — API routes, SSH connection management, tmux integration, Claude Code team state polling, WebSocket server for real-time terminal I/O, and database layer. The backend runs as a custom Node.js server wrapping Next.js with socket.io.

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 15+ | API route handlers |
| Node.js | 20+ | Runtime |
| socket.io | 4.x | WebSocket server |
| ssh2 | 1.x | SSH client connections |
| Drizzle ORM | 0.3x+ | Database access |
| PostgreSQL | 16 | Data storage |
| TypeScript | 5.x | Type safety |

---

## 1. Project Setup (Backend-Specific)

After the frontend scaffolds the Next.js project, install backend dependencies:

```bash
npm install socket.io ssh2 drizzle-orm postgres
npm install -D drizzle-kit @types/ssh2
```

### Environment Variables (`.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/remote_team
NODE_ENV=development
DEV_USER_LOGIN=dev@tailnet.example.com
POLL_INTERVAL_MS=2000
PORT=3000

# SSH keys (one per host, referenced by name in DB)
SSH_KEY_WORK_LAPTOP="-----BEGIN OPENSSH PRIVATE KEY-----..."
```

---

## 2. Custom Server (`server/index.ts`)

Next.js App Router has no native WebSocket support. Create a custom server that wraps Next.js and attaches socket.io.

```typescript
// server/index.ts
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIO } from 'socket.io';
import { setupTerminalNamespace } from '../src/lib/socket/terminal';
import { setupUpdatesNamespace } from '../src/lib/socket/updates';
import { startTeamPoller } from '../src/lib/claude/poller';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new SocketIO(httpServer, {
    cors: { origin: false },  // Same-origin only
  });

  const terminalNs = io.of('/terminal');
  const updatesNs = io.of('/updates');

  setupTerminalNamespace(terminalNs);
  setupUpdatesNamespace(updatesNs);
  startTeamPoller(updatesNs);

  const port = parseInt(process.env.PORT || '3000', 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "tsx watch server/index.ts",
    "build": "next build",
    "start": "NODE_ENV=production node server/index.js"
  }
}
```

Install `tsx` for dev: `npm install -D tsx`

---

## 3. Database Layer (`src/lib/db/`)

### Schema (`src/lib/db/schema.ts`)

```typescript
import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const hosts = pgTable('hosts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  hostname: text('hostname').notNull(),
  port: integer('port').notNull().default(22),
  username: text('username').notNull(),
  authMethod: text('auth_method').notNull().default('key'),
  privateKeyEnv: text('private_key_env'),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLogin: text('user_login').notNull().unique(),
  theme: text('theme').notNull().default('dark'),
  terminalFontSize: integer('terminal_font_size').notNull().default(14),
  terminalFontFamily: text('terminal_font_family').notNull().default('JetBrains Mono'),
  pollIntervalMs: integer('poll_interval_ms').notNull().default(2000),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Connection (`src/lib/db/index.ts`)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### Drizzle Config (`drizzle.config.ts`)

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Commands:**
```bash
npx drizzle-kit generate   # Generate migration
npx drizzle-kit migrate    # Apply migration
npx drizzle-kit studio     # Visual DB browser (dev)
```

---

## 4. Authentication Middleware

### Tailscale Auth (`src/lib/auth.ts`)

```typescript
import { headers } from 'next/headers';

export interface AuthUser {
  login: string;
  name: string;
  profilePic: string | null;
}

export async function getUser(): Promise<AuthUser | null> {
  const headerStore = await headers();
  const login = headerStore.get('tailscale-user-login');
  const name = headerStore.get('tailscale-user-name');
  const profilePic = headerStore.get('tailscale-user-profile-pic');

  // Dev fallback
  if (!login && process.env.NODE_ENV === 'development') {
    return {
      login: process.env.DEV_USER_LOGIN || 'dev@local',
      name: 'Dev User',
      profilePic: null,
    };
  }

  if (!login) return null;

  return { login, name: name || login, profilePic };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
```

### Next.js Middleware (`src/middleware.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const userLogin = request.headers.get('tailscale-user-login');

  // Dev mode bypass
  if (!userLogin && process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  if (!userLogin) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
```

---

## 5. SSH Connection Pool (`src/lib/ssh/`)

### Types (`src/lib/ssh/types.ts`)

```typescript
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PooledConnection {
  config: SSHConfig;
  client: any;  // ssh2.Client
  state: ConnectionState;
  lastUsed: number;
  refCount: number;
}
```

### Pool Manager (`src/lib/ssh/pool.ts`)

```typescript
import { Client as SSHClient } from 'ssh2';

class SSHPool {
  private connections = new Map<string, PooledConnection>();
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly KEEPALIVE_INTERVAL = 30_000;   // 30 seconds

  async getConnection(hostId: string, config: SSHConfig): Promise<SSHClient> {
    // Return existing connection if available
    // Otherwise create new, store in pool
    // Set up keepalive and idle timeout
  }

  async exec(hostId: string, config: SSHConfig, command: string): Promise<string> {
    const client = await this.getConnection(hostId, config);
    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => resolve(output));
      });
    });
  }

  async shell(hostId: string, config: SSHConfig): Promise<ClientChannel> {
    const client = await this.getConnection(hostId, config);
    return new Promise((resolve, reject) => {
      client.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) return reject(err);
        resolve(stream);
      });
    });
  }

  async disconnect(hostId: string): void { /* ... */ }
  async healthCheck(hostId: string): Promise<boolean> { /* ... */ }

  // Periodic cleanup of idle connections
  startCleanupTimer(): void {
    setInterval(() => {
      for (const [id, conn] of this.connections) {
        if (conn.refCount === 0 && Date.now() - conn.lastUsed > this.IDLE_TIMEOUT) {
          conn.client.end();
          this.connections.delete(id);
        }
      }
    }, 60_000);
  }
}

export const sshPool = new SSHPool();
```

### SSH Client Helper (`src/lib/ssh/client.ts`)

```typescript
import { db } from '../db';
import { hosts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sshPool } from './pool';
import type { SSHConfig } from './types';

export async function getHostSSHConfig(hostId: string): Promise<SSHConfig> {
  const host = await db.select().from(hosts).where(eq(hosts.id, hostId)).limit(1);
  if (!host[0]) throw new Error(`Host not found: ${hostId}`);

  const h = host[0];
  const privateKey = h.privateKeyEnv ? process.env[h.privateKeyEnv] : undefined;

  return {
    host: h.hostname,
    port: h.port,
    username: h.username,
    privateKey,
  };
}

export async function execOnHost(hostId: string, command: string): Promise<string> {
  const config = await getHostSSHConfig(hostId);
  return sshPool.exec(hostId, config, command);
}
```

---

## 6. tmux Integration (`src/lib/tmux/`)

### Types (`src/lib/tmux/types.ts`)

```typescript
export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
  activity: string;
}

export interface TmuxWindow {
  index: number;
  name: string;
  panes: number;
  active: boolean;
}

export interface TmuxPane {
  index: number;
  width: number;
  height: number;
  active: boolean;
  pid: number;
  currentCommand: string;
}
```

### Command Builders (`src/lib/tmux/commands.ts`)

```typescript
export const tmuxCommands = {
  listSessions: () =>
    `tmux list-sessions -F "#{session_name}|#{session_windows}|#{session_attached}|#{session_created}|#{session_activity}" 2>/dev/null || echo ""`,

  listWindows: (session: string) =>
    `tmux list-windows -t "${session}" -F "#{window_index}|#{window_name}|#{window_panes}|#{window_active}" 2>/dev/null || echo ""`,

  listPanes: (session: string, window: number) =>
    `tmux list-panes -t "${session}:${window}" -F "#{pane_index}|#{pane_width}|#{pane_height}|#{pane_active}|#{pane_pid}|#{pane_current_command}" 2>/dev/null || echo ""`,

  capturePane: (target: string, lines: number = 100) =>
    `tmux capture-pane -p -t "${target}" -S -${lines} 2>/dev/null || echo ""`,

  sendKeys: (target: string, keys: string) =>
    `tmux send-keys -t "${target}" ${JSON.stringify(keys)}`,

  newSession: (name: string) =>
    `tmux new-session -d -s "${name}"`,

  killSession: (name: string) =>
    `tmux kill-session -t "${name}"`,

  attachToSession: (name: string) =>
    `tmux attach-session -t "${name}"`,
};
```

### Parser (`src/lib/tmux/parser.ts`)

```typescript
import type { TmuxSession, TmuxWindow, TmuxPane } from './types';

export function parseSessions(output: string): TmuxSession[] {
  if (!output.trim()) return [];
  return output.trim().split('\n').map(line => {
    const [name, windows, attached, created, activity] = line.split('|');
    return {
      name,
      windows: parseInt(windows, 10),
      attached: attached === '1',
      created,
      activity,
    };
  });
}

export function parseWindows(output: string): TmuxWindow[] {
  if (!output.trim()) return [];
  return output.trim().split('\n').map(line => {
    const [index, name, panes, active] = line.split('|');
    return {
      index: parseInt(index, 10),
      name,
      panes: parseInt(panes, 10),
      active: active === '1',
    };
  });
}

export function parsePanes(output: string): TmuxPane[] {
  if (!output.trim()) return [];
  return output.trim().split('\n').map(line => {
    const [index, width, height, active, pid, currentCommand] = line.split('|');
    return {
      index: parseInt(index, 10),
      width: parseInt(width, 10),
      height: parseInt(height, 10),
      active: active === '1',
      pid: parseInt(pid, 10),
      currentCommand,
    };
  });
}
```

---

## 7. Claude Code Team Poller (`src/lib/claude/`)

### Types (`src/lib/claude/types.ts`)

```typescript
export interface ClaudeTeam {
  name: string;
  hostId: string;
  members: ClaudeAgent[];
}

export interface ClaudeAgent {
  name: string;
  agentId: string;
  agentType: string;
}

export interface ClaudeTask {
  id: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string;
  blockedBy: string[];
  blocks: string[];
}

export interface HostTeamState {
  hostId: string;
  teams: ClaudeTeam[];
  tasks: Map<string, ClaudeTask[]>;  // teamName → tasks
  timestamp: number;
}
```

### Parser (`src/lib/claude/parser.ts`)

```typescript
import type { ClaudeTeam, ClaudeTask } from './types';

export function parseTeamConfigs(jsonOutput: string, hostId: string): ClaudeTeam[] {
  // jsonOutput is concatenated JSON objects from multiple config files
  // Parse each, attach hostId
  try {
    const configs = JSON.parse(`[${jsonOutput.replace(/}\s*{/g, '},{')}]`);
    return configs.map((c: any) => ({
      name: c.name,
      hostId,
      members: c.members || [],
    }));
  } catch {
    return [];
  }
}

export function parseTaskFiles(jsonOutput: string): ClaudeTask[] {
  try {
    const tasks = JSON.parse(`[${jsonOutput.replace(/}\s*{/g, '},{')}]`);
    return tasks.map((t: any) => ({
      id: t.id,
      subject: t.subject || '',
      description: t.description || '',
      status: t.status || 'pending',
      owner: t.owner || '',
      blockedBy: t.blockedBy || [],
      blocks: t.blocks || [],
    }));
  } catch {
    return [];
  }
}
```

### Poller (`src/lib/claude/poller.ts`)

```typescript
import { Namespace } from 'socket.io';
import { db } from '../db';
import { hosts } from '../db/schema';
import { execOnHost } from '../ssh/client';
import { parseTeamConfigs, parseTaskFiles } from './parser';
import type { HostTeamState } from './types';

// In-memory state cache
const stateCache = new Map<string, HostTeamState>();

async function pollHost(hostId: string): Promise<HostTeamState | null> {
  try {
    // Read team configs
    const teamOutput = await execOnHost(hostId,
      'cat ~/.claude/teams/*/config.json 2>/dev/null || echo ""'
    );
    const teams = parseTeamConfigs(teamOutput, hostId);

    // Read task files for each team
    const tasks = new Map<string, any[]>();
    for (const team of teams) {
      const taskOutput = await execOnHost(hostId,
        `cat ~/.claude/tasks/${team.name}/*.json 2>/dev/null || echo ""`
      );
      tasks.set(team.name, parseTaskFiles(taskOutput));
    }

    return { hostId, teams, tasks, timestamp: Date.now() };
  } catch (err) {
    console.error(`Poll failed for host ${hostId}:`, err);
    return null;
  }
}

export function startTeamPoller(updatesNs: Namespace) {
  const interval = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);

  setInterval(async () => {
    // Get all online hosts
    const onlineHosts = await db.select().from(hosts);

    for (const host of onlineHosts) {
      const state = await pollHost(host.id);
      if (!state) continue;

      const prev = stateCache.get(host.id);
      stateCache.set(host.id, state);

      // Compare and emit delta if changed
      if (JSON.stringify(prev) !== JSON.stringify(state)) {
        updatesNs.emit('teams:state', {
          hostId: host.id,
          teams: state.teams,
          tasks: Object.fromEntries(state.tasks),
        });
      }
    }
  }, interval);
}

// Export cache for REST API access
export function getCachedTeamState(hostId: string): HostTeamState | undefined {
  return stateCache.get(hostId);
}
```

---

## 8. WebSocket Server (`src/lib/socket/`)

### Event Constants (`src/lib/socket/events.ts`)

```typescript
export const TERMINAL_EVENTS = {
  CONNECT: 'terminal:connect',
  DATA: 'terminal:data',
  RESIZE: 'terminal:resize',
  DISCONNECT: 'terminal:disconnect',
  ERROR: 'terminal:error',
} as const;

export const UPDATE_EVENTS = {
  TEAMS_STATE: 'teams:state',
  TEAMS_DELTA: 'teams:delta',
  SESSIONS_STATE: 'sessions:state',
  HOST_STATUS: 'host:status',
} as const;
```

### Terminal Namespace (`src/lib/socket/terminal.ts`)

This is the core of the WebSSH2 pattern — bridging browser WebSocket to SSH.

```typescript
import { Namespace, Socket } from 'socket.io';
import { sshPool } from '../ssh/pool';
import { getHostSSHConfig } from '../ssh/client';
import { TERMINAL_EVENTS } from './events';

interface TerminalConnectPayload {
  hostId: string;
  sessionName: string;
  pane?: string;
}

export function setupTerminalNamespace(ns: Namespace) {
  ns.on('connection', (socket: Socket) => {
    let sshStream: any = null;

    socket.on(TERMINAL_EVENTS.CONNECT, async (payload: TerminalConnectPayload) => {
      try {
        const config = await getHostSSHConfig(payload.hostId);
        const stream = await sshPool.shell(payload.hostId, config);
        sshStream = stream;

        // Attach to tmux session
        const target = payload.pane
          ? `${payload.sessionName}:${payload.pane}`
          : payload.sessionName;
        stream.write(`tmux attach-session -t "${target}" || tmux new-session -s "${target}"\n`);

        // SSH output → browser
        stream.on('data', (data: Buffer) => {
          socket.emit(TERMINAL_EVENTS.DATA, { data: data.toString('utf-8') });
        });

        stream.on('close', () => {
          socket.emit(TERMINAL_EVENTS.ERROR, { message: 'SSH connection closed' });
          sshStream = null;
        });

        stream.stderr.on('data', (data: Buffer) => {
          socket.emit(TERMINAL_EVENTS.DATA, { data: data.toString('utf-8') });
        });

      } catch (err: any) {
        socket.emit(TERMINAL_EVENTS.ERROR, { message: err.message });
      }
    });

    // Browser keystrokes → SSH
    socket.on(TERMINAL_EVENTS.DATA, (payload: { data: string }) => {
      if (sshStream) {
        sshStream.write(payload.data);
      }
    });

    // Terminal resize
    socket.on(TERMINAL_EVENTS.RESIZE, (payload: { cols: number; rows: number }) => {
      if (sshStream) {
        sshStream.setWindow(payload.rows, payload.cols, 0, 0);
      }
    });

    // Cleanup
    socket.on(TERMINAL_EVENTS.DISCONNECT, () => {
      if (sshStream) {
        sshStream.end();
        sshStream = null;
      }
    });

    socket.on('disconnect', () => {
      if (sshStream) {
        sshStream.end();
        sshStream = null;
      }
    });
  });
}
```

### Updates Namespace (`src/lib/socket/updates.ts`)

```typescript
import { Namespace } from 'socket.io';
import { getCachedTeamState } from '../claude/poller';

export function setupUpdatesNamespace(ns: Namespace) {
  ns.on('connection', (socket) => {
    // Send current cached state on connect
    // Client can request specific host state
    socket.on('subscribe:host', (hostId: string) => {
      socket.join(`host:${hostId}`);
      const state = getCachedTeamState(hostId);
      if (state) {
        socket.emit('teams:state', {
          hostId,
          teams: state.teams,
          tasks: Object.fromEntries(state.tasks),
        });
      }
    });

    socket.on('unsubscribe:host', (hostId: string) => {
      socket.leave(`host:${hostId}`);
    });
  });
}
```

---

## 9. API Route Handlers

All routes in `src/app/api/`. Each route handler uses `requireUser()` for auth.

### Hosts (`src/app/api/hosts/`)

#### `src/app/api/hosts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hosts } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';

// GET /api/hosts — List all hosts
export async function GET() {
  await requireUser();
  const allHosts = await db.select().from(hosts);
  return NextResponse.json(allHosts);
}

// POST /api/hosts — Create host
export async function POST(req: NextRequest) {
  await requireUser();
  const body = await req.json();
  const [host] = await db.insert(hosts).values({
    name: body.name,
    hostname: body.hostname,
    port: body.port || 22,
    username: body.username,
    authMethod: body.authMethod || 'key',
    privateKeyEnv: body.privateKeyEnv,
  }).returning();
  return NextResponse.json(host, { status: 201 });
}
```

#### `src/app/api/hosts/[id]/route.ts`

```typescript
// GET, PATCH, DELETE for individual host
// Standard CRUD with db.select/update/delete
```

#### `src/app/api/hosts/[id]/test/route.ts`

```typescript
// POST /api/hosts/[id]/test — Test SSH connectivity
import { execOnHost } from '@/lib/ssh/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await requireUser();
  try {
    const output = await execOnHost(params.id, 'echo "ok"');
    return NextResponse.json({ success: true, output: output.trim() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
```

#### `src/app/api/hosts/[id]/sessions/route.ts`

```typescript
// GET /api/hosts/[id]/sessions — List tmux sessions
import { execOnHost } from '@/lib/ssh/client';
import { tmuxCommands } from '@/lib/tmux/commands';
import { parseSessions } from '@/lib/tmux/parser';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await requireUser();
  const output = await execOnHost(params.id, tmuxCommands.listSessions());
  const sessions = parseSessions(output);
  return NextResponse.json(sessions);
}
```

#### `src/app/api/hosts/[id]/teams/route.ts`

```typescript
// GET /api/hosts/[id]/teams — Get cached team state
import { getCachedTeamState } from '@/lib/claude/poller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await requireUser();
  const state = getCachedTeamState(params.id);
  return NextResponse.json(state?.teams || []);
}
```

### Projects, Preferences

Follow the same pattern — standard CRUD with Drizzle queries.

---

## 10. Implementation Order

**Build in this order to support the frontend team:**

1. **Database setup** — Schema, migrations, DB connection (`src/lib/db/`)
2. **Auth middleware** — `src/lib/auth.ts` + `src/middleware.ts`
3. **Host CRUD API** — `/api/hosts` routes (frontend needs this first for settings page)
4. **SSH connection pool** — `src/lib/ssh/pool.ts`, `client.ts`
5. **Host connectivity test** — `/api/hosts/[id]/test` route
6. **Custom server** — `server/index.ts` with socket.io attached
7. **Terminal WebSocket** — `/terminal` namespace (frontend terminal depends on this)
8. **tmux integration** — Commands, parsers, `/api/hosts/[id]/sessions`
9. **Claude Code poller** — `src/lib/claude/poller.ts`, `/updates` namespace
10. **Team API routes** — `/api/hosts/[id]/teams` and tasks
11. **Projects + Preferences API** — CRUD routes
12. **Health checks** — Periodic host connectivity monitoring

---

## 11. Error Handling Patterns

### SSH Errors

```typescript
// Wrap all SSH operations
try {
  const result = await execOnHost(hostId, command);
} catch (err) {
  if (err.message.includes('ECONNREFUSED')) {
    // Host unreachable — mark as offline
    await db.update(hosts).set({ isOnline: false }).where(eq(hosts.id, hostId));
  }
  throw err;
}
```

### WebSocket Error Events

Always emit structured error events to the client:
```typescript
socket.emit(TERMINAL_EVENTS.ERROR, {
  message: 'Human-readable error message',
  code: 'SSH_CONNECTION_FAILED',
  recoverable: true,  // Client can retry
});
```

### API Error Responses

```typescript
// Consistent error format
return NextResponse.json(
  { error: 'Host not found', code: 'NOT_FOUND' },
  { status: 404 }
);
```

---

## 12. Security Notes

1. **SSH keys are NEVER stored in the database.** The DB stores the name of an environment variable. Read keys via `process.env[envVarName]`.
2. **Validate all tmux command inputs.** Never interpolate raw user input into shell commands. Use the command builders in `src/lib/tmux/commands.ts` which properly escape arguments.
3. **Auth middleware runs on every request.** No unauthenticated access to any API route.
4. **WebSocket connections require auth too.** Check Tailscale headers in the socket.io handshake middleware (via HTTP headers on the upgrade request).
5. **Dev mode fallback** (`DEV_USER_LOGIN`) is only active when `NODE_ENV=development`.

---

## 13. Testing Approach

- **Unit tests:** tmux parsers, Claude Code parsers (pure functions, easy to test)
- **Integration tests:** API routes with test database
- **SSH mocking:** Use `ssh2` mock or local SSH server for connection pool tests
- **WebSocket tests:** socket.io-client to test terminal namespace end-to-end

---

**Spec Complete**
**Architect:** @architect
**Date:** February 27, 2026
