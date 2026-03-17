'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ session?: string; pane?: string }>;
}

export default function TerminalRedirect({ params, searchParams }: Props) {
  const { sessionId: hostId } = use(params);
  const { session: sessionName = 'main', pane = '0' } = use(searchParams);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/terminal/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId, sessionName, pane }),
    })
      .then(() => router.replace('/terminal'))
      .catch(() => router.replace('/terminal'));
  }, [hostId, sessionName, pane, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Weiterleitung...</span>
    </div>
  );
}
