# File Browser Redesign — Design Document

**Datum:** 2026-03-04
**Status:** Genehmigt
**Scope:** Kompletter Neubau des File Browsers mit CodeMirror 6, Medienvorschau und vollstaendigen Datei-Operationen

---

## Zusammenfassung

Der bestehende File Browser (`/files`) wird komplett neu gebaut. Der aktuelle hat einen kritischen Bug (Dateien werden nicht gelistet, nur Ordner) und ist als monolithische 573-Zeilen-Page unwartbar.

**Neu:**
- CodeMirror 6 als Code-Editor mit Syntax-Highlighting
- Bild-/Medienvorschau (PNG, JPG, SVG, GIF, WebP)
- Vollstaendige Datei-Operationen (CRUD + Rename, Copy, Move, Mkdir)
- Dateiname- und Inhaltssuche (find + grep)
- Kontext-Menue (Rechtsklick)
- Keyboard Shortcuts
- Terminal-Integration ("Im Terminal oeffnen")
- Status-Bar mit Metadaten

---

## Backend-API

### Browse-Endpoint (Rewrite)

`GET /api/hosts/:id/browse?path=/home/user/project`

Liefert Dateien UND Verzeichnisse mit Metadaten. Implementierung via `ls -lA --time-style=iso`.

```typescript
interface BrowseResponse {
  path: string
  parent: string | null
  entries: {
    name: string
    isDir: boolean
    size: number | null    // null fuer Verzeichnisse
    modified: string       // ISO timestamp
    permissions: string    // z.B. "-rw-r--r--"
  }[]
}
```

### Files-Endpoint (Erweitert)

Bestehende CRUD-Operationen plus:

| Route | Methode | Body | Beschreibung |
|-------|---------|------|-------------|
| `/api/hosts/:id/files?path=...&mode=base64` | GET | — | Bild als Base64 |
| `/api/hosts/:id/files/rename` | POST | `{ oldPath, newPath }` | Umbenennen via `mv` |
| `/api/hosts/:id/files/copy` | POST | `{ source, destination }` | Kopieren via `cp -r` |
| `/api/hosts/:id/files/move` | POST | `{ source, destination }` | Verschieben via `mv` |
| `/api/hosts/:id/files/mkdir` | POST | `{ path }` | Ordner via `mkdir -p` |
| `/api/hosts/:id/files/search` | POST | `{ path, query, type }` | Suche via `find`/`grep -rl` |

### Sicherheit
- Bestehende BLOCKED-Liste beibehalten und erweitern
- Path-Traversal-Schutz (`..` normalisieren, Pfad muss absolut sein)
- Dateigroesse limitieren: max 1 MB fuer Anzeige, 5 MB fuer Download
- Alle Pfade via `JSON.stringify()` escapen (bestehender Ansatz)

---

## Frontend-Architektur

### Zustand Store

`src/lib/stores/file-browser.ts` — Zentraler State fuer den gesamten File Browser:

```typescript
interface FileBrowserState {
  // Host
  hostId: string
  setHostId: (id: string) => void

  // Navigation
  currentPath: string
  entries: FileEntry[]
  loading: boolean
  error: string | null
  browse: (path?: string) => Promise<void>
  navigateUp: () => void

  // Datei-Viewer
  activeFile: { path: string; content: string; isImage: boolean } | null
  fileLoading: boolean
  openFile: (path: string) => Promise<void>

  // Editor
  editing: boolean
  editContent: string
  startEditing: () => void
  saveFile: () => Promise<void>
  cancelEditing: () => void

  // Operationen
  createFile: (name: string, content?: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  deleteEntry: (path: string) => Promise<void>
  renameEntry: (oldPath: string, newName: string) => Promise<void>
  copyEntry: (source: string, destination: string) => Promise<void>
  moveEntry: (source: string, destination: string) => Promise<void>

  // Suche
  searchQuery: string
  searchResults: SearchResult[]
  searchType: 'filename' | 'content'
  search: (query: string, type: string) => Promise<void>

  // Selection / Clipboard
  selectedEntries: Set<string>
  clipboard: { paths: string[]; mode: 'copy' | 'cut' } | null
}
```

### Komponenten

| Datei | Verantwortung | ~Zeilen |
|-------|--------------|---------|
| `src/app/files/page.tsx` | Layout, Host-Auswahl, Toolbar | ~80 |
| `src/components/files/file-tree.tsx` | Verzeichnisbaum, Breadcrumbs, Navigation | ~150 |
| `src/components/files/file-viewer.tsx` | CodeMirror-Editor, Read-Only-Ansicht | ~120 |
| `src/components/files/file-toolbar.tsx` | Aktions-Buttons, Suche-Toggle | ~60 |
| `src/components/files/file-search.tsx` | Dateiname-Filter + grep-Ergebnisse | ~100 |
| `src/components/files/context-menu.tsx` | Rechtsklick-Menue | ~80 |
| `src/components/files/image-preview.tsx` | Bild-Anzeige | ~40 |
| `src/components/files/file-dialogs.tsx` | Alle Dialoge (Neu, Loeschen, Rename) | ~120 |
| `src/components/files/status-bar.tsx` | Dateigroesse, Permissions, Aenderungsdatum | ~30 |

