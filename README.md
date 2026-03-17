<div align="center">

<img src="docs/logo.svg?v=2" alt="VibeCoding Germany Remote" width="600" />

<br />

Selbst-gehostetes Web-Dashboard zur Verwaltung von tmux-Sessions auf Remote-Hosts via SSH.
Zeigt Live-Terminals im Browser — funktioniert mit Claude Code, Codex oder jedem anderen Tool das in tmux laeuft.

</div>

Gesichert ueber Tailscale — nur fuer Tailnet-Mitglieder zugaenglich, keine Login-Seite noetig.

## Features

- **Terminal im Browser** — Live tmux-Sessions von Remote-Hosts via xterm.js
- **Session-Manager** — tmux-Sessions auf allen konfigurierten Hosts entdecken und verbinden
- **Host-Verwaltung** — SSH-Hosts mit verschluesselten Keys in der Web-UI verwalten
- **Code-Editor** — Dateien auf Remote-Hosts direkt im Browser bearbeiten (CodeMirror)
- **Auth ohne Konfiguration** — Tailscale Identity-Header, keine Login-Seite
- **Einfaches Deployment** — 2 Docker-Container, SQLite, kein externer Datenbankserver

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) und Docker Compose
- [Tailscale](https://tailscale.com/) Account (kostenlos fuer bis zu 100 Geraete)
- SSH-Zugang zu mindestens einem Remote-Host
- tmux auf den Remote-Hosts installiert

## Schnellstart (5 Minuten)

### 1. Repo klonen

```bash
git clone https://github.com/VibeCoding-Germany/vibecoding-germany-remote.git
cd vibecoding-germany-remote
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

`.env` bearbeiten — mindestens diese zwei Werte setzen:

```bash
# Tailscale Auth-Key erstellen: https://login.tailscale.com/admin/settings/keys
# Empfohlen: Reusable + Ephemeral + Tag "container"
TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx

# Verschluesselungs-Key fuer SSH-Keys in der Datenbank
# Generieren mit: openssl rand -hex 32
ENCRYPTION_KEY=dein-64-zeichen-hex-string
```

### 3. Starten

```bash
docker compose up -d --build
```

Die App ist jetzt unter `https://vcg-remote.<dein-tailnet>.ts.net` erreichbar — aber nur fuer Mitglieder deines Tailnets.

### 4. Ersten Host hinzufuegen

1. Dashboard im Browser oeffnen
2. **Hosts** → **Host hinzufuegen**
3. Hostname/IP, SSH-User und Private Key eintragen
4. **Verbindung testen** → **Speichern**

Fertig! Unter **Terminal** siehst du jetzt die tmux-Sessions des Hosts.

## Konfiguration

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|----------|--------------|
| `TS_AUTHKEY` | Ja | — | Tailscale Auth-Key ([erstellen](https://login.tailscale.com/admin/settings/keys)) |
| `ENCRYPTION_KEY` | Ja | — | Master-Key fuer SSH-Key-Verschluesselung (`openssl rand -hex 32`) |
| `TS_CERT_DOMAIN` | Ja | — | Tailnet-Domain ([finden](https://login.tailscale.com/admin/dns)) |
| `TS_HOSTNAME` | Nein | `vcg-remote` | Hostname im Tailnet |
| `POLL_INTERVAL_MS` | Nein | `2000` | Polling-Intervall fuer tmux-Sessions (ms) |
| `PORT` | Nein | `3000` | Interner App-Port |

## Entwicklung

Lokales Setup ohne Docker:

```bash
# Dependencies installieren
npm install

# Verschluesselungs-Key generieren
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# Dev-Auth-Bypass setzen
export DEV_USER_LOGIN=dev@example.com

# Datenbank initialisieren
npm run db:generate
npm run db:migrate

# Entwicklungsserver starten
npm run dev
```

Erreichbar unter `http://localhost:3000`.

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Terminal | xterm.js 6 |
| WebSocket | socket.io 4 |
| SSH | ssh2 1 |
| Datenbank | SQLite (better-sqlite3 + Drizzle ORM) |
| Auth | Tailscale Identity-Header |
| Container | Docker + Tailscale Serve |

## Docker-Architektur

```
┌─────────────────────────────────────────┐
│ Docker Compose                          │
│                                         │
│  tailscale ─── HTTPS + Auth ──→ Browser │
│     │                                   │
│     └── network_mode: shared ──→ app    │
│                                  │      │
│                              SQLite DB  │
│                              (Volume)   │
└─────────────────────────────────────────┘
```

| Container | Aufgabe |
|-----------|---------|
| `tailscale` | Tailnet-Verbindung, HTTPS (Let's Encrypt), Auth-Header |
| `app` | Next.js + socket.io + SQLite |

## Lizenz

MIT — siehe [LICENSE](LICENSE).
