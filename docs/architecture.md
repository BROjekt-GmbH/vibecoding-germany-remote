# Remote Team Dashboard - Architecture Document

**Date:** February 27, 2026
**Author:** @architect
**Status:** Final
**Based on:** Research Report by @researcher

---

## 1. System Overview

Remote Team is a self-hosted web dashboard for managing tmux sessions and Claude Code agent teams across multiple devices over SSH. It runs on Coolify behind Tailscale, accessible only to tailnet members.

### Core Capabilities

1. **Terminal Viewer** — Render live tmux sessions from remote hosts via xterm.js
2. **Team Dashboard** — Display Claude Code agent teams, tasks, and status in real-time
3. **Message Interface** — View and interact with Claude Code team member conversations
4. **Session Manager** — Discover, connect, and manage tmux sessions across devices
5. **Project Manager** — Organize SSH hosts and Claude Code projects

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Tailnet)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ xterm.js │  │ Team     │  │ Chat     │  │ Session    │  │
│  │ Terminal  │  │ Dashboard│  │ Panel    │  │ Manager    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │ WS          │ WS/REST     │ REST         │ REST     │
└───────┼─────────────┼─────────────┼──────────────┼──────────┘
        │             │             │              │
┌───────┼─────────────┼─────────────┼──────────────┼──────────┐
│       ▼             ▼             ▼              ▼          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js Server (App Router)             │    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │    │
│  │  │ WS Server│  │ API Routes│  │ Auth Middleware   │ │    │
│  │  │(socket.io)│  │ (REST)   │  │ (Tailscale Hdrs) │ │    │
│  │  └────┬─────┘  └─────┬────┘  └──────────────────┘ │    │
│  │       │               │                             │    │
│  │  ┌────┴───────────────┴────┐                        │    │
│  │  │     Service Layer       │                        │    │
│  │  │  ┌─────┐ ┌──────┐      │                        │    │
│  │  │  │ SSH │ │ Team │      │                        │    │
│  │  │  │ Mgr │ │Poller│      │                        │    │
│  │  │  └──┬──┘ └──┬───┘      │                        │    │
│  │  └─────┼───────┼──────────┘                        │    │
│  │        │       │                                    │    │
│  │  ┌─────┴───────┴──────────┐                        │    │
│  │  │    SSH Connection Pool  │                        │    │
│  │  └─────────────┬──────────┘                        │    │
│  └────────────────┼────────────────────────────────────┘    │
│                   │                                          │
│  ┌────────────────┴──────────────┐                          │
│  │         PostgreSQL            │                          │
│  │  (hosts, projects, prefs)     │                          │
│  └───────────────────────────────┘                          │
│                                                              │
│                  VPS (Coolify + Tailscale)                    │
└──────────────────────────────────────────────────────────────┘
        │
        │ SSH (via Tailscale)
        ▼
┌──────────────────┐  ┌──────────────────┐
│  Remote Host A   │  │  Remote Host B   │
│  ├─ tmux sessions│  │  ├─ tmux sessions│
│  └─ ~/.claude/   │  │  └─ ~/.claude/   │
│     ├─ teams/    │  │     ├─ teams/    │
│     └─ tasks/    │  │     └─ tasks/    │
└──────────────────┘  └──────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Next.js (App Router) | 15+ | Server components, API routes, SSR |
| **UI** | React | 19 | Server/client component model |
| **Language** | TypeScript | 5.x | Type safety across stack |
| **Styling** | Tailwind CSS | 4.x | Utility-first, fast iteration |
| **Terminal** | xterm.js | 5.x | Industry standard, GPU-accelerated |
| **WebSocket** | socket.io | 4.x | Reliable bidirectional comms |
| **SSH** | ssh2 | 1.x | Pure JS SSH2 client |
| **Database** | PostgreSQL | 16 | Relational data, JSON support |
| **ORM** | Drizzle ORM | 0.3x+ | Type-safe, lightweight, SQL-first |
| **Auth** | Tailscale headers | N/A | Zero-code auth via identity headers |
| **Deploy** | Coolify + Nixpacks | N/A | Self-hosted PaaS |

---

