# Remote Team Dashboard - Frontend Implementation Spec

**Date:** February 27, 2026
**Author:** @architect
**For:** @frontend-dev
**Reference:** `docs/architecture.md`

---

## Overview

You are building the frontend for Remote Team — a dashboard for managing tmux sessions and Claude Code agent teams across remote devices. The app uses Next.js App Router with React Server Components where possible, and Client Components for interactive elements (terminals, live status, forms).

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 15+ | Framework (App Router) |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| xterm.js | 5.x | Terminal emulator |
| @xterm/addon-fit | 0.10+ | Auto-resize terminal |
| @xterm/addon-webgl | 0.18+ | GPU-accelerated rendering |
| socket.io-client | 4.x | WebSocket client |

---

## 1. Project Setup

Initialize the project with these commands:

```bash
npx create-next-app@latest remote-team --typescript --tailwind --eslint --app --src-dir
cd remote-team
npm install xterm @xterm/addon-fit @xterm/addon-webgl socket.io-client
npm install -D @types/node
```

### next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Coolify deployment
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
```

---

## 2. Layout Structure

### Root Layout (`src/app/layout.tsx`) — Server Component

```
┌─────────────────────────────────────────────────┐
│ Header (user info, breadcrumb)                   │
├────────┬────────────────────────────────────────┤
│        │                                         │
│ Side-  │          Page Content                   │
│ bar    │          (children)                     │
│        │                                         │
│ - Home │                                         │
│ - Hosts│                                         │
│ - Teams│                                         │
│ - Proj │                                         │
│ - Cfg  │                                         │
│        │                                         │
├────────┴────────────────────────────────────────┤
│ Status bar (connection status, active sessions)  │
└─────────────────────────────────────────────────┘
```

- **Header**: Server Component. Reads `Tailscale-User-Name` from headers. Shows breadcrumb.
- **Sidebar**: Client Component. Manages active route highlighting, collapse state.
- **Status bar**: Client Component. Shows WebSocket connection status, count of active terminal sessions.

### Sidebar Navigation Items

| Label | Path | Icon |
|-------|------|------|
| Dashboard | `/` | Home |
| Hosts | `/hosts` | Server |
| Teams | `/teams` | Users |
| Projects | `/projects` | Folder |
| Settings | `/settings` | Gear |

---

## 3. Pages

### 3.1 Dashboard Home (`src/app/page.tsx`) — Server Component

The landing page shows an at-a-glance overview.

**Layout:**
```
┌──────────────────────┬──────────────────────┐
│  Online Hosts (3)    │  Active Teams (2)    │
│  ┌────────────────┐  │  ┌────────────────┐  │
│  │ Work Laptop ●  │  │  │ remote-team    │  │
│  │ 3 tmux sessions│  │  │ 5 agents, 3/8  │  │
│  └────────────────┘  │  │ tasks done     │  │
│  ┌────────────────┐  │  └────────────────┘  │
│  │ Home Server ●  │  │  ┌────────────────┐  │
│  │ 1 tmux session │  │  │ web-app-team   │  │
│  └────────────────┘  │  │ 3 agents, 1/5  │  │
│                      │  │ tasks done     │  │
│                      │  └────────────────┘  │
├──────────────────────┴──────────────────────┤
│  Recent Sessions                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ dev:0   │ │ build:0 │ │ logs:0  │       │
│  │ Laptop  │ │ Server  │ │ Server  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
└──────────────────────────────────────────────┘
```

**Data fetching:** Server Component fetches hosts from DB, teams from API (cached in memory on server).

### 3.2 Hosts Page (`src/app/hosts/page.tsx`) — Server Component

Lists all configured SSH hosts with connectivity status.

**Each HostCard shows:**
- Host name + hostname
- Online/offline indicator (green/red dot)
- Number of active tmux sessions
- Number of active Claude Code teams
- "Connect" button → navigates to host detail

### 3.3 Host Detail (`src/app/hosts/[hostId]/page.tsx`) — Server Component

Shows a specific host with its tmux sessions and teams.

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Work Laptop (100.x.x.x)          ● Online   │
├──────────────────────┬───────────────────────┤
│ tmux Sessions        │ Claude Code Teams     │
│ ┌──────────────────┐ │ ┌──────────────────┐  │
│ │ dev              │ │ │ remote-team      │  │
│ │ 3 windows        │ │ │ 5 agents         │  │
│ │ [Open Terminal]  │ │ │ [View Team]      │  │
│ └──────────────────┘ │ └──────────────────┘  │
│ ┌──────────────────┐ │                       │
│ │ build            │ │                       │
│ │ 1 window         │ │                       │
│ │ [Open Terminal]  │ │                       │
│ └──────────────────┘ │                       │
└──────────────────────┴───────────────────────┘
```

