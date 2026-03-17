# Feature-Roadmap: Agent Activity Center, Notifications, Split-View Terminal

**Datum**: 2026-03-03
**Version**: 0.5.0 (geplant)

## Kontext

Das Remote Team Dashboard (v0.4.3) bietet solide Terminal-Verwaltung, Team-Polling und Mobile-Optimierung. Die drei Haupt-Pain-Points sind:
1. Geringe Sichtbarkeit in Agent-Aktivitaeten und Team-Fortschritt
2. Kein proaktives Alerting bei Problemen
3. Kein Multi-Terminal-View fuer paralleles Arbeiten

## Feature A: Agent Activity Center (Prioritaet 1)

### Ziel
Vollstaendige Transparenz ueber Agent-Aktivitaeten, Team-Fortschritt und Inter-Agent-Kommunikation.

### Neue Komponenten

#### Activity Feed
- Chronologischer Event-Stream auf der Team-Detail-Seite
- Events: Task-Statuswechsel, Agent-Statuswechsel, neue Tasks, neue Teammitglieder
- Format: "[Zeitstempel] [Icon] [Agent] hat [Aktion] [Objekt]"
- Auto-Scroll mit "Neue Events"-Badge bei manuellem Scroll
- Max 100 Events im Speicher (FIFO), kein DB-Persistenz

#### Message Panel (Fertigstellung)
- Backend: Messages aus Claude-Code-Dateisystem lesen (soweit verfuegbar)
- Broadcasts vs. Direkt-Messages visuell unterschieden
- Agent-Avatar mit Farb-Badge und Rollenbezeichnung
- Zeitstempel + Message-Typ-Icons

#### Progress Overview
- Fortschrittsbalken: completed/total Tasks als Prozent
- Farbige Segmente: Pending (grau) / In Progress (cyan) / Completed (gruen)
- Mini-Sparkline: Task-Completions ueber Zeit (letzte 30 Datenpunkte)
- Pro-Agent-Statistik: Tasks assigned/completed

### Architektur

```
Poller (erweitert)
  ├── Liest teams/ + tasks/ (wie bisher)
  ├── Vergleicht mit letztem State (Delta-Detection)
  ├── Generiert ActivityEvents aus Deltas
  └── Emittiert:
      ├── teams:state (bestehend)
      ├── teams:activity {events: ActivityEvent[]}
      └── teams:progress {completed, total, byStatus, byAgent}
```

Kein neues DB-Schema — alles ephemer und in-memory.

### UI-Layout

**Desktop**: Drei-Spalten-Layout auf Team-Detail-Seite
- Links (schmal): Agent-Liste + Progress Overview
- Mitte (breit): Task-Board
- Rechts (mittel): Activity Feed + Message Panel als Tabs

**Mobile**: Horizontale Tabs (Agents | Tasks | Activity | Messages)

### Neue Dateien
- `src/components/team/activity-feed.tsx`
- `src/components/team/progress-overview.tsx`
- `src/components/team/message-panel.tsx` (existiert, erweitern)
- `src/lib/claude/activity.ts` (Delta-Detection + Event-Generierung)
- `src/hooks/useTeamActivity.ts`

---

## Feature C: Notification & Alert System (Prioritaet 2)

### Ziel
Proaktive Benachrichtigungen bei wichtigen Ereignissen — sowohl im Dashboard als auch via Browser Push.

### Komponenten

#### Toast-System (In-App)
- Slide-in von oben-rechts, auto-dismiss nach 5s
- Typen: info (blau/cyan), warning (gelb), error (rot), success (gruen)
- Max 3 gleichzeitig, stackable, klickbar (fuehrt zur relevanten Seite)

#### Browser Push Notifications
- Service Worker (PWA-Infrastruktur existiert bereits)
- Permission-Request nur bei expliziter Nutzer-Aktion in Settings
- Push wenn Tab unfocused: Host offline, Agent-Fehler, Team fertig

#### Notification Center
- Glocken-Icon im Header mit Badge-Counter
- Dropdown-Panel mit chronologischer Liste (letzte 50, in-memory)
- "Alle gelesen" Button
- Klick auf Notification navigiert zur Quelle

#### Alert-Regeln (Server-Side)
Vordefinierte Trigger (v1, nicht konfigurierbar):
- Host offline > 60 Sekunden
- Alle Tasks eines Teams completed
- Agent-Statuswechsel (idle <-> active)

Evaluation im bestehenden Poller-Loop.

### Datenfluss

```
Poller
  ├── Host offline detected → notifications:alert {type: 'host_offline', ...}
  ├── All tasks completed → notifications:alert {type: 'team_complete', ...}
  └── Agent status changed → notifications:alert {type: 'agent_status', ...}

Client
  ├── socket.on('notifications:alert') → Toast + Notification Center
  ├── document.hidden? → Service Worker Push
  └── React Context fuer Notification State
```

### Neue Dateien
- `src/components/layout/toast.tsx`
- `src/components/layout/notification-center.tsx`
- `src/lib/notifications/alerts.ts` (Alert-Regel-Engine)
- `src/hooks/useNotifications.ts`
- `public/sw.js` (Service Worker fuer Push)

---

## Feature B: Split-View Terminal (Prioritaet 3)

### Ziel
Mehrere Terminals gleichzeitig sichtbar fuer paralleles Arbeiten.

### Layout-Presets
- **Single**: Standard (wie bisher)
- **Horizontal Split**: 2 Terminals nebeneinander
- **Vertical Split**: 2 Terminals uebereinander
- **Quad Grid**: 4 Terminals im 2x2 Grid

### Verhalten
- Toolbar-Button zum Wechseln des Layout-Presets
- Drag & Drop von Tabs in Grid-Slots
- Leere Slots zeigen Placeholder
- Resize-Handle zwischen Slots
- Max 4 gleichzeitig sichtbare Terminals

### Synchronisierte Eingabe (optional)
- "Broadcast Mode" Toggle in Toolbar
- Tastatureingabe an alle sichtbaren Terminals gleichzeitig
- Visueller Indikator (orangener Rahmen)

### Technische Umsetzung
- CSS Grid mit dynamischen `grid-template-columns/rows`
- Pro Slot eigener ResizeObserver + FitAddon
- Resize-Events individuell per SSH-Stream
- Layout-State in `preferences` JSONB-Feld (kein Schema-Migration)

### Neue Dateien
- `src/components/terminal/terminal-grid.tsx`
- `src/components/terminal/grid-slot.tsx`
- `src/components/terminal/layout-selector.tsx`
- `src/hooks/useTerminalLayout.ts`

---

## Implementierungs-Reihenfolge

| Phase | Feature | Geschaetzter Scope |
|-------|---------|-------------------|
| 1 | Agent Activity Center | Mittel (Poller-Erweiterung + 3 neue Komponenten) |
| 2 | Notification System | Mittel (Toast + Push + Alert-Engine) |
| 3 | Split-View Terminal | Hoch (Grid-Layout + Multi-Resize + Drag&Drop) |

Jede Phase wird als eigenes Minor-Release (0.5.0, 0.6.0, 0.7.0) versioniert.
