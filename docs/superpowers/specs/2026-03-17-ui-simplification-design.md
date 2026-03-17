# UI-Vereinfachung + Onboarding + SSH-Passwort — Design-Spec

## Datum: 2026-03-17

## Zusammenfassung

Vier zusammenhaengende Aenderungen am VCG Remote Dashboard:
1. Panel-System (Floating Windows) komplett entfernen — Navigation oeffnet Hauptseiten
2. Onboarding-Wizard fuer neue Nutzer — automatisch bei leerem Dashboard
3. SSH-Passwort-Authentifizierung als dritte Auth-Methode
4. Hilfe-Seite mit Erklaerungen und Installationsanweisungen

Zielgruppe: Einsteiger ohne fundierte SSH/tmux-Kenntnisse.

---

## 1. Panel-System entfernen

### Dateien loeschen

- `src/components/panels/` — gesamtes Verzeichnis (workspace-overlay, panel-container, minimized-bar, alle content-Panels)
- `src/lib/stores/panel-manager.ts` — Panel-State-Store
- `src/types/panels.ts` — PanelId Type, PANEL_DEFAULTS

### Panel-Referenzen bereinigen

Alle Dateien mit Panel-Imports/-Referenzen muessen bereinigt werden. Vollstaendige Liste ermitteln mit:

```bash
grep -rn 'panel\|PanelId\|usePanelManager\|panel-manager\|WorkspaceOverlay\|workspace-overlay\|openPanel\|togglePanel' src/ --include="*.ts" --include="*.tsx"
```

Bekannte betroffene Dateien:

| Datei | Aenderung |
|-------|-----------|
| `src/app/layout.tsx` | WorkspaceOverlay Import/Render entfernen |
| `src/components/layout/quick-action-bar.tsx` | Panel-Toggle-Buttons entfernen, Komponente entfernen (wird leer, siehe unten) |
| `src/components/command-palette/command-palette.tsx` | Panel-Befehle entfernen |
| `src/hooks/use-keyboard-shortcuts.ts` | Panel-Shortcuts entfernen |
| `src/app/page.tsx` | Panel-Referenzen entfernen |
| `src/app/hosts/page.tsx` | Panel-Referenzen entfernen |
| `src/app/hosts/[hostId]/page.tsx` | Panel-Referenzen entfernen |
| `src/app/projects/page.tsx` | Panel-Referenzen entfernen |
| `src/app/projects/[id]/page.tsx` | Panel-Referenzen entfernen |
| `src/app/files/page.tsx` | Panel-Referenzen entfernen |
| `src/app/terminal/page.tsx` | Panel-Referenzen entfernen |
| `src/app/settings/page.tsx` | Panel-Referenzen entfernen |
| `src/components/layout/notification-center.tsx` | Panel-Referenzen entfernen |
| `src/components/host/host-card.tsx` | Panel-Referenzen entfernen |
| `src/components/host/session-list.tsx` | Panel-Referenzen entfernen |
| `src/components/files/context-menu.tsx` | Panel-Referenzen entfernen |
| `src/components/files/file-viewer.tsx` | Panel-Referenzen entfernen |
| `src/components/files/file-tree.tsx` | Panel-Referenzen entfernen |
| `src/components/files/file-search.tsx` | Panel-Referenzen entfernen |
| `src/components/terminal/layout-selector.tsx` | Panel-Referenzen entfernen |
| `src/lib/stores/terminal-tab-events.ts` | Panel-Referenzen entfernen |
| `src/app/globals.css` | Panel-bezogene CSS-Regeln entfernen |

### Quick-Action-Bar

Nach Entfernung der Panel-Buttons bleibt nur der Ctrl+K-Suchbutton. Die Quick-Action-Bar wird komplett entfernt:
- `src/components/layout/quick-action-bar.tsx` loeschen
- Suchfunktion (Command Palette Trigger) in den Header rechts verschieben (neben Notifications)
- Import/Render in `src/components/layout/header.tsx` entfernen

### Was bleibt

- Sidebar mit Links zu Hauptseiten
- Command Palette mit Seitennavigation (ohne Panel-Eintraege)
- Alle bestehenden Seiten (/, /hosts, /terminal, /files, /projects, /settings)

---

