import { Client as SSHClient } from 'ssh2';
import { SSHExecError } from './types';
import type { SSHConfig, PooledConnection, ClientChannel } from './types';

class SSHPool {
  private connections = new Map<string, PooledConnection>();
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly KEEPALIVE_INTERVAL = 30_000;   // 30 seconds

  constructor() {
    this.startCleanupTimer();
  }

  async getConnection(hostId: string, config: SSHConfig): Promise<SSHClient> {
    const existing = this.connections.get(hostId);

    if (existing && existing.state === 'connected') {
      existing.lastUsed = Date.now();
      existing.refCount++;
      return existing.client;
    }

    // Laufender Verbindungsversuch — darauf warten statt killen
    if (existing && existing.state === 'connecting' && existing.connectPromise) {
      existing.refCount++;
      return existing.connectPromise;
    }

    // Remove stale connection if present
    if (existing) {
      try { existing.client.end(); } catch { /* ignore */ }
      this.connections.delete(hostId);
    }

    return this.createConnection(hostId, config);
  }

  private createConnection(hostId: string, config: SSHConfig): Promise<SSHClient> {
    const client = new SSHClient();

    const pooled: PooledConnection = {
      config,
      client,
      state: 'connecting',
      lastUsed: Date.now(),
      refCount: 1,
    };
    this.connections.set(hostId, pooled);

    const promise = new Promise<SSHClient>((resolve, reject) => {
      client
        .on('ready', () => {
          pooled.state = 'connected';
          resolve(client);
        })
        .on('error', (err) => {
          pooled.state = 'error';
          // NUR eigenen Eintrag loeschen — nicht eine neuere Connection
          if (this.connections.get(hostId) === pooled) {
            this.connections.delete(hostId);
          }
          reject(err);
        })
        .on('close', () => {
          if (pooled.state !== 'error') {
            pooled.state = 'disconnected';
          }
          // NUR eigenen Eintrag loeschen — nicht eine neuere Connection
          if (this.connections.get(hostId) === pooled) {
            this.connections.delete(hostId);
          }
        })
        .connect({
          host: config.host,
          port: config.port,
          username: config.username,
          privateKey: config.privateKey,
          password: config.password,
          agent: config.agent,
          keepaliveInterval: this.KEEPALIVE_INTERVAL,
          keepaliveCountMax: 3,
          readyTimeout: 20_000,
        });
    });

    pooled.connectPromise = promise;
    return promise;
  }

  async exec(hostId: string, config: SSHConfig, command: string): Promise<string> {
    const client = await this.getConnection(hostId, config);
    try {
      return await this.execOnClient(client, hostId, command);
    } catch (err) {
      // Wenn bestehender Client fehlschlug → frische Connection versuchen
      await this.disconnect(hostId);
      const freshClient = await this.getConnection(hostId, config);
      return this.execOnClient(freshClient, hostId, command);
    }
  }

  private execOnClient(client: SSHClient, hostId: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        let exitCode: number | null = null;
        stream.on('data', (data: Buffer) => { stdout += data.toString(); });
        stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
        stream.on('exit', (code: number | null) => { exitCode = code; });
        stream.on('close', () => {
          const conn = this.connections.get(hostId);
          if (conn) conn.refCount = Math.max(0, conn.refCount - 1);
          if (exitCode != null && exitCode !== 0) {
            reject(new SSHExecError(command, exitCode, stdout, stderr));
          } else {
            resolve(stdout);
          }
        });
      });
    });
  }

  async shell(
    hostId: string,
    config: SSHConfig,
    window?: { cols: number; rows: number },
  ): Promise<ClientChannel> {
    const client = await this.getConnection(hostId, config);
    return new Promise((resolve, reject) => {
      client.shell(
        {
          term: 'xterm-256color',
          cols: window?.cols ?? 80,
          rows: window?.rows ?? 24,
        },
        { env: { LANG: 'de_DE.UTF-8', LC_ALL: 'de_DE.UTF-8' } as unknown as NodeJS.ProcessEnv },
        (err, stream) => {
          if (err) return reject(err);
          resolve(stream);
        },
      );
    });
  }

  async disconnect(hostId: string): Promise<void> {
    const conn = this.connections.get(hostId);
    if (conn) {
      try { conn.client.end(); } catch { /* ignore */ }
      this.connections.delete(hostId);
    }
  }

  async healthCheck(hostId: string, config: SSHConfig): Promise<boolean> {
    try {
      const output = await this.exec(hostId, config, 'echo ok');
      return output.trim() === 'ok';
    } catch {
      return false;
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      for (const [id, conn] of this.connections) {
        if (conn.refCount === 0 && Date.now() - conn.lastUsed > this.IDLE_TIMEOUT) {
          try { conn.client.end(); } catch { /* ignore */ }
          this.connections.delete(id);
        }
      }
    }, 60_000);
  }
}

export const sshPool = new SSHPool();
