# Remote Team Dashboard

Ein selbst-gehostetes Web-Dashboard zur Verwaltung von tmux-Sessions und Claude Code Agent-Teams auf mehreren Geräten via SSH. Läuft auf Coolify hinter Tailscale — nur für Tailnet-Mitglieder zugänglich.

## Features

- **Terminal-Viewer** — Live tmux-Sessions von Remote-Hosts via xterm.js im Browser
- **Team-Dashboard** — Echtzeit-Status von Claude Code Agent-Teams, Tasks und Mitgliedern
- **Session-Manager** — tmux-Sessions auf allen konfigurierten Hosts entdecken und verbinden
- **Projekt-Manager** — SSH-Hosts und Claude Code Projekte verwalten
- **Auth ohne Konfiguration** — Tailscale Identity-Header; keine Login-Seite notwendig

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Framework | Next.js 15+ (App Router) |
| Sprache | TypeScript 5.x |
| Styling | Tailwind CSS 4.x |
| Terminal | xterm.js 5.x |
| WebSocket | socket.io 4.x |
| SSH | ssh2 1.x |
| Datenbank | PostgreSQL 16 + Drizzle ORM |
| Auth | Tailscale Identity-Header |
| Deployment | Coolify + Docker Compose |
| Container | Docker Multi-Stage Build |
| Netzwerk | Tailscale Sidecar (HTTPS via Serve) |

## Architektur

```
Browser (Tailnet)
  ├── xterm.js Terminal  ──WS──▶ /terminal Namespace
  ├── Team-Dashboard     ──WS──▶ /updates Namespace
  └── REST-Aufrufe       ──────▶ Next.js API Routes
                                      │
                               SSH Connection Pool
                                      │
                         Remote-Hosts (tmux + Claude Code)
```

Der App-Server ist ein Custom Node.js Server, der Next.js umhüllt und socket.io für bidirektionales Terminal-I/O und Echtzeit-State-Updates anhängt.

## Voraussetzungen

- Node.js 20+
- PostgreSQL 16
- Tailscale (auf dem Server und allen Remote-Hosts)
- SSH-Key-Zugriff auf Remote-Hosts

## Einrichtung

### 1. Klonen und installieren

```bash
git clone <repo-url>
cd remote-team
npm install
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

`.env` bearbeiten:

```bash
# Pflichtfeld
DATABASE_URL=postgresql://user:pass@localhost:5432/remote_team

# Entwicklung (ohne Tailscale)
DEV_USER_LOGIN=dev@tailnet.example.com

# SSH-Keys — eine Variable pro Host
SSH_KEY_WORK_LAPTOP="-----BEGIN OPENSSH PRIVATE KEY-----..."
```

### 3. Datenbank einrichten

```bash
npm run db:generate   # Migrationen generieren
npm run db:migrate    # Migrationen anwenden
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Erreichbar unter `http://localhost:3000`. Im Entwicklungsmodus wird `DEV_USER_LOGIN` als Tailscale-Identität verwendet.

## Produktions-Deployment (Coolify + Docker Compose + Tailscale)

Das Deployment basiert auf drei Docker-Containern:

| Container | Aufgabe |
|-----------|---------|
| `tailscale` | Tailscale Sidecar — stellt die Tailnet-Verbindung her, terminiert HTTPS via Serve |
| `app` | Next.js App — teilt das Netzwerk mit dem Tailscale-Container |
| `db` | PostgreSQL 16 — nur intern erreichbar, kein Port nach aussen |

Die App ist dadurch **ausschliesslich ueber Tailscale erreichbar** — kein oeffentlicher Port, kein Reverse Proxy noetig.

### Voraussetzungen

- Docker und Docker Compose (auf dem Coolify-Host vorhanden)
- Tailscale-Account mit **Auth-Key** (Reusable + Ephemeral, Tag `container`)
- Eigene Domain (optional) fuer Cloudflare DNS-Eintrag

### 1. Umgebungsvariablen vorbereiten

Vorlage kopieren und bearbeiten:

```bash
cp .env.production.example .env
```

Pflichtfelder in `.env`:

```bash
# Tailscale
TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx        # https://login.tailscale.com/admin/settings/keys
TS_CERT_DOMAIN=mein-tailnet.ts.net         # https://login.tailscale.com/admin/dns

# Datenbank
POSTGRES_PASSWORD=sicheres-passwort-hier

# SSH-Keys (ein Eintrag pro Remote-Host)
SSH_KEY_WORK_LAPTOP="-----BEGIN OPENSSH PRIVATE KEY-----..."
```

### 2. Coolify-Deployment

1. In Coolify **New Resource** anlegen, Typ **Docker Compose**
2. Repository-URL eintragen: `https://github.com/MediaBytesDe/remote-team`
3. Alle Umgebungsvariablen aus `.env` unter **Environment Variables** eintragen
4. SSH-Keys (`SSH_KEY_*`) als **Secrets** (verschluesselt) eintragen
5. **Deploy** klicken — Coolify baut das Image und startet alle drei Container

Nach dem Start ist die App unter `https://remote-team.<dein-tailnet>.ts.net` erreichbar — aber nur fuer Tailnet-Mitglieder.

### 3. Cloudflare DNS konfigurieren (optional)

Um eine eigene Domain (z.B. `dashboard.example.com`) auf die Tailscale-Adresse zu zeigen:

