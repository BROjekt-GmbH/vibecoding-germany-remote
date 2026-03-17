'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TerminalView } from '@/components/terminal/terminal-view';
import { TerminalTabs, type TerminalTab } from '@/components/terminal/terminal-tabs';
import { TerminalToolbar } from '@/components/terminal/terminal-toolbar';
import { TerminalKeysToolbar } from '@/components/terminal/terminal-keys-toolbar';
import { SessionPickerDialog } from '@/components/terminal/session-picker-dialog';
import { TerminalGrid } from '@/components/terminal/terminal-grid';
import { IdeLayout } from '@/components/terminal/ide-layout';
import { useTerminalLayout } from '@/hooks/use-terminal-layout';
import { useIdeFileBrowser } from '@/lib/stores/ide-file-browser';
import { useTerminalTabEvents } from '@/lib/stores/terminal-tab-events';
import { Spinner } from '@/components/ui/spinner';
import { Terminal, Plus, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { useRouter } from 'next/navigation';

interface DbTab {
  id: string;
  hostId: string;
  hostName: string | null;
  sessionName: string;
  pane: string;
  position: number;
  isActive: boolean;
}

function dbTabToTab(dt: DbTab): TerminalTab {
  const hostName = dt.hostName ?? 'Unknown';
  return {
    id: dt.id,
    hostId: dt.hostId,
    hostName,
    sessionName: dt.sessionName,
    pane: dt.pane ?? '0',
    label: `${hostName}:${dt.sessionName}`,
    position: dt.position,
    isActive: dt.isActive,
  };
}

export default function TerminalPage() {
  const isMobile = useIsMobile();
  const vpHeight = useVisualViewport();
  const router = useRouter();

  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [sendData, setSendData] = useState<((data: string) => void) | null>(null);
  const [fontSize, setFontSize] = useState(14);

  // Layout-State fuer Split-View
  const { layout, slots, setLayout, assignTab, removeTab, broadcastMode, setBroadcastMode } =
    useTerminalLayout('single');

  // sendData-Referenzen fuer alle Grid-Terminals (Broadcast-Mode)
  const sendDataRefsMap = useRef<Map<string, (data: string) => void>>(new Map());

  // sendData-Funktion eines Terminals registrieren
  const handleGridSendData = useCallback((tabId: string, fn: (data: string) => void) => {
    sendDataRefsMap.current.set(tabId, fn);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Beim Layout-Wechsel auf 'single': ersten freien Slot mit aktivem Tab vorbelegen
  useEffect(() => {
    if (layout === 'single' && activeTabId && slots[0]?.tabId === null) {
      assignTab('slot-0', activeTabId);
    }
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // IDE-Store zuruecksetzen wenn von IDE weg gewechselt wird
  useEffect(() => {
    if (layout !== 'ide') {
      useIdeFileBrowser.getState().reset();
    }
  }, [layout]);

  // Tabs aus DB laden
  useEffect(() => {
    fetch('/api/terminal/tabs')
      .then((r) => r.ok ? r.json() : [])
      .then((data: DbTab[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setLoading(false);
          setShowPicker(true);
          return;
        }
        const mapped = data.map(dbTabToTab);
        setTabs(mapped);
        const active = mapped.find((t) => t.isActive) ?? mapped[0];
        setActiveTabId(active.id);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setShowPicker(true);
      });
  }, []);

  // Aktiven Tab in DB speichern (debounced)
  useEffect(() => {
    if (!activeTabId) return;
    const timer = setTimeout(() => {
      fetch(`/api/terminal/tabs/${activeTabId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTabId]);

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
  };

  const handleReorderTabs = useCallback((ids: string[]) => {
    const reordered = ids
      .map((id, i) => {
        const tab = tabs.find((t) => t.id === id);
        return tab ? { ...tab, position: i } : null;
      })
      .filter((t): t is TerminalTab => t !== null);
    setTabs(reordered);

    fetch('/api/terminal/tabs/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }, [tabs]);

  const handleCloseTab = async (id: string) => {
    fetch(`/api/terminal/tabs/${id}`, { method: 'DELETE' }).catch(() => {});

    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);

    if (id === activeTabId) {
      if (newTabs.length > 0) {
        const nextIdx = Math.max(0, idx - 1);
        setActiveTabId(newTabs[nextIdx].id);
      } else {
        setActiveTabId(null);
        setShowPicker(true);
      }
    }
  };

  const handleAddTab = () => {
    setShowPicker(true);
  };

  const handleSelectSession = async (hostId: string, hostName: string, sessionName: string, pane = '0') => {
    const existing = tabs.find(
      (t) => t.hostId === hostId && t.sessionName === sessionName && t.pane === pane
    );
    if (existing) {
      setActiveTabId(existing.id);
      setShowPicker(false);
      return;
    }

    try {
      const res = await fetch('/api/terminal/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, sessionName, pane }),
      });
      if (!res.ok) return;
      const dbTab: DbTab = await res.json();
      const newTab = dbTabToTab(dbTab);
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch { /* ignore */ }

    setShowPicker(false);
  };

  // Pending Tab aus dem Files-Panel konsumieren
  const pendingTab = useTerminalTabEvents((s) => s.pendingTab);
  const consumeTab = useTerminalTabEvents((s) => s.consumeTab);

  useEffect(() => {
    if (!pendingTab || loading) return;
    const tab = consumeTab();
    if (!tab) return;

    // Existierenden Tab aktivieren, falls vorhanden
    const existing = tabs.find(
      (t) => t.hostId === tab.hostId && t.sessionName === tab.sessionName && t.pane === tab.pane
    );
    if (existing) {
      queueMicrotask(() => setActiveTabId(existing.id));
      return;
    }

    // Neuen Tab erstellen — Host-Name kommt aus API-Response
    fetch('/api/terminal/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: tab.hostId, sessionName: tab.sessionName, pane: tab.pane }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((dbTab: DbTab | null) => {
        if (!dbTab) return;
        const newTab = dbTabToTab(dbTab);
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      })
      .catch(() => {});
  }, [pendingTab, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <Spinner size="md" />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Lade Sessions...</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        position: 'fixed',
        top: isMobile ? 0 : 'var(--header-height)',
        left: isMobile ? 0 : 'var(--sidebar-width)',
        right: 0,
        overscrollBehavior: 'none',
        ...(isMobile && vpHeight != null
          ? { height: vpHeight }
          : { bottom: 'var(--footer-height)' }),
      }}
    >
      {/* Mobile header */}
      {isMobile && (
        <div
          className="flex items-center justify-between px-3 shrink-0"
          style={{ height: '36px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[13px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Terminal</span>
          <button
            onClick={() => router.push('/')}
            className="w-7 h-7 flex items-center justify-center rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tab bar */}
      {tabs.length > 0 && (
        <TerminalTabs
          tabs={tabs}
          activeTabId={activeTabId ?? ''}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onAddTab={handleAddTab}
          onReorderTabs={handleReorderTabs}
        />
      )}

      {/* Terminal-Bereich: IDE, Single oder Grid je nach Layout */}
      <div className="flex-1 min-h-0 relative">
        {layout === 'ide' ? (
          /* IDE-Modus: File-Tree + Editor + Terminal */
          <IdeLayout
            activeTab={activeTab}
            fontSize={isMobile ? 12 : fontSize}
            onSendData={(fn) => setSendData(() => fn)}
          />
        ) : layout === 'single' ? (
          /* Single-Mode: alle Terminals gemountet, nur aktiver sichtbar */
          <>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                style={{
                  display: tab.id === activeTabId ? 'block' : 'none',
                  position: 'absolute',
                  inset: 0,
                }}
              >
                <TerminalView
                  hostId={tab.hostId}
                  sessionName={tab.sessionName}
                  pane={tab.pane}
                  fontSize={isMobile ? 12 : fontSize}
                  visible={tab.id === activeTabId}
                  className="w-full h-full"
                  onSendData={
                    tab.id === activeTabId
                      ? (fn) => setSendData(() => fn)
                      : undefined
                  }
                />
              </div>
            ))}

            {/* Leerer State */}
            {tabs.length === 0 && !showPicker && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div
                  className="w-16 h-16 rounded-sm flex items-center justify-center"
                  style={{ background: 'var(--terminal-bg)', border: '1px solid var(--border-default)' }}
                >
                  <Terminal
                    size={24}
                    className="text-[#22d3ee]"
                    style={{ filter: 'drop-shadow(0 0 8px var(--cyan))' }}
                  />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Keine offenen Sessions
                </p>
                <button onClick={() => setShowPicker(true)} className="btn btn-primary">
                  <Plus size={13} />
                  Session verbinden
                </button>
              </div>
            )}
          </>
        ) : (
          /* Multi-Layout: Terminal-Grid mit Slots */
          <TerminalGrid
            layout={layout}
            slots={slots}
            tabs={tabs}
            onAssignTab={assignTab}
            onRemoveTab={removeTab}
            broadcastMode={broadcastMode}
            fontSize={isMobile ? 12 : fontSize}
            onSendData={handleGridSendData}
          />
        )}
      </div>

      {/* Bottom toolbar — Desktop */}
      {!isMobile && (activeTab || layout !== 'single') && (
        <TerminalToolbar
          hostName={layout === 'single' ? activeTab?.hostName : undefined}
          sessionName={layout === 'single' ? activeTab?.sessionName : undefined}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          layout={layout}
          onLayoutChange={setLayout}
          broadcastMode={broadcastMode}
          onBroadcastModeChange={setBroadcastMode}
        />
      )}

      {/* Mobile keys toolbar */}
      {isMobile && activeTab && sendData && (
        <TerminalKeysToolbar onKey={sendData} />
      )}

      {/* Session-Picker Dialog */}
      <SessionPickerDialog
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectSession}
        existingTabs={tabs.map((t) => ({ hostId: t.hostId, sessionName: t.sessionName, pane: t.pane }))}
      />
    </div>
  );
}
