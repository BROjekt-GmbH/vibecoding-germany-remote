import { headers } from 'next/headers';

export interface AuthUser {
  login: string;
  name: string;
  profilePic: string | null;
}

/**
 * Decode MIME encoded-word headers (RFC 2047).
 * Handles =?utf-8?q?...?= (quoted-printable) and =?utf-8?b?...?= (base64).
 */
function decodeMimeHeader(value: string): string {
  return value.replace(
    /=\?([^?]+)\?(q|b)\?([^?]*)\?=/gi,
    (_match, _charset: string, encoding: string, encoded: string) => {
      if (encoding.toLowerCase() === 'b') {
        return Buffer.from(encoded, 'base64').toString('utf-8');
      }
      // quoted-printable: =XX → byte, _ → space
      const decoded = encoded
        .replace(/_/g, ' ')
        .replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
      return Buffer.from(decoded, 'binary').toString('utf-8');
    }
  );
}

export async function getUser(): Promise<AuthUser | null> {
  const headerStore = await headers();
  const login = headerStore.get('tailscale-user-login');
  const rawName = headerStore.get('tailscale-user-name');
  const profilePic = headerStore.get('tailscale-user-profile-pic');

  // Dev fallback — only active when NODE_ENV=development
  if (!login && process.env.NODE_ENV === 'development') {
    return {
      login: process.env.DEV_USER_LOGIN || 'dev@local',
      name: 'Dev User',
      profilePic: null,
    };
  }

  if (!login) return null;

  const name = rawName ? decodeMimeHeader(rawName) : login;
  return { login, name, profilePic };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
