# Remote Team Dashboard - Web App Research Report
**Date:** February 27, 2026
**Status:** Complete
**Prepared by:** @researcher

---

## Executive Summary

This report provides research-backed recommendations for building the Remote Team dashboard—a Tailscale-only web application for managing tmux sessions and Claude Code agent teams across multiple devices.

**Key Findings:**
- Use **xterm.js** for terminal rendering (proven, well-maintained, GPU-accelerated)
- Deploy SSH proxy via **WebSSH2 pattern** (ssh2 library + WebSocket bridge)
- Control tmux programmatically via **CLI commands** (list-sessions, send-keys, capture-pane)
- Monitor Claude Code teams by **reading file-based state** (~/.claude/teams, ~/.claude/tasks)
- Use **WebSockets** for bi-directional real-time updates (required for interactive terminal)
- Deploy on **Coolify with Nixpacks**, Next.js standalone mode
- Leverage **Tailscale identity headers** for auth (no additional auth layer needed)

**Tech Stack Recommendation:**
- **Frontend:** React 18, Next.js 14+, TypeScript, Tailwind CSS
- **Backend:** Node.js, next/api routes, WebSocket server (socket.io or ws library)
- **Terminal/SSH:** xterm.js, node-pty, ssh2, WebSSH2 pattern
- **Deployment:** Coolify on VPS, Nixpacks build, Tailscale Serve
- **Real-time:** WebSockets for bidirectional terminal I/O

---

## 1. Web Terminal Libraries

### Research Summary

**Xterm.js** remains the gold standard for browser-based terminal emulation, powering VS Code's integrated terminal and numerous browser IDEs.

### Key Findings

| Aspect | Details |
|--------|---------|
| **Performance** | Very fast; supports GPU-accelerated rendering with WebGL mode (`xtermjs=webgl`) |
| **Compatibility** | Works with bash, vim, tmux, curses-based apps; full ANSI escape codes + mouse support |
| **Unicode Support** | Full Unicode support with proper character width handling |
| **React Integration** | Available via `react-xtermjs` wrapper library for clean integration |
| **Maintenance** | Active development; part of the xterm.js ecosystem maintained by the open-source community |
| **Browser Support** | Modern browsers with WebSocket and WebGL support |

### Alternatives Considered

| Library | Pros | Cons |
|---------|------|------|
| **xterm.js** | GPU acceleration, proven at scale (VS Code), excellent docs | None significant |
| **hterm** | Lightweight, Google-maintained | Slower, less feature-rich |
| **Terminalizer** | Screen recording | Not designed for real-time interactive sessions |

### Recommendation

**Use xterm.js** — it's the industry standard with no viable alternatives for this use case. Enable WebGL mode for optimal performance when rendering multiple terminal panes simultaneously.

