# scribe — Memory

## Rolle
Git/GitHub Setup, Commits, Dokumentation, Versionierung

## Erledigt
- Git init, Branch `main`
- GitHub-Repo erstellt: https://github.com/MediaBytesDe/remote-team (PRIVAT ✓)
- 17 atomare Commits — alle gepusht (v0.1.0)
- Tag v0.1.0 auf HEAD gesetzt
- GitHub Release v0.1.0: https://github.com/MediaBytesDe/remote-team/releases/tag/v0.1.0
- README.md — vollständige Projektbeschreibung, Setup, Coolify + Tailscale Deployment (auf Deutsch)
- CHANGELOG.md — Keep-a-Changelog-Format, v0.1.0-Eintrag (auf Deutsch)
- VERSION-Datei — 0.1.0
- .gitignore korrigiert: .env* → explizite .env-Muster (damit .env.example getrackt wird)
- .memory/scribe.md erstellt

### v0.2.0 — Docker Compose Deployment (2026-02-27)
- Neue Deployment-Dateien dokumentiert:
  - `Dockerfile` — Multi-Stage Build
  - `docker-compose.yml` — 3 Services (tailscale, app, db)
  - `.dockerignore`
  - `tailscale/entrypoint.sh`
  - `tailscale/serve.json`
  - `.env.production.example`
- README.md komplett ueberarbeitete Deployment-Sektion (Docker Compose, Coolify, Cloudflare DNS, Tailscale Serve)
- CHANGELOG.md — v0.2.0-Eintrag
- VERSION — 0.2.0
- 2 Commits erstellt:
  1. `feat: Docker Compose Setup mit Tailscale Sidecar hinzugefuegt`
  2. `docs: Deployment-Anleitung fuer Coolify und Cloudflare ergaenzt`
- Alles gepusht + Tag v0.2.0 gesetzt

## Teamregeln
- Repos IMMER privat (gh repo create --private)
- Sprache: DEUTSCH — gilt für Commits, Docs, Memory-Files, Nachrichten
  - Technische Begriffe (API, WebSocket, Component) dürfen englisch bleiben
- Conventional Commits: feat:, fix:, docs:, chore:, test: (Beschreibung auf Deutsch)
- Semantic Versioning: aktuell 0.2.0
- VERSION-Datei im Projektordner pflegen
- .memory/{name}.md für alle Agents im Projektordner

## Commits (gesamt: 19)
1. chore: initial project setup
2. docs: add architecture spec, README, and changelog
3. chore: add public assets and global styles
4. feat: add backend service layer
5. feat: add REST API routes
6. feat: add UI component library
7. feat: add pages and client hooks
8. test: add unit tests for core modules and UI components
9. docs: add builder implementation report for v0.1.0
10. chore: add agent memory file for scribe
11. fix: align types across frontend/backend interface
12. test: add Playwright E2E test scaffold and accessibility setup
13. fix: teams API returns tasks alongside teams, update parser tests
14. test: add terminal E2E test spec
15. fix: TypeScript-Typen mit Backend-Implementierung abgleichen
16. test: E2E-Tests für Accessibility, Navigation, Projekte und Teams
17. docs: README und CHANGELOG auf Deutsch umgestellt
18. feat: Docker Compose Setup mit Tailscale Sidecar hinzugefuegt
19. docs: Deployment-Anleitung fuer Coolify und Cloudflare ergaenzt

### v0.2.1 — Tailscale Deployment Fix (2026-02-27)
- `docker-compose.yml` korrigiert:
  - Heredoc-JSON durch `printf` ersetzt (YAML-Konflikt durch uneingerueckte `{`-Zeilen behoben)
  - Tailscale-Service Healthcheck hinzugefuegt (`tailscale status`, retries: 10, start_period: 30s)
  - App `depends_on` tailscale: `service_started` → `service_healthy`
- 1 Commit: `fix: Tailscale Healthcheck und Serve-Config JSON korrigiert`

## Offene Punkte
- GitHub Release v0.2.0 kann nach dem Push erstellt werden