## 3. Directory Structure

```
remote-team/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (Server Component)
│   │   ├── page.tsx                  # Dashboard home (Server Component)
│   │   ├── globals.css               # Tailwind imports
│   │   │
│   │   ├── hosts/
│   │   │   ├── page.tsx              # Host list (Server Component)
│   │   │   └── [hostId]/
│   │   │       └── page.tsx          # Host detail + sessions (Server Component)
│   │   │
│   │   ├── terminal/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx          # Full terminal view (Client Component wrapper)
│   │   │
│   │   ├── teams/
│   │   │   ├── page.tsx              # All teams overview (Server Component)
│   │   │   └── [teamId]/
│   │   │       └── page.tsx          # Team detail: tasks + agents (Server Component)
│   │   │
│   │   ├── projects/
│   │   │   ├── page.tsx              # Project list (Server Component)
│   │   │   └── [projectId]/
│   │   │       └── page.tsx          # Project detail + sessions (Server Component)
│   │   │
│   │   └── settings/
│   │       └── page.tsx              # SSH hosts config, preferences (Client Component)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx           # Navigation sidebar (Client Component)
│   │   │   ├── header.tsx            # Top bar with user info (Server Component)
│   │   │   └── breadcrumb.tsx        # Breadcrumb nav (Server Component)
│   │   │
│   │   ├── terminal/
│   │   │   ├── terminal-view.tsx     # xterm.js wrapper (Client Component)
│   │   │   ├── terminal-tabs.tsx     # Session tab bar (Client Component)
│   │   │   └── terminal-toolbar.tsx  # Terminal actions (Client Component)
│   │   │
│   │   ├── team/
│   │   │   ├── team-card.tsx         # Team summary card (Server Component)
│   │   │   ├── agent-list.tsx        # Agent roster with status (Client Component)
│   │   │   ├── task-board.tsx        # Task list with status (Client Component)
│   │   │   └── task-card.tsx         # Individual task (Server Component)
│   │   │
│   │   ├── chat/
│   │   │   ├── message-panel.tsx     # Chat/message viewer (Client Component)
│   │   │   └── message-bubble.tsx    # Single message (Server Component)
│   │   │
│   │   ├── host/
│   │   │   ├── host-card.tsx         # SSH host card (Server Component)
│   │   │   ├── host-form.tsx         # Add/edit host (Client Component)
│   │   │   └── session-list.tsx      # tmux sessions for host (Client Component)
│   │   │
│   │   └── ui/
│   │       ├── badge.tsx             # Status badges
│   │       ├── card.tsx              # Card container
│   │       ├── button.tsx            # Button component
│   │       ├── input.tsx             # Form input
│   │       ├── dialog.tsx            # Modal dialog
│   │       └── spinner.tsx           # Loading spinner
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema definitions
│   │   │   ├── index.ts             # DB connection + client export
│   │   │   └── migrations/          # Generated migrations
│   │   │
│   │   ├── ssh/
│   │   │   ├── pool.ts              # SSH connection pool manager
│   │   │   ├── client.ts            # SSH command execution helpers
│   │   │   └── types.ts             # SSH-related types
│   │   │
│   │   ├── tmux/
│   │   │   ├── commands.ts           # tmux command builders
│   │   │   ├── parser.ts            # Parse tmux output into typed objects
│   │   │   └── types.ts             # tmux session/window/pane types
│   │   │
│   │   ├── claude/
│   │   │   ├── poller.ts            # Poll ~/.claude/teams and tasks via SSH
│   │   │   ├── parser.ts            # Parse team config + task JSON files
│   │   │   └── types.ts             # Claude Code team/task types
│   │   │
│   │   ├── socket/
│   │   │   ├── server.ts            # socket.io server setup + namespaces
│   │   │   └── events.ts            # Event name constants
│   │   │
│   │   ├── auth.ts                  # Tailscale identity header middleware
│   │   └── utils.ts                 # Shared utilities
│   │
│   ├── hooks/
│   │   ├── use-socket.ts            # socket.io client hook
│   │   ├── use-terminal.ts          # xterm.js lifecycle hook
│   │   └── use-team-updates.ts      # Live team state subscription
│   │
│   └── types/
│       └── index.ts                 # Shared TypeScript types
│
├── server/
│   └── index.ts                     # Custom server entry (socket.io + Next.js)
│
├── drizzle.config.ts                # Drizzle ORM config
├── next.config.ts                   # Next.js config (standalone output)
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json                    # TypeScript config
├── package.json
├── .env.example                     # Environment variable template
└── docs/
    ├── research-report.md
    ├── architecture.md              # This document
    ├── frontend-spec.md
    └── backend-spec.md
```

