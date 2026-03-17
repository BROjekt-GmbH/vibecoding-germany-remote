'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Server, Terminal, FolderOpen,
  Settings, Zap,
} from 'lucide-react';
import { useCommandPalette } from '@/lib/stores/command-palette';

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();

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
          <Command.Input placeholder="Suche nach Seiten, Aktionen..." autoFocus />
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

              <Command.Item onSelect={() => navigate('/settings')}>
                <Settings size={14} /> Einstellungen
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
