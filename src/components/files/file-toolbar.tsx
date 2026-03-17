'use client';

import { RefreshCw, FolderPlus, FilePlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileBrowser } from '@/lib/stores/file-browser';

interface FileToolbarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function FileToolbar({ onNewFile, onNewFolder }: FileToolbarProps) {
  const { refresh, loading, searchOpen, setSearchOpen } = useFileBrowser();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={refresh}
        disabled={loading}
        title="Aktualisieren"
      >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">Aktualisieren</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewFolder}
        title="Neuer Ordner"
      >
        <FolderPlus size={12} />
        <span className="hidden sm:inline">Ordner</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewFile}
        title="Neue Datei"
      >
        <FilePlus size={12} />
        <span className="hidden sm:inline">Datei</span>
      </Button>
      <Button
        variant={searchOpen ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setSearchOpen(!searchOpen)}
        title="Suche"
      >
        <Search size={12} />
      </Button>
    </div>
  );
}
