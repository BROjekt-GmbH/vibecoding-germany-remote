// In-Memory Token Store fuer Shared Terminal Sessions
// Extrahiert aus der API-Route, damit Socket-Server und API-Route
// denselben State ohne zirkulaere Imports teilen koennen.

export interface ShareTokenData {
  hostId: string;
  sessionName: string;
  pane: string;
  createdBy: string;
  expiresAt: number;
  viewers: Set<string>;
  writable: Set<string>;
}

export const shareTokens = new Map<string, ShareTokenData>();

// Abgelaufene Tokens automatisch aufraeumen (jede Minute)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of shareTokens) {
    if (data.expiresAt < now) shareTokens.delete(token);
  }
}, 60_000);
