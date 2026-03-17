import { createServer } from 'http';
import next from 'next';
import { Server as SocketIO } from 'socket.io';
import { setupTerminalNamespace } from '../src/lib/socket/terminal';
import { setupUpdatesNamespace } from '../src/lib/socket/updates';

import { resolveIdentity } from '../src/lib/tailscale/whois';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    // Tailscale-Identitaet aus Client-IP ermitteln (via LocalAPI WhoIs)
    const xff = req.headers['x-forwarded-for'] as string | undefined;
    const remoteAddr = req.socket.remoteAddress;
    const clientIp = xff?.split(',')[0].trim() || remoteAddr;

    // Nur fuer Tailscale-IPs (100.x.x.x) WhoIs abfragen
    if (clientIp?.startsWith('100.') && !req.headers['tailscale-user-login']) {
      try {
        const identity = await resolveIdentity(clientIp);
        if (identity) {
          req.headers['tailscale-user-login'] = identity.login;
          req.headers['tailscale-user-name'] = identity.displayName;
        } else {
          console.error(`WhoIs: keine Identity fuer ${clientIp} (xff=${xff}, remote=${remoteAddr})`);
        }
      } catch (err) {
        console.error('WhoIs-Middleware Fehler:', err);
      }
    } else if (!req.headers['tailscale-user-login'] && req.url && !req.url.startsWith('/_next')) {
      console.error(`Kein Tailscale-Client: clientIp=${clientIp} xff=${xff} remote=${remoteAddr} url=${req.url}`);
    }

    handler(req, res);
  });
  const io = new SocketIO(httpServer, {
    cors: { origin: false }, // Same-origin only
  });

  const terminalNs = io.of('/terminal');
  const updatesNs = io.of('/updates');

  setupTerminalNamespace(terminalNs);
  setupUpdatesNamespace(updatesNs);

  const port = parseInt(process.env.PORT || '3000', 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
