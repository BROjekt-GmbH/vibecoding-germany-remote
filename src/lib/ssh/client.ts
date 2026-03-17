import { db } from '../db';
import { hosts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sshPool } from './pool';
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

  // Prioritaet: Key direkt aus DB, Fallback auf Env-Var (Bestandshosts)
  const privateKey = h.privateKey ?? (h.privateKeyEnv ? process.env[h.privateKeyEnv] : undefined);

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
