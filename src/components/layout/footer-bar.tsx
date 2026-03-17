'use client';

import { ConnectionStatus } from './connection-status';

export function FooterBar() {
  return (
    <footer
      className="fixed left-0 right-0 z-30 flex items-center px-4"
      style={{
        height: 'var(--footer-height)',
        bottom: 'var(--tab-bar-height)',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <ConnectionStatus />
    </footer>
  );
}
