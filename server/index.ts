import { createServer } from 'http';
import next from 'next';
import { Server as SocketIO } from 'socket.io';
import { setupTerminalNamespace } from '../src/lib/socket/terminal';
import { setupUpdatesNamespace } from '../src/lib/socket/updates';

// Pflicht: ENCRYPTION_KEY muss gesetzt sein
if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error('FEHLER: ENCRYPTION_KEY ist nicht gesetzt. Generiere einen mit: openssl rand -hex 32');
  process.exit(1);
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Tailscale Serve setzt die Header nativ — kein WhoIs noetig.
    // Im Dev-Modus wird DEV_USER_LOGIN in der Middleware genutzt.
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