### Sources
- [Xterm.js Official Site](https://xtermjs.org/)
- [GitHub - xtermjs/xterm.js](https://github.com/xtermjs/xterm.js)
- [React-xtermjs Integration](https://www.qovery.com/blog/react-xtermjs-a-react-library-to-build-terminals)

---

## 2. SSH from Browser Architecture

### Research Summary

The **WebSSH2 pattern** (established architecture) bridges browser WebSockets to server-side SSH connections. This is the proven pattern for web-based SSH clients.

### Architecture Overview

```
Browser (xterm.js + WebSocket)
    ↓
Node.js Server (WebSSH2 pattern)
    ├─ Receives WebSocket messages from browser
    ├─ Converts to SSH protocol
    └─ Maintains SSH2 connection to target host
    ↓
Remote SSH Server (on Tailscale network)
```

### Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **WebSocket Bridge** | socket.io or ws | Browser ↔ Server communication |
| **SSH Client** | ssh2 npm package | Server-side SSH connection management |
| **Protocol Conversion** | Custom middleware | Convert WebSocket frames ↔ SSH protocol |
| **Authentication** | SSH keys or passwords | Authenticate to remote hosts |

### Detailed Findings

**SSH2 Library (npm package `ssh2`):**
- Pure JavaScript SSH2 client and server modules
- Supports all major SSH features (key auth, password auth, port forwarding)
- Actively maintained by mscdex
- Used in production systems at scale

**WebSSH2 Reference Implementation:**
- Combines ssh2 + socket.io + xterm.js + Express
- Complete working example available on GitHub
- Demonstrates proper error handling, session management, reconnection logic

**Security Considerations:**
- SSH keys should be stored securely (consider Tailscale identity for auth)
- SSH2 connection should use agent forwarding carefully
- Consider SSH key path restrictions per user

### Implementation Pattern

1. Browser initiates WebSocket connection to Node.js server
2. User provides SSH connection details (host, port, username)
3. Server creates SSH2 connection to target using provided credentials
4. Server bridges WebSocket I/O ↔ SSH terminal I/O in both directions
5. On disconnect, server closes SSH connection

### Recommendation

**Implement the WebSSH2 pattern** using:
- `ssh2` library (Node.js SSH client)
- `socket.io` or `ws` (WebSocket server)
- Custom middleware to bridge the two

Alternatively, deploy **WebSSH2 as a separate service** that your Next.js backend proxies to, but this adds operational complexity.

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Embedded ssh2 + socket.io** | Simpler deployment, tight integration | More code to maintain |
| **WebSSH2 as service** | Proven, separate concern | Extra infra, network hop |

### Sources
- [GitHub - billchurch/webssh2](https://github.com/billchurch/webssh2)
- [ssh2 npm Package](https://www.npmjs.com/package/ssh2)
- [WebSSH2 npm Package](https://www.npmjs.com/package/webssh2)
- [SSH2 Code Examples](https://www.tabnine.com/code/javascript/modules/ssh2)

---

## 3. tmux Integration (Programmatic Control)

### Research Summary

**tmux provides a comprehensive CLI** for programmatic control. All operations can be performed via `tmux` command invocations—no custom API needed.

### Core Commands for Remote Team Use Case

| Task | Command | Example |
|------|---------|---------|
| **List all sessions** | `tmux list-sessions -F` | `tmux ls -F "#{session_name}: #{session_windows} windows"` |
| **Attach/switch to pane** | `tmux select-window -t` | `tmux select-window -t mysession:0` |
| **Send keyboard input** | `tmux send-keys -t` | `tmux send-keys -t mysession:0 "ls -la" Enter` |
| **Capture pane output** | `tmux capture-pane -p -t` | `tmux capture-pane -p -t mysession:0 -S -100` (last 100 lines) |
| **Split pane** | `tmux split-window` | `tmux split-window -t mysession -h` (horizontal) |
| **Kill pane/session** | `tmux kill-pane -t` | `tmux kill-pane -t mysession:0.1` |

### Architecture Pattern

**From Node.js backend:**
```javascript
// Execute tmux command via SSH to remote device
const { exec } = require('child_process');

// Example: list tmux sessions on remote host
exec('ssh remote-host "tmux list-sessions -F \\"#{session_name}\\"" ',
  (error, stdout, stderr) => {
    // Parse stdout for session names
  });
```

### Key Findings

**Programmatic Access:**
- tmux uses a command-line interface; no built-in API
- All operations are CLI commands executed via shell
- Can be controlled remotely via SSH command execution
- Output is text-based and parseable

**Session Format:**
- Sessions = named collections of windows
- Windows = numbered tabs within a session
- Panes = split regions within a window
- Reference format: `session:window.pane` (e.g., `mysession:0.1`)

**Capturing Output:**
- `tmux capture-pane -p -t <target> -S -N` captures visible content
- `-S -N` means "show last N lines"
- Useful for displaying tmux pane content in the web UI

**Performance Notes:**
- Each tmux command is relatively lightweight
- Polling (checking sessions every N seconds) is viable for small numbers of sessions
- For real-time updates, consider file watching or event hooks

### Implementation Strategy

1. **On each remote device:** tmux is already running with user's sessions
2. **From Node.js server:** Execute SSH commands to query tmux state
3. **Polling approach:** Periodically run `tmux list-sessions`, `capture-pane` to pull state
4. **Display in UI:** Render captured output in xterm.js, allow sending keystrokes
5. **User input:** Convert browser input → `tmux send-keys` commands

### Recommendation

**Use tmux CLI commands executed via SSH.** Implement a polling pattern (every 1-2 seconds) for session discovery, and on-demand capture-pane for rendering visible content.

### Alternative: Event-Based Updates

For lower latency, consider:
- Running a tmux hook script that signals Node.js when changes occur
- WebSocket-based event stream from each remote device
- More complex but lower overhead than polling

### Sources
- [tmux Manual Page](https://man7.org/linux/man-pages/man1/tmux.1.html)
- [Tmux Cheat Sheet & Reference](https://tmuxcheatsheet.com/)
- [Tmux Core Concepts](https://tmux.info/docs/core-concepts)
- [Getting Started with tmux](https://github.com/tmux/tmux/wiki/Getting-Started)

---

## 4. Claude Code Team API & State Management

### Research Summary

Claude Code stores team and task state in **file-based configuration** located in the user's home directory. This state is JSON-based and can be monitored/read from external applications.

### File System Structure

```
~/.claude/
├── teams/
│   └── {team-name}/
│       └── config.json          # Team metadata, member list
└── tasks/
    └── {team-name}/
        ├── 1.json              # Task objects (one per task)
        ├── 2.json
        └── ...
```

### Team Config Structure

**File:** `~/.claude/teams/{team-name}/config.json`

```json
{
  "name": "remote-team",
  "members": [
    {
      "name": "team-lead",
      "agentId": "uuid-1",
      "agentType": "lead"
    },
    {
      "name": "researcher",
      "agentId": "uuid-2",
      "agentType": "researcher"
    }
  ]
}
```

### Task State Structure

**File:** `~/.claude/tasks/{team-name}/{task-id}.json`

**Fields:**
- `id`: Task identifier
- `subject`: Task title (imperative form)
- `description`: Detailed requirements
- `status`: "pending" | "in_progress" | "completed"
- `owner`: Assigned agent name (or empty if unassigned)
- `blockedBy`: Array of task IDs blocking this task
- `blocks`: Array of task IDs this task blocks
- `metadata`: Custom key-value data

### Key Findings

**Advantages:**
- No API server required; simple JSON file format
- Readable by any process with file access
- Team members auto-discover each other by reading config
- Tasks have built-in dependency tracking
- Status updates are atomic (write to disk)

**Monitoring Approach:**
- Watch file system for changes (node `fs.watch()` or similar)
- Poll file system periodically
- Read JSON on demand

**Limitations:**
- File-based coordination can have race conditions with concurrent writes
- No real-time event stream (requires polling or file watching)
- Team members run independently; no central server

### Integration Strategy for Remote Team Dashboard

1. **Periodic Polling (every 1-2 seconds):**
   - SSH to each remote device
   - Read `~/.claude/teams/*/config.json`
   - Read all task files from `~/.claude/tasks/*/`
   - Store in local cache/database
   - Serve via API to frontend

2. **Display in UI:**
   - Show list of teams running on each device
   - Display tasks with status and owner
   - Show team members and their roles
   - Real-time updates via WebSocket (server pushes deltas)

3. **Send Messages to Agents:**
   - Claude Code team API uses inter-agent messaging
   - Remote Team can't directly invoke messages
   - But can **display message status** and **show conversation context**

### Example Implementation

```javascript
// Poll remote team state
async function pollRemoteTeams(remoteHost) {
  const teamConfigPath = '.claude/teams/*/config.json';
  const cmd = `find ~/${teamConfigPath} -type f 2>/dev/null | xargs cat`;

  const output = await sshExec(remoteHost, cmd);
  const teamConfigs = JSON.parse(output);

  // Also poll task state
  const tasksCmd = 'find ~/.claude/tasks -name "*.json" -type f | xargs cat';
  const taskOutput = await sshExec(remoteHost, tasksCmd);
  const tasks = JSON.parse(taskOutput);

  return { teams: teamConfigs, tasks };
}
```

### Recommendation

**Implement file-based polling via SSH:**
1. Query team configs and task files from each remote device
2. Cache results locally with 1-2 second refresh interval
3. Serve aggregated state via REST API + WebSocket for real-time updates

This approach requires no changes to Claude Code and works with the existing file-based team system.

### Sources
- [Claude Code - Orchestrate teams](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Team Orchestration Guide](https://claudefa.st/blog/guide/agents/team-orchestration)
- [How to Deploy Claude Code for Teams](https://www.eesel.ai/blog/deploy-claude-code)

---

## 5. Real-Time Updates: WebSocket vs SSE

### Research Summary

For the Remote Team dashboard, **WebSocket is the recommended choice** because the application requires bi-directional communication (sending terminal input to remote sessions).

### Detailed Comparison

| Criteria | WebSocket | SSE |
|----------|-----------|-----|
| **Direction** | Bidirectional | Server-to-client only |
| **Protocol** | Custom binary/text | HTTP-based text |
| **Reconnection** | Manual handling | Automatic built-in |
| **Overhead** | 2 bytes per frame | ~5 bytes per message |
| **Binary Support** | Yes | Text only |
| **Browser Compat** | Modern browsers | Modern browsers |
| **Firewall Friendly** | Good | Better (standard HTTP) |
| **Use Case Match** | Interactive (terminal, chat) | Read-only (feeds, notifications) |

### When to Use Each

**Use WebSocket when:**
- ✅ Bi-directional communication needed (like our terminal + tmux control)
- ✅ Low-latency interactions required
- ✅ Binary data must be transmitted
- ✅ Chat, games, collaborative editing

**Use SSE when:**
- ✅ Server-push-only (stock tickers, news feeds)
- ✅ Simpler implementation needed
- ✅ Automatic reconnection important
- ✅ HTTP/2 benefits important

### For Remote Team Dashboard

**WebSocket is necessary** because:
1. **Terminal I/O is bidirectional:** browser sends keystrokes → server → tmux → response back
2. **Interactivity requires immediate feedback:** typing a command and seeing results
3. **Multiple users can interact simultaneously** with different sessions

### Implementation Options

| Option | Technology | Pros | Cons |
|--------|-----------|------|------|
| **socket.io** | WebSocket wrapper | Auto fallbacks, built-in rooms | Larger library |
| **ws (Node.js)** | Native WebSocket | Lightweight, zero-dependency | More manual work |
| **tRPC with WebSocket** | Type-safe RPC | Great DX, real-time | Framework coupling |

### Recommendation

**Use socket.io** with Next.js API routes:
- Handles WebSocket connections reliably
- Room-based broadcasting for team updates
- Built-in reconnection logic
- Well-documented, widely used

For team updates (non-terminal), consider SSE fallback or separate channel.

### Sources
- [WebSockets vs SSE - Ably](https://ably.com/blog/websockets-vs-sse)
- [SSE vs WebSockets - SoftwareMill](https://softwaremill.com/sse-vs-websockets-comparing-real-time-communication-protocols)
- [WebSocket.org Comparison](https://websocket.org/comparisons/sse)
- [Server-Sent Events vs WebSockets - DEV Community](https://dev.to/polliog/server-sent-events-beat-websockets-for-95-of-real-time-apps-heres-why-a4l)

---

## 6. Coolify Deployment Best Practices

### Research Summary

Coolify is an open-source Platform-as-a-Service (PaaS) for deploying applications on your own VPS. Next.js deployments are straightforward with proper configuration.

### Recommended Setup

| Setting | Value | Reason |
|---------|-------|--------|
| **Build Pack** | Nixpacks | Auto-detects, requires zero config |
| **Next.js Mode** | Standalone | Reduces image size dramatically |
| **Port Exposed** | 3000 | Default for Next.js |
| **Deployment** | Auto on git push | Enable for CI/CD |
| **Preview Deploys** | Enabled | Staging environment for PRs |

### Build Configuration Details

**Using Nixpacks (Recommended):**
- Coolify automatically detects Next.js
- Handles build and runtime setup
- Supports environment variables
- Works with monorepos

**Using Dockerfile (for control):**
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./
COPY public ./public

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 2GB | 4GB |
| **Storage** | 20GB | 50GB |
| **Cost** | ~$7.99/mo (2GB) | ~$20/mo (4GB) |

### Tailscale Integration with Coolify

**Option 1: Coolify Behind Tailscale Serve**
- Run Coolify on private VPS
- Use `tailscale serve 3000` to expose the dashboard
- Access via `https://dashboard.tailnet-name.ts.net`
- No public internet exposure

**Option 2: Tailscale Subnet Router**
- VPS becomes part of Tailnet
- Apps can talk to each other directly
- Better for agent-to-dashboard communication

### Data Sovereignty & Security

- All settings and data stay on your infrastructure
- No build-minute overages (unlimited)
- Single-tenant (not multi-tenant like Vercel)
- Good for Tailscale-only (no public internet)

### Zero-Downtime Deployments

Coolify supports:
- Blue-green deployments
- Automatic rollback on failure
- Health checks during deployment

### Recommendation

**Deploy Remote Team Dashboard on Coolify:**
1. Set up a small VPS (4GB RAM, 2-4 cores) on DigitalOcean, Hetzner, or similar
2. Install Coolify using their one-liner
3. Point Coolify to your GitHub repo
4. Configure as Next.js with Nixpacks
5. Enable auto-deploy on git push
6. Use `tailscale serve` or subnet router for network access
7. Set environment variables for SSH keys, Tailscale identity

### Deployment Architecture

```
GitHub (push code)
    ↓
Coolify (detects, builds, deploys)
    ↓
VPS (runs Next.js application)
    ↓
Tailscale Serve / Subnet Router
    ↓
User's Tailnet (secure access from anywhere on Tailscale)
```

### Sources
- [Coolify NextJS Docs](https://coolify.io/docs/applications/nextjs)
- [Deploy Next.js to Coolify](https://blog.coffeeinc.in/deploy-your-next-js-application-to-coolify-in-minutes-00893e8e7d01)
- [Coolify Cloud for Next.js](https://shipixen.com/boilerplate-documentation/coolify-cloud-nextjs-deploy-integration)
- [Coolify Applications Overview](https://coolify.io/docs/applications)

---

## 7. Security: Tailscale-Based Authentication

### Research Summary

**Tailscale Serve** provides built-in identity headers for HTTP requests, enabling zero-additional-auth applications. This is ideal for internal tools accessible only to tailnet members.

### How Tailscale Identity Headers Work

When using Tailscale Serve to proxy traffic:
1. User makes request from Tailscale device
2. Tailscale Serve intercepts the request
3. Verifies user is authenticated to Tailnet
4. Adds identity headers to the request
5. Proxies to your application

### Available Identity Headers

| Header | Value | Example |
|--------|-------|---------|
| **Tailscale-User-Login** | User's email/login | `alice@example.com` |
| **Tailscale-User-Name** | Display name | `Alice Architect` |
| **Tailscale-User-Profile-Pic** | Profile picture URL | HTTPS URL |

### Implementation in Next.js

```typescript
// pages/api/protected.ts
export default function handler(req, res) {
  // Headers are added by Tailscale Serve before reaching your app
  const userLogin = req.headers['tailscale-user-login'];
  const userName = req.headers['tailscale-user-name'];

  if (!userLogin) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // User is authenticated via Tailscale
  res.status(200).json({ user: userLogin, name: userName });
}
```

### Authentication Strategy

**Zero-Auth Approach (Recommended for Tailscale-only apps):**
- ✅ No user database needed
- ✅ Identity via Tailscale headers
- ✅ Works for internal tools only
- ✅ Minimal code complexity

**Conditional Auth:**
- Use Tailscale headers for Tailnet users
- Require password/token for external APIs
- Deny all requests without Tailscale headers

### Security Features in Tailscale (as of 2025)

**App Capabilities:**
- Grant fine-grained permissions via JSON headers
- Serialize app capabilities into `Tailscale-App-Capabilities` header
- Requires Tailscale v1.92+

**Workload Identity Federation:**
- Short-lived API tokens based on signed JWTs
- Better than long-lived API keys
- Good for CI/CD and service-to-service auth

### Authorization Within the App

While Tailscale headers provide **authentication** (who you are), you still need **authorization** (what you can do):

**Implementation:**
1. Read `Tailscale-User-Login` from headers
2. Look up user in your app's role/permission store
3. Check if user has permission for requested action
4. Return 403 if unauthorized

```javascript
const userRole = getUserRole(userLogin); // from your DB
if (userRole !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### SSH Key Security

**For SSH operations from your app:**
- Store SSH keys in environment variables (encrypted at rest)
- Don't hardcode SSH keys in source code
- Use SSH agent forwarding when possible
- Rotate keys periodically
- Restrict SSH key permissions per host

### Network Security

**Tailscale Serve benefits:**
- ✅ No VPN needed (integrated into Tailscale)
- ✅ End-to-end encryption
- ✅ No open ports on firewall
- ✅ Access only from Tailnet members
- ✅ Audit logs for all connections

### Recommendation

**Implement zero-auth using Tailscale identity headers:**
1. Deploy app behind Tailscale Serve
2. Read headers in middleware
3. Redirect unauthenticated requests to Tailscale login
4. Implement role-based authorization within the app
5. Store SSH keys in encrypted environment variables

This approach is:
- ✅ Secure (Tailscale encryption)
- ✅ Simple (no auth database)
- ✅ Audit-friendly (Tailscale logs)
- ✅ Scalable (works across multiple devices)

### Sources
- [Tailscale App Capabilities](https://tailscale.com/blog/app-capabilities)
- [Tailscale Serve Documentation](https://tailscale.com/docs/features/tailscale-serve)
- [Tailscale Identity Headers Demo](https://github.com/tailscale-dev/id-headers-demo)
- [Tailscale Workload Identity](https://tailscale.com/blog/workload-identity-beta)
- [Security Best Practices](https://tailscale.com/kb/1196/security-hardening)

---

## 8. Node PTY (Pseudo-Terminal in Node.js)

### Additional Finding

While not a primary focus, **node-pty** deserves mention as the bridge between Node.js and shell processes locally.

### When to Use Node-pty

**For local terminal spawning:**
- Running shell commands locally on the dashboard server
- Creating new tmux sessions
- Local shell access (not recommended for Remote Team)

**Architecture:**
```
Browser ← xterm.js ← WebSocket ← Node.js + node-pty ← Local Shell
```

### Not Needed for Remote Team

Since the Remote Team dashboard **accesses remote devices via SSH**, node-pty is **not directly used**. Instead:
- SSH connection handles pseudo-terminal allocation
- tmux provides terminal management
- xterm.js displays output in browser

### Sources
- [GitHub - microsoft/node-pty](https://github.com/microsoft/node-pty)
- [Web Terminal with xterm.js, node-pty, and WebSockets](https://ashishpoudel.substack.com/p/web-terminal-with-xtermjs-node-pty)

---

## Summary: Recommended Tech Stack

### Frontend
- **Framework:** React 18 + Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Terminal UI:** xterm.js + react-xtermjs wrapper
- **Real-time:** socket.io-client

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Next.js API routes + socket.io
- **SSH:** ssh2 library
- **tmux Control:** exec() for SSH commands
- **File Monitoring:** fs.watch() or periodic polling

### Deployment
- **Hosting:** Coolify on VPS
- **Build:** Nixpacks
- **Network:** Tailscale Serve or Subnet Router
- **Auth:** Tailscale identity headers

### Real-time Architecture
- **Terminal I/O:** WebSocket (socket.io)
- **Team Updates:** WebSocket or SSE
- **Polling:** File-based state query every 1-2 seconds

### Key Design Patterns

1. **SSH Proxy Pattern:** Browser → WebSocket → Node.js (ssh2) → Remote Host
2. **File-Based Polling:** Query ~/.claude/teams and ~/.claude/tasks via SSH
3. **Tailscale-First Auth:** Use identity headers, no additional auth layer
4. **Multi-Device Aggregation:** Poll each remote device, aggregate results locally

---

## Implementation Priority & Effort Estimates

### Phase 1 (Foundation) - 2-3 weeks
- [ ] Set up Next.js project with TypeScript + Tailwind
- [ ] Implement Tailscale-based auth middleware
- [ ] Build basic SSH connection management
- [ ] Create xterm.js terminal component

### Phase 2 (Terminal Rendering) - 2-3 weeks
- [ ] Implement WebSSH2 pattern for SSH proxy
- [ ] Connect xterm.js to WebSocket
- [ ] Add keyboard input handling
- [ ] Test with multiple remote sessions

### Phase 3 (tmux Integration) - 2-3 weeks
- [ ] Implement tmux command execution via SSH
- [ ] Build tmux session discovery
- [ ] Add pane capture and display
- [ ] Create session browser UI

### Phase 4 (Claude Code Teams) - 1-2 weeks
- [ ] Implement file-based polling for team state
- [ ] Parse team configs and task files
- [ ] Create team/task display components
- [ ] Add real-time updates via WebSocket

### Phase 5 (UI/UX & Polish) - 2-3 weeks
- [ ] Dashboard layout and navigation
- [ ] Multi-pane terminal view (like tmux)
- [ ] Team member communication display
- [ ] Error handling and reconnection logic

### Phase 6 (Deployment) - 1 week
- [ ] Configure Coolify deployment
- [ ] Set up Tailscale Serve
- [ ] Environment variable management
- [ ] Production testing

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **SSH connection drops** | Lose terminal session | Implement auto-reconnect with exponential backoff |
| **WebSocket latency** | Sluggish terminal response | Use socket.io with WebGL terminal rendering |
| **File-based polling overhead** | Dashboard server CPU spike | Implement caching, incremental polling |
| **Tailscale availability** | Dashboard inaccessible | Fallback to VPN or direct IP (if on same network) |
| **tmux session conflicts** | Multiple users editing same session | Document single-user per session rule |

---

## Conclusion

The Remote Team dashboard is technically feasible with proven libraries and patterns. The tech stack leverages:
- **xterm.js** for reliable terminal rendering
- **WebSSH2 pattern** for browser-to-remote SSH bridging
- **File-based polling** for Claude Code team state
- **WebSockets** for bi-directional real-time updates
- **Tailscale identity** for secure, zero-auth access
- **Coolify** for simple, cost-effective deployment

All technologies are actively maintained, well-documented, and proven in production systems.

---

**Report Completed:** February 27, 2026
**Researcher:** @researcher
**Next Step:** Handoff to @architect for system design and implementation specs
