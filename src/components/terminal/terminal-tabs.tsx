'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Terminal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TerminalTab {
  id: string;
  hostId: string;
  hostName: string;
  sessionName: string;
  pane: string;
  label: string;
  position: number;
  isActive: boolean;
}

interface TerminalTabsProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onReorderTabs?: (ids: string[]) => void;
}

function MobileTabSelector({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
}: TerminalTabsProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (!open) return;
    const handleTap = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleTap);
    document.addEventListener('touchstart', handleTap);
    return () => {
      document.removeEventListener('mousedown', handleTap);
      document.removeEventListener('touchstart', handleTap);
    };
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      className="relative shrink-0 border-b border-[#1a2028]"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Aktiver Tab als Button */}
      <div className="flex items-center h-11">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 px-3 h-full text-left"
        >
          <Terminal size={14} className="text-[#22d3ee] shrink-0" />
          <span className="text-[13px] text-[#22d3ee] truncate">
            {activeTab ? `${activeTab.hostName}:${activeTab.sessionName}` : 'Kein Tab'}
          </span>
          {tabs.length > 1 && (
            <span className="text-[11px] text-[#4a5a6e] ml-auto mr-1">
              {tabs.findIndex((t) => t.id === activeTabId) + 1}/{tabs.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn(
              'text-[#4a5a6e] transition-transform shrink-0',
              open && 'rotate-180'
            )}
          />
        </button>

        <button
          onClick={onAddTab}
          className="h-11 px-3 text-[#4a5a6e] active:text-[#8a9bb0] border-l border-[#1a2028]"
          aria-label="Neues Terminal"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Dropdown-Liste */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 border-b border-[#1a2028] max-h-[60vh] overflow-y-auto"
          style={{ background: 'var(--bg-surface)' }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 px-3 h-11 cursor-pointer border-b border-[#1a2028]/50',
                  isActive
                    ? 'bg-[#030404] text-[#22d3ee]'
                    : 'text-[#8a9bb0] active:bg-[#0b0e11]'
                )}
                onClick={() => {
                  onSelectTab(tab.id);
                  setOpen(false);
                }}
              >
                <Terminal size={14} className={isActive ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'} />
                <span className="text-[13px] truncate flex-1">
                  {tab.hostName}:{tab.sessionName}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                    if (tabs.length <= 1) setOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-sm text-[#4a5a6e] active:text-[#f87171]"
                  aria-label={`${tab.label} schließen`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DesktopTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onReorderTabs,
}: TerminalTabsProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDragId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparentes Drag-Image um den Browser-Ghost zu minimieren
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (tabId !== dragId) {
      setDropTargetId(tabId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId || !onReorderTabs) {
      setDragId(null);
      setDropTargetId(null);
      return;
    }

    const oldIndex = tabs.findIndex((t) => t.id === dragId);
    const newIndex = tabs.findIndex((t) => t.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...tabs];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorderTabs(reordered.map((t) => t.id));

    setDragId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTargetId(null);
  };

  return (
    <div
      className="flex items-center gap-0 overflow-x-auto border-b border-[#1a2028] shrink-0"
      style={{ background: 'var(--bg-surface)', minHeight: '36px' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isDragging = tab.id === dragId;
        const isDropTarget = tab.id === dropTargetId && dragId !== null;
        return (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragEnd={handleDragEnd}
            onDragLeave={() => setDropTargetId(null)}
            className={cn(
              'flex items-center gap-2 px-3 h-9 border-r border-[#1a2028] cursor-pointer',
              'text-[12px] select-none group transition-colors shrink-0',
              isActive
                ? 'bg-[#030404] text-[#22d3ee] border-b-[1px] border-b-[#22d3ee]'
                : 'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#0b0e11]',
              isDragging && 'opacity-40',
              isDropTarget && 'border-l-2 border-l-[#22d3ee]'
            )}
            style={{
              borderBottom: isActive ? '1px solid var(--cyan)' : '1px solid transparent',
            }}
            onClick={() => onSelectTab(tab.id)}
          >
            <Terminal size={11} className={isActive ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'} />
            <span className="max-w-[160px] truncate">{tab.hostName}:{tab.sessionName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className={cn(
                'w-4 h-4 flex items-center justify-center rounded-sm ml-1',
                'text-[#4a5a6e] hover:text-[#f87171] hover:bg-[#1a2028]',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
              aria-label={`Close ${tab.label}`}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}

      <button
        onClick={onAddTab}
        className="h-9 px-3 text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#0b0e11] transition-colors border-r border-[#1a2028]"
        aria-label="Open new terminal"
        title="Open new terminal"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function TerminalTabs(props: TerminalTabsProps) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileTabSelector {...props} /> : <DesktopTabs {...props} />;
}
