import { db } from '../db';
import { hosts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sshPool } from './pool';
import { decrypt } from '../crypto';
import type { SSHConfig } from './types';

export async function getHostSSHConfig(hostId: string): Promise<SSHConfig> {
  const result = await db.select().from(hosts).where(eq(hosts.id, hostId)).limit(1);
  if (!result[0]) throw new Error(`Host not found: ${hostId}`);

  const h = result[0];

  if (h.authMethod === 'agent') {
    return {
      host: h.hostname,
      port: h.port,
      username: h.username,
      agent: process.env.SSH_AUTH_SOCK,
    };
  }

  // Key aus DB entschluesseln
  const privateKey = h.privateKey ? decrypt(h.privateKey) : undefined;

  return {
    host: h.hostname,
    port: h.port,
    username: h.username,
    privateKey,
  };
}

export async function execOnHost(hostId: string, command: string): Promise<string> {
  const config = await getHostSSHConfig(hostId);
  return sshPool.exec(hostId, config, command);
}
