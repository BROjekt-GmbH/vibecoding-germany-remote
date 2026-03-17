'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText } from 'lucide-react';
import { TerminalView } from '@/components/terminal/terminal-view';
import { FileTree } from '@/components/files/file-tree';
import { FileViewer } from '@/components/files/file-viewer';
import { ResizableDivider } from '@/components/ui/resizable-divider';
import { useIdeFileBrowser } from '@/lib/stores/ide-file-browser';
import type { TerminalTab } from '@/components/terminal/terminal-tabs';

const STORAGE_KEY = 'ide-layout-sizes';
const DEFAULT_TREE_WIDTH = 250;
const MIN_TREE_WIDTH = 180;
const MAX_TREE_WIDTH = 400;
const DEFAULT_EDITOR_RATIO = 0.67; // 2/3

interface SavedSizes {
  treeWidth: number;
  editorRatio: number;
}

function loadSizes(): SavedSizes {
  if (typeof window === 'undefined') {
    return { treeWidth: DEFAULT_TREE_WIDTH, editorRatio: DEFAULT_EDITOR_RATIO };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        treeWidth: Math.max(MIN_TREE_WIDTH, Math.min(MAX_TREE_WIDTH, parsed.treeWidth ?? DEFAULT_TREE_WIDTH)),
        editorRatio: Math.max(0.2, Math.min(0.9, parsed.editorRatio ?? DEFAULT_EDITOR_RATIO)),
      };
    }
  } catch { /* ignore */ }
  return { treeWidth: DEFAULT_TREE_WIDTH, editorRatio: DEFAULT_EDITOR_RATIO };
}

function saveSizes(sizes: SavedSizes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
}

interface IdeLayoutProps {
  activeTab: TerminalTab | null;
  fontSize: number;
  onSendData?: (fn: (data: string) => void) => void;
}

export function IdeLayout({ activeTab, fontSize, onSendData }: IdeLayoutProps) {
  const [initialSizes] = useState(loadSizes);
  const [treeWidth, setTreeWidth] = useState(initialSizes.treeWidth);
  const [editorRatio, setEditorRatio] = useState(initialSizes.editorRatio);
  const containerRef = useRef<HTMLDivElement>(null);

  const { hostId, setHostId, reset, activeFile } = useIdeFileBrowser();

  // Ctrl+B: File-Tree toggling
  const [treeVisible, setTreeVisible] = useState(true);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setTreeVisible((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Host + cwd synchronisieren wenn sich der aktive Tab aendert
  useEffect(() => {
    if (!activeTab) {
      reset();
      return;
    }

    // Host setzen (nur wenn anders)
    if (activeTab.hostId !== hostId) {
      setHostId(activeTab.hostId);
    }

    // cwd abfragen
    fetch(`/api/hosts/${activeTab.hostId}/sessions/${encodeURIComponent(activeTab.sessionName)}/cwd?pane=${encodeURIComponent(activeTab.pane)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.cwd) {
          useIdeFileBrowser.getState().browse(data.cwd);
        }
      })
      .catch(() => {
        // Fallback: root browsing — setHostId hat browse() bereits ausgeloest
      });
  }, [activeTab?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tree-Width Resize
  const handleTreeResize = useCallback((delta: number) => {
    setTreeWidth((prev) => Math.max(MIN_TREE_WIDTH, Math.min(MAX_TREE_WIDTH, prev + delta)));
  }, []);

  // Editor/Terminal Ratio Resize
  const handleEditorResize = useCallback((delta: number) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.clientHeight;
    if (totalHeight === 0) return;
    setEditorRatio((prev) => Math.max(0.2, Math.min(0.9, prev + delta / totalHeight)));
  }, []);

  // Persist bei Resize-Ende — Refs statt State-Dependencies fuer stabilen Callback
  const treeWidthRef = useRef(treeWidth);
  const editorRatioRef = useRef(editorRatio);
  useEffect(() => { treeWidthRef.current = treeWidth; }, [treeWidth]);
  useEffect(() => { editorRatioRef.current = editorRatio; }, [editorRatio]);

  const handleResizeEnd = useCallback(() => {
    saveSizes({ treeWidth: treeWidthRef.current, editorRatio: editorRatioRef.current });
  }, []);

  // Doppelklick: Reset auf Default
  const handleTreeDoubleClick = useCallback(() => {
    setTreeWidth(DEFAULT_TREE_WIDTH);
    saveSizes({ treeWidth: DEFAULT_TREE_WIDTH, editorRatio: editorRatioRef.current });
  }, []);

  const handleEditorDoubleClick = useCallback(() => {
    setEditorRatio(DEFAULT_EDITOR_RATIO);
    saveSizes({ treeWidth: treeWidthRef.current, editorRatio: DEFAULT_EDITOR_RATIO });
  }, []);

  // IDE-Store als Hook-Wrapper fuer FileTree/FileViewer
  const useStore = useIdeFileBrowser;

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* File-Tree (Ctrl+B togglebar) */}
      {treeVisible && (
        <>
          <div
            className="shrink-0 overflow-hidden flex flex-col"
            style={{ width: treeWidth, borderRight: '1px solid #1a2028' }}
          >
            <FileTree useStore={useStore} />
          </div>

          {/* Horizontaler Divider */}
          <ResizableDivider
            direction="horizontal"
            onResize={handleTreeResize}
            onResizeEnd={handleResizeEnd}
            onDoubleClick={handleTreeDoubleClick}
          />
        </>
      )}

      {/* Rechte Spalte: Editor + Terminal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Code-Editor */}
        <div
          className="overflow-hidden flex flex-col min-h-0"
          style={{ height: `${editorRatio * 100}%` }}
        >
          {activeFile ? (
            <FileViewer useStore={useStore} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: '#060809' }}>
              <FileText size={32} className="text-[#2d3f52]" />
              <p className="text-[12px] text-[#4a5a6e]">Datei aus dem File-Tree auswaehlen</p>
            </div>
          )}
        </div>

        {/* Vertikaler Divider */}
        <ResizableDivider
          direction="vertical"
          onResize={handleEditorResize}
          onResizeEnd={handleResizeEnd}
          onDoubleClick={handleEditorDoubleClick}
        />

        {/* Terminal */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {activeTab ? (
            <TerminalView
              hostId={activeTab.hostId}
              sessionName={activeTab.sessionName}
              pane={activeTab.pane}
              fontSize={fontSize}
              visible={true}
              className="w-full h-full"
              onSendData={onSendData}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center h-full" style={{ background: 'var(--terminal-bg)' }}>
              <p className="text-[12px] text-[#4a5a6e]">Keine Terminal-Session aktiv</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
