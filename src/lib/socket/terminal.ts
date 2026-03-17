import type { Namespace, Socket } from 'socket.io';
import { sshPool } from '../ssh/pool';
import { getHostSSHConfig } from '../ssh/client';
import { TERMINAL_EVENTS } from './events';
import type { ClientChannel } from '../ssh/types';

// Shared-Terminal: Map von "hostId:sessionName:pane" → Set von Zuschauer-Sockets
const sharedViewers = new Map<string, Set<Socket>>();

function sharedKey(hostId: string, sessionName: string, pane: string) {
  return `${hostId}:${sessionName}:${pane}`;
}

interface TerminalConnectPayload {
  hostId: string;
  sessionName: string;
  pane?: string;
  cols?: number;
  rows?: number;
}

export function setupTerminalNamespace(ns: Namespace) {
  ns.on('connection', (socket: Socket) => {
    let sshStream: ClientChannel | null = null;

    socket.on(TERMINAL_EVENTS.CONNECT, async (payload: TerminalConnectPayload) => {
      // Alten Stream aufraumen falls vorhanden
      if (sshStream) {
        sshStream.removeAllListeners();
        sshStream.end();
        sshStream = null;
      }

      try {
        const config = await getHostSSHConfig(payload.hostId);
        const window = payload.cols && payload.rows
          ? { cols: payload.cols, rows: payload.rows }
          : undefined;
        const stream = await sshPool.shell(payload.hostId, config, window);
        sshStream = stream;

        // UTF-8 Locale sicherstellen (Fallback falls SSH-Server AcceptEnv blockt)
        stream.write('export LANG=de_DE.UTF-8 LC_ALL=de_DE.UTF-8 2>/dev/null\n');

        // tmux: CSI u (extended keys) aktivieren, damit modifizierte
        // Tasten wie Shift+Enter korrekt an die Anwendung (z.B. Claude Code)
        // weitergeleitet werden. Erfordert tmux 3.2+.
        // "always" statt "on": Anwendungen (Claude Code) fordern CSI u
        // nicht explizit via XTMODKEYS an — "always" erzwingt die Weiterleitung.
        stream.write(
          'tmux set -s extended-keys always 2>/dev/null; ' +
          "tmux set -as terminal-features 'xterm*:extkeys' 2>/dev/null\n",
        );

        // Attach to tmux session — nur Session-Name verwenden,
        // kein :window/:pane Suffix (verursacht "can't find window"
        // bei base-index != 0 und erzeugt falsche Session-Namen)
        const session = payload.sessionName;
        stream.write(
          `tmux attach-session -t ${JSON.stringify(session)} || tmux new-session -s ${JSON.stringify(session)}\n`,
        );

        // Signal client that connection is ready
        socket.emit(TERMINAL_EVENTS.READY);

        // SSH output → browser + shared viewers
        stream.on('data', (data: Buffer) => {
          const str = data.toString('utf-8');
          socket.emit(TERMINAL_EVENTS.DATA, { data: str });
          // Broadcast an alle Shared-Viewer dieser Session
          const key = sharedKey(payload.hostId, payload.sessionName, payload.pane ?? '0');
          const viewers = sharedViewers.get(key);
          if (viewers) {
            for (const viewer of viewers) {
              viewer.emit(TERMINAL_EVENTS.DATA, { data: str });
            }
          }
        });

        stream.on('close', () => {
          socket.emit(TERMINAL_EVENTS.ERROR, {
            message: 'SSH connection closed',
            code: 'SSH_STREAM_CLOSED',
            recoverable: true,
          });
          sshStream = null;
        });

        stream.stderr.on('data', (data: Buffer) => {
          socket.emit(TERMINAL_EVENTS.DATA, { data: data.toString('utf-8') });
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        socket.emit(TERMINAL_EVENTS.ERROR, {
          message,
          code: 'SSH_CONNECTION_FAILED',
          recoverable: true,
        });
      }
    });

    // Browser keystrokes → SSH
    socket.on(TERMINAL_EVENTS.DATA, (payload: { data: string }) => {
      if (sshStream) {
        sshStream.write(payload.data);
      }
    });

    // Terminal resize
    socket.on(TERMINAL_EVENTS.RESIZE, (payload: { cols: number; rows: number }) => {
      if (sshStream) {
        sshStream.setWindow(payload.rows, payload.cols, 0, 0);
      }
    });

    // Explicit client disconnect event
    socket.on(TERMINAL_EVENTS.DISCONNECT, () => {
      if (sshStream) {
        sshStream.end();
        sshStream = null;
      }
    });

    // Shared Terminal — read-only Zuschauer-Verbindung
    let sharedViewerKey: string | null = null;

    socket.on('terminal:connect-shared', async (payload: { token: string }) => {
      try {
        const { shareTokens } = await import('../terminal/share-tokens');
        const data = shareTokens.get(payload.token);
        if (!data || data.expiresAt < Date.now()) {
          socket.emit(TERMINAL_EVENTS.ERROR, {
            message: 'Share-Token ungueltig oder abgelaufen',
            code: 'SHARE_TOKEN_INVALID',
            recoverable: false,
          });
          return;
        }

        const key = sharedKey(data.hostId, data.sessionName, data.pane);
        sharedViewerKey = key;

        if (!sharedViewers.has(key)) {
          sharedViewers.set(key, new Set());
        }
        sharedViewers.get(key)!.add(socket);

        socket.emit(TERMINAL_EVENTS.READY);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        socket.emit(TERMINAL_EVENTS.ERROR, {
          message,
          code: 'SHARE_CONNECT_FAILED',
          recoverable: false,
        });
      }
    });

    // Socket.io transport disconnect
    socket.on('disconnect', () => {
      if (sshStream) {
        sshStream.end();
        sshStream = null;
      }
      // Shared-Viewer aufraumen
      if (sharedViewerKey) {
        const viewers = sharedViewers.get(sharedViewerKey);
        if (viewers) {
          viewers.delete(socket);
          if (viewers.size === 0) sharedViewers.delete(sharedViewerKey);
        }
      }
    });
  });
}
