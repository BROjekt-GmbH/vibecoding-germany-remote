'use client';

import { useRef, useState, useEffect } from 'react';
import {
  FolderOpen,

  Terminal,
  Plus,
  Search,
  Monitor,
  History,
  FolderKanban,
} from 'lucide-react';
import { usePanelManager } from '@/lib/stores/panel-manager';
import { useCommandPalette } from '@/lib/stores/command-palette';
import type { PanelId } from '@/types/panels';

// Primaere Panel-Buttons die immer sichtbar sind
interface PrimaryButton {
  id: PanelId;
  icon: React.ReactNode;
  label: string;
}

const PRIMARY_BUTTONS: PrimaryButton[] = [
  { id: 'files',         icon: <FolderOpen  size={15} />, label: 'Dateien' },
  { id: 'terminal-mini', icon: <Terminal    size={15} />, label: 'Terminal' },
];

// Weitere Panels im [+]-Dropdown
interface MoreButton {
  id: PanelId;
  icon: React.ReactNode;
  label: string;
}

const MORE_BUTTONS: MoreButton[] = [
  { id: 'projects',    icon: <FolderKanban size={14} />, label: 'Projekte' },
  { id: 'host-status', icon: <Monitor      size={14} />, label: 'Host-Status' },
  { id: 'history',     icon: <History      size={14} />, label: 'Verlauf' },
];

export function QuickActionBar() {
  const { panels, togglePanel } = usePanelManager();
  const toggleCommandPalette = useCommandPalette((s) => s.toggle);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown bei Klick ausserhalb schliessen
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  return (
    <div className="flex items-center gap-1">
      {/* Primaere Panel-Buttons */}
      {PRIMARY_BUTTONS.map(({ id, icon, label }) => {
        const isActive = panels[id]?.open && !panels[id]?.minimized;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => togglePanel(id)}
            className="relative flex items-center justify-center rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cyan)]"
            style={{
              width: 'clamp(32px, 5vw, 28px)',
              height: 'clamp(32px, 5vw, 28px)',
              minWidth: 32,
              minHeight: 32,
              color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
              background: isActive ? 'var(--cyan-glow)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
          >
            {icon}
          </button>
        );
      })}

      {/* [+] Dropdown fuer weitere Panels */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          title="Weitere Panels"
          aria-label="Weitere Panels"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          onClick={() => setDropdownOpen((v) => !v)}
          className="relative flex items-center justify-center rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cyan)]"
          style={{
            width: 'clamp(32px, 5vw, 28px)',
            height: 'clamp(32px, 5vw, 28px)',
            minWidth: 32,
            minHeight: 32,
            color: dropdownOpen ? 'var(--cyan)' : 'var(--text-muted)',
            background: dropdownOpen ? 'var(--cyan-glow)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!dropdownOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
            }
          }}
          onMouseLeave={(e) => {
            if (!dropdownOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }
          }}
        >
          <Plus size={15} />
        </button>

        {/* Dropdown-Inhalt */}
        {dropdownOpen && (
          <div
            className="animate-fade-in absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-sm overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {MORE_BUTTONS.map(({ id, icon, label }) => {
              const isActive = panels[id]?.open && !panels[id]?.minimized;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    togglePanel(id);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors duration-100"
                  style={{
                    color: isActive ? 'var(--cyan)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--cyan-glow)' : 'transparent',
                    minHeight: 36,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-overlay)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{ color: isActive ? 'var(--cyan)' : 'var(--text-muted)' }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Trennlinie */}
      <div
        className="mx-1 self-stretch"
        style={{ width: 1, background: 'var(--border-subtle)' }}
        aria-hidden="true"
      />

      {/* Ctrl+K Suche */}
      <button
        type="button"
        title="Befehlspalette (Ctrl+K)"
        aria-label="Befehlspalette oeffnen"
        onClick={toggleCommandPalette}
        className="flex items-center gap-1.5 rounded-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cyan)]"
        style={{
          height: 'clamp(32px, 5vw, 28px)',
          minHeight: 32,
          paddingLeft: 8,
          paddingRight: 8,
          color: 'var(--text-muted)',
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
        }}
      >
        <Search size={13} />
        <span className="text-[10px] tracking-wider hidden sm:inline" style={{ color: 'var(--text-dim)' }}>
          Ctrl+K
        </span>
      </button>
    </div>
  );
}
