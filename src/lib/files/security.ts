const BLOCKED_PATTERNS = [
  '/etc/shadow', '/etc/passwd', '.env',
  'id_rsa', 'id_ed25519', '.ssh/authorized_keys',
  '.ssh/id_', '.gnupg/',
];

export function isBlocked(path: string): boolean {
  return BLOCKED_PATTERNS.some(b => path.includes(b));
}

export function validatePath(path: string): string | null {
  if (!path || typeof path !== 'string') return 'Pfad erforderlich';
  if (!path.startsWith('/')) return 'Pfad muss absolut sein';
  const normalized = path.replace(/\/+/g, '/');
  if (normalized.includes('/../') || normalized.endsWith('/..')) {
    return 'Path-Traversal nicht erlaubt';
  }
  if (isBlocked(normalized)) return 'Zugriff verweigert';
  return null;
}

export const MAX_VIEW_SIZE = 1024 * 1024;
export const MAX_DOWNLOAD_SIZE = 5 * 1024 * 1024;
