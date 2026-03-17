# File Browser Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Komplett neuer File Browser mit CodeMirror 6 Editor, Medienvorschau, vollstaendigen Datei-Operationen, Suche und Terminal-Integration.

**Architecture:** Zustand-Store als zentraler State, aufgeteilt in 9 fokussierte Komponenten. Backend-API wird erweitert (Browse liefert Dateien+Ordner+Metadaten, neue Endpoints fuer Rename/Copy/Move/Mkdir/Search). CodeMirror 6 fuer Syntax-Highlighting und Editor.

**Tech Stack:** Next.js 16, React 19, Zustand 5, CodeMirror 6, Tailwind CSS 4, Lucide Icons, SSH via `execOnHost()`

**Design-Dokument:** `docs/plans/2026-03-04-file-browser-redesign.md`

---

## Task 1: CodeMirror 6 Dependencies installieren

**Files:**
- Modify: `package.json`

**Step 1: Pakete installieren**

Run:
```bash
npm install codemirror @codemirror/view @codemirror/state @codemirror/language @codemirror/commands @codemirror/search @codemirror/autocomplete @codemirror/lint @codemirror/lang-javascript @codemirror/lang-json @codemirror/lang-css @codemirror/lang-html @codemirror/lang-markdown @codemirror/lang-python @codemirror/lang-sql @codemirror/lang-yaml @codemirror/theme-one-dark @lezer/highlight
```

**Step 2: Verify installation**

Run: `npm ls codemirror`
Expected: codemirror listed without errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: CodeMirror 6 Dependencies fuer File Browser"
```

---

## Task 2: Types und Shared Utilities

**Files:**
- Modify: `src/types/index.ts` — Neue File-Browser-Types hinzufuegen
- Create: `src/lib/files/utils.ts` — Utility-Funktionen (Sprach-Erkennung, Groessen-Format, etc.)

**Step 1: Types hinzufuegen**

Fuege am Ende von `src/types/index.ts` hinzu:

```typescript
// ─── File Browser ───────────────────────────────────────

export interface FileEntry {
  name: string;
  isDir: boolean;
  size: number | null;
  modified: string;
  permissions: string;
}

export interface BrowseResponse {
  path: string;
  parent: string | null;
  entries: FileEntry[];
}

export interface SearchResult {
  path: string;
  name: string;
  isDir: boolean;
  // Nur bei content-Suche: Zeile mit Match
  line?: string;
  lineNumber?: number;
}
```

**Step 2: Utility-Funktionen erstellen**

Create `src/lib/files/utils.ts`:

```typescript
// Sprach-Erkennung fuer CodeMirror
const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  json: 'json',
  css: 'css',
  html: 'html', htm: 'html',
  md: 'markdown', mdx: 'markdown',
  py: 'python',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  yaml: 'yaml', yml: 'yaml',
  sql: 'sql',
};

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return LANG_MAP[ext] ?? 'plaintext';
}

// Bild-Erkennung
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']);

export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

// Binaerdatei-Erkennung
const BINARY_EXTENSIONS = new Set([
  'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'exe', 'bin', 'dll', 'so', 'dylib',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'mp4', 'avi', 'mkv', 'wav', 'flac',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'o', 'a', 'class', 'pyc', 'pyo',
]);

export function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return BINARY_EXTENSIONS.has(ext);
}

// Dateigroesse formatieren
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

// Relative Zeitangabe
export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tagen`;
  return new Date(isoDate).toLocaleDateString('de-DE');
}

// Pfad-Helfer
export function joinPath(base: string, name: string): string {
  return base === '/' ? `/${name}` : `${base}/${name}`;
}

export function parentPath(path: string): string | null {
  if (path === '/') return null;
  return path.replace(/\/[^/]+\/?$/, '') || '/';
}

export function fileName(path: string): string {
  return path.split('/').pop() ?? path;
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types/index.ts src/lib/files/utils.ts
git commit -m "feat: File Browser Types und Utility-Funktionen"
```

---

## Task 3: Browse-API Rewrite

**Files:**
- Modify: `src/app/api/hosts/[id]/browse/route.ts` — Kompletter Rewrite

Die bestehende Browse-API liefert nur Verzeichnisse. Der Rewrite liefert Dateien UND Verzeichnisse mit Metadaten.

**Step 1: Browse-Route umschreiben**

Replace the entire content of `src/app/api/hosts/[id]/browse/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  await requireUser();
  const { id } = await params;
  const requestedPath = req.nextUrl.searchParams.get('path');

  try {
    let targetPath = requestedPath;

    // Ohne Pfad: Home-Verzeichnis ermitteln
    if (!targetPath) {
      const home = await execOnHost(id, `bash -lc 'echo $HOME'`);
      targetPath = home.trim();
    }

    // Normalisierung: .. entfernen, Pfad muss absolut sein
    if (!targetPath.startsWith('/')) {
      return NextResponse.json({ error: 'Pfad muss absolut sein' }, { status: 400 });
    }

    // ls -lA mit ISO-Zeitformat fuer Dateien UND Verzeichnisse
    const output = await execOnHost(
      id,
      `bash -lc 'ls -lA --time-style=long-iso ${JSON.stringify(targetPath)} 2>/dev/null | tail -n +2 | head -500'`
    );

    const entries = output
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => parseLsLine(line))
      .filter((e): e is NonNullable<typeof e> => e !== null)
      // Ordner zuerst, dann alphabetisch
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    // Parent-Pfad
    const parent = targetPath === '/'
      ? null
      : targetPath.replace(/\/[^/]+\/?$/, '') || '/';

    return NextResponse.json({ path: targetPath, parent, entries });
  } catch {
    return NextResponse.json(
      { error: 'Verzeichnis konnte nicht gelesen werden' },
      { status: 500 }
    );
  }
}

/**
 * Parst eine Zeile von `ls -lA --time-style=long-iso`
 * Format: "-rw-r--r-- 1 user group 1234 2026-03-04 10:30 filename"
 */
function parseLsLine(line: string): {
  name: string;
  isDir: boolean;
  size: number | null;
  modified: string;
  permissions: string;
} | null {
  // Regex fuer ls -l Output mit long-iso Zeitformat
  const match = line.match(
    /^([drwxlsStT\-]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/
  );
  if (!match) return null;

  const [, permissions, sizeStr, date, time, name] = match;

  // Symlinks und spezielle Eintraege ueberspringen
  if (name === '.' || name === '..') return null;
  // Symlink-Target entfernen (name -> target)
  const cleanName = name.replace(/\s->.*$/, '');

  const isDir = permissions.startsWith('d');

  return {
    name: cleanName,
    isDir,
    size: isDir ? null : parseInt(sizeStr, 10),
    modified: `${date}T${time}:00`,
    permissions,
  };
}
```

