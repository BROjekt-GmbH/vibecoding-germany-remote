'use client';

import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTerminal } from '@/hooks/use-terminal';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface TerminalViewProps {
  hostId: string;
  sessionName: string;
  pane?: string;
  fontSize?: number;
  fontFamily?: string;
  className?: string;
  onSendData?: (sendFn: (data: string) => void) => void;
  visible?: boolean;
  readOnly?: boolean;
  shareToken?: string;
}

export function TerminalView({
  hostId,
  sessionName,
  pane = '0',
  fontSize = 14,
  fontFamily,
  className = '',
  onSendData,
  visible = true,
  readOnly = false,
  shareToken,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { terminal, fitAddon, ready } = useTerminal(containerRef, { fontSize, fontFamily });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  const MAX_RETRIES = 5;
  const BACKOFF_BASE = 1000; // 1s
  const BACKOFF_MAX = 8000; // 8s

  // Keep ref in sync with state
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    if (!ready || !terminal) return;

    const socket = io('/terminal', { reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (readOnly && shareToken) {
        socket.emit('terminal:connect-shared', { token: shareToken });
      } else {
        socket.emit('terminal:connect', {
          hostId,
          sessionName,
          pane,
          cols: terminal.cols,
          rows: terminal.rows,
        });
      }
      setConnecting(true);
      setError(null);
    });

    socket.on('terminal:ready', () => {
      setConnected(true);
      setConnecting(false);
      retryCountRef.current = 0;
      // Explicitly send current dimensions — the initial resize
      // may have been lost before the SSH stream was created
      if (fitAddon) {
        fitAddon.fit();
      }
      socket.emit('terminal:resize', {
        cols: terminal.cols,
        rows: terminal.rows,
      });
      onSendData?.((data: string) => {
        if (connectedRef.current) {
          socket.emit('terminal:data', { data });
        }
      });
      if (visible) terminal.focus();
    });

    socket.on('terminal:data', ({ data }: { data: string }) => {
      terminal.write(data);
    });

    socket.on('terminal:error', ({ message, code }: { message: string; code?: string }) => {
      setConnected(false);

      // Auto-Reconnect bei SSH-Stream-Close
      if (code === 'SSH_STREAM_CLOSED' && retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BACKOFF_BASE * 2 ** retryCountRef.current, BACKOFF_MAX);
        retryCountRef.current++;
        setConnecting(true);
        setError(null);
        retryTimerRef.current = setTimeout(() => {
          socket.emit('terminal:connect', {
            hostId, sessionName, pane,
            cols: terminal?.cols, rows: terminal?.rows,
          });
        }, delay);
      } else {
        retryCountRef.current = 0;
        setError(message);
        setConnecting(false);
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Send keystrokes — use ref to avoid stale closure (skip in read-only mode)
    const dataDispose = terminal.onData((data) => {
      if (connectedRef.current && !readOnly) {
        socket.emit('terminal:data', { data });
      }
    });

    // Handle resize
    const resizeDispose = terminal.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { cols, rows });
    });

    if (fitAddon) {
      fitAddon.fit();
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      socket.emit('terminal:disconnect');
      socket.disconnect();
      dataDispose.dispose();
      resizeDispose.dispose();
      socketRef.current = null;
    };
  }, [ready, terminal, fitAddon, hostId, sessionName, pane, readOnly, shareToken]);

  // Re-fit und Fokus wenn Tab sichtbar wird
  useEffect(() => {
    if (visible && fitAddon && ready) {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          if (terminal && socketRef.current) {
            socketRef.current.emit('terminal:resize', {
              cols: terminal.cols,
              rows: terminal.rows,
            });
          }
          terminal?.focus();
        } catch { /* ignore */ }
      });
    }
  }, [visible, fitAddon, ready, terminal]);

  const reconnect = () => {
    retryCountRef.current = 0;
    setError(null);
    setConnecting(true);
    if (readOnly && shareToken) {
      socketRef.current?.emit('terminal:connect-shared', { token: shareToken });
    } else {
      socketRef.current?.emit('terminal:connect', {
        hostId, sessionName, pane,
        cols: terminal?.cols, rows: terminal?.rows,
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* xterm.js mounts here — inline position overrides .scanline's position:relative */}
      <div
        ref={containerRef}
        className="scanline"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--terminal-bg)',
          opacity: connected ? 1 : 0.4,
          transition: 'opacity 0.3s ease',
          touchAction: 'none',
        }}
      />

      {/* Connecting overlay */}
      {connecting && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030404]/80 backdrop-blur-sm z-10">
          <Spinner size="md" />
          <span className="text-label text-[#4a5a6e] mt-3">
            CONNECTING TO {sessionName.toUpperCase()}
          </span>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030404]/90 z-10 gap-3">
          <AlertCircle size={24} className="text-[#f87171]" />
          <div className="text-center">
            <p className="text-[#f87171] text-sm font-medium">Connection Failed</p>
            <p className="text-[#4a5a6e] text-xs mt-1 max-w-xs">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reconnect}>
            <RefreshCw size={12} />
            Reconnect
          </Button>
        </div>
      )}
    </div>
  );
}
