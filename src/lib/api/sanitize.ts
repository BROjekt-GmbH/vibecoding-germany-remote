import type { hosts } from '@/lib/db/schema';

type HostRow = typeof hosts.$inferSelect;

export function sanitizeHost(host: HostRow) {
  const { privateKey, ...rest } = host;
  return { ...rest, hasKey: Boolean(privateKey) };
}