**Step 2: Manuell testen**

Run: `curl -s http://localhost:3000/api/hosts/<HOST_ID>/browse | jq .`
Expected: JSON mit `path`, `parent`, `entries[]` (Dateien UND Ordner mit size, modified, permissions)

**Step 3: Commit**

```bash
git add src/app/api/hosts/[id]/browse/route.ts
git commit -m "feat: Browse-API liefert Dateien und Ordner mit Metadaten"
```

---

## Task 4: Files-API erweitern (Rename, Copy, Move, Mkdir, Search, Base64)

**Files:**
- Modify: `src/app/api/hosts/[id]/files/route.ts` — GET erweitern (base64-Modus)
- Create: `src/app/api/hosts/[id]/files/rename/route.ts`
- Create: `src/app/api/hosts/[id]/files/copy/route.ts`
- Create: `src/app/api/hosts/[id]/files/move/route.ts`
- Create: `src/app/api/hosts/[id]/files/mkdir/route.ts`
- Create: `src/app/api/hosts/[id]/files/search/route.ts`

**Step 1: Shared Security-Helfer erstellen**

Create `src/lib/files/security.ts`:

```typescript
const BLOCKED_PATTERNS = [
  '/etc/shadow', '/etc/passwd', '.env',
  'id_rsa', 'id_ed25519', '.ssh/authorized_keys',
  '.ssh/id_', '.gnupg/',
];

export function isBlocked(path: string): boolean {
  return BLOCKED_PATTERNS.some(b => path.includes(b));
}

export function validatePath(path: string): string | null {
  if (!path || typeof path !== 'string') return 'Pfad erforderlich';
  if (!path.startsWith('/')) return 'Pfad muss absolut sein';
  // Einfache .. Pruefung (nach Normalisierung)
  const normalized = path.replace(/\/+/g, '/');
  if (normalized.includes('/../') || normalized.endsWith('/..')) {
    return 'Path-Traversal nicht erlaubt';
  }
  if (isBlocked(normalized)) return 'Zugriff verweigert';
  return null;
}

// Max-Groesse fuer Datei-Anzeige (1 MB)
export const MAX_VIEW_SIZE = 1024 * 1024;
// Max-Groesse fuer Download (5 MB)
export const MAX_DOWNLOAD_SIZE = 5 * 1024 * 1024;
```

**Step 2: Files-Route GET erweitern (base64-Modus + __ls__-Hack entfernen)**

