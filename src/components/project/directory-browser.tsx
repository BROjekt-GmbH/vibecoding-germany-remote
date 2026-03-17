'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, ChevronRight, ArrowUp, Home, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

interface BrowseResult {
  path: string;
  parent: string | null;
  directories: string[];
}

interface DirectoryBrowserProps {
  hostId: string;
  onSelect: (path: string) => void;
}

export function DirectoryBrowser({ hostId, onSelect }: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [directories, setDirectories] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const browse = useCallback(async (path?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = path
        ? `/api/hosts/${hostId}/browse?path=${encodeURIComponent(path)}`
        : `/api/hosts/${hostId}/browse`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler beim Laden');
        setLoading(false);
        return;
      }
      const data: BrowseResult = await res.json();
      setCurrentPath(data.path);
      setDirectories(data.directories);
      setParentPath(data.parent);
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  // Beim Mounten: Home-Verzeichnis laden
  useEffect(() => {
    browse();
  }, [browse]);

  const navigateToDir = (dir: string) => {
    browse(currentPath === '/' ? `/${dir}` : `${currentPath}/${dir}`);
  };

  const navigateUp = () => {
    if (parentPath) browse(parentPath);
  };

  // Pfad in Breadcrumb-Segmente aufteilen
  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb-Navigation */}
      <div className="flex items-center gap-1 text-[11px] text-[#4a5a6e] font-mono overflow-x-auto py-1">
        <button
          type="button"
          onClick={() => browse('/')}
          className="shrink-0 hover:text-[#8a9bb0] transition-colors p-0.5"
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

      {/* Verzeichnis-Liste */}
      <div
        className="border border-[#1a2028] rounded-sm overflow-hidden"
        style={{ background: 'var(--bg-overlay)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-[#f87171]">{error}</div>
        ) : (
          <div className="max-h-52 overflow-y-auto">
            {parentPath && (
              <button
                type="button"
                onClick={navigateUp}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#8a9bb0] hover:bg-[#1a2028] transition-colors"
              >
                <ArrowUp size={12} className="text-[#4a5a6e]" />
                ..
              </button>
            )}
            {directories.length === 0 && (
              <div className="px-3 py-4 text-[11px] text-[#4a5a6e] text-center">
                Keine Unterverzeichnisse
              </div>
            )}
            {directories.map(dir => (
              <button
                key={dir}
                type="button"
                onClick={() => navigateToDir(dir)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#c8d6e5] hover:bg-[#1a2028] transition-colors text-left"
              >
                <Folder size={12} className="text-[#fbbf24] shrink-0" />
                <span className="truncate">{dir}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ausgewaehlter Pfad + Auswaehlen-Button */}
      {currentPath && !loading && !error && (
        <div className="flex items-center justify-between gap-2">
          <code className="text-[11px] text-[#8a9bb0] truncate">{currentPath}</code>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={() => onSelect(currentPath)}
            className="shrink-0"
          >
            <Check size={12} />
            Auswaehlen
          </Button>
        </div>
      )}
    </div>
  );
}