- **SessionList**: Client Component — polls session state, "Open Terminal" opens `/terminal/[sessionId]`
- **Team list**: Client Component — live team data via WebSocket

### 3.4 Terminal Page (`src/app/terminal/[sessionId]/page.tsx`) — Client Component

Full-screen terminal view. This is the most complex page.

**Layout:**
```
┌──────────────────────────────────────────────┐
│ [Tab: dev:0] [Tab: dev:1] [Tab: build:0] [+]│
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │          xterm.js Terminal             │  │
│  │                                        │  │
│  │  $ claude --team remote-team           │  │
│  │  > Starting team lead...               │  │
│  │  > Spawning researcher...              │  │
│  │  █                                     │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
├──────────────────────────────────────────────┤
│ Host: Work Laptop │ Session: dev │ 80x24    │
└──────────────────────────────────────────────┘
```

**Components:**
- **TerminalTabs**: Tab bar for switching between sessions. "+" button opens session picker dialog.
- **TerminalView**: The xterm.js instance. One per active tab.
- **TerminalToolbar**: Bottom bar showing connection info, terminal size.

**Key behaviors:**
- Terminal connects via socket.io `/terminal` namespace
- On mount: emit `terminal:connect` with host and session info
- Keystrokes: xterm.js `onData` → emit `terminal:data`
- Output: listen `terminal:data` → `terminal.write(data)`
- Resize: use `@xterm/addon-fit`, emit `terminal:resize` on window resize
- On unmount: emit `terminal:disconnect`

### 3.5 Teams Page (`src/app/teams/page.tsx`) — Server Component

Overview of all active Claude Code teams across all hosts.

**Each TeamCard shows:**
- Team name
- Host it's running on
- Agent count with roles
- Task progress (completed/total)
- Link to team detail

### 3.6 Team Detail (`src/app/teams/[teamId]/page.tsx`) — Server Component shell

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Team: remote-team (on Work Laptop)           │
├──────────────────┬───────────────────────────┤
│ Agents           │ Tasks                     │
│ ┌──────────────┐ │ ┌───────────────────────┐ │
│ │ ● team-lead  │ │ │ #1 Research stack ✅   │ │
│ │   (active)   │ │ │ #2 Design arch  🔄    │ │
│ │ ● researcher │ │ │ #3 Frontend     ⏳    │ │
│ │   (idle)     │ │ │ #4 Backend      ⏳    │ │
│ │ ● builder    │ │ │ #5 Testing      ⏳    │ │
│ │   (active)   │ │ └───────────────────────┘ │
│ └──────────────┘ │                           │
├──────────────────┴───────────────────────────┤
│ Messages                                      │
│ ┌────────────────────────────────────────────┐│
│ │ [team-lead] Assigned task #2 to architect  ││
│ │ [researcher] Research complete, report at...││
│ │ [architect] Starting architecture design... ││
│ └────────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

- **AgentList**: Client Component — live status via WebSocket
- **TaskBoard**: Client Component — live task updates
- **MessagePanel**: Client Component — shows team communication

### 3.7 Projects Page (`src/app/projects/page.tsx`) — Server Component

List of configured projects, each linked to a host and directory path.

### 3.8 Settings Page (`src/app/settings/page.tsx`) — Client Component

Forms for:
- Add/edit/delete SSH hosts
- Terminal preferences (font size, font family, theme)
- Polling interval configuration