---

## 4. Component Architecture

### Server/Client Component Boundaries

**Principle:** Server Components by default. Client Components only when browser APIs are needed (xterm.js, WebSocket, user interaction state).

```
Root Layout (Server)
├── Header (Server) — reads Tailscale user from headers
├── Sidebar (Client) — navigation state, active route highlighting
└── Page Content
    ├── Dashboard Home (Server)
    │   ├── HostCard (Server) — static host info from DB
    │   ├── TeamCard (Server) — initial team snapshot from DB
    │   ├── AgentList (Client) — live status updates via WS
    │   └── SessionList (Client) — live tmux session state via WS
    │
    ├── Terminal Page (Client boundary)
    │   ├── TerminalView (Client) — xterm.js, WebSocket I/O
    │   ├── TerminalTabs (Client) — session switching
    │   └── TerminalToolbar (Client) — actions (disconnect, resize)
    │
    ├── Team Detail (Server)
    │   ├── TaskBoard (Client) — live task updates
    │   ├── AgentList (Client) — live agent status
    │   └── MessagePanel (Client) — live message stream
    │
    └── Settings (Client) — forms, validation
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Terminal rendering | xterm.js via Client Component | Requires DOM + WebGL access |
| Team status | Client Component + WS | Real-time updates needed |
| Host list | Server Component | Static data, fetched from DB |
| Task board | Client Component | Live updates, drag potential |
| Auth header reading | Server Component / Middleware | Headers available server-side only |
| Settings forms | Client Component | User input, validation |

---

## 5. API Design

### REST API Routes (Next.js Route Handlers)

All API routes are in `src/app/api/`. Auth middleware reads `Tailscale-User-Login` header on every request.

#### Hosts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hosts` | List all configured SSH hosts |
| `POST` | `/api/hosts` | Add a new SSH host |
| `GET` | `/api/hosts/[id]` | Get host details |
| `PATCH` | `/api/hosts/[id]` | Update host config |
| `DELETE` | `/api/hosts/[id]` | Remove host |
| `POST` | `/api/hosts/[id]/test` | Test SSH connectivity |

#### tmux Sessions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hosts/[id]/sessions` | List tmux sessions on host |
| `GET` | `/api/hosts/[id]/sessions/[name]` | Get session detail (windows, panes) |
| `POST` | `/api/hosts/[id]/sessions` | Create new tmux session |
| `DELETE` | `/api/hosts/[id]/sessions/[name]` | Kill tmux session |
| `POST` | `/api/hosts/[id]/sessions/[name]/capture` | Capture pane output |

#### Claude Code Teams

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hosts/[id]/teams` | List teams on host |
| `GET` | `/api/hosts/[id]/teams/[name]` | Get team detail (members, config) |
| `GET` | `/api/hosts/[id]/teams/[name]/tasks` | Get all tasks for team |

#### Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/[id]` | Get project detail |
| `PATCH` | `/api/projects/[id]` | Update project |
| `DELETE` | `/api/projects/[id]` | Delete project |

