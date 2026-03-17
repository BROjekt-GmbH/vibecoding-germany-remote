# backend-dev memory

## Status
- Task #4 COMPLETED
- Waiting on frontend-dev decisions on interface mismatches

## Files Created
- `src/lib/db/schema.ts` — hosts, projects, preferences tables (Drizzle)
- `src/lib/db/index.ts` — DB connection
- `drizzle.config.ts` — Drizzle Kit config
- `src/lib/auth.ts` — Tailscale header auth + dev fallback
- `src/middleware.ts` — Next.js middleware (all routes protected)
- `src/lib/ssh/types.ts`, `pool.ts`, `client.ts` — SSH connection pool
- `src/lib/tmux/types.ts`, `commands.ts`, `parser.ts` — tmux integration
- `src/lib/claude/types.ts`, `parser.ts`, `poller.ts` — Claude Code poller
- `src/lib/socket/events.ts`, `terminal.ts`, `updates.ts` — WebSocket namespaces
- `server/index.ts` — Custom HTTP server (Next.js + socket.io)
- `src/app/api/hosts/route.ts` — GET/POST /api/hosts
- `src/app/api/hosts/[id]/route.ts` — GET/PATCH/DELETE
- `src/app/api/hosts/[id]/test/route.ts` — POST (SSH connectivity test)
- `src/app/api/hosts/[id]/sessions/route.ts` — GET tmux sessions
- `src/app/api/hosts/[id]/teams/route.ts` — GET Claude teams (cached)
- `src/app/api/projects/route.ts`, `[id]/route.ts` — CRUD
- `src/app/api/preferences/route.ts` — GET/PATCH (upsert per user)
- `src/lib/validation.ts` — Zod v4 schemas
- `src/__tests__/tmux-parser.test.ts`, `claude-parser.test.ts`, `tmux-commands.test.ts`
- `jest.config.ts`, `.env.example`
- `reports/v0.1/02-builder-report.md`

## Files Modified
- `package.json` — updated scripts (dev=tsx custom server, typecheck, test, db commands)

## Quality Gates (all passing)
- `npm run typecheck` ✅
- `npm test` ✅ 20/20
- `npm run lint` ✅

## Key Decisions
- Drizzle ORM + postgres-js (not Prisma)
- SSH keys: never in DB, only env var name stored (process.env[host.privateKeyEnv])
- tmux commands: JSON.stringify-escaped (not raw string interpolation)
- Auth: Tailscale headers, dev fallback only when NODE_ENV=development
- Error shape: `{ error: string, code: string, details?: object }` on all routes
- WebSocket: /terminal namespace (WebSSH2 bridge), /updates namespace (team state)
- Team poller: 2s interval, emits teams:state only on delta

## Regeln
- Kommunikationssprache: Deutsch (technische Begriffe dürfen Englisch bleiben)

## Interface Alignment (resolved with frontend-dev)
1. authMethod → `'key' | 'agent'` ✅ (updated validation.ts + schema comment)
2. Agent.status → derived server-side from task ownership ✅ (added deriveAgentStatus in parser.ts)
3. TmuxPane → no change needed, SessionList only needs sessions list ✅
4. teams:delta → teams:state full snapshot is sufficient, frontend will adapt ✅
5. MessagePanel → skip v0.1, show empty state ✅
6. /api/hosts/:id/teams → now returns `{ teams, tasks }` together ✅
   /api/hosts/:id/teams/:name → neu, returns `{ team, tasks }` für useTeamUpdates ✅
7. UserPreferences.theme → dropped 'system', now `'dark' | 'light'` ✅

## Coordination
- Notified qa-engineer: use `npm run dev` (not next dev), run db:migrate before server start
- Notified scribe: server/index.ts exists, stable files listed, 4 files pending frontend-dev decisions
- Sent frontend-dev full interface mismatch analysis — awaiting reply
