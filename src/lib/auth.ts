import { headers } from 'next/headers';

export interface AuthUser {
  login: string;
  name: string;
  profilePic: string | null;
}

export async function getUser(): Promise<AuthUser | null> {
  const headerStore = await headers();
  const login = headerStore.get('tailscale-user-login');
  const name = headerStore.get('tailscale-user-name');
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

  return { login, name: name || login, profilePic };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
