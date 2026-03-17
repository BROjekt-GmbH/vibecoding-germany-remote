'use client';

import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Server, ChevronDown, Circle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Dialog } from '@/components/ui/dialog';
import { FileToolbar } from '@/components/files/file-toolbar';
import { FileSearch } from '@/components/files/file-search';
import { FileTree } from '@/components/files/file-tree';
import { FileViewer } from '@/components/files/file-viewer';
import { ContextMenu } from '@/components/files/context-menu';
import {
  NewFileDialog,
  NewFolderDialog,
  DeleteDialog,
  RenameDialog,
} from '@/components/files/file-dialogs';
import { useFileBrowser } from '@/lib/stores/file-browser';
import type { Host, FileEntry } from '@/types';

interface ContextMenuState {
  entry: FileEntry;
  x: number;
  y: number;
}

export default function FilesPage() {
  // Hosts
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostsLoading, setHostsLoading] = useState(true);

  // Dialog-State
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [renameTarget, setRenameTarget] = useState('');
  const [showRename, setShowRename] = useState(false);

  // Kontext-Menue
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const [showHostPicker, setShowHostPicker] = useState(false);
  const { hostId, setHostId, saveFile } = useFileBrowser();
  const selectedHost = hosts.find(h => h.id === hostId);

  // Hosts laden
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hosts');
        if (res.ok) {
          const data = await res.json();
          setHosts(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        setHostsLoading(false);
      }
    })();
  }, []);

  // Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+S — Speichern
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
        return;
      }
      // Ctrl+Shift+N — Neue Datei
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNewFile(true);
        return;
      }
      // Ctrl+Shift+F — Suche toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        useFileBrowser.getState().setSearchOpen(!useFileBrowser.getState().searchOpen);
        return;
      }
      // Escape — Editor verlassen
      if (e.key === 'Escape') {
        const state = useFileBrowser.getState();
        if (state.editing) {
          e.preventDefault();
          state.cancelEditing();
        }
        return;
      }
      // Delete — Loeschen (mit Bestaetigung)
      if (e.key === 'Delete') {
        const activeFile = useFileBrowser.getState().activeFile;
        if (activeFile) {
          setDeleteTarget(activeFile.path);
          setShowDelete(true);
        }
        return;
      }
      // F2 — Umbenennen (wenn aktive Datei)
      if (e.key === 'F2') {
        const activeFile = useFileBrowser.getState().activeFile;
        if (activeFile) {
          setRenameTarget(activeFile.path);
          setShowRename(true);
        }
        return;
      }
    },
    [saveFile]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleContextMenu = (entry: FileEntry, x: number, y: number) => {
    setContextMenu({ entry, x, y });
  };

  const handleRenameFromMenu = (path: string) => {
    setRenameTarget(path);
    setShowRename(true);
  };

  const handleDeleteFromMenu = (path: string) => {
    setDeleteTarget(path);
    setShowDelete(true);
  };

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

        {/* Host-Auswahl Button */}
        {hostsLoading ? (
          <Spinner size="sm" />
        ) : (
          <button
            type="button"
            onClick={() => setShowHostPicker(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#222c38] hover:border-[#22d3ee] bg-[#0b0e11] transition-colors text-[12px]"
          >
            {selectedHost ? (
              <>
                <Circle size={7} className={selectedHost.isOnline ? 'text-[#34d399] fill-[#34d399]' : 'text-[#f87171] fill-[#f87171]'} />
                <span className="text-[#c8d6e5]">{selectedHost.name}</span>
                <span className="text-[#4a5a6e]">({selectedHost.hostname})</span>
              </>
            ) : (
              <span className="text-[#4a5a6e]">Host waehlen...</span>
            )}
            <ChevronDown size={12} className="text-[#4a5a6e]" />
          </button>
        )}
      </div>

      {hostId ? (
        <div className="flex flex-col gap-3 animate-fade-in stagger-1">
          {/* Toolbar + Suche */}
          <div className="flex flex-col gap-2">
            <FileToolbar
              onNewFile={() => setShowNewFile(true)}
              onNewFolder={() => setShowNewFolder(true)}
            />
            <FileSearch />
          </div>

          {/* Zwei-Panel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 max-h-[calc(100vh-250px)]">
            <FileTree onContextMenu={handleContextMenu} />
            <FileViewer />
          </div>
        </div>
      ) : (
        <div className="panel p-8 text-center text-[#4a5a6e] text-[13px] animate-fade-in stagger-1">
          Bitte einen Host auswaehlen, um den File-Browser zu verwenden.
        </div>
      )}

      {/* Kontext-Menue */}
      {contextMenu && (
        <ContextMenu
          entry={contextMenu.entry}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={handleRenameFromMenu}
          onDelete={handleDeleteFromMenu}
        />
      )}

      {/* Dialoge */}
      <NewFileDialog
        open={showNewFile}
        onClose={() => setShowNewFile(false)}
      />
      <NewFolderDialog
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
      />
      <DeleteDialog
        open={showDelete}
        path={deleteTarget}
        onClose={() => {
          setShowDelete(false);
          setDeleteTarget('');
        }}
      />
      <RenameDialog
        open={showRename}
        path={renameTarget}
        onClose={() => {
          setShowRename(false);
          setRenameTarget('');
        }}
      />

      {/* Host-Picker Dialog */}
      <Dialog open={showHostPicker} onClose={() => setShowHostPicker(false)} title="Host auswaehlen">
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {hosts.length === 0 ? (
            <p className="text-[12px] text-[#4a5a6e] text-center py-4">Keine Hosts konfiguriert</p>
          ) : (
            hosts.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => { setHostId(h.id); setShowHostPicker(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-left ${
                  h.id === hostId
                    ? 'bg-[#0e3a5e] border border-[#22d3ee]/30'
                    : 'hover:bg-[#1a2028] border border-transparent'
                }`}
              >
                <Server size={14} className={h.isOnline ? 'text-[#34d399]' : 'text-[#4a5a6e]'} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] text-[#c8d6e5] truncate">{h.name}</span>
                  <span className="text-[11px] text-[#4a5a6e] font-mono truncate">{h.username}@{h.hostname}:{h.port}</span>
                </div>
                <Circle size={6} className={`ml-auto shrink-0 ${h.isOnline ? 'text-[#34d399] fill-[#34d399]' : 'text-[#f87171] fill-[#f87171]'}`} />
              </button>
            ))
          )}
        </div>
      </Dialog>
    </div>
  );
}
