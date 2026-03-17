'use client';

import { Edit3, Save, X, Download, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CodeEditor } from './code-editor';
import { ImagePreview } from './image-preview';
import { StatusBar } from './status-bar';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { fileName } from '@/lib/files/utils';

export interface FileViewerStore {
  hostId: string;
  activeFile: {
    path: string;
    content: string;
    isImage: boolean;
    isBinary: boolean;
    size: number;
    modified: string;
    permissions: string;
    language: string;
  } | null;
  fileLoading: boolean;
  fileError: string | null;
  editing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  startEditing: () => void;
  saveFile: () => Promise<boolean>;
  cancelEditing: () => void;
}

interface FileViewerProps {
  useStore?: () => FileViewerStore;
}

export function FileViewer({ useStore }: FileViewerProps = {}) {
  const store = useStore ?? useFileBrowser;
  const {
    hostId,
    activeFile,
    fileLoading,
    fileError,
    editing,
    editContent,
    setEditContent,
    startEditing,
    saveFile,
    cancelEditing,
  } = store();

  const handleDownload = async () => {
    if (!activeFile || !hostId) return;

    try {
      const url = `/api/hosts/${hostId}/files?path=${encodeURIComponent(activeFile.path)}${activeFile.isImage ? '&mode=base64' : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;

      let blob: Blob;
      if (activeFile.isImage) {
        const data = await res.json();
        const bytes = Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0));
        blob = new Blob([bytes]);
      } else {
        const data = await res.json();
        blob = new Blob([data.content], { type: 'text/plain' });
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName(activeFile.path);
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore
    }
  };

  if (fileLoading) {
    return (
      <div className="panel p-0 flex flex-col overflow-hidden" style={{ height: '100%' }}>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (fileError) {
    return (
      <div className="panel p-0 flex flex-col overflow-hidden" style={{ height: '100%' }}>
        <div className="flex-1 flex items-center justify-center text-[#f87171] text-[12px] font-mono p-4">
          {fileError}
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className="panel p-0 flex flex-col overflow-hidden" style={{ height: '100%' }}>
        <div className="flex-1 flex items-center justify-center text-[#4a5a6e] text-[12px]">
          Datei auswaehlen, um Inhalt anzuzeigen
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-0 flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2028] shrink-0 min-w-0">
        <code className="text-[11px] text-[#8a9bb0] truncate font-mono flex-1 mr-2">
          {activeFile.path}
        </code>
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEditing} title="Abbrechen">
                <X size={11} />
                <span className="hidden sm:inline">Abbrechen</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveFile}
                title="Speichern (Ctrl+S)"
              >
                <Save size={11} />
                <span className="hidden sm:inline">Speichern</span>
              </Button>
            </>
          ) : (
            <>
              {!activeFile.isBinary && !activeFile.isImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  title="Bearbeiten"
                >
                  <Edit3 size={11} />
                  <span className="hidden sm:inline">Bearbeiten</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Herunterladen"
              >
                <Download size={11} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeFile.isBinary ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[#4a5a6e]">
            <FileWarning size={32} className="text-[#4a5a6e]" />
            <p className="text-[12px]">Binaere Datei — kein Vorschau moeglich</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download size={12} />
              Herunterladen
            </Button>
          </div>
        ) : activeFile.isImage ? (
          <ImagePreview
            content={activeFile.content}
            filename={fileName(activeFile.path)}
          />
        ) : editing ? (
          <div className="flex-1 overflow-hidden min-h-0">
            <CodeEditor
              content={editContent}
              language={activeFile.language}
              readOnly={false}
              onChange={setEditContent}
              onSave={saveFile}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0">
            <CodeEditor
              content={activeFile.content}
              language={activeFile.language}
              readOnly={true}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      {!activeFile.isBinary && (
        <StatusBar
          size={activeFile.size}
          permissions={activeFile.permissions}
          modified={activeFile.modified}
          language={activeFile.language}
        />
      )}
    </div>
  );
}