#### User Preferences

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/preferences` | Get user preferences |
| `PATCH` | `/api/preferences` | Update preferences |

### WebSocket Namespaces (socket.io)

```
/terminal    — Terminal I/O (bidirectional)
/updates     — Team + session state updates (server → client)
```

#### `/terminal` Namespace

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `terminal:connect` | Client → Server | `{ hostId, sessionName, pane? }` | Open SSH → tmux session |
| `terminal:data` | Client → Server | `{ data: string }` | Keystrokes from browser |
| `terminal:data` | Server → Client | `{ data: string }` | Terminal output from remote |
| `terminal:resize` | Client → Server | `{ cols, rows }` | Terminal resize event |
| `terminal:disconnect` | Client → Server | `{}` | Close SSH session |
| `terminal:error` | Server → Client | `{ message }` | Connection/SSH error |

#### `/updates` Namespace

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `teams:state` | Server → Client | `{ hostId, teams[] }` | Full team state snapshot |
| `teams:delta` | Server → Client | `{ hostId, changes[] }` | Incremental team updates |
| `sessions:state` | Server → Client | `{ hostId, sessions[] }` | tmux session list update |
| `host:status` | Server → Client | `{ hostId, online }` | Host connectivity change |

---

## 6. Database Schema

Using Drizzle ORM with PostgreSQL.

```typescript
// src/lib/db/schema.ts

import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const hosts = pgTable('hosts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),                    // Display name (e.g., "Work Laptop")
  hostname: text('hostname').notNull(),             // Tailscale IP or hostname
  port: integer('port').notNull().default(22),
  username: text('username').notNull(),
  authMethod: text('auth_method').notNull().default('key'), // 'key' | 'agent'
  privateKeyEnv: text('private_key_env'),           // Env var name containing SSH key
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  path: text('path').notNull(),                     // Absolute path on remote host
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLogin: text('user_login').notNull().unique(),  // Tailscale-User-Login
  theme: text('theme').notNull().default('dark'),
  terminalFontSize: integer('terminal_font_size').notNull().default(14),
  terminalFontFamily: text('terminal_font_family').notNull().default('JetBrains Mono'),
  pollIntervalMs: integer('poll_interval_ms').notNull().default(2000),
  settings: jsonb('settings').default({}),           // Extensible JSON blob
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Design decisions:**
- **No users table** — Tailscale headers provide identity. Preferences table uses `userLogin` as the key.
- **SSH keys stored in env vars** — `privateKeyEnv` references the name of the environment variable, not the key itself. The app reads `process.env[host.privateKeyEnv]` at runtime.
- **No teams/tasks in DB** — Claude Code team state is ephemeral and file-based. We poll it live and cache in memory; no persistence needed.
- **Projects link to hosts** — A project exists on a specific host at a specific path.

---

## 7. Real-Time Architecture

### Data Flow Pattern

```
Remote Host (tmux + Claude Code)
    │
    │  SSH (polled every 2s)
    ▼
┌──────────────────────────────┐
│  Poller Service (server-side) │
│  ├─ SSH connection pool       │
│  ├─ tmux state cache          │
│  └─ Claude team state cache   │
└──────────┬───────────────────┘
           │
           │  Diff detection
           ▼
┌──────────────────────────────┐
│  socket.io Server             │
│  ├─ /terminal namespace       │  ← Bidirectional terminal I/O
│  └─ /updates namespace        │  ← Server-push state updates
└──────────┬───────────────────┘
           │
           │  WebSocket
           ▼
       Browser Clients
```

### Terminal I/O Flow (Bidirectional)

```
1. User types in xterm.js
2. xterm.js → socket.io client emits "terminal:data"
3. socket.io server receives data
4. Server writes data to SSH channel (ssh2 stream)
5. SSH channel sends to remote tmux session
6. tmux output flows back through SSH channel
7. Server emits "terminal:data" to socket.io client
8. xterm.js renders output
```

### Team State Polling Flow

```
1. Poller service runs on interval (configurable, default 2s)
2. For each online host:
   a. SSH exec: find/read ~/.claude/teams/*/config.json
   b. SSH exec: find/read ~/.claude/tasks/*/*.json
3. Parse JSON responses
4. Diff against previous cached state
5. If changes detected:
   a. Update in-memory cache
   b. Emit "teams:delta" event via socket.io /updates namespace
6. Clients receive delta and update UI
```

### Connection Lifecycle

```
Browser opens page
    │
    ├─ HTTP: Fetch initial data (Server Components + API)
    │
    ├─ WS: Connect to /updates namespace
    │      → Server starts sending team/session state
    │
    └─ WS: Connect to /terminal namespace (when user opens terminal)
           → Server establishes SSH connection to target host
           → Bidirectional I/O begins
           → On close: SSH connection teardown
```

---

## 8. Authentication & Authorization

### Auth Flow

```
User Request (from Tailnet)
    │
    ▼
Tailscale Serve (adds identity headers)
    │
    ▼
Next.js Middleware (src/middleware.ts)
    ├─ Read Tailscale-User-Login header
    ├─ If missing → 401 Unauthorized
    ├─ Attach user info to request context
    └─ Continue to route handler
```

### Middleware Implementation

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const userLogin = request.headers.get('tailscale-user-login');

  if (!userLogin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pass user info downstream via headers
  const response = NextResponse.next();
  response.headers.set('x-user-login', userLogin);
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next|favicon.ico).*)'],
};
```

### Development Mode

For local development without Tailscale:
- Environment variable `DEV_USER_LOGIN` provides a fake identity
- Middleware checks `NODE_ENV === 'development'` and falls back to env var

---

## 9. SSH Connection Pool

### Design

The SSH pool manages persistent connections to remote hosts, avoiding reconnection overhead for each command.

```typescript
// Conceptual design
class SSHPool {
  private connections: Map<string, SSHConnection>;

