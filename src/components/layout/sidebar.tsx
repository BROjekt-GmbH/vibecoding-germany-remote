'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Server,
  FolderOpen,
  FileText,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Hosts', path: '/hosts', icon: Server },
  { label: 'Terminal', path: '/terminal', icon: Terminal },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Files', path: '/files', icon: FileText },
  { label: 'Logs', path: '/logs', icon: ScrollText },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored === 'true';
    }
    return false;
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  // Ctrl+B Shortcut aus use-keyboard-shortcuts empfangen
  useEffect(() => {
    function onSidebarToggle(e: Event) {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      setCollapsed(detail.collapsed);
    }
    window.addEventListener('sidebar-toggle', onSidebarToggle);
    return () => window.removeEventListener('sidebar-toggle', onSidebarToggle);
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-[var(--header-height)] bottom-0 z-20 hidden md:flex flex-col',
        'border-r border-[#1a2028] bg-[#060809]',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[52px]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Nav items */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-sm text-[13px]',
                'transition-all duration-150 group relative',
                'animate-slide-left',
                `stagger-${Math.min(i + 1, 6)}`,
                isActive
                  ? 'bg-[#0e3a5e] text-[#22d3ee] border border-[#0e7490]'
                  : 'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#0b0e11] border border-transparent'
              )}
            >
              <Icon
                size={16}
                className={cn(
                  'flex-shrink-0',
                  isActive ? 'text-[#22d3ee]' : 'text-[#4a5a6e] group-hover:text-[#8a9bb0]'
                )}
              />
              {!collapsed && (
                <span className="truncate tracking-wide">{item.label}</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#22d3ee] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-3 border-t border-[#1a2028] pt-3">
        <button
          onClick={toggle}
          className={cn(
            'w-full flex items-center gap-3 px-2 py-2 rounded-sm',
            'text-[#4a5a6e] hover:text-[#8a9bb0] hover:bg-[#0b0e11]',
            'transition-colors text-[13px]',
            collapsed && 'justify-center'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Meridian wordmark */}
      {!collapsed && (
        <div className="px-4 pb-3 flex items-center gap-1.5 opacity-20">
          <Zap size={10} className="text-[#22d3ee]" />
          <span className="text-[10px] tracking-[0.2em] text-[#22d3ee] uppercase">Meridian</span>
        </div>
      )}
    </aside>
  );
}
