import http from 'http';

// socat-Proxy im Tailscale-Container bridged den Unix-Socket auf TCP localhost:9090
const TAILSCALE_API_PORT = parseInt(process.env.TAILSCALE_API_PORT || '9090', 10);
const CACHE_TTL = 60_000; // 1 Minute

interface TailscaleIdentity {
  login: string;
  displayName: string;
}

interface WhoIsResponse {
  UserProfile?: {
    LoginName?: string;
    DisplayName?: string;
  };
}

const cache = new Map<string, { identity: TailscaleIdentity; expiry: number }>();

function queryWhoIsRaw(addr: string): Promise<WhoIsResponse | null> {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${TAILSCALE_API_PORT}/localapi/v0/whois?addr=${encodeURIComponent(addr)}`,
      { headers: { 'Sec-Tailscale': 'localapi' } },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`WhoIs fehlgeschlagen: HTTP ${res.statusCode} fuer ${addr}`);
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            console.error('WhoIs: JSON-Parse fehlgeschlagen');
            resolve(null);
          }
        });
      },
    );
    req.on('error', (err) => {
      console.error('WhoIs-Anfrage fehlgeschlagen:', err.message);
      resolve(null);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      console.error('WhoIs-Anfrage Timeout');
      resolve(null);
    });
  });
}

export async function resolveIdentity(clientIp: string): Promise<TailscaleIdentity | null> {
  const cached = cache.get(clientIp);
  if (cached && cached.expiry > Date.now()) {
    return cached.identity;
  }

  const whois = await queryWhoIsRaw(`${clientIp}:1`);
  if (!whois?.UserProfile?.LoginName) return null;

  const identity: TailscaleIdentity = {
    login: whois.UserProfile.LoginName,
    displayName: whois.UserProfile.DisplayName || whois.UserProfile.LoginName,
  };

  cache.set(clientIp, { identity, expiry: Date.now() + CACHE_TTL });
  return identity;
}
