export interface TailscaleIdentity {
  login: string;
  displayName: string;
}

/**
 * Liest die Tailscale-Identitaet aus den nativen Tailscale Serve Headern.
 * Tailscale Serve setzt diese Header automatisch fuer authentifizierte Requests.
 */
export function getIdentityFromHeaders(headers: Record<string, string | string[] | undefined>): TailscaleIdentity | null {
  const login = typeof headers['tailscale-user-login'] === 'string'
    ? headers['tailscale-user-login']
    : undefined;

  if (!login) return null;

  const displayName = typeof headers['tailscale-user-name'] === 'string'
    ? headers['tailscale-user-name']
    : login;

  return { login, displayName };
}
