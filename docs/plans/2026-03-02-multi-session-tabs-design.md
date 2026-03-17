# Multi-Session Terminal Tabs — Design

## Zusammenfassung

Mehrere SSH-Sessions gleichzeitig offen halten, über verschiedene Hosts hinweg, auf einer einzigen `/terminal`-Seite. Tabs werden in PostgreSQL persistiert und beim nächsten Besuch automatisch wiederhergestellt.

## Anforderungen

- Mehrere Sessions gleichzeitig offen (verschiedene Hosts)
- Tabs persistent über Page-Refresh und Sessions hinweg
- [+] Button öffnet Dialog mit allen Hosts und deren Sessions
- Hintergrund-Tabs bleiben verbunden (kein Reconnect bei Tab-Wechsel)
- Speicherung in PostgreSQL (geräteübergreifend)

## Architektur: Single-Page Tab Manager

Eine zentrale `/terminal`-Seite ersetzt die bestehende `/terminal/[sessionId]`-Route. Alle Terminal-Instanzen bleiben gleichzeitig gemountet — inaktive Tabs werden per `display: none` versteckt.

### Tab-Datenmodell

```typescript
interface TerminalTab {
  id: string           // UUID
  hostId: string       // FK → hosts
  hostName: string     // Anzeige (aus hosts-Tabelle)
  sessionName: string  // tmux Session-Name
  pane: string         // tmux Pane Index
  label: string        // "hostName:sessionName"
  position: number     // Sortierung
}
```

### DB-Schema: terminal_tabs

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID (PK) | Tab-ID |
| userId | string | Tailscale Login |
| hostId | UUID (FK → hosts) | Zugehöriger Host |
| sessionName | string | tmux Session-Name |
| pane | string (default '0') | tmux Pane |
| position | integer | Reihenfolge |
| isActive | boolean | Zuletzt aktiver Tab |
| createdAt | timestamp | Erstellt |
| updatedAt | timestamp | Aktualisiert |

### API-Routen

- `GET /api/terminal/tabs` — Alle Tabs des Users
- `POST /api/terminal/tabs` — Neuen Tab erstellen
- `DELETE /api/terminal/tabs/:id` — Tab schließen
- `PATCH /api/terminal/tabs/:id` — Position/Active ändern
- `PUT /api/terminal/tabs/reorder` — Batch-Reorder

### UI-Komponenten

**TabManager** (`/terminal/page.tsx`):
- Lädt Tabs aus DB beim Mount
- Rendert alle TerminalView-Instanzen gleichzeitig
- Aktiv: `display: block`, Rest: `display: none`
- Tab-Wechsel = nur CSS, kein Re-Mount

**TabBar** (überarbeitete `terminal-tabs.tsx`):
- Format: `hostName:sessionName` pro Tab
- Online/Offline-Indikator (Host-Status)
- [+] Button → SessionPickerDialog

**SessionPickerDialog** (neu):
- Zeigt alle Hosts als Karten mit Online-Status
- Klick auf Host → lädt Sessions via API
- Sessions mit Window-Count
- "Neue Session erstellen" Option
- "Verbinden" Button → Tab in DB + TerminalView

### Verbindungsmanagement

- Jeder Tab = eigene socket.io-Verbindung zu `/terminal`
- Alle bleiben offen, auch Hintergrund-Tabs
- `TerminalView` bekommt `visible: boolean` Prop
- `fitAddon.fit()` nur bei `visible=true`
- Tab-Wechsel → sofort `fit()` + Resize-Event

### Lifecycle

1. **Erster Besuch:** Keine Tabs → automatisch Dialog zeigen
2. **Wiederkehr:** Tabs aus DB → alle verbinden → zuletzt aktiven Tab zeigen
3. **Tab schließen:** Socket disconnect → DB löschen → nächsten Tab aktivieren
4. **Letzter Tab:** Leerer State mit [+] Button

### Routing

- `/terminal` — neue Hauptseite
- `/terminal/[sessionId]` — Redirect auf `/terminal` (Abwärtskompatibilität)
