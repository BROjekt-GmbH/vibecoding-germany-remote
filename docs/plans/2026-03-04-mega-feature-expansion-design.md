# Mega Feature Expansion — Design Document

**Datum:** 2026-03-04
**Version:** 0.6.1 → 1.0.0
**Umfang:** 14 Features in 4 Wellen

---

## Uebersicht

Erweiterung des Remote Team Dashboards von einem read-only Monitoring-Tool zu einer vollstaendigen interaktiven Plattform fuer Claude Code Teams, Terminal-Management und Multi-User-Collaboration.

## Entscheidungen

- **Storage:** PostgreSQL fuer alle Persistence (Alerts, Task-History, Templates)
- **Webhooks:** Nicht benoetigt — entfaellt
- **File-Browser:** Lesen + Editieren (Textarea, kein Monaco)
- **Shared Terminal:** Read-only Zuschauer + optionale Schreibrechte
- **Umsetzung:** Wellen-basiert (4 Wellen, parallel innerhalb Wellen)

---

## Welle 1 — Foundation (DB + Backend-Kern)

### 1.1 Datenbank-Erweiterungen

Neue Tabellen in `src/lib/db/schema.ts`:

**`alertHistory`**
- `id` UUID PK
- `hostId` UUID FK → hosts
- `type` text (host_offline | team_complete | agent_status)
- `severity` text (info | warning | error | success)
- `message` text
- `metadata` JSONB (teamName, agentName, taskId, etc.)
- `readAt` timestamp nullable
- `createdAt` timestamp

**`taskHistory`**
- `id` UUID PK
- `hostId` UUID FK → hosts
- `teamName` text
- `externalTaskId` text (Task-ID aus Claude)
- `subject` text
- `status` text
- `owner` text nullable
- `startedAt` timestamp nullable
- `completedAt` timestamp nullable
- `createdAt` timestamp

**`sessionTemplates`**
- `id` UUID PK
- `userLogin` text
- `name` text
- `description` text nullable
- `layout` JSONB (panes, splits, startCommands)
- `createdAt` timestamp
- `updatedAt` timestamp

