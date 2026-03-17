# QA Engineer — Memory

## Erstellte Dateien

### E2E-Test-Infrastruktur
- `playwright.config.ts` — Chromium, sequentielle Worker, Port 3001, 30s Timeout
- `e2e/global-setup.ts` — Test-DB erstellen, `db:migrate`, Custom Server starten
- `e2e/global-teardown.ts` — Server beenden, `.env.test` löschen
- `e2e/fixtures/test-base.ts` — Erweitertes Playwright-Fixture mit axe-helper

### E2E-Spec-Dateien (66 Tests, 7 Dateien)
- `e2e/hosts.spec.ts` — SSH-Host-Konfiguration (add/edit/delete/validation)
- `e2e/terminal.spec.ts` — Terminal-Viewer (xterm.js, WebSocket-Events, Keyboard)
- `e2e/teams.spec.ts` — Team-Dashboard (Leerstand, WS-Subscription, Fehlerresilienz)
- `e2e/projects.spec.ts` — Projektverwaltung (CRUD via API + UI)
- `e2e/navigation.spec.ts` — App-Shell (alle 6 Routen, Sidebar, Dashboard-Kacheln)
- `e2e/accessibility.spec.ts` — WCAG 2.1 AA (axe × 6 Routen, Fokus-Trap, Labels, Keyboard)
- `e2e/performance.spec.ts` — Core Web Vitals (LCP/FCP/TTFB/CLS, API-Timing, WS-Latenz)

### Dokumentation
- `docs/qa-report.md` — Vollständiger QA-Bericht

## Absprachen / Entscheidungen
- Server muss via `npm run dev` (tsx + socket.io) gestartet werden, NICHT mit `next dev`
- Vor Server-Start: `npm run db:migrate` gegen Test-DB
- Test-DB: `remote_team_test` auf Port 5432 (postgres/postgres)
- Test-Server läuft auf Port 3001 (nicht 3000) um Konflikte zu vermeiden
- `POLL_INTERVAL_MS=60000` in Tests gesetzt (verhindert SSH-Rauschen während Tests)
- `DEV_USER_LOGIN=qa@test.example` für Auth-Bypass im Dev-Modus

## Abhängigkeiten (installiert)
- `@playwright/test` ^1.58.2
- `@axe-core/playwright` ^4.11.1
- Playwright Chromium Browser installiert

## Lint-Fix (2026-02-27)
- Problem: ESLint (react-hooks/rules-of-hooks) verwechselt Playwright's `use`-Parameter mit React Hook
- Fix: Parameter in `test-base.ts` von `use` → `provide` umbenannt
- Unbenutzten `chromium`-Import aus `performance.spec.ts` entfernt
- Unbenutzten `stubTerminalSocket`-Helper aus `terminal.spec.ts` entfernt
- Ergebnis: `npm run lint` — 0 Fehler, 0 Warnungen

## Offene Punkte (P2 — vor v1.0)
1. `prefers-reduced-motion` CSS-Override für `animate-fade-in`-Animationen prüfen
2. Manuelle Screenreader-Tests für xterm.js (von axe ausgeschlossen)
3. Voller Lighthouse-Score nur gegen Production-Build messbar (`npm run build`)

## npm-Scripts (hinzugefügt)
- `npm run test:e2e` — Alle E2E-Tests
- `npm run test:e2e:ui` — Playwright UI Explorer
- `npm run test:e2e:report` — HTML-Report öffnen
- `npm run audit:lighthouse` — Lighthouse-Audit gegen laufenden Server

## Status
- Task #5: ✅ Abgeschlossen
