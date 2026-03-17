'use client';

import { Zap } from 'lucide-react';
import type { AuthUser } from '@/types';
import { NotificationCenter } from './notification-center';
import { QuickActionBar } from './quick-action-bar';

interface HeaderProps {
  user: AuthUser | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
      style={{
        height: 'var(--header-height)',
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo — auf Mobile nur Icon, ab sm mit Text */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6">
          <div className="absolute inset-0 bg-[#22d3ee] opacity-10 rounded-sm" />
          <Zap size={18} className="sm:!w-[14px] sm:!h-[14px] text-[#22d3ee] text-glow-cyan relative z-10" />
        </div>
        <span
          className="hidden sm:inline text-[13px] font-medium tracking-[0.15em] uppercase text-[#22d3ee]"
          style={{ textShadow: '0 0 12px rgba(34,211,238,0.4)' }}
        >
          Remote Team
        </span>
        <span className="hidden sm:inline text-[10px] text-[#2d3f52] tracking-widest uppercase ml-1">MERIDIAN</span>
      </div>

      {/* Mitte — Quick-Action-Bar (Panel-Schalter und Suche) */}
      <QuickActionBar />

      {/* Rechte Seite: Notification Center + User */}
      <div className="flex items-center gap-3">
        <NotificationCenter />

        {user && (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-[12px] text-[#8a9bb0] leading-none">{user.name}</div>
              <div className="text-[10px] text-[#4a5a6e] leading-none mt-0.5">{user.login}</div>
            </div>
            <div
              className="w-8 h-8 sm:w-7 sm:h-7 rounded-sm flex items-center justify-center text-[12px] sm:text-[11px] font-bold"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--cyan)' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
