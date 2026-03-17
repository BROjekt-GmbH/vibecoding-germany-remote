'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TerminalView } from '@/components/terminal/terminal-view';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, Eye } from 'lucide-react';

interface ShareInfo {
  hostId: string;
  sessionName: string;
  pane: string;
  createdBy: string;
}

export default function SharedTerminalPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/terminal/share?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Token ungueltig');
        }
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#030404]">
        <Spinner size="md" />
        <span className="text-sm ml-3" style={{ color: 'var(--text-muted)' }}>Lade geteiltes Terminal...</span>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#030404] gap-3">
        <AlertCircle size={32} className="text-[#f87171]" />
        <p className="text-[#f87171] text-sm font-medium">{error || 'Token ungueltig'}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Der Share-Link ist abgelaufen oder ungueltig.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#030404]">
      {/* Banner */}
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs"
        style={{ background: 'var(--surface-raised)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
      >
        <Eye size={14} className="text-[#22d3ee]" />
        <span>
          Geteiltes Terminal von <strong className="text-[#c8d6e5]">{info.createdBy}</strong> — Nur lesen
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider">
          {info.sessionName}
        </span>
      </div>

      {/* Terminal — read-only via shared socket event */}
      <div className="flex-1 relative">
        <TerminalView
          hostId={info.hostId}
          sessionName={info.sessionName}
          pane={info.pane}
          className="absolute inset-0"
          readOnly
          shareToken={token}
        />
      </div>
    </div>
  );
}