  async getConnection(hostId: string): Promise<SSHConnection>;
  async exec(hostId: string, command: string): Promise<string>;
  async shell(hostId: string): Promise<SSHStream>;  // For terminal I/O
  async disconnect(hostId: string): void;
  async healthCheck(hostId: string): Promise<boolean>;
}
```

### Connection States

```
DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTING → DISCONNECTED
                    │                         ▲
                    └── ERROR ────────────────┘
                         │
                         └── Auto-retry with exponential backoff
```

### Key Behaviors

- **Lazy connection:** Connect only when first needed
- **Keep-alive:** Send keepalive packets every 30s
- **Auto-reconnect:** Exponential backoff on disconnect (1s, 2s, 4s, 8s, max 30s)
- **Idle timeout:** Disconnect after 5 minutes of no activity
- **Health check:** Periodic `echo ok` via SSH exec to verify connectivity

---

## 10. Custom Server (socket.io + Next.js)

Next.js App Router doesn't natively support WebSocket. A custom server wraps Next.js and attaches socket.io.

```typescript
// server/index.ts — conceptual structure
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIO } from 'socket.io';

const app = next({ dev: process.env.NODE_ENV !== 'production' });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new SocketIO(httpServer);

  // Register namespaces
  setupTerminalNamespace(io.of('/terminal'));
  setupUpdatesNamespace(io.of('/updates'));

  // Start polling service
  startTeamPoller(io.of('/updates'));

  httpServer.listen(3000);
});
```

---

## 11. Implementation Order

### Phase 1: Foundation

**Goal:** Running Next.js app with DB, auth, and basic host management.

1. Initialize Next.js project with TypeScript + Tailwind
2. Set up PostgreSQL + Drizzle ORM schema + migrations
3. Implement Tailscale auth middleware
4. Build host CRUD (API routes + settings page)
5. Create app layout (sidebar, header)

**Deliverables:** Working app shell, can add/edit SSH hosts, auth works.

### Phase 2: SSH + Terminal

**Goal:** Connect to a remote host and interact via terminal in the browser.

1. Implement SSH connection pool (`src/lib/ssh/`)
2. Set up custom server with socket.io (`server/index.ts`)
3. Build `/terminal` WebSocket namespace
4. Create xterm.js Terminal component
5. Wire up terminal page with session connection

**Deliverables:** Can open a terminal to a remote host and type commands.

### Phase 3: tmux Integration

**Goal:** Discover and interact with tmux sessions.

1. Implement tmux command builders + parsers (`src/lib/tmux/`)
2. Build session discovery API (`/api/hosts/[id]/sessions`)
3. Create session list UI component
4. Add tmux session switching in terminal view
5. Implement pane capture for preview thumbnails

**Deliverables:** Can see tmux sessions, connect to specific sessions/panes.

### Phase 4: Claude Code Team Dashboard

**Goal:** Display live Claude Code team state.

1. Implement team state poller (`src/lib/claude/`)
2. Build `/updates` WebSocket namespace for state broadcasting
3. Create team list and detail pages
4. Build task board component with live updates
5. Build agent list with status indicators

**Deliverables:** Can see teams, agents, tasks updating live.

### Phase 5: Projects + Polish

**Goal:** Project management, UX refinements.

1. Build project CRUD (API + UI)
2. Link projects to hosts and sessions
3. Add message panel for team communication viewing
4. Implement terminal tabs (multiple sessions)
5. Error handling, reconnection UI, loading states

**Deliverables:** Complete, polished application.

### Phase 6: Deployment

**Goal:** Production deployment on Coolify.

1. Configure `next.config.ts` for standalone output
2. Create `.env.example` with all required variables
3. Configure Coolify with Nixpacks
4. Set up Tailscale Serve
5. Production testing

**Deliverables:** Live, deployed dashboard.

---

## 12. Trade-Offs & Decisions

### Decision 1: Custom Server vs Next.js API Routes for WebSocket

**Chosen:** Custom server wrapping Next.js

**Rationale:** Next.js App Router has no native WebSocket support. A custom `server/index.ts` that creates an HTTP server, attaches socket.io, and delegates HTTP to Next.js is the established pattern. This allows bidirectional terminal I/O without workarounds.

**Trade-off:** Slightly more complex deployment config. Mitigated by standalone output mode which bundles everything.

### Decision 2: Drizzle ORM vs Prisma

**Chosen:** Drizzle ORM

**Rationale:** Lighter weight, SQL-first approach, better TypeScript inference, no code generation step. Schema is small (3 tables). Prisma's features (complex relations, middleware) aren't needed here.

### Decision 3: In-Memory Cache vs DB for Team State

**Chosen:** In-memory cache (no DB storage for teams/tasks)

**Rationale:** Claude Code team state is ephemeral — teams start and stop dynamically. Persisting to DB adds write overhead and stale data problems. In-memory cache with 2-second polling is simpler and always fresh.

### Decision 4: SSH Key Storage

**Chosen:** Environment variables (referenced by name in DB)

**Rationale:** SSH keys should never be in the database. Storing the env var name (`SSH_KEY_WORK_LAPTOP`) in the hosts table and reading `process.env[name]` at runtime is secure and compatible with Coolify's secrets management.

### Decision 5: socket.io vs ws

**Chosen:** socket.io

**Rationale:** Built-in reconnection, namespaces (separate terminal from updates), room support (broadcasting to specific team viewers), and fallback to HTTP long-polling. The overhead vs raw `ws` is negligible for this use case.

---

## 13. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/remote_team

# Development
NODE_ENV=development
DEV_USER_LOGIN=dev@tailnet.example.com

# SSH Keys (one per host, named by convention)
SSH_KEY_WORK_LAPTOP="-----BEGIN OPENSSH PRIVATE KEY-----..."
SSH_KEY_HOME_SERVER="-----BEGIN OPENSSH PRIVATE KEY-----..."

# Polling
POLL_INTERVAL_MS=2000

# Server
PORT=3000
```

---

## 14. Affected Modules Summary

| Module | Files | Change Type |
|--------|-------|-------------|
| `src/app/` | 10+ page/layout files | New — all pages |
| `src/components/` | 15+ components | New — UI layer |
| `src/lib/db/` | schema, index, migrations | New — database |
| `src/lib/ssh/` | pool, client, types | New — SSH management |
| `src/lib/tmux/` | commands, parser, types | New — tmux integration |
| `src/lib/claude/` | poller, parser, types | New — Claude Code state |
| `src/lib/socket/` | server, events | New — WebSocket |
| `src/hooks/` | 3 custom hooks | New — client-side state |
| `server/` | Custom server entry | New — socket.io integration |

---

## 15. Next Steps

- [ ] **@frontend-dev** — Implement UI components, pages, client state (see `docs/frontend-spec.md`)
- [ ] **@backend-dev** — Implement API routes, SSH/tmux integration, DB, WebSocket (see `docs/backend-spec.md`)

---

**Architecture Design Complete**
**Architect:** @architect
**Date:** February 27, 2026