**`hostGroups`**
- `id` UUID PK
- `name` text
- `color` text (hex, z.B. #3b82f6)
- `position` integer
- `createdAt` timestamp

**Aenderungen an bestehenden Tabellen:**
- `hosts` + `groupId` UUID nullable FK → hostGroups

### 1.2 SSH-Agent-Forwarding

`src/lib/ssh/pool.ts` → `getHostSSHConfig()`:
- Wenn `authMethod === 'agent'`: `{ agent: process.env.SSH_AUTH_SOCK }`
- Kein neues UI noetig, HostForm unterstuetzt bereits die Auswahl

### 1.3 Team-Messages Backend

- Poller-Erweiterung: Messages aus Task-JSONs extrahieren (messages-Array)
- API: `GET /api/hosts/[id]/teams/[name]/messages`
- Socket.io: `teams:messages` Event im `/updates` Namespace
- Anbindung an bestehende `MessagePanel` Komponente

### 1.4 Notification-Persistence

- `alerts.ts` erweitern: bei jedem Alert → INSERT in `alertHistory`
- Bestehende In-Memory-Alerts bleiben fuer Echtzeit-Delivery

### 1.5 Task-History Snapshots

- Poller (`src/lib/claude/poller.ts`): bei Task-Status-Aenderung → INSERT/UPDATE in `taskHistory`
- `startedAt` wird gesetzt wenn Status → in_progress
- `completedAt` wird gesetzt wenn Status → completed

---

## Welle 2 — Neue Seiten & APIs

### 2.1 File-Browser

**Seite:** `/files`
- Host-Selector Dropdown
- Linke Sidebar: Verzeichnisbaum (erweiterbar, basiert auf bestehendem DirectoryBrowser)
- Rechte Seite: Datei-Inhalt mit Syntax-Highlighting (`<pre>` + CSS)
- Edit-Mode: Textarea mit Speichern-Button
- Aktionen: Anzeigen, Editieren, Neue Datei, Loeschen (mit Bestaetigung)

**APIs:**
- `GET /api/hosts/[id]/browse` — existiert bereits (Verzeichnisse)
- `GET /api/hosts/[id]/files?path=` — Datei-Inhalt lesen (via SSH `cat`)
- `PUT /api/hosts/[id]/files?path=` — Datei schreiben (via SSH `cat >`)
- `DELETE /api/hosts/[id]/files?path=` — Datei loeschen (via SSH `rm`)
- `POST /api/hosts/[id]/files?path=` — Neue Datei erstellen

**Sicherheit:** Blocklist fuer sensitive Pfade (/etc/shadow, .env, id_rsa, etc.)

### 2.2 Log-Viewer

**Seite:** `/logs`
- Host-Selector
- Log-Datei-Liste (`ls ~/.claude/logs/`)
- Log-Inhalt-Anzeige (letzte 500 Zeilen)
- Live-Tail via Socket.io (optional Toggle)

**APIs:**
- `GET /api/hosts/[id]/logs` — Liste der Log-Dateien
- `GET /api/hosts/[id]/logs/[filename]?lines=500` — Log-Inhalt (tail)

**Socket.io:**
- `logs:subscribe` / `logs:data` / `logs:unsubscribe` im neuen `/logs` Namespace

### 2.3 Interaktive Task-Steuerung

**APIs:**
- `POST /api/hosts/[id]/teams/[name]/tasks` — Task erstellen (JSON via SSH schreiben)
- `PATCH /api/hosts/[id]/teams/[name]/tasks/[taskId]` — Task zuweisen/Status aendern

**UI-Erweiterungen:**
- "Task erstellen"-Button im TaskBoard
- Task-Zuweisung per Dropdown (Agent-Liste)
- Status-Aenderung per Klick (pending → in_progress → completed)

### 2.4 Analytics Dashboard

**API:** `GET /api/analytics?hostId=&from=&to=`
- Tasks pro Tag (Balkendiagramm)
- Durchschnittliche Task-Duration
- Agent-Leaderboard (meiste completed Tasks)
- Team-Laufzeiten

**UI:** Dashboard-Widget auf `/` Startseite
- CSS-basierte Balken (kein Chart-Library)
- Zeitraum-Filter (Heute, 7 Tage, 30 Tage)

### 2.5 Notification-Center

**APIs:**
- `GET /api/notifications?read=false&limit=50`
- `PATCH /api/notifications/[id]/read`
- `POST /api/notifications/read-all`

**UI:**
- Header: Glocken-Icon mit ungelesene-Anzahl Badge
- Dropdown: Alert-Liste mit Zeitstempel, Severity-Farben, "Alle gelesen" Button
- Klick auf Alert → Navigation zur relevanten Seite

---

## Welle 3 — UX & Polish

### 3.1 Settings-Seite komplett

Sektionen:
- **Darstellung:** Theme (Dark/Light), Terminal Font-Size (Slider 10-24), Font-Family (Dropdown)
- **Verhalten:** Poll-Interval (Slider 1000-10000ms)
- **Tastenkuerzel:** Tabelle mit Aktion → Tastenkombination, editierbar
- Speichern via `POST /api/preferences`

### 3.2 Dark/Light Theme

- CSS Custom Properties: `:root` (Dark), `[data-theme="light"]` (Light)
- Toggle-Button im Header (Sonne/Mond Icon von Lucide)
- Preference in DB, `prefers-color-scheme` als Default
- Transition: `transition: background-color 0.3s, color 0.3s`

### 3.3 Global Search / Command Palette

- Trigger: `Ctrl+K` oder `/` (ausserhalb von Inputs)
- Dialog: zentriert, mit Suchfeld oben
- Durchsucht: Hosts, Projekte, Teams, Sessions
- Fuzzy-Matching, Ergebnisse gruppiert
- Enter → Navigation, Esc → Schliessen
- Client-seitig + ein API-Call fuer Sessions

### 3.4 Keyboard Shortcuts

- Global Event-Listener auf `document`
- Defaults:
  - `Ctrl+K` → Command Palette
  - `Ctrl+1..9` → Terminal Tab wechseln
  - `Ctrl+Shift+T` → Neuer Terminal Tab
  - `?` → Shortcut-Overlay
  - `Esc` → Dialog schliessen
- Konfigurierbar in Settings
- Shortcut-Overlay: Modal mit Tabelle aller Shortcuts

### 3.5 Host-Gruppen

- Settings: Gruppen verwalten (CRUD mit Name + Farbe)
- HostForm: Gruppen-Dropdown
- `/hosts` Seite: Gruppierte Anzeige mit farbigen Section-Headern
- Ungroupierte Hosts unter "Sonstige"

---

## Welle 4 — Collaboration

### 4.1 Session-Templates

- Save: Aktuelle tmux-Session als Template speichern (Pane-Layout + Befehle)
- Restore: Template auswaehlen → neue Session mit gespeichertem Layout erstellen
- UI: Template-Liste in Session-Picker, "Als Template speichern" in Terminal-Toolbar
- API: CRUD unter `/api/terminal/templates`

### 4.2 Shared Terminal

- `terminal:share` Event → generiert Share-Token (UUID, TTL 1h)
- Share-URL: `/terminal/shared/[token]`
- Host-Terminal sendet Daten an alle verbundenen Clients
- Zuschauer: read-only (sehen Output, koennen nicht tippen)
- Host kann Schreibrechte per Button erteilen
- Avatare am oberen Rand zeigen verbundene User
- API: `POST /api/terminal/share` → `{token, expiresAt}`
- Cleanup: Tokens nach TTL automatisch invalidieren

---

## Nicht umgesetzt

- **Webhooks/Integrationen** — vom User als nicht benoetigt eingestuft
