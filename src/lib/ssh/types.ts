import type { Client as SSHClient, ClientChannel } from 'ssh2';

export class SSHExecError extends Error {
  constructor(
    command: string,
    public readonly exitCode: number,
    public readonly stdout: string,
    public readonly stderr: string,
  ) {
    super(`Command failed (exit ${exitCode}): ${command}`);
    this.name = 'SSHExecError';
  }
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  agent?: string; // SSH_AUTH_SOCK Pfad
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PooledConnection {
  config: SSHConfig;
  client: SSHClient;
  state: ConnectionState;
  lastUsed: number;
  refCount: number;
  connectPromise?: Promise<SSHClient>;
}

export type { ClientChannel };