## 2. Navigation anpassen

### Sidebar-Eintraege

| Eintrag | Pfad | Icon (lucide-react) | Neu? |
|---------|------|---------------------|------|
| Dashboard | `/` | LayoutDashboard | — |
| Hosts | `/hosts` | Server | — |
| Terminal | `/terminal` | Terminal | — |
| Projects | `/projects` | FolderOpen | — |
| Files | `/files` | FileText | — |
| Hilfe | `/help` | CircleHelp | Neu |
| Settings | `/settings` | Settings | — |

Betroffene Datei: `src/components/layout/sidebar.tsx` — neuen Hilfe-Eintrag hinzufuegen.

---

## 3. Onboarding-Wizard

### Trigger

- **Automatisch:** Dashboard (`src/app/page.tsx`) prueft client-seitig per `fetch('/api/hosts')` ob Hosts existieren. Leere Liste → Wizard anzeigen statt normalem Dashboard.
- **Manuell:** Settings-Seite hat weiterhin "Host hinzufuegen" Button (oeffnet HostForm Dialog wie bisher)

### Wizard-Schritte

**Schritt 1: Willkommen**
- Ueberschrift: "Willkommen bei VCG Remote"
- Kurze Erklaerung: "Verbinde dich mit deinen Remote-Hosts und verwalte tmux-Sessions direkt im Browser."
- Button: "Los geht's"

**Schritt 2: Host-Daten**
- Felder: Anzeigename, Hostname/IP, Port (default 22), Benutzername
- Hilfe-Texte pro Feld (z.B. "Die IP-Adresse oder der Hostname deines Servers")
- Validierung inline

**Schritt 3: Authentifizierung**
- Drei klar erklaerte Optionen als Cards (nicht Dropdown):
  - **Passwort** — "Am einfachsten. Dein SSH-Passwort wird verschluesselt gespeichert."
  - **SSH-Key** — "Sicherer. Fuege deinen privaten SSH-Schluessel ein."
  - **SSH-Agent** — "Fuer Fortgeschrittene. Nutzt den SSH-Agent deines Systems."
- Je nach Auswahl erscheint das passende Eingabefeld (Passwort-Input / Key-Textarea / nichts)

**Schritt 4: Verbindung testen**
- Grosser "Verbindung testen" Button
- Klares Feedback: Erfolg (gruener Check + "Verbunden!") oder Fehler (roter X + verstaendliche Fehlermeldung)
- Bei Fehler: Link zur Hilfe-Seite (`/help#troubleshooting`)
- Bei Erfolg: "Speichern & weiter" Button

**Schritt 5: Fertig**
- "Dein Host ist eingerichtet!"
- Zwei Buttons: "Zum Terminal" (→ /terminal) und "Weiteren Host hinzufuegen" (→ Schritt 2)

### Implementierung

- Wizard aufgeteilt in Unterkomponenten:
  - `src/components/onboarding/wizard.tsx` — Container mit Step-State
  - `src/components/onboarding/step-welcome.tsx`
  - `src/components/onboarding/step-host-data.tsx`
  - `src/components/onboarding/step-auth.tsx`
  - `src/components/onboarding/step-test.tsx`
  - `src/components/onboarding/step-done.tsx`
- Multi-Step mit internem State (useState, kein Router)
- Nutzt intern die gleichen API-Calls wie HostForm (POST /api/hosts, POST /api/hosts/test)
- Dashboard (`src/app/page.tsx`) ist Client-Komponente, prueft Host-Count per Fetch

---

## 4. SSH-Passwort-Authentifizierung

### Schema-Aenderung

`src/lib/db/schema.ts` — `hosts` Tabelle:
- `authMethod`: Kommentar auf `// 'key' | 'agent' | 'password'` aktualisieren
- Neues Feld: `password: text('password')` — AES-256-GCM verschluesselt (gleiche Logik wie `privateKey`)

### Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/lib/db/schema.ts` | `password` Spalte hinzufuegen |
| `src/types/index.ts` | `Host` Interface: authMethod um `'password'` erweitern, `hasPassword: boolean` hinzufuegen |
| `src/lib/ssh/types.ts` | `SSHConfig` um `password?: string` erweitern |
| `src/lib/ssh/client.ts` | Drei explizite Pfade: password / key / agent |
| `src/lib/ssh/pool.ts` | Pruefen ob `password` aus SSHConfig an ssh2 weitergegeben wird |
| `src/lib/validation.ts` | `password` Feld in CreateHostSchema, authMethod um `'password'` |
| `src/lib/api/sanitize.ts` | `password` aus Response entfernen, `hasPassword` Flag |
| `src/app/api/hosts/route.ts` | `password` beim POST verschluesseln |
| `src/app/api/hosts/[id]/route.ts` | `password` beim PATCH verschluesseln |
| `src/app/api/hosts/test/route.ts` | `TestSchema` um `authMethod` und `password` erweitern, Auth-Methoden-Switch |
| `src/components/host/host-form.tsx` | Passwort-Option im authMethod-Dropdown, `buildPayload()` um password erweitern |

### SSH-Client Logik

```typescript
// src/lib/ssh/client.ts — explizite Drei-Wege-Unterscheidung
if (h.authMethod === 'agent') {
  return { host, port, username, agent: process.env.SSH_AUTH_SOCK };
}
if (h.authMethod === 'password') {
  return { host, port, username, password: h.password ? decrypt(h.password) : undefined };
}
// Default: key
return { host, port, username, privateKey: h.privateKey ? decrypt(h.privateKey) : undefined };
```

### Sicherheit

- Passwort wird mit `encrypt()` aus `src/lib/crypto.ts` verschluesselt (AES-256-GCM)
- Identische Behandlung wie SSH-Keys
- Wird nie an den Client/Browser zurueckgegeben
- `sanitizeHost()` filtert `password` raus, setzt `hasPassword: Boolean(password)`

---

## 5. Hilfe-Seite (`/help`)

### Neue Dateien

- `src/app/help/page.tsx` — Hilfe-Seite

### Sektionen

**Was ist VCG Remote?**
- Kurzbeschreibung, Anwendungsfaelle
- Wie es funktioniert (Browser → Tailscale → SSH → tmux)

**SSH-Grundlagen**
- Was ist SSH
- Authentifizierung: Passwort vs. Key vs. Agent
- SSH-Key generieren: `ssh-keygen -t ed25519`
- Key auf Server kopieren: `ssh-copy-id user@host`

**tmux**
- Was ist tmux und warum braucht man es
- Installation: `apt install tmux` / `brew install tmux` / `apk add tmux`
- Grundbefehle: `tmux new -s name`, `tmux ls`, `tmux attach -t name`
- Wichtigste Shortcuts: Prefix (Ctrl+B), Split, Navigate

**Tailscale**
- Was ist Tailscale und warum VPN
- Installation: Link zu tailscale.com/download
- Geraet hinzufuegen: `tailscale up`
- Auth-Key fuer Container erstellen

**Host einrichten**
- Schritt-fuer-Schritt: Host hinzufuegen, Auth-Methode waehlen, testen
- Welche Informationen man braucht (IP, User, Key/Passwort)

**Troubleshooting / FAQ** (Anchor-ID: `#troubleshooting`)
- "Host nicht erreichbar" — Firewall, Tailscale-Status, Hostname pruefen
- "Verbindung abgelehnt" — SSH-Dienst laeuft? Port korrekt?
- "Authentifizierung fehlgeschlagen" — Passwort/Key falsch, Berechtigungen pruefen
- "tmux nicht gefunden" — tmux installieren
- "Keine Sessions sichtbar" — `tmux new -s test` auf dem Host ausfuehren

### Navigation

- Sidebar: neuer Eintrag "Hilfe" mit `CircleHelp` Icon, vor Settings
- Jede Sektion hat eine Anchor-ID fuer direkte Verlinkung aus Wizard/Fehlermeldungen

---

## 6. Neue Migration

Nach Schema-Aenderung:
```bash
npx drizzle-kit generate
```

Erzeugt Migration die `password` Spalte zur `hosts` Tabelle hinzufuegt.

---

## Nicht im Scope

- Panel-System durch anderes Layout ersetzen (wird einfach entfernt)
- Englische Uebersetzung der Hilfe-Seite
- Interaktive Tutorials / Guided Tours
- SSH-Key-Generierung in der App
- Passwort-Rotation / Ablauf
