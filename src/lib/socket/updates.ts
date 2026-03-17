import type { Namespace } from 'socket.io';

export function setupUpdatesNamespace(ns: Namespace) {
  ns.on('connection', (socket) => {
    socket.on('subscribe:host', (hostId: string) => {
      socket.join(`host:${hostId}`);
    });

    socket.on('unsubscribe:host', (hostId: string) => {
      socket.leave(`host:${hostId}`);
    });
  });
}
