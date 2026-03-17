import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import * as http from 'http';

const TEST_PORT = 3001;
const PROJECT_ROOT = resolve(__dirname, '..');
const TEST_DB_PATH = resolve(PROJECT_ROOT, 'data', 'test.db');
const READY_TIMEOUT = 30_000;

function waitForServer(port: number, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      http
        .get(`http://localhost:${port}/`, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() > deadline) {
            reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
          } else {
            setTimeout(check, 500);
          }
        });
    };
    setTimeout(check, 500);
  });
}

export default async function globalSetup() {
  console.log('\n[setup] Preparing test environment...');

  mkdirSync(resolve(PROJECT_ROOT, 'data'), { recursive: true });

  const env = [
    `DATABASE_PATH=${TEST_DB_PATH}`,
    `NODE_ENV=development`,
    `DEV_USER_LOGIN=qa@test.example`,
    `PORT=${TEST_PORT}`,
    `POLL_INTERVAL_MS=60000`,
    `ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000`,
  ].join('\n');

  writeFileSync(resolve(PROJECT_ROOT, '.env.test'), env);
  console.log('[setup] .env.test written');

  // Migrations ausfuehren
  try {
    execSync('npx tsx server/migrate.ts', {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        DATABASE_PATH: TEST_DB_PATH,
        NODE_ENV: 'development',
      },
      stdio: 'pipe',
    });
    console.log('[setup] Migrations applied');
  } catch (err) {
    console.error('[setup] Migration failed:', (err as Error).message);
    throw err;
  }

  // Server starten
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      DATABASE_PATH: TEST_DB_PATH,
      NODE_ENV: 'development',
      DEV_USER_LOGIN: 'qa@test.example',
      PORT: String(TEST_PORT),
      POLL_INTERVAL_MS: '60000',
      ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (d: Buffer) => {
    const line = d.toString().trim();
    if (line) process.stdout.write(`[server] ${line}\n`);
  });
  serverProcess.stderr?.on('data', (d: Buffer) => {
    const line = d.toString().trim();
    if (line) process.stderr.write(`[server] ${line}\n`);
  });

  process.env.__TEST_SERVER_PID__ = String(serverProcess.pid);

  console.log(`[setup] Waiting for server on port ${TEST_PORT}...`);
  await waitForServer(TEST_PORT, READY_TIMEOUT);
  console.log('[setup] Server ready. Starting tests.\n');
}