---

## 4. Component Specifications

### 4.1 TerminalView (`src/components/terminal/terminal-view.tsx`)

**Type:** Client Component (`'use client'`)

**Props:**
```typescript
interface TerminalViewProps {
  hostId: string;
  sessionName: string;
  pane?: string;            // Default: "0" (first pane)
  fontSize?: number;        // Default: 14
  fontFamily?: string;      // Default: "JetBrains Mono"
}
```

**Behavior:**
1. On mount: create xterm.js Terminal instance, attach to DOM ref
2. Load WebGL addon for GPU rendering, Fit addon for auto-resize
3. Connect to socket.io `/terminal` namespace
4. Emit `terminal:connect` with host/session details
5. Register `terminal.onData()` → emit `terminal:data`
6. Listen for `terminal:data` → `terminal.write()`
7. Set up ResizeObserver → `fitAddon.fit()` → emit `terminal:resize`
8. On unmount: dispose terminal, disconnect socket
9. On `terminal:error`: show error overlay with reconnect button

**xterm.js Configuration:**
```typescript
{
  cursorBlink: true,
  fontSize: props.fontSize ?? 14,
  fontFamily: props.fontFamily ?? 'JetBrains Mono, monospace',
  theme: {
    background: '#0a0a0a',
    foreground: '#e4e4e7',
    cursor: '#e4e4e7',
  },
  allowProposedApi: true,  // Required for WebGL addon
}
```

### 4.2 AgentList (`src/components/team/agent-list.tsx`)

**Type:** Client Component

**Props:**
```typescript
interface AgentListProps {
  hostId: string;
  teamName: string;
}
```

**Behavior:**
- Subscribes to `/updates` namespace
- Listens for `teams:state` and `teams:delta` events
- Shows each agent with: name, role, status indicator (active/idle/offline)
- Status colors: green = active, yellow = idle, gray = offline

### 4.3 TaskBoard (`src/components/team/task-board.tsx`)

**Type:** Client Component

**Props:**
```typescript
interface TaskBoardProps {
  hostId: string;
  teamName: string;
}
```

**Behavior:**
- Subscribes to `/updates` namespace for live task state
- Shows tasks in a vertical list (not kanban — tasks are linear)
- Each task shows: ID, subject, status badge, owner, blocked-by indicators
- Status badges: pending (gray), in_progress (blue), completed (green)

### 4.4 MessagePanel (`src/components/chat/message-panel.tsx`)

**Type:** Client Component

**Props:**
```typescript
interface MessagePanelProps {
  hostId: string;
  teamName: string;
}
```

**Behavior:**
- Displays team communication messages in chronological order
- Each message shows: sender name (with role color), content, timestamp
- Auto-scrolls to bottom on new messages
- Optional: filter by agent name

### 4.5 HostCard (`src/components/host/host-card.tsx`)

**Type:** Server Component

**Props:**
```typescript
interface HostCardProps {
  host: {
    id: string;
    name: string;
    hostname: string;
    isOnline: boolean;
    lastSeen: Date | null;
  };
  sessionCount: number;
  teamCount: number;
}
```

### 4.6 Sidebar (`src/components/layout/sidebar.tsx`)

**Type:** Client Component

**Behavior:**
- Uses `usePathname()` from `next/navigation` for active route
- Collapsible (stores state in localStorage)
- Navigation items as defined in section 2

---

## 5. Custom Hooks

### 5.1 `useSocket` (`src/hooks/use-socket.ts`)

```typescript
function useSocket(namespace: string): {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
}
```

- Creates and manages a socket.io client connection
- Handles auto-reconnection
- Returns connection state for UI indicators

### 5.2 `useTerminal` (`src/hooks/use-terminal.ts`)

```typescript
function useTerminal(
  containerRef: RefObject<HTMLDivElement>,
  options: TerminalOptions
): {
  terminal: Terminal | null;
  fitAddon: FitAddon | null;
}
```

- Creates xterm.js Terminal instance
- Loads WebGL + Fit addons
- Handles cleanup on unmount
- Manages ResizeObserver for auto-fit