### Layout

```
+--------------------------------------------------+
|  FILE BROWSER         Host: [Dropdown v]         |
|  File-Browser                                     |
+--------------------------------------------------+
|  [Refresh] [Ordner+] [Datei+] [Download] [Suche] |
+---------------+----------------------------------+
| Home > src >  |  src/components/Button.tsx        |
| components    |  -------------------------------- |
|               |  import React from 'react';      |
|  Ordner ui/   |  import { cn } from '@/lib/utils' |
|  Ordner lay/  |                                   |
|  Button.tsx   |  export function Button({...}) {  |
|  Dialog.tsx < |    return (                       |
|  Input.tsx    |      <button>                     |
|  Badge.tsx    |        {children}                 |
|               |      </button>                    |
|  [Rechtsklick |    );                             |
|   -> Menue]   |  }                                |
+---------------+----------------------------------+
|  1.2 KB | -rw-r--r-- | vor 2 Std | TypeScript    |
+--------------------------------------------------+
```

---

## CodeMirror 6 Integration

### Dependency
`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-*`, `@codemirror/theme-one-dark` (oder Custom Theme)

### Sprach-Erkennung nach Extension

| Extensions | Sprache |
|-----------|---------|
| `.ts`, `.tsx` | TypeScript |
| `.js`, `.jsx` | JavaScript |
| `.json` | JSON |
| `.css` | CSS |
| `.html` | HTML |
| `.md` | Markdown |
| `.py` | Python |
| `.sh`, `.bash` | Shell |
| `.yaml`, `.yml` | YAML |
| `.sql` | SQL |
| Sonstige | Plain Text |

### Editor-Features
- Read-Only als Default, "Bearbeiten" schaltet auf editierbar
- Dark Theme passend zum Dashboard (Custom Theme mit CSS-Variablen)
- Zeilennummern immer sichtbar
- Editor-interne Suche (Ctrl+F) via CodeMirror built-in
- Bracket Matching und Auto-Indent
- Keine AutoComplete/IntelliSense

### Medien-Vorschau
- Bilder (PNG, JPG, GIF, SVG, WebP): Base64-API, `<img>` Render, zentriert
- SVG: Toggle zwischen Bild-Anzeige und Code-Ansicht
- Binaerdateien: "Binaerdatei — X KB" + Download-Button

---

## UX-Details

### Kontext-Menue (Rechtsklick)

Auf Dateien:
- Oeffnen
- Im Terminal oeffnen (Ordner des Files)
- ---
- Umbenennen (F2)
- Kopieren / Ausschneiden / Einfuegen
- Download
- ---
- Loeschen

Auf Ordner:
- Oeffnen
- Im Terminal oeffnen
- ---
- Umbenennen (F2)
- Kopieren / Ausschneiden / Einfuegen
- ---
- Loeschen

### Keyboard Shortcuts
- `Ctrl+S` — Speichern (im Editor-Modus)
- `Ctrl+Shift+N` — Neue Datei
- `Ctrl+Shift+F` — Suche oeffnen
- `Escape` — Editor verlassen / Dialog schliessen
- `Delete` — Loeschen (mit Bestaetigung)
- `F2` — Umbenennen

### Terminal-Integration
"Im Terminal oeffnen" Button/Menue-Eintrag bei Ordnern:
1. Prueft ob tmux-Session auf dem Host existiert
2. Wenn ja: Oeffnet `/terminal` mit `cd <path>` Command
3. Wenn nein: Erstellt neue tmux-Session im Verzeichnis

### Status-Bar
Zeigt fuer die geoeffnete Datei:
- Dateigroesse (human-readable: 1.2 KB)
- Berechtigungen (-rw-r--r--)
- Letzte Aenderung (relative Zeit: "vor 2 Stunden")
- Erkannte Sprache (TypeScript, JSON, etc.)

---

## Bestehende Komponenten (Wiederverwendung)

- `Button` (primary, ghost, danger, outline)
- `Dialog` (Modal mit Backdrop)
- `Input` (mit Label und Error)
- `Spinner` (sm, md, lg)
- `Badge` (Status-Badges)

Design-Sprache: Dark Theme, CSS-Variablen (`--cyan`, `--amber`, `--bg-surface`, etc.), Lucide Icons, `animate-fade-in` + Stagger.

---

## Abgrenzung (NICHT im Scope)

- Kein Drag-and-Drop Upload (zu komplex fuer SSH-Transfer)
- Kein Multi-File-Tab-System (eine Datei gleichzeitig reicht)
- Kein Git-Integration im File Browser (separates Feature)
- Keine Datei-Diff-Ansicht
- Keine Terminal-Emulation im File Browser
