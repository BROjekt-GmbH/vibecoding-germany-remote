'use client';

import { Home, ChevronRight, ArrowUp, RefreshCw, Folder, FileText } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { formatFileSize, joinPath } from '@/lib/files/utils';
import type { FileEntry } from '@/types';

export interface FileTreeStore {
  currentPath: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  browse: (path?: string) => Promise<void>;
  navigateUp: () => void;
  refresh: () => Promise<void>;
  activeFile: { path: string } | null;
  openFile: (entry: FileEntry) => Promise<void>;
}

interface FileTreeProps {
  onContextMenu?: (entry: FileEntry, x: number, y: number) => void;
  useStore?: () => FileTreeStore;
}

export function FileTree({ onContextMenu, useStore }: FileTreeProps) {
  const store = useStore ?? useFileBrowser;
  const {
    currentPath,
    entries,
    loading,
    error,
    browse,
    navigateUp,
    refresh,
    activeFile,
    openFile,
  } = store();

  const pathSegments = currentPath.split('/').filter(Boolean);
  const hasParent = currentPath !== '/' && currentPath !== '';

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.isDir) {
      browse(joinPath(currentPath, entry.name));
    } else {
      openFile(entry);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(entry, e.clientX, e.clientY);
    }
  };

  return (
    <div className="panel p-0 flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[11px] text-[#4a5a6e] font-mono px-3 py-2 border-b border-[#1a2028] overflow-x-auto shrink-0 min-w-0">
        <button
          type="button"
          onClick={() => browse('/')}
          className="shrink-0 hover:text-[#8a9bb0] transition-colors p-0.5 rounded"
          title="Home"
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
                  ? 'text-[#c8d6e5] truncate max-w-[80px]'
                  : 'hover:text-[#8a9bb0] transition-colors truncate max-w-[60px]'
              }
              title={seg}
            >
              {seg}
            </button>
          </span>
        ))}
      </div>

      {/* Mini-Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#1a2028] shrink-0">
        {hasParent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateUp}
            title="Ebene hoch"
          >
            <ArrowUp size={11} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          title="Aktualisieren"
          disabled={loading}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Eintraege */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-[#f87171] font-mono">{error}</div>
        ) : entries.length === 0 ? (
          <div className="px-3 py-6 text-[11px] text-[#4a5a6e] text-center">
            Leeres Verzeichnis
          </div>
        ) : (
          <>
            {/* Ordner zuerst, dann Dateien */}
            {[...entries]
              .sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
              })
              .map((entry) => {
                const entryPath = joinPath(currentPath, entry.name);
                const isActive = !entry.isDir && activeFile?.path === entryPath;

                return (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => handleEntryClick(entry)}
                    onContextMenu={(e) => handleContextMenu(e, entry)}
                    className={`group w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#1a2028] transition-colors text-left ${
                      isActive
                        ? 'bg-[#0e3a5e] text-[#22d3ee]'
                        : 'text-[#c8d6e5]'
                    }`}
                  >
                    {entry.isDir ? (
                      <Folder size={12} className="text-[#fbbf24] shrink-0" />
                    ) : (
                      <FileText size={12} className="text-[#4a5a6e] shrink-0" />
                    )}
                    <span className="truncate flex-1 font-mono">{entry.name}</span>
                    {!entry.isDir && entry.size !== null && (
                      <span
                        className={`text-[10px] font-mono shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#22d3ee]/60'
                            : 'text-[#2d3f52] group-hover:text-[#4a5a6e]'
                        }`}
                      >
                        {formatFileSize(entry.size)}
                      </span>
                    )}
                  </button>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}