### 5.3 `useTeamUpdates` (`src/hooks/use-team-updates.ts`)

```typescript
function useTeamUpdates(hostId: string, teamName: string): {
  team: TeamState | null;
  tasks: Task[];
  agents: Agent[];
  loading: boolean;
}
```

- Fetches initial state via REST API
- Subscribes to `/updates` namespace for live deltas
- Merges deltas into local state
- Returns current team snapshot

---

## 6. TypeScript Types (`src/types/index.ts`)

```typescript
// Host
export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  authMethod: 'key' | 'agent';
  isOnline: boolean;
  lastSeen: string | null;
}

// tmux
export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
}

export interface TmuxPane {
  sessionName: string;
  windowIndex: number;
  paneIndex: number;
  width: number;
  height: number;
  active: boolean;
}

// Claude Code Team
export interface Team {
  name: string;
  hostId: string;
  members: Agent[];
}

export interface Agent {
  name: string;
  agentId: string;
  agentType: string;
  status: 'active' | 'idle' | 'offline';
}

export interface Task {
  id: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string;
  blockedBy: string[];
  blocks: string[];
}

// User
export interface UserPreferences {
  theme: 'dark' | 'light';
  terminalFontSize: number;
  terminalFontFamily: string;
  pollIntervalMs: number;
}
```

---

## 7. Styling Guidelines

### Theme

Dark theme by default (this is a terminal-focused app).

```css
/* globals.css */
@import 'tailwindcss';

:root {
  --background: #09090b;     /* zinc-950 */
  --foreground: #fafafa;     /* zinc-50 */
  --card: #18181b;           /* zinc-900 */
  --card-border: #27272a;    /* zinc-800 */
  --muted: #71717a;          /* zinc-500 */
  --accent: #3b82f6;         /* blue-500 */
  --success: #22c55e;        /* green-500 */
  --warning: #eab308;        /* yellow-500 */
  --danger: #ef4444;         /* red-500 */
}
```

### Component Styling Patterns

- Use Tailwind utility classes directly
- Cards: `bg-zinc-900 border border-zinc-800 rounded-lg p-4`
- Status dots: `w-2 h-2 rounded-full bg-green-500` (online) / `bg-red-500` (offline)
- Badges: `px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400`
- Terminal container: `bg-black rounded-lg overflow-hidden` (xterm.js renders inside)

### Font

- UI: System font stack (Tailwind default)
- Terminal: JetBrains Mono (loaded via `next/font/google`)
- Monospace fallback: `'Fira Code', 'Cascadia Code', monospace`

---

## 8. Implementation Order

**Build in this order to have a working app as early as possible:**

1. **Project scaffolding** — `create-next-app`, install deps, configure Tailwind
2. **Root layout + sidebar + header** — App shell with navigation
3. **Settings page + host form** — Can add SSH hosts (stores to DB via API)
4. **Hosts list page** — Display hosts from DB
5. **Terminal component** — xterm.js wrapper with socket.io connection
6. **Terminal page** — Full-screen terminal with tab support
7. **Team dashboard components** — AgentList, TaskBoard, TeamCard
8. **Teams pages** — List + detail views with live updates
9. **Dashboard home** — Overview page aggregating all data
10. **Projects page** — CRUD for projects
11. **Polish** — Loading states, error boundaries, reconnection UI, responsive design

---

## 9. Important Notes

- **Server Components are the default.** Only add `'use client'` when the component needs browser APIs (DOM, WebSocket, useState, useEffect).
- **Fetch data in Server Components** using `async` function calls to the backend API or direct DB queries (via Drizzle).
- **Pass data down** from Server Components to Client Components via props — don't re-fetch on the client what you already have from the server.
- **The terminal page is entirely client-rendered** — xterm.js requires DOM access. Wrap it in a Client Component boundary.
- **socket.io-client** connects to the same host (no CORS issues). Use relative URL: `io('/terminal')`.
- **No external UI library** — Build simple components with Tailwind. Keep it lean.

---

**Spec Complete**
**Architect:** @architect
**Date:** February 27, 2026
