'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Server, Terminal, FolderOpen, ScrollText,
  Settings, FolderKanban, Clock, Zap,
} from 'lucide-react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import { useCommandPalette } from '@/lib/stores/command-palette';
import type { PanelId } from '@/types/panels';

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { togglePanel } = usePanelManager();

  // Ctrl+K / Cmd+K globaler Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const panel = (id: PanelId) => {
    togglePanel(id);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] md:pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Hintergrund-Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div className="relative z-10 w-full max-w-[560px] mx-auto px-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <Command label="Command Palette">
          <Command.Input placeholder="Suche nach Seiten, Panels, Aktionen..." autoFocus />
          <Command.List>
            <Command.Empty>Keine Ergebnisse gefunden.</Command.Empty>

            <Command.Group heading="Navigation">
              <Command.Item onSelect={() => navigate('/')}>
                <LayoutDashboard size={14} /> Dashboard
              </Command.Item>
              <Command.Item onSelect={() => navigate('/hosts')}>
                <Server size={14} /> Hosts
              </Command.Item>
              <Command.Item onSelect={() => navigate('/terminal')}>
                <Terminal size={14} /> Terminal
              </Command.Item>
              <Command.Item onSelect={() => navigate('/files')}>
                <FolderOpen size={14} /> Dateien
              </Command.Item>
              <Command.Item onSelect={() => navigate('/logs')}>
                <ScrollText size={14} /> Logs
              </Command.Item>
              <Command.Item onSelect={() => navigate('/settings')}>
                <Settings size={14} /> Einstellungen
              </Command.Item>
            </Command.Group>

            <Command.Separator />

            <Command.Group heading="Panels">
              <Command.Item onSelect={() => panel('files')}>
                <FolderOpen size={14} /> Panel: Dateien
              </Command.Item>
              <Command.Item onSelect={() => panel('logs')}>
                <ScrollText size={14} /> Panel: Logs
              </Command.Item>
              <Command.Item onSelect={() => panel('terminal-mini')}>
                <Terminal size={14} /> Panel: Quick Terminal
              </Command.Item>
              <Command.Item onSelect={() => panel('projects')}>
                <FolderKanban size={14} /> Panel: Projekte
              </Command.Item>
              <Command.Item onSelect={() => panel('host-status')}>
                <Server size={14} /> Panel: Host-Status
              </Command.Item>
              <Command.Item onSelect={() => panel('history')}>
                <Clock size={14} /> Panel: Verlauf
              </Command.Item>
            </Command.Group>

            <Command.Separator />

            <Command.Group heading="Aktionen">
              <Command.Item onSelect={() => navigate('/terminal')}>
                <Zap size={14} /> Neue Terminal-Session
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
