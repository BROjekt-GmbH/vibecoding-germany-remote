import { create } from 'zustand';
import type { FileEntry } from '@/types';
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

interface IdeFileBrowserState {
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

  // Reset
  reset: () => void;
}

const INITIAL_STATE = {
  hostId: '',
  currentPath: '',
  entries: [] as FileEntry[],
  loading: false,
  error: null as string | null,
  activeFile: null as ActiveFile | null,
  fileLoading: false,
  fileError: null as string | null,
  editing: false,
  editContent: '',
};

export const useIdeFileBrowser = create<IdeFileBrowserState>((set, get) => ({
  ...INITIAL_STATE,

  setHostId: (id) => {
    set({
      ...INITIAL_STATE,
      hostId: id,
    });
    if (id) {
      get().browse();
    }
  },

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
            path: filePath, content: '', isImage: false, isBinary: true,
            size: entry.size ?? 0, modified: entry.modified,
            permissions: entry.permissions, language: 'plaintext',
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
          path: filePath, content: data.content, isImage, isBinary: false,
          size: data.size ?? entry.size ?? 0, modified: entry.modified,
          permissions: entry.permissions, language: detectLanguage(entry.name),
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

  reset: () => {
    set(INITIAL_STATE);
  },
}));