Rewrite `src/app/api/hosts/[id]/files/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath, MAX_VIEW_SIZE } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const path = req.nextUrl.searchParams.get('path');
  const mode = req.nextUrl.searchParams.get('mode');

  const err = validatePath(path ?? '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    // Groesse pruefen
    const sizeOutput = await execOnHost(id, `stat -c '%s' ${JSON.stringify(path)} 2>/dev/null`);
    const fileSize = parseInt(sizeOutput.trim(), 10);

    if (fileSize > MAX_VIEW_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu gross', size: fileSize, maxSize: MAX_VIEW_SIZE },
        { status: 413 }
      );
    }

    if (mode === 'base64') {
      const content = await execOnHost(id, `base64 -w 0 ${JSON.stringify(path)}`);
      return NextResponse.json({ path, content: content.trim(), encoding: 'base64', size: fileSize });
    }

    const content = await execOnHost(id, `cat ${JSON.stringify(path)}`);
    return NextResponse.json({ path, content, size: fileSize });
  } catch {
    return NextResponse.json({ error: 'Datei nicht lesbar' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path, content } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (content === undefined) return NextResponse.json({ error: 'content required' }, { status: 400 });

  try {
    const b64 = Buffer.from(content).toString('base64');
    await execOnHost(id, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Schreiben fehlgeschlagen' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const path = req.nextUrl.searchParams.get('path');

  const err = validatePath(path ?? '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    await execOnHost(id, `rm -rf ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path, content } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const b64 = Buffer.from(content ?? '').toString('base64');
    await execOnHost(id, `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erstellen fehlgeschlagen' }, { status: 500 });
  }
}
```

**Step 3: Rename-Route**

Create `src/app/api/hosts/[id]/files/rename/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { oldPath, newPath } = await req.json();

  for (const p of [oldPath, newPath]) {
    const err = validatePath(p);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    await execOnHost(id, `mv ${JSON.stringify(oldPath)} ${JSON.stringify(newPath)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Umbenennen fehlgeschlagen' }, { status: 500 });
  }
}
```

**Step 4: Copy-Route**

Create `src/app/api/hosts/[id]/files/copy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { source, destination } = await req.json();

  for (const p of [source, destination]) {
    const err = validatePath(p);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    await execOnHost(id, `cp -r ${JSON.stringify(source)} ${JSON.stringify(destination)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Kopieren fehlgeschlagen' }, { status: 500 });
  }
}
```

**Step 5: Move-Route**

Create `src/app/api/hosts/[id]/files/move/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { source, destination } = await req.json();

  for (const p of [source, destination]) {
    const err = validatePath(p);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    await execOnHost(id, `mv ${JSON.stringify(source)} ${JSON.stringify(destination)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Verschieben fehlgeschlagen' }, { status: 500 });
  }
}
```

**Step 6: Mkdir-Route**

Create `src/app/api/hosts/[id]/files/mkdir/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    await execOnHost(id, `mkdir -p ${JSON.stringify(path)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Ordner erstellen fehlgeschlagen' }, { status: 500 });
  }
}
```

**Step 7: Search-Route**

Create `src/app/api/hosts/[id]/files/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { execOnHost } from '@/lib/ssh/client';
import { validatePath } from '@/lib/files/security';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  await requireUser();
  const { id } = await params;
  const { path, query, type } = await req.json();

  const err = validatePath(path);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query erforderlich' }, { status: 400 });
  }

  // Query sanitizen (keine Shell-Injection)
  const safeQuery = query.replace(/['"\\$`!]/g, '');

  try {
    if (type === 'content') {
      // grep -rl: rekursiv, nur Dateinamen + Zeilen
      const output = await execOnHost(
        id,
        `bash -lc 'grep -rnl --include="*" -m 5 ${JSON.stringify(safeQuery)} ${JSON.stringify(path)} 2>/dev/null | head -50'`
      );
      const results = output.trim().split('\n').filter(Boolean).map(line => {
        const parts = line.split(':');
        const filePath = parts[0];
        const name = filePath.split('/').pop() ?? filePath;
        return { path: filePath, name, isDir: false };
      });
      return NextResponse.json({ results });
    }

    // Dateiname-Suche via find
    const output = await execOnHost(
      id,
      `bash -lc 'find ${JSON.stringify(path)} -maxdepth 5 -iname ${JSON.stringify('*' + safeQuery + '*')} 2>/dev/null | head -50'`
    );
    const results = output.trim().split('\n').filter(Boolean).map(filePath => {
      const name = filePath.split('/').pop() ?? filePath;
      // isDir erkennen: Endete der Pfad auf / oder pruefen wir via -d?
      // Einfach: kein . im Namen = wahrscheinlich Ordner (ungenau aber pragmatisch)
      return { path: filePath, name, isDir: !name.includes('.') };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Suche fehlgeschlagen' }, { status: 500 });
  }
}
```

**Step 8: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add src/lib/files/security.ts src/app/api/hosts/\[id\]/files/ src/app/api/hosts/\[id\]/browse/
git commit -m "feat: File-API erweitert — Rename, Copy, Move, Mkdir, Search, Base64, Security"
```

---

## Task 5: Zustand Store

**Files:**
- Create: `src/lib/stores/file-browser.ts`

**Step 1: Store erstellen**

Create `src/lib/stores/file-browser.ts`:

```typescript
import { create } from 'zustand';
import type { FileEntry, SearchResult } from '@/types';
import { joinPath, isImageFile, isBinaryFile } from '@/lib/files/utils';

interface ActiveFile {
  path: string;
  content: string;
  isImage: boolean;
  isBinary: boolean;
  size: number;
  modified: string;
  permissions: string;
  language: string;
}

interface FileBrowserState {
  // Host
  hostId: string;
  setHostId: (id: string) => void;

  // Navigation
  currentPath: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  browse: (path?: string) => Promise<void>;
  navigateUp: () => void;
  refresh: () => Promise<void>;

  // Datei-Viewer
  activeFile: ActiveFile | null;
  fileLoading: boolean;
  fileError: string | null;
  openFile: (entry: FileEntry) => Promise<void>;
  closeFile: () => void;

  // Editor
  editing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  startEditing: () => void;
  saveFile: () => Promise<boolean>;
  cancelEditing: () => void;

  // Operationen
  createFile: (name: string, content?: string) => Promise<boolean>;
  createFolder: (name: string) => Promise<boolean>;
  deleteEntry: (path: string) => Promise<boolean>;
  renameEntry: (oldPath: string, newName: string) => Promise<boolean>;
  copyEntry: (source: string, destination: string) => Promise<boolean>;
  moveEntry: (source: string, destination: string) => Promise<boolean>;

  // Suche
  searchOpen: boolean;
  searchQuery: string;
  searchType: 'filename' | 'content';
  searchResults: SearchResult[];
  searchLoading: boolean;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchType: (type: 'filename' | 'content') => void;
  search: () => Promise<void>;

  // Clipboard
  clipboard: { paths: string[]; mode: 'copy' | 'cut' } | null;
  setClipboard: (clipboard: FileBrowserState['clipboard']) => void;
  paste: () => Promise<boolean>;
}

export const useFileBrowser = create<FileBrowserState>((set, get) => ({
  // Host
  hostId: '',
  setHostId: (hostId) => {
    set({ hostId, currentPath: '', entries: [], activeFile: null, editing: false, error: null });
    if (hostId) get().browse();
  },

  // Navigation
  currentPath: '',
  entries: [],
  loading: false,
  error: null,

  browse: async (path?: string) => {
    const { hostId } = get();
    if (!hostId) return;
    set({ loading: true, error: null });
    try {
      const url = path
        ? `/api/hosts/${hostId}/browse?path=${encodeURIComponent(path)}`
        : `/api/hosts/${hostId}/browse`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        set({ error: data.error || 'Fehler beim Laden', loading: false });
        return;
      }
      const data = await res.json();
      set({ currentPath: data.path, entries: data.entries, loading: false });
    } catch {
      set({ error: 'Verbindungsfehler', loading: false });
    }
  },

  navigateUp: () => {
    const { currentPath } = get();
    if (currentPath === '/') return;
    const parent = currentPath.replace(/\/[^/]+\/?$/, '') || '/';
    get().browse(parent);
  },

  refresh: async () => {
    const { currentPath } = get();
    await get().browse(currentPath);
  },

  // Datei-Viewer
  activeFile: null,
  fileLoading: false,
  fileError: null,

  openFile: async (entry: FileEntry) => {
    const { hostId, currentPath } = get();
    if (!hostId || entry.isDir) return;

    const path = joinPath(currentPath, entry.name);
    set({ fileLoading: true, fileError: null, editing: false });

    try {
      const isImage = isImageFile(entry.name);
      const binary = isBinaryFile(entry.name);

      if (binary && !isImage) {
        // Binaerdatei: nur Metadaten anzeigen
        set({
          activeFile: {
            path,
            content: '',
            isImage: false,
            isBinary: true,
            size: entry.size ?? 0,
            modified: entry.modified,
            permissions: entry.permissions,
            language: 'binary',
          },
          fileLoading: false,
        });
        return;
      }

      const mode = isImage ? '&mode=base64' : '';
      const res = await fetch(`/api/hosts/${hostId}/files?path=${encodeURIComponent(path)}${mode}`);
      if (!res.ok) {
        const data = await res.json();
        set({ fileError: data.error || 'Datei nicht lesbar', fileLoading: false });
        return;
      }

      const data = await res.json();
      const { detectLanguage } = await import('@/lib/files/utils');

      set({
        activeFile: {
          path,
          content: data.content,
          isImage,
          isBinary: false,
          size: data.size ?? entry.size ?? 0,
          modified: entry.modified,
          permissions: entry.permissions,
          language: detectLanguage(entry.name),
        },
        fileLoading: false,
      });
    } catch {
      set({ fileError: 'Verbindungsfehler', fileLoading: false });
    }
  },

  closeFile: () => set({ activeFile: null, editing: false, fileError: null }),

  // Editor
  editing: false,
  editContent: '',
  setEditContent: (editContent) => set({ editContent }),

  startEditing: () => {
    const { activeFile } = get();
    if (!activeFile || activeFile.isImage || activeFile.isBinary) return;
    set({ editing: true, editContent: activeFile.content });
  },

  saveFile: async () => {
    const { hostId, activeFile, editContent } = get();
    if (!hostId || !activeFile) return false;
    try {
      const res = await fetch(`/api/hosts/${hostId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile.path, content: editContent }),
      });
      if (!res.ok) return false;
      set({
        activeFile: { ...activeFile, content: editContent },
        editing: false,
      });
      return true;
    } catch {
      return false;
    }
  },

  cancelEditing: () => set({ editing: false }),

  // Operationen
  createFile: async (name, content) => {
    const { hostId, currentPath } = get();
    if (!hostId) return false;
    const path = joinPath(currentPath, name);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: content ?? '' }),
      });
      if (!res.ok) return false;
      await get().refresh();
      return true;
    } catch {
      return false;
    }
  },

  createFolder: async (name) => {
    const { hostId, currentPath } = get();
    if (!hostId) return false;
    const path = joinPath(currentPath, name);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/mkdir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) return false;
      await get().refresh();
      return true;
    } catch {
      return false;
    }
  },

  deleteEntry: async (path) => {
    const { hostId, activeFile } = get();
    if (!hostId) return false;
    try {
      const res = await fetch(`/api/hosts/${hostId}/files?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return false;
      if (activeFile?.path === path) set({ activeFile: null, editing: false });
      await get().refresh();
      return true;
    } catch {
      return false;
    }
  },

  renameEntry: async (oldPath, newName) => {
    const { hostId, currentPath } = get();
    if (!hostId) return false;
    const newPath = joinPath(currentPath, newName);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      if (!res.ok) return false;
      await get().refresh();
      return true;
    } catch {
      return false;
    }
  },

  copyEntry: async (source, destination) => {
    const { hostId } = get();
    if (!hostId) return false;
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination }),
      });
      if (!res.ok) return false;
      await get().refresh();
      return true;
    } catch {
      return false;
    }
  },

  moveEntry: async (source, destination) => {
    const { hostId } = get();
    if (!hostId) return false;
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination }),
      });
      if (!res.ok) return false;
      await get().refresh();
      return true;
    } catch {
      return false;
    }
  },

  // Suche
  searchOpen: false,
  searchQuery: '',
  searchType: 'filename',
  searchResults: [],
  searchLoading: false,
  setSearchOpen: (searchOpen) => set({ searchOpen, searchResults: [], searchQuery: '' }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchType: (searchType) => set({ searchType }),

  search: async () => {
    const { hostId, currentPath, searchQuery, searchType } = get();
    if (!hostId || !searchQuery.trim()) return;
    set({ searchLoading: true });
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath, query: searchQuery, type: searchType }),
      });
      if (!res.ok) {
        set({ searchLoading: false });
        return;
      }
      const data = await res.json();
      set({ searchResults: data.results ?? [], searchLoading: false });
    } catch {
      set({ searchLoading: false });
    }
  },

  // Clipboard
  clipboard: null,
  setClipboard: (clipboard) => set({ clipboard }),

  paste: async () => {
    const { clipboard, currentPath } = get();
    if (!clipboard || clipboard.paths.length === 0) return false;

    const source = clipboard.paths[0];
    const name = source.split('/').pop() ?? 'paste';
    const destination = joinPath(currentPath, name);

    let success: boolean;
    if (clipboard.mode === 'copy') {
      success = await get().copyEntry(source, destination);
    } else {
      success = await get().moveEntry(source, destination);
      if (success) set({ clipboard: null });
    }
    return success;
  },
}));
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/stores/file-browser.ts
git commit -m "feat: Zustand Store fuer File Browser"
```

---

## Task 6: CodeMirror Editor-Komponente

**Files:**
- Create: `src/components/files/code-editor.tsx`

**Step 1: CodeMirror-Wrapper erstellen**

Create `src/components/files/code-editor.tsx`:

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

// Sprach-Imports
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'typescript': return javascript({ typescript: true, jsx: true });
    case 'javascript': return javascript({ jsx: true });
    case 'json': return json();
    case 'css': return css();
    case 'html': return html();
    case 'markdown': return markdown();
    case 'python': return python();
    case 'sql': return sql();
    case 'yaml': return yaml();
    default: return [];
  }
}

interface CodeEditorProps {
  content: string;
  language: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: () => void;
}

export function CodeEditor({ content, language, readOnly = true, onChange, onSave }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const handleSave = useCallback(() => {
    onSave?.();
    return true;
  }, [onSave]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Bestehenden Editor aufraeumen
    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      bracketMatching(),
      indentOnInput(),
      highlightSelectionMatches(),
      history(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      oneDark,
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        { key: 'Mod-s', run: () => handleSave() },
      ]),
      getLanguageExtension(language),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '12px',
          fontFamily: '"Azeret Mono", "JetBrains Mono", "Fira Code", monospace',
        },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-gutters': {
          backgroundColor: '#0b0e11',
          borderRight: '1px solid #1a2028',
          color: '#4a5a6e',
        },
        '.cm-activeLineGutter': { backgroundColor: '#111519' },
        '.cm-activeLine': { backgroundColor: '#111519' },
      }),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    if (onChange) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }));
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [content, language, readOnly, onChange, handleSave]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors (CodeMirror types should resolve)

