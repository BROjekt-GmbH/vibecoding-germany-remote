'use client';

import { useEffect, useRef } from 'react';
import {
  FileText,
  Terminal,
  Edit3,
  Copy,
  Scissors,
  Clipboard,
  Download,
  Trash2,

} from 'lucide-react';
import { useFileBrowser } from '@/lib/stores/file-browser';
import { usePanelManager } from '@/lib/stores/panel-manager';
import { joinPath, parentPath } from '@/lib/files/utils';
import type { FileEntry } from '@/types';
import { useRouter } from 'next/navigation';

interface ContextMenuProps {
  entry: FileEntry;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
}

export function ContextMenu({
  entry,
  x,
  y,
  onClose,
  onRename,
  onDelete,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const openPanel = usePanelManager((s) => s.openPanel);
  const {
    hostId,
    currentPath,
    clipboard,
    setClipboard,
    paste,
    openFile,
    browse,
  } = useFileBrowser();

  const entryPath = joinPath(currentPath, entry.name);

  // Position anpassen wenn ausserhalb Viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const menu = menuRef.current;

    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  // Schliessen bei Klick ausserhalb
  useEffect(() => {
    const handleClick = () => onClose();
    const handleContextMenu = () => onClose();

    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.isDir) {
      browse(entryPath);
    } else {
      openFile(entry);
    }
    onClose();
  };

  const handleOpenInTerminal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dir = entry.isDir ? entryPath : (parentPath(entryPath) ?? '/');
    router.push(`/terminal?hostId=${encodeURIComponent(hostId)}&startDir=${encodeURIComponent(dir)}`);
    onClose();
  };

  const handleQuickTerminal = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPanel('terminal-mini');
    onClose();
  };


  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename(entryPath);
    onClose();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClipboard({ paths: [entryPath], mode: 'copy' });
    onClose();
  };

  const handleCut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClipboard({ paths: [entryPath], mode: 'cut' });
    onClose();
  };

  const handlePaste = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await paste();
    onClose();
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hostId || entry.isDir) return;
    try {
      const url = `/api/hosts/${hostId}/files?path=${encodeURIComponent(entryPath)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([data.content], { type: 'text/plain' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore
    }
    onClose();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(entryPath);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] py-1 rounded border border-[#222c38] bg-[#0b0e11] shadow-xl"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Oeffnen */}
      <MenuButton icon={<FileText size={12} />} onClick={handleOpen}>
        {entry.isDir ? 'Oeffnen' : 'Anzeigen'}
      </MenuButton>

      {/* Im Terminal oeffnen */}
      <MenuButton icon={<Terminal size={12} />} onClick={handleOpenInTerminal}>
        Im Terminal oeffnen
      </MenuButton>

      {/* Quick Terminal */}
      <MenuButton icon={<Terminal size={12} />} onClick={handleQuickTerminal}>
        Quick Terminal
      </MenuButton>

      <Separator />

      {/* Umbenennen */}
      <MenuButton icon={<Edit3 size={12} />} onClick={handleRename} shortcut="F2">
        Umbenennen
      </MenuButton>

      {/* Kopieren */}
      <MenuButton icon={<Copy size={12} />} onClick={handleCopy}>
        Kopieren
      </MenuButton>

      {/* Ausschneiden */}
      <MenuButton icon={<Scissors size={12} />} onClick={handleCut}>
        Ausschneiden
      </MenuButton>

      {/* Einfuegen (nur wenn Clipboard gefuellt) */}
      {clipboard && (
        <MenuButton icon={<Clipboard size={12} />} onClick={handlePaste}>
          Einfuegen
          <span className="text-[#4a5a6e] ml-1">({clipboard.paths.length})</span>
        </MenuButton>
      )}

      {/* Download (nur Dateien) */}
      {!entry.isDir && (
        <MenuButton icon={<Download size={12} />} onClick={handleDownload}>
          Herunterladen
        </MenuButton>
      )}

      <Separator />

      {/* Loeschen */}
      <MenuButton icon={<Trash2 size={12} />} onClick={handleDelete} danger>
        Loeschen
      </MenuButton>
    </div>
  );
}

interface MenuButtonProps {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
}

function MenuButton({ icon, onClick, children, shortcut, danger }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono transition-colors ${
        danger
          ? 'text-[#f87171] hover:bg-[#f87171]/10'
          : 'text-[#c8d6e5] hover:bg-[#1a2028]'
      }`}
    >
      <span className={danger ? 'text-[#f87171]' : 'text-[#4a5a6e]'}>{icon}</span>
      <span className="flex-1 text-left">{children}</span>
      {shortcut && (
        <span className="text-[#4a5a6e] text-[10px]">{shortcut}</span>
      )}
    </button>
  );
}

function Separator() {
  return <div className="my-1 border-t border-[#1a2028]" />;
}
