'use client';

import { cn } from '@/lib/utils';
import type { TerminalLayout, LayoutSlot } from '@/hooks/use-terminal-layout';
import type { TerminalTab } from '@/components/terminal/terminal-tabs';
import { TerminalView } from '@/components/terminal/terminal-view';
import { GridSlot } from '@/components/terminal/grid-slot';

// CSS-Grid-Klassen je Layout
const GRID_CLASSES: Record<TerminalLayout, string> = {
  single: 'grid-cols-1 grid-rows-1',
  'split-h': 'grid-cols-2 grid-rows-1',
  'split-v': 'grid-cols-1 grid-rows-2',
  quad: 'grid-cols-2 grid-rows-2',
  ide: 'grid-cols-1 grid-rows-1',
};

interface TerminalGridProps {
  layout: TerminalLayout;
  slots: LayoutSlot[];
  tabs: TerminalTab[];
  onAssignTab: (slotId: string, tabId: string) => void;
  onRemoveTab: (slotId: string) => void;
  broadcastMode: boolean;
  fontSize: number;
  // Callback um sendData-Funktion eines Terminals im Parent zu registrieren
  onSendData: (tabId: string, fn: (data: string) => void) => void;
}

export function TerminalGrid({
  layout,
  slots,
  tabs,
  onAssignTab,
  onRemoveTab,
  broadcastMode,
  fontSize,
  onSendData,
}: TerminalGridProps) {
  return (
    <div
      className={cn('grid gap-px h-full', GRID_CLASSES[layout])}
      data-layout={layout}
      style={{ background: '#1a2028' }} // Gap-Farbe (Trennlinie)
    >
      {slots.map((slot) => {
        const assignedTab = slot.tabId
          ? tabs.find((t) => t.id === slot.tabId) ?? null
          : null;

        return (
          <GridSlot
            key={slot.id}
            slotId={slot.id}
            tabId={slot.tabId}
            tabs={tabs}
            onAssign={(tabId) => onAssignTab(slot.id, tabId)}
            onRemove={() => onRemoveTab(slot.id)}
            broadcastMode={broadcastMode}
          >
            {/* Terminal-View nur rendern wenn Tab zugewiesen und gefunden */}
            {assignedTab && (
              <TerminalView
                hostId={assignedTab.hostId}
                sessionName={assignedTab.sessionName}
                pane={assignedTab.pane}
                fontSize={fontSize}
                visible={true}
                className="w-full h-full"
                onSendData={(fn) => onSendData(assignedTab.id, fn)}
              />
            )}
          </GridSlot>
        );
      })}
    </div>
  );
}