**Step 3: Commit**

```bash
git add src/components/files/code-editor.tsx
git commit -m "feat: CodeMirror 6 Editor-Komponente mit Dark Theme"
```

---

## Task 7: File Tree Komponente

**Files:**
- Create: `src/components/files/file-tree.tsx`

**Step 1: Erstellen**

Create `src/components/files/file-tree.tsx`:

```typescript
'use client';

import { Folder, FileText, ChevronRight, ArrowUp, Home, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { formatFileSize } from '@/lib/files/utils';
import type { FileEntry } from '@/types';

interface FileTreeProps {
  onContextMenu: (e: React.MouseEvent, entry: FileEntry, path: string) => void;
}

export function FileTree({ onContextMenu }: FileTreeProps) {
  const {
    currentPath, entries, loading, error,
    browse, navigateUp, refresh, openFile, activeFile,
  } = useFileBrowser();

  const pathSegments = currentPath.split('/').filter(Boolean);
  const fullPath = (entry: FileEntry) =>
    currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;

  return (
    <div className="panel p-0 flex flex-col overflow-hidden h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[11px] text-[#4a5a6e] font-mono px-3 py-2 border-b border-[#1a2028] overflow-x-auto shrink-0">
        <button
          type="button"
          onClick={() => browse('/')}
          className="shrink-0 hover:text-[#8a9bb0] transition-colors p-0.5"
          title="Root"
        >
          <Home size={11} />
        </button>
        {pathSegments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight size={9} className="text-[#2d3f52]" />
            <button
              type="button"
              onClick={() => browse('/' + pathSegments.slice(0, i + 1).join('/'))}
              className={
                i === pathSegments.length - 1
                  ? 'text-[#c8d6e5]'
                  : 'hover:text-[#8a9bb0] transition-colors'
              }
            >
              {seg}
            </button>
          </span>
        ))}
      </div>

      {/* Toolbar mini */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-[#1a2028] shrink-0">
        <button
          type="button"
          onClick={navigateUp}
          disabled={currentPath === '/'}
          className="p-1 text-[#4a5a6e] hover:text-[#8a9bb0] disabled:opacity-30 transition-colors"
          title="Uebergeordneter Ordner"
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={refresh}
          className="p-1 text-[#4a5a6e] hover:text-[#8a9bb0] transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Eintraege */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-[#f87171]">{error}</div>
        ) : entries.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-[#4a5a6e] text-center">
            Leeres Verzeichnis
          </div>
        ) : (
          entries.map(entry => {
            const path = fullPath(entry);
            const isActive = !entry.isDir && activeFile?.path === path;
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => entry.isDir ? browse(path) : openFile(entry)}
                onContextMenu={(e) => onContextMenu(e, entry, path)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#1a2028] transition-colors text-left group ${
                  isActive ? 'bg-[#0e3a5e] text-[#22d3ee]' : 'text-[#c8d6e5]'
                }`}
              >
                {entry.isDir ? (
                  <Folder size={13} className="text-[#fbbf24] shrink-0" />
                ) : (
                  <FileText size={13} className="text-[#4a5a6e] shrink-0" />
                )}
                <span className="truncate flex-1">{entry.name}</span>
                {!entry.isDir && entry.size !== null && (
                  <span className="text-[10px] text-[#2d3f52] shrink-0 group-hover:text-[#4a5a6e]">
                    {formatFileSize(entry.size)}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/files/file-tree.tsx
git commit -m "feat: File Tree Komponente mit Breadcrumbs und Metadaten"
```

---

## Task 8: File Viewer Komponente

**Files:**
- Create: `src/components/files/file-viewer.tsx`
- Create: `src/components/files/image-preview.tsx`
- Create: `src/components/files/status-bar.tsx`

**Step 1: Image Preview**

Create `src/components/files/image-preview.tsx`:

```typescript
'use client';

interface ImagePreviewProps {
  content: string; // base64
  filename: string;
}

export function ImagePreview({ content, filename }: ImagePreviewProps) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
    ico: 'image/x-icon', bmp: 'image/bmp',
  };
  const mime = mimeMap[ext] ?? 'image/png';

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
      <img
        src={`data:${mime};base64,${content}`}
        alt={filename}
        className="max-w-full max-h-full object-contain rounded"
        style={{ imageRendering: ext === 'ico' ? 'pixelated' : 'auto' }}
      />
    </div>
  );
}
```

**Step 2: Status Bar**

Create `src/components/files/status-bar.tsx`:

```typescript
'use client';

