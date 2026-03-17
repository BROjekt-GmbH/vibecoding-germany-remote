'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, Terminal, FolderOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const tabs = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Hosts', path: '/hosts', icon: Server },
  { label: 'Terminal', path: '/terminal', icon: Terminal },
  { label: 'Files', path: '/files', icon: FolderOpen },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  if (!isMobile || pathname.startsWith('/terminal/')) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t"
      style={{
        height: 'var(--tab-bar-height)',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.path ||
          (tab.path !== '/' && pathname.startsWith(tab.path));
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative',
              isActive
                ? 'text-[var(--cyan)]'
                : 'text-[var(--text-muted)]'
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] leading-none">{tab.label}</span>
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: 'var(--cyan)' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
