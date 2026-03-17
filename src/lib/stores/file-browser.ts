import { create } from 'zustand';
import type { FileEntry, SearchResult } from '@/types';
import { joinPath, parentPath, isImageFile, isBinaryFile, detectLanguage } from '@/lib/files/utils';

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
  setHostId: (id) => {
    set({
      hostId: id,
      currentPath: '',
      entries: [],
      activeFile: null,
      fileError: null,
      error: null,
      editing: false,
      editContent: '',
      searchResults: [],
      clipboard: null,
    });
    if (id) {
      get().browse();
    }
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
      const url = path !== undefined
        ? `/api/hosts/${hostId}/browse?path=${encodeURIComponent(path)}`
        : `/api/hosts/${hostId}/browse`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        set({ error: data.error ?? 'Fehler beim Laden', loading: false });
        return;
      }
      const data = await res.json();
      set({
        currentPath: data.path,
        entries: data.entries ?? [],
        loading: false,
        error: null,
      });
    } catch {
      set({ error: 'Verbindungsfehler', loading: false });
    }
  },

  navigateUp: () => {
    const { currentPath, browse } = get();
    const parent = parentPath(currentPath);
    if (parent) browse(parent);
  },

  refresh: async () => {
    const { currentPath, browse } = get();
    await browse(currentPath);
  },

  // Datei-Viewer
  activeFile: null,
  fileLoading: false,
  fileError: null,

  openFile: async (entry: FileEntry) => {
    const { hostId, currentPath } = get();
    if (!hostId) return;

    const filePath = joinPath(currentPath, entry.name);
    const isImage = isImageFile(entry.name);
    const isBinary = !isImage && isBinaryFile(entry.name);

    set({ fileLoading: true, fileError: null, editing: false, editContent: '' });

    try {
      if (isBinary) {
        set({
          activeFile: {
            path: filePath,
            content: '',
            isImage: false,
            isBinary: true,
            size: entry.size ?? 0,
            modified: entry.modified,
            permissions: entry.permissions,
            language: 'plaintext',
          },
          fileLoading: false,
        });
        return;
      }

      const mode = isImage ? 'base64' : undefined;
      const url = mode
        ? `/api/hosts/${hostId}/files?path=${encodeURIComponent(filePath)}&mode=${mode}`
        : `/api/hosts/${hostId}/files?path=${encodeURIComponent(filePath)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        set({ fileError: data.error ?? 'Fehler beim Laden', fileLoading: false });
        return;
      }

      const data = await res.json();
      set({
        activeFile: {
          path: filePath,
          content: data.content,
          isImage,
          isBinary: false,
          size: data.size ?? entry.size ?? 0,
          modified: entry.modified,
          permissions: entry.permissions,
          language: detectLanguage(entry.name),
        },
        fileLoading: false,
        fileError: null,
      });
    } catch {
      set({ fileError: 'Verbindungsfehler', fileLoading: false });
    }
  },

  closeFile: () => {
    set({ activeFile: null, fileError: null, editing: false, editContent: '' });
  },

  // Editor
  editing: false,
  editContent: '',

  setEditContent: (content) => set({ editContent: content }),

  startEditing: () => {
    const { activeFile } = get();
    if (!activeFile) return;
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

  cancelEditing: () => {
    set({ editing: false, editContent: '' });
  },

  // Operationen
  createFile: async (name, content = '') => {
    const { hostId, currentPath, refresh } = get();
    if (!hostId) return false;

    const fullPath = joinPath(currentPath, name);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath, content }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  },

  createFolder: async (name) => {
    const { hostId, currentPath, refresh } = get();
    if (!hostId) return false;

    const fullPath = joinPath(currentPath, name);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/mkdir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  },

  deleteEntry: async (path) => {
    const { hostId, activeFile, refresh, closeFile } = get();
    if (!hostId) return false;

    try {
      const res = await fetch(
        `/api/hosts/${hostId}/files?path=${encodeURIComponent(path)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) return false;

      if (activeFile?.path === path) {
        closeFile();
      }
      await refresh();
      return true;
    } catch {
      return false;
    }
  },

  renameEntry: async (oldPath, newName) => {
    const { hostId, refresh } = get();
    if (!hostId) return false;

    const parentDir = parentPath(oldPath) ?? '/';
    const newPath = joinPath(parentDir, newName);
    try {
      const res = await fetch(`/api/hosts/${hostId}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  },

  copyEntry: async (source, destination) => {
    const { hostId, refresh } = get();
    if (!hostId) return false;

    try {
      const res = await fetch(`/api/hosts/${hostId}/files/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  },

  moveEntry: async (source, destination) => {
    const { hostId, activeFile, refresh } = get();
    if (!hostId) return false;

    try {
      const res = await fetch(`/api/hosts/${hostId}/files/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination }),
      });
      if (!res.ok) return false;

      if (activeFile?.path === source) {
        set({ activeFile: { ...activeFile, path: destination } });
      }
      await refresh();
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

  setSearchOpen: (open) => set({ searchOpen: open, searchResults: open ? get().searchResults : [] }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchType: (type) => set({ searchType: type }),

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
    const { hostId, currentPath, clipboard, copyEntry, moveEntry, refresh, setClipboard } = get();
    if (!hostId || !clipboard) return false;

    let allOk = true;
    for (const sourcePath of clipboard.paths) {
      const name = sourcePath.split('/').pop() ?? 'file';
      const destination = joinPath(currentPath, name);
      let ok: boolean;
      if (clipboard.mode === 'copy') {
        ok = await copyEntry(sourcePath, destination);
      } else {
        ok = await moveEntry(sourcePath, destination);
      }
      if (!ok) allOk = false;
    }

    if (clipboard.mode === 'cut') {
      setClipboard(null);
    }

    await refresh();
    return allOk;
  },
}));
