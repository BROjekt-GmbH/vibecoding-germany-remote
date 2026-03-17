# Floating Workspace UX Redesign

**Datum:** 2026-03-05
**Status:** Genehmigt
**Ziel:** Intuitivere Bedienung durch Floating Panels, Command Palette und kontextuelle Aktionen — ohne Seitenwechsel.

---

## 1. Architektur-Uebersicht

Die App behaelt alle bestehenden Seiten bei (Dashboard, Hosts, Terminal, Teams, Files, Logs, Settings). Zusaetzlich kommen drei neue UX-Layer:

1. **Command Palette** (Ctrl+K) — Power-User Schnellzugriff auf alles
2. **Quick-Action-Bar** (Header) — Toggle-Buttons fuer Floating Panels
3. **Floating Panels** — Draggable/resizable Fenster ueber jeder Seite

---

## 2. Command Palette (Ctrl+K)

**Ausloeser:** `Ctrl+K` / `Cmd+K` oder Suchfeld-Icon im Header

**Kategorien:**
- **Zuletzt verwendet** — letzte 5 Aktionen (Panels, Dateien, Sessions)
- **Navigation** — alle Seiten (Dashboard, Hosts, Terminal, Teams, Files, Logs, Settings)
- **Panels** — Floating Panels oeffnen/schliessen
- **Aktionen** — Session starten, Host wechseln, Datei erstellen, Layout aendern
- **Suche** — Fuzzy-Search ueber Dateien, Hosts, Sessions, Teams

**Verhalten:**
- Tippen filtert sofort (Fuzzy-Match)
- `Enter` fuehrt aus, `ESC` schliesst
- Tastaturnavigation mit Pfeiltasten
- Kategorien werden beim Tippen gefiltert

---

## 3. Quick-Action-Bar (Header)

Integration in den bestehenden Header:

```
MERIDIAN  [Files][Logs][Teams][Term][+v]  [Ctrl+K]  Notifications  User
```

- **4 primaere Toggle-Buttons:** Files, Logs, Teams, Terminal-Mini
- **[+]-Button:** Dropdown mit weiteren Panels (Projects, Host-Status, History)
- Aktiver Zustand: Button leuchtet cyan
- Badges zeigen Zaehler (z.B. "3 Tasks", "2 Errors")

---

## 4. Floating Panels

### 4.1 Panel-Features

- **Titelleiste:** Panel-Name + Minimize/Maximize/Close Buttons
- **Draggable:** Am Titelbalken ziehen
- **Resizable:** An Ecken/Kanten ziehen
- **Minimize:** Klappt zu Tab am unteren Bildschirmrand
- **Maximize:** Fuellt den Hauptbereich
- **Mehrere gleichzeitig:** Bis zu 4 Panels
- **Z-Order:** Klick bringt Panel nach vorne
- **Persistenz:** Position + Groesse in User-Preferences gespeichert

### 4.2 Verfuegbare Panels (7 Stueck)

| Panel | Quick-Bar | Inhalt |
|-------|-----------|--------|
| Files | Ja | File-Tree + Mini-Editor, Host-Auswahl |
| Logs | Ja | Log-Tail, Echtzeit-Stream, Filter |
| Teams | Ja | Team-Liste, Tasks, Agent-Status |
| Terminal-Mini | Ja | Einzelnes Terminal fuer schnelle Befehle |
| Projects | via [+] | Projekt-Uebersicht, Status, Sessions |
| Host-Status | via [+] | Live Host-Monitor, Verbindungen |
| History | via [+] | Aktivitaets-Timeline ueber alles |

---

## 5. Kontextuelle Aktionen pro Seite

### Terminal-Seite
- **Rechtsklick im Terminal** -> Kontextmenue: Files hier oeffnen (CWD), Logs fuer Host, Team-Status, PWD im File-Panel
- **Floating Action Button** (unten rechts) fuer Touch/Mobile

### Files-Seite
- **Rechtsklick** erweitert um: "Im Terminal oeffnen", "Logs fuer Datei", "Git History"
- **Toolbar** ergaenzt: "Quick Terminal" Button

### Teams-Seite
- **Klick auf Agent** -> "Terminal des Agents", "Logs anzeigen", "Tasks filtern"
- **Klick auf Task** -> "Zugehoerige Dateien", "Agent-Logs"

### Dashboard
- **Host-Karten Hover** -> "Terminal oeffnen", "Files browsen", "Logs anzeigen"
- Alles oeffnet Floating Panels (kein Seitenwechsel)

### Logs-Seite
- **Klick auf Log-Eintrag** -> "Datei oeffnen", "Im Terminal nachschauen"

---

## 6. Mobile-Anpassung (< 768px)

- **Floating Panels werden zu Bottom-Sheets** (von unten hochschiebend)
- **Drag-Handle** zum Hoehe anpassen (halb/voll)
- **Nur 1 Panel gleichzeitig** (statt bis zu 4 auf Desktop)
- **Swipe-Down** schliesst Panel
- **Quick-Action-Bar** zeigt max. 3 Icons + "Mehr"-Button
- **Long-Press** im Terminal -> Kontextmenue (statt Rechtsklick)
- **Command Palette** als Vollbild-Overlay

---

## 7. Technische Umsetzung

### Kernkomponenten

| Komponente | Zweck | Bibliothek |
|------------|-------|------------|
| `FloatingPanel` | Draggable + resizable Container | `react-rnd` oder custom |
| `CommandPalette` | Ctrl+K Suchmenue | `cmdk` |
| `QuickActionBar` | Header-Toolbar mit Panel-Toggles | Custom (Zustand) |
| `BottomSheet` | Mobile Panel-Ansicht | Custom (touch events) |
| `PanelManager` | State Management fuer Panels | Zustand Store |
| `ContextMenu` | Rechtsklick-Menue (erweitert) | Bestehendes erweitern |

### State Management (Zustand)

```typescript
interface PanelState {
  id: string;
  open: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

interface PanelManager {
  panels: Map<string, PanelState>;
  openPanel(id: string): void;
  closePanel(id: string): void;
  togglePanel(id: string): void;
  movePanel(id: string, pos: Position): void;
  resizePanel(id: string, size: Size): void;
  bringToFront(id: string): void;
  minimize(id: string): void;
  maximize(id: string): void;
}
```

### Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Ctrl+K` | Command Palette oeffnen |
| `Ctrl+B` | Sidebar toggle |
| `Ctrl+1..7` | Panel 1-7 togglen |
| `Escape` | Aktives Panel/Palette schliessen |
| `Ctrl+Shift+M` | Alle Panels minimieren |

### Persistenz

Panel-Positionen und -Groessen werden in der bestehenden `preferences`-Tabelle als JSON gespeichert.

---

## 8. Implementierungsreihenfolge

1. PanelManager (Zustand Store) + FloatingPanel Basis-Komponente
2. Command Palette (cmdk Integration)
3. Quick-Action-Bar (Header-Integration)
4. Panel-Inhalte (Files, Logs, Teams, Terminal-Mini)
5. Erweiterte Panels (Projects, Host-Status, History)
6. Kontextuelle Aktionen pro Seite (Rechtsklick-Menues)
7. Mobile Bottom-Sheets
8. Keyboard Shortcuts
9. Persistenz (Preferences)