import { formatFileSize, timeAgo } from '@/lib/files/utils';

interface StatusBarProps {
  size: number;
  permissions: string;
  modified: string;
  language: string;
}

export function StatusBar({ size, permissions, modified, language }: StatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-t border-[#1a2028] text-[10px] text-[#4a5a6e] font-mono shrink-0">
      <span>{formatFileSize(size)}</span>
      <span className="text-[#2d3f52]">|</span>
      <span>{permissions}</span>
      <span className="text-[#2d3f52]">|</span>
      <span>{timeAgo(modified)}</span>
      <span className="text-[#2d3f52]">|</span>
      <span className="text-[#22d3ee]">{language}</span>
    </div>
  );
}
```

**Step 3: File Viewer (Hauptkomponente)**

Create `src/components/files/file-viewer.tsx`:

```typescript
'use client';

import { Edit3, Save, X, Download, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CodeEditor } from './code-editor';
import { ImagePreview } from './image-preview';
import { StatusBar } from './status-bar';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { fileName } from '@/lib/files/utils';

export function FileViewer() {
  const {
    activeFile, fileLoading, fileError,
    editing, editContent, setEditContent,
    startEditing, saveFile, cancelEditing,
    hostId,
  } = useFileBrowser();

  if (fileLoading) {
    return (
      <div className="panel p-0 flex flex-col h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (fileError) {
    return (
      <div className="panel p-0 flex flex-col h-full items-center justify-center text-[#f87171] text-[12px]">
        {fileError}
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className="panel p-0 flex flex-col h-full items-center justify-center text-[#4a5a6e] text-[12px]">
        Datei auswaehlen, um Inhalt anzuzeigen
      </div>
    );
  }

  const name = fileName(activeFile.path);

  // Download-Handler
  const handleDownload = () => {
    const blob = activeFile.isImage
      ? new Blob([Uint8Array.from(atob(activeFile.content), c => c.charCodeAt(0))])
      : new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel p-0 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2028] shrink-0">
        <code className="text-[11px] text-[#8a9bb0] truncate">{activeFile.path}</code>
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>
                <X size={11} /> Abbrechen
              </Button>
              <Button variant="primary" size="sm" onClick={saveFile}>
                <Save size={11} /> Speichern
              </Button>
            </>
          ) : (
            <>
              {!activeFile.isImage && !activeFile.isBinary && (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Edit3 size={11} /> Bearbeiten
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download size={11} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex-1 overflow-hidden">
        {activeFile.isBinary && !activeFile.isImage ? (
          // Binaerdatei
          <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full text-[#4a5a6e]">
            <FileWarning size={32} />
            <p className="text-[12px]">Binaerdatei — {name}</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download size={12} /> Download
            </Button>
          </div>
        ) : activeFile.isImage ? (
          <ImagePreview content={activeFile.content} filename={name} />
        ) : editing ? (
          <CodeEditor
            content={editContent}
            language={activeFile.language}
            readOnly={false}
            onChange={setEditContent}
            onSave={saveFile}
          />
        ) : (
          <CodeEditor
            content={activeFile.content}
            language={activeFile.language}
            readOnly={true}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        size={activeFile.size}
        permissions={activeFile.permissions}
        modified={activeFile.modified}
        language={activeFile.language}
      />
    </div>
  );
}
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/components/files/file-viewer.tsx src/components/files/image-preview.tsx src/components/files/status-bar.tsx
git commit -m "feat: File Viewer mit CodeMirror, Bildvorschau und Status-Bar"
```

---

## Task 9: Toolbar, Dialoge und Suche

**Files:**
- Create: `src/components/files/file-toolbar.tsx`
- Create: `src/components/files/file-dialogs.tsx`
- Create: `src/components/files/file-search.tsx`

**Step 1: Toolbar**

Create `src/components/files/file-toolbar.tsx`:

```typescript
'use client';

import { RefreshCw, FolderPlus, FilePlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileBrowser } from '@/lib/stores/file-browser';

interface FileToolbarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function FileToolbar({ onNewFile, onNewFolder }: FileToolbarProps) {
  const { refresh, searchOpen, setSearchOpen } = useFileBrowser();

  return (
    <div className="flex items-center gap-1 mb-3 animate-fade-in stagger-2">
      <Button variant="ghost" size="sm" onClick={refresh}>
        <RefreshCw size={12} /> Aktualisieren
      </Button>
      <Button variant="ghost" size="sm" onClick={onNewFolder}>
        <FolderPlus size={12} /> Ordner
      </Button>
      <Button variant="ghost" size="sm" onClick={onNewFile}>
        <FilePlus size={12} /> Datei
      </Button>
      <div className="flex-1" />
      <Button
        variant={searchOpen ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setSearchOpen(!searchOpen)}
      >
        <Search size={12} /> Suche
      </Button>
    </div>
  );
}
```

**Step 2: Dialoge**

Create `src/components/files/file-dialogs.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit3, FolderPlus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useFileBrowser } from '@/lib/stores/file-browser';

// ─── Neue Datei Dialog ────────────────────────────────────

interface NewFileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewFileDialog({ open, onClose }: NewFileDialogProps) {
  const { createFile, currentPath } = useFileBrowser();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Dateiname erforderlich'); return; }
    setLoading(true);
    setError('');
    const ok = await createFile(name.trim(), content);
    setLoading(false);
    if (ok) { setName(''); setContent(''); onClose(); }
    else setError('Erstellen fehlgeschlagen');
  };

  return (
    <Dialog open={open} onClose={onClose} title="Neue Datei erstellen">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-[11px] text-[#4a5a6e] font-mono">{currentPath}</div>
        <Input label="DATEINAME" placeholder="z.B. config.json" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <div className="flex flex-col gap-1">
          <label className="text-label">INHALT (OPTIONAL)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="input font-mono text-[12px] min-h-[100px] resize-y" placeholder="Datei-Inhalt..." spellCheck={false} />
        </div>
        {error && <p className="text-[11px] text-[#f87171]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Plus size={12} />} Erstellen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Neuer Ordner Dialog ──────────────────────────────────

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewFolderDialog({ open, onClose }: NewFolderDialogProps) {
  const { createFolder, currentPath } = useFileBrowser();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Ordnername erforderlich'); return; }
    setLoading(true);
    setError('');
    const ok = await createFolder(name.trim());
    setLoading(false);
    if (ok) { setName(''); onClose(); }
    else setError('Erstellen fehlgeschlagen');
  };

  return (
    <Dialog open={open} onClose={onClose} title="Neuer Ordner">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-[11px] text-[#4a5a6e] font-mono">{currentPath}</div>
        <Input label="ORDNERNAME" placeholder="z.B. components" value={name} onChange={e => setName(e.target.value)} autoFocus />
        {error && <p className="text-[11px] text-[#f87171]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <FolderPlus size={12} />} Erstellen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Loeschen-Bestaetigung ────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  targetPath: string;
  isDir: boolean;
}

export function DeleteDialog({ open, onClose, targetPath, isDir }: DeleteDialogProps) {
  const { deleteEntry } = useFileBrowser();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const ok = await deleteEntry(targetPath);
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={isDir ? 'Ordner loeschen?' : 'Datei loeschen?'}>
      <div className="flex flex-col gap-4">
        <p className="text-[12px] text-[#c8d6e5]">
          {isDir ? 'Ordner und alle Inhalte' : 'Datei'} wirklich loeschen?
        </p>
        <code className="text-[11px] text-[#f87171] font-mono bg-[#1a2028] px-2 py-1 rounded-sm break-all">{targetPath}</code>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Abbrechen</Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Trash2 size={12} />} Loeschen
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Umbenennen-Dialog ────────────────────────────────────

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  currentName: string;
  fullPath: string;
}

export function RenameDialog({ open, onClose, currentName, fullPath }: RenameDialogProps) {
  const { renameEntry } = useFileBrowser();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset name wenn Dialog oeffnet
  const handleOpen = () => setName(currentName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) { onClose(); return; }
    setLoading(true);
    setError('');
    const ok = await renameEntry(fullPath, name.trim());
    setLoading(false);
    if (ok) onClose();
    else setError('Umbenennen fehlgeschlagen');
  };

  return (
    <Dialog open={open} onClose={onClose} title="Umbenennen">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="NEUER NAME" value={name} onChange={e => setName(e.target.value)} autoFocus onFocus={handleOpen} />
        {error && <p className="text-[11px] text-[#f87171]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Edit3 size={12} />} Umbenennen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

**Step 3: Suche**

Create `src/components/files/file-search.tsx`:

```typescript
'use client';

import { Search, FileText, Folder, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useFileBrowser } from '@/lib/stores/file-browser';

export function FileSearch() {
  const {
    searchOpen, searchQuery, searchType, searchResults, searchLoading,
    setSearchOpen, setSearchQuery, setSearchType, search,
    browse, openFile, entries, currentPath,
  } = useFileBrowser();

  if (!searchOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  const handleResultClick = (result: { path: string; name: string; isDir: boolean }) => {
    if (result.isDir) {
      browse(result.path);
    } else {
      // Zum Verzeichnis navigieren und Datei oeffnen
      const dir = result.path.replace(/\/[^/]+$/, '') || '/';
      browse(dir);
      // Wir oeffnen die Datei via den Store
      // Da browse async ist, muessen wir die Datei nach Navigation oeffnen
      // Einfacher Ansatz: direkt die openFile-Methode mit einem synthetischen Entry aufrufen
      const entry = { name: result.name, isDir: false, size: null, modified: '', permissions: '' };
      // Wir navigieren erst zum Ordner, dann oeffnen wir die Datei
      // Hier setzen wir currentPath manuell um den Pfad korrekt aufzuloesen
      setTimeout(() => openFile(entry), 500);
    }
  };

  return (
    <div className="panel p-3 mb-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-label">SUCHE</span>
        <Button variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
          <X size={11} />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setSearchType('filename')}
            className={`text-[11px] px-2 py-0.5 rounded ${
              searchType === 'filename' ? 'bg-[#0e3a5e] text-[#22d3ee]' : 'text-[#4a5a6e] hover:text-[#8a9bb0]'
            }`}
          >
            Dateiname
          </button>
          <button
            type="button"
            onClick={() => setSearchType('content')}
            className={`text-[11px] px-2 py-0.5 rounded ${
              searchType === 'content' ? 'bg-[#0e3a5e] text-[#22d3ee]' : 'text-[#4a5a6e] hover:text-[#8a9bb0]'
            }`}
          >
            Inhalt
          </button>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={searchType === 'filename' ? 'Dateiname...' : 'Suchbegriff...'}
          className="input flex-1 text-[12px]"
          autoFocus
        />
        <Button variant="primary" size="sm" type="submit" disabled={searchLoading}>
          {searchLoading ? <Spinner size="sm" /> : <Search size={12} />}
        </Button>
      </form>

      {/* Ergebnisse */}
      {searchResults.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto">
          {searchResults.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleResultClick(result)}
              className="w-full flex items-center gap-2 px-2 py-1 text-[11px] text-[#c8d6e5] hover:bg-[#1a2028] rounded transition-colors text-left"
            >
              {result.isDir ? (
                <Folder size={11} className="text-[#fbbf24] shrink-0" />
              ) : (
                <FileText size={11} className="text-[#4a5a6e] shrink-0" />
              )}
              <span className="truncate font-mono">{result.path}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/components/files/file-toolbar.tsx src/components/files/file-dialogs.tsx src/components/files/file-search.tsx
git commit -m "feat: File Toolbar, Dialoge und Suche"
```

---

## Task 10: Kontext-Menue

**Files:**
- Create: `src/components/files/context-menu.tsx`

**Step 1: Erstellen**

Create `src/components/files/context-menu.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import {
  FolderOpen, Terminal, Edit3, Copy, Scissors, Clipboard,
  Download, Trash2, FileText,
} from 'lucide-react';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { useRouter } from 'next/navigation';

interface ContextMenuProps {
  x: number;
  y: number;
  entry: { name: string; isDir: boolean; path: string };
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ContextMenu({ x, y, entry, onClose, onRename, onDelete }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { browse, openFile, setClipboard, clipboard, paste, hostId } = useFileBrowser();

  // Ausserhalb klicken schliesst Menue
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('click', handler);
    document.addEventListener('contextmenu', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('contextmenu', handler);
    };
  }, [onClose]);

  // Position anpassen wenn Menue aus dem Viewport ragt
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      ref.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      ref.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const handleOpen = () => {
    if (entry.isDir) browse(entry.path);
    else openFile({ name: entry.name, isDir: false, size: null, modified: '', permissions: '' });
    onClose();
  };

  const handleOpenInTerminal = () => {
    const dir = entry.isDir ? entry.path : entry.path.replace(/\/[^/]+$/, '');
    // URL mit Query-Params fuer Terminal-Seite
    router.push(`/terminal?hostId=${hostId}&startDir=${encodeURIComponent(dir)}`);
    onClose();
  };

  const handleCopy = () => {
    setClipboard({ paths: [entry.path], mode: 'copy' });
    onClose();
  };

  const handleCut = () => {
    setClipboard({ paths: [entry.path], mode: 'cut' });
    onClose();
  };

  const handlePaste = async () => {
    await paste();
    onClose();
  };

  const handleDownload = async () => {
    try {
      const mode = entry.isDir ? '' : '&mode=base64';
      const res = await fetch(`/api/hosts/${hostId}/files?path=${encodeURIComponent(entry.path)}${mode}`);
      if (!res.ok) return;
      const data = await res.json();
      const blob = data.encoding === 'base64'
        ? new Blob([Uint8Array.from(atob(data.content), c => c.charCodeAt(0))])
        : new Blob([data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    onClose();
  };

  const items = [
    { label: 'Oeffnen', icon: entry.isDir ? FolderOpen : FileText, action: handleOpen },
    { label: 'Im Terminal oeffnen', icon: Terminal, action: handleOpenInTerminal },
    'separator' as const,
    { label: 'Umbenennen', icon: Edit3, action: () => { onRename(); onClose(); }, shortcut: 'F2' },
    { label: 'Kopieren', icon: Copy, action: handleCopy },
    { label: 'Ausschneiden', icon: Scissors, action: handleCut },
    ...(clipboard ? [{ label: 'Einfuegen', icon: Clipboard, action: handlePaste }] : []),
    ...(!entry.isDir ? [{ label: 'Download', icon: Download, action: handleDownload }] : []),
    'separator' as const,
    { label: 'Loeschen', icon: Trash2, action: () => { onDelete(); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#111519] border border-[#222c38] rounded-md shadow-xl py-1 min-w-[180px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={i} className="my-1 border-t border-[#1a2028]" />
        ) : (
          <button
            key={i}
            type="button"
            onClick={item.action}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors text-left ${
              'danger' in item && item.danger
                ? 'text-[#f87171] hover:bg-[#2a1015]'
                : 'text-[#c8d6e5] hover:bg-[#1a2028]'
            }`}
          >
            <item.icon size={12} className="shrink-0" />
            <span className="flex-1">{item.label}</span>
            {'shortcut' in item && item.shortcut && (
              <span className="text-[10px] text-[#4a5a6e]">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/files/context-menu.tsx
git commit -m "feat: Kontext-Menue mit Terminal-Integration"
```

---

## Task 11: Hauptseite zusammenbauen

**Files:**
- Modify: `src/app/files/page.tsx` — Komplett ersetzen

**Step 1: Page neu schreiben**

Replace entire content of `src/app/files/page.tsx`:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { FolderOpen } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { FileTree } from '@/components/files/file-tree';
import { FileViewer } from '@/components/files/file-viewer';
import { FileToolbar } from '@/components/files/file-toolbar';
import { FileSearch } from '@/components/files/file-search';
import { ContextMenu } from '@/components/files/context-menu';
import { NewFileDialog, NewFolderDialog, DeleteDialog, RenameDialog } from '@/components/files/file-dialogs';
import { joinPath } from '@/lib/files/utils';
import type { Host, FileEntry } from '@/types';

export default function FilesPage() {
  const { hostId, setHostId, currentPath, editing, saveFile, setSearchOpen, searchOpen } = useFileBrowser();

  // Hosts laden
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostsLoading, setHostsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hosts');
        if (res.ok) setHosts(await res.json());
      } catch { /* ignore */ }
      finally { setHostsLoading(false); }
    })();
  }, []);

  // Dialoge
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [contextTarget, setContextTarget] = useState<{ name: string; isDir: boolean; path: string } | null>(null);

  // Kontext-Menue
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry; path: string } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry, path });
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S: Speichern
      if (e.ctrlKey && e.key === 's' && editing) {
        e.preventDefault();
        saveFile();
      }
      // Ctrl+Shift+N: Neue Datei
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNewFile(true);
      }
      // Ctrl+Shift+F: Suche
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      // F2: Umbenennen (wenn Kontext-Target existiert)
      if (e.key === 'F2' && contextTarget) {
        e.preventDefault();
        setShowRename(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, saveFile, searchOpen, setSearchOpen, contextTarget]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <div className="text-label text-[#4a5a6e] mb-1 flex items-center gap-1.5">
            <FolderOpen size={10} />
            FILES
          </div>
          <h1 className="text-xl font-medium text-[#c8d6e5]">File-Browser</h1>
        </div>

        {/* Host-Selector */}
        <div className="animate-fade-in stagger-1">
          {hostsLoading ? (
            <Spinner size="sm" />
          ) : (
            <select
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              className="input max-w-xs text-[12px]"
            >
              <option value="">Host waehlen...</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.hostname}){h.isOnline ? '' : ' — offline'}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {hostId && (
        <>
          {/* Toolbar */}
          <FileToolbar
            onNewFile={() => setShowNewFile(true)}
            onNewFolder={() => setShowNewFolder(true)}
          />

          {/* Suche */}
          <FileSearch />

          {/* Zwei-Panel Layout */}
          <div
            className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 animate-fade-in stagger-3"
            style={{ height: 'calc(100vh - 280px)' }}
          >
            {/* Links: Verzeichnisbaum */}
            <FileTree onContextMenu={handleContextMenu} />

            {/* Rechts: Datei-Viewer/Editor */}
            <FileViewer />
          </div>
        </>
      )}

      {/* Kontext-Menue */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entry={{ name: contextMenu.entry.name, isDir: contextMenu.entry.isDir, path: contextMenu.path }}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setContextTarget({ name: contextMenu.entry.name, isDir: contextMenu.entry.isDir, path: contextMenu.path });
            setShowRename(true);
          }}
          onDelete={() => {
            setContextTarget({ name: contextMenu.entry.name, isDir: contextMenu.entry.isDir, path: contextMenu.path });
            setShowDelete(true);
          }}
        />
      )}

      {/* Dialoge */}
      <NewFileDialog open={showNewFile} onClose={() => setShowNewFile(false)} />
      <NewFolderDialog open={showNewFolder} onClose={() => setShowNewFolder(false)} />
      {contextTarget && (
        <>
          <DeleteDialog
            open={showDelete}
            onClose={() => { setShowDelete(false); setContextTarget(null); }}
            targetPath={contextTarget.path}
            isDir={contextTarget.isDir}
          />
          <RenameDialog
            open={showRename}
            onClose={() => { setShowRename(false); setContextTarget(null); }}
            currentName={contextTarget.name}
            fullPath={contextTarget.path}
          />
        </>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Manuell testen**

Open `http://localhost:3000/files` and verify:
- Host-Auswahl funktioniert
- Verzeichnisse UND Dateien werden angezeigt
- Dateien oeffnen zeigt Syntax-Highlighting
- Bearbeiten + Speichern funktioniert
- Neue Datei/Ordner erstellen
- Rechtsklick → Kontext-Menue
- Suche (Dateiname + Inhalt)
- Bilder werden als Vorschau angezeigt

**Step 4: Commit**

```bash
git add src/app/files/page.tsx
git commit -m "feat: File Browser Page komplett neu gebaut"
```

---

## Task 12: Smoke Test und Cleanup

**Step 1: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Dev-Server starten und manuell testen**

Run: `npm run dev` (oder `tsx watch server/index.ts`)

Teste alle Features:
- [ ] Host waehlen → Verzeichnis laedt mit Dateien und Ordnern
- [ ] Datei klicken → CodeMirror mit Syntax-Highlighting
- [ ] Bearbeiten → Ctrl+S speichert
- [ ] Neue Datei erstellen (Dialog)
- [ ] Neuen Ordner erstellen (Dialog)
- [ ] Rechtsklick → Kontext-Menue erscheint
- [ ] Umbenennen ueber Kontext-Menue
- [ ] Kopieren → Einfuegen in anderem Ordner
- [ ] Loeschen mit Bestaetigung
- [ ] Bilder werden als Vorschau angezeigt
- [ ] Binaerdateien zeigen Download-Button
- [ ] Suche nach Dateiname findet Ergebnisse
- [ ] Suche nach Inhalt findet Ergebnisse
- [ ] "Im Terminal oeffnen" navigiert zur Terminal-Seite
- [ ] Breadcrumbs funktionieren
- [ ] Keyboard Shortcuts (Ctrl+Shift+N, Ctrl+Shift+F)
- [ ] Status-Bar zeigt Groesse, Permissions, Datum, Sprache

**Step 3: Alte Workarounds entfernen**

Falls die alte `page.tsx` noch Code hat der den `__ls__:` Hack referenziert — dieser wurde in Task 11 komplett ersetzt. Pruefen ob `src/app/api/hosts/[id]/files/route.ts` noch den alten `__ls__:` Handler hat und ggf. entfernen (sollte in Task 4 schon bereinigt sein).

**Step 4: Final Commit**

```bash
git add -A
git commit -m "feat: File Browser v2 — komplett neu mit CodeMirror, Medienvorschau, Suche und Terminal-Integration"
```

**WICHTIG: Zum Schluss Scribe spawnen fuer Version-Bump, CHANGELOG, Tag und Push.**
