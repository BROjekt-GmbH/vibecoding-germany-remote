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
  const base = { host: h.hostname, port: h.port, username: h.username };

  if (h.authMethod === 'agent') {
    return { ...base, agent: process.env.SSH_AUTH_SOCK };
  }

  if (h.authMethod === 'password') {
    return { ...base, password: h.password ? decrypt(h.password) : undefined };
  }

  // Default: key
  return { ...base, privateKey: h.privateKey ? decrypt(h.privateKey) : undefined };
}

export async function execOnHost(hostId: string, command: string): Promise<string> {
  const config = await getHostSSHConfig(hostId);
  return sshPool.exec(hostId, config, command);
}