1. Tailscale-IP der Maschine ermitteln:
   ```bash
   tailscale ip -4
   # Beispiel: 100.x.x.x
   ```
2. In Cloudflare einen **A-Record** anlegen:
   - Name: `dashboard`
   - IPv4: `100.x.x.x` (Tailscale-IP)
   - Proxy-Status: **DNS only** (grauer Wolken-Icon — kein orangener Proxy!)
3. SSL/TLS: Kein Cloudflare-Zertifikat noetig — HTTPS wird vollstaendig von **Tailscale Serve** mit automatischem Let's Encrypt-Zertifikat uebernommen.

> **Wichtig:** Der Cloudflare-Proxy (orange Wolke) muss **deaktiviert** sein. Da die App nur im Tailnet erreichbar ist, kann Cloudflare den Traffic sowieso nicht proxyen — DNS-only leitet die Anfrage direkt an die Tailscale-IP weiter, wo Tailscale Serve das Zertifikat aushandelt.

### 4. HTTPS und SSL via Tailscale Serve

Der Tailscale-Sidecar-Container uebernimmt die gesamte HTTPS-Terminierung:

- `tailscale/entrypoint.sh` generiert beim Start dynamisch eine Serve-Konfiguration fuer `https://remote-team.<TS_CERT_DOMAIN>`
- Tailscale Serve holt automatisch ein **Let's Encrypt-Zertifikat** fuer die Tailscale-Domain
- Alle eingehenden HTTPS-Anfragen werden intern an `http://127.0.0.1:3000` (Next.js App) weitergeleitet
- Tailscale fuegt automatisch den `Tailscale-User-Login`-Header hinzu — die App nutzt ihn zur passwortlosen Authentifizierung

### Umgebungsvariablen-Referenz

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|---------|--------------|
| `TS_AUTHKEY` | Ja | — | Tailscale Auth-Key (Reusable, Ephemeral) |
| `TS_CERT_DOMAIN` | Ja | `tailnet.ts.net` | Tailnet-Domain (z.B. `mein-tailnet.ts.net`) |
| `POSTGRES_PASSWORD` | Ja | — | PostgreSQL-Passwort |
| `POSTGRES_USER` | Nein | `remote_team` | PostgreSQL-Benutzername |
| `POSTGRES_DB` | Nein | `remote_team` | PostgreSQL-Datenbankname |
| `POLL_INTERVAL_MS` | Nein | `2000` | Polling-Intervall fuer Claude Code State (ms) |
| `SSH_KEY_*` | Ja* | — | SSH Private Keys pro Host (*mindestens einer) |

### SSH-Keys

SSH Private Keys als Umgebungsvariablen in Coolifys Secrets-Panel hinterlegen. Die Host-Konfiguration in der App speichert nur den Variablennamen (z.B. `SSH_KEY_WORK_LAPTOP`), der Server liest `process.env[name]` zur Laufzeit.

### Lokaler Test mit Docker Compose

```bash
# Image bauen und alle Container starten
docker compose up --build

# Nur im Hintergrund
docker compose up -d --build

# Logs verfolgen
docker compose logs -f

# Stoppen
docker compose down
```

## Remote-Hosts hinzufügen

1. **Einstellungen** im Dashboard öffnen
2. **Host hinzufügen** klicken
3. Ausfüllen:
   - Anzeigename (z.B. „Arbeits-Laptop")
   - Tailscale-Hostname oder IP
   - SSH-Benutzername
   - SSH-Key-Umgebungsvariable (z.B. `SSH_KEY_WORK_LAPTOP`)
4. **Verbindung testen** klicken

## Skripte

```bash
npm run dev          # Entwicklungsserver starten (tsx watch)
npm run build        # Produktions-Build erstellen
npm run start        # Produktionsserver starten
npm run lint         # ESLint ausführen
npm run typecheck    # TypeScript Type-Check
npm run test         # Jest Unit-Tests
npm run db:generate  # Drizzle-Migrationen generieren
npm run db:migrate   # Migrationen anwenden
npm run db:studio    # Drizzle Studio öffnen
```

## Projektstruktur

```
remote-team/
├── src/
│   ├── app/              # Next.js App Router (Seiten + API Routes)
│   ├── components/       # React Components (Layout, Terminal, Team, Host, UI)
│   ├── lib/              # Core-Services (DB, SSH, tmux, Claude, Socket)
│   ├── hooks/            # Client-seitige React Hooks
│   └── types/            # Gemeinsame TypeScript-Typen
├── server/
│   └── index.ts          # Custom Server (socket.io + Next.js)
├── tailscale/
│   ├── entrypoint.sh     # Generiert Serve-Config dynamisch, startet containerboot
│   └── serve.json        # Tailscale Serve Template (HTTPS → localhost:3000)
├── e2e/                  # Playwright E2E-Tests
├── docs/
│   ├── architecture.md   # System-Design und Entscheidungen
│   ├── frontend-spec.md  # Frontend-Implementierungsspezifikation
│   └── backend-spec.md   # Backend-Implementierungsspezifikation
├── Dockerfile            # Multi-Stage Build (deps → build → standalone runner)
├── docker-compose.yml    # 3 Services: Tailscale Sidecar, App, PostgreSQL
├── .dockerignore         # Build-Ausschlüsse
└── .env.production.example  # Produktions-Umgebungsvariablen-Vorlage
```

## Lizenz

Privat. Alle Rechte vorbehalten.
