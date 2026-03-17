# Projects Hub — Design

**Datum:** 2026-03-03
**Status:** Genehmigt

## Ziel

Projects wird zum zentralen Einstiegspunkt: Projekt anklicken → bestehende tmux-Session attachen oder neue starten. Automatische Zuordnung von Sessions und Claude Teams per Verzeichnis-Matching.

## Datenmodell

### TmuxSession-Erweiterung

```typescript
interface TmuxSession {
  name: string;
  windows: number;
  created: string;
  attached: boolean;
  panePaths: string[];  // NEU: aktuelle Verzeichnisse pro Pane
}
```

### Matching-Logik

Ein Projekt matcht eine Session, wenn mindestens ein `panePath` mit `project.path` beginnt (Prefix-Match → Unterverzeichnisse zählen mit).

Claude Teams matchen, wenn ihr Arbeitsverzeichnis im Projektpfad liegt.

## Session-Polling Erweiterung

Zusätzlich zum bestehenden `tmux list-sessions` wird abgefragt:

```bash
tmux list-panes -a -F "#{session_name}|||#{pane_current_path}"
```

Ergebnis wird nach Session-Name gruppiert und als `panePaths`-Array an die Session-Daten gehängt.

## UI: Projekt-Detail-Seite (`/projects/[id]`)

```
┌─────────────────────────────────────────────┐
│ ← Projects    [Projektname]     [Connect ▶] │
│ /home/user/repos/my-project  on my-server   │
├─────────────────────────────────────────────┤
│ AKTIVE SESSIONS                              │
│ ┌──────────────────────┐ ┌────────────────┐ │
│ │ 🟢 my-project (3w)   │ │ 🟢 dev (1w)   │ │
│ │ [Attach]              │ │ [Attach]       │ │
│ └──────────────────────┘ └────────────────┘ │
├─────────────────────────────────────────────┤
│ CLAUDE TEAMS                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ team-webapp  · 3 agents · 5/8 tasks done │ │
│ │ researcher(idle) builder(active) qa(idle) │ │
│ └──────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ [+ Neue Session starten]                     │
└─────────────────────────────────────────────┘
```

### Komponenten

- **Header:** Projektname, Pfad, Host-Info, Connect-Button (attacht erste aktive Session oder startet neue)
- **Sessions-Sektion:** Karten pro gematchter Session mit Name, Window-Count, Attach-Button → `/terminal/{hostId}?session=...`
- **Claude Teams-Sektion:** Gefiltert auf Teams im Projektverzeichnis, mit Agent-Status und Task-Fortschritt
- **Neue Session:** Button startet neue tmux-Session im Projektverzeichnis

## UI: Projekt-Liste (`/projects`)

Bestehende Liste wird mit Live-Daten aufgewertet:

```
┌────────────────────────────────────────────┐
│ 📁 remote-team                    [Connect]│
│ /home/user/Projects/remote-team            │
│ on my-server · 🟢 online                   │
│ 2 Sessions · 1 Claude Team (5/8 tasks)     │
└────────────────────────────────────────────┘
```

## Technische Änderungen

1. **`src/types/index.ts`** — `TmuxSession` um `panePaths: string[]` erweitern
2. **SSH Session-Polling** — Zusätzlichen `tmux list-panes` Befehl einbauen, Ergebnisse parsen und mergen
3. **Matching-Utility** — `matchSessionsToProject(project, sessions)` und `matchTeamsToProject(project, teams)`
4. **`/projects` Page** — Von statisch auf Live-Daten umstellen (Client Component mit Polling)
5. **`/projects/[id]` Page** — Neue Detail-Seite mit Sessions, Claude Teams, Connect-Action
6. **API-Erweiterung** — Endpoint für "neue Session im Projektverzeichnis starten"
7. **Socket-Events** — Projekt-relevante Updates über bestehende WebSocket-Infrastruktur pushen
