'use client';

import { Search, Folder, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { parentPath } from '@/lib/files/utils';
import type { SearchResult } from '@/types';

export function FileSearch() {
  const {
    searchOpen,
    searchQuery,
    searchType,
    searchResults,
    searchLoading,
    setSearchQuery,
    setSearchType,
    search,
    browse,
    openFile,
  } = useFileBrowser();

  if (!searchOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  const handleResultClick = async (result: SearchResult) => {
    if (result.isDir) {
      browse(result.path);
      return;
    }
    // Zum Verzeichnis navigieren
    const dir = parentPath(result.path) ?? '/';
    await browse(dir);

    // Datei-Eintrag oeffnen — wir muessen die Entry erst aus dem aktuellen State bekommen
    // Da browse async ist und entries sich updaten, erstellen wir einen synthetischen Entry
    const syntheticEntry = {
      name: result.name,
      isDir: false,
      size: null,
      modified: new Date().toISOString(),
      permissions: '',
    };
    openFile(syntheticEntry);
  };

  // Suche auch bei Enter im Suchfeld
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  return (
    <div className="panel p-3 flex flex-col gap-2">
      {/* Typ-Toggle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setSearchType('filename')}
          className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
            searchType === 'filename'
              ? 'bg-[#0e3a5e] text-[#22d3ee]'
              : 'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#1a2028]'
          }`}
        >
          Dateiname
        </button>
        <button
          type="button"
          onClick={() => setSearchType('content')}
          className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
            searchType === 'content'
              ? 'bg-[#0e3a5e] text-[#22d3ee]'
              : 'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#1a2028]'
          }`}
        >
          Inhalt
        </button>
      </div>

      {/* Suchfeld */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={searchType === 'filename' ? 'Dateiname suchen...' : 'Textinhalt suchen...'}
          className="input flex-1 text-[12px]"
          autoFocus
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={searchLoading || !searchQuery.trim()}
        >
          {searchLoading ? <Spinner size="sm" /> : <Search size={12} />}
        </Button>
      </form>

      {/* Ergebnisse */}
      {searchResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-[#1a2028] rounded">
          {searchResults.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleResultClick(result)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-[#1a2028] transition-colors text-left border-b border-[#1a2028] last:border-0"
            >
              {result.isDir ? (
                <Folder size={11} className="text-[#fbbf24] shrink-0" />
              ) : (
                <FileText size={11} className="text-[#4a5a6e] shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[#c8d6e5] truncate font-mono">{result.name}</span>
                <span className="text-[#4a5a6e] truncate font-mono">{result.path}</span>
                {result.line && (
                  <span className="text-[#8a9bb0] truncate font-mono text-[10px]">
                    {result.lineNumber && `L${result.lineNumber}: `}{result.line}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {!searchLoading && searchQuery && searchResults.length === 0 && (
        <p className="text-[11px] text-[#4a5a6e] text-center py-2">
          Keine Ergebnisse
        </p>
      )}
    </div>
  );
}
