import { execSync, spawn } from 'child_process';
import { writeFileSync } from 'fs';
import * as http from 'http';

const TEST_PORT = 3001;
const TEST_DB = 'remote_team_test';
const READY_TIMEOUT = 30_000;

/**
 * Wait for the HTTP server to respond on baseURL.
 */
function waitForServer(port: number, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      http
        .get(`http://localhost:${port}/`, (res) => {
          // Any response (including 401) means the server is up
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

  // ── 1. Write .env.test ──────────────────────────────────────────────────
  const env = [
    `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${TEST_DB}`,
    `NODE_ENV=development`,
    `DEV_USER_LOGIN=qa@test.example`,
    `PORT=${TEST_PORT}`,
    `POLL_INTERVAL_MS=60000`, // slow polling during tests
  ].join('\n');

  writeFileSync('/home/silence/Projects/remote-team/.env.test', env);
  console.log('[setup] .env.test written');

  // ── 2. Create test database ─────────────────────────────────────────────
  try {
    execSync(
      `psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB}" 2>/dev/null; psql -U postgres -c "CREATE DATABASE ${TEST_DB}"`,
      { stdio: 'pipe' }
    );
    console.log(`[setup] Database "${TEST_DB}" created`);
  } catch (err) {
    console.warn('[setup] Could not create DB via psql — assuming it exists:', (err as Error).message);
  }

  // ── 3. Run migrations ────────────────────────────────────────────────────
  try {
    execSync('npm run db:migrate', {
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`,
        NODE_ENV: 'development',
      },
      stdio: 'pipe',
    });
    console.log('[setup] Migrations applied');
  } catch (err) {
    console.error('[setup] Migration failed:', (err as Error).message);
    throw err;
  }

  // ── 4. Start the custom server ───────────────────────────────────────────
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: '/home/silence/Projects/remote-team',
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`,
      NODE_ENV: 'development',
      DEV_USER_LOGIN: 'qa@test.example',
      PORT: String(TEST_PORT),
      POLL_INTERVAL_MS: '60000',
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

  // Store PID so teardown can kill it
  process.env.__TEST_SERVER_PID__ = String(serverProcess.pid);

  // ── 5. Wait for server ready ─────────────────────────────────────────────
  console.log(`[setup] Waiting for server on port ${TEST_PORT}...`);
  await waitForServer(TEST_PORT, READY_TIMEOUT);
  console.log('[setup] Server ready. Starting tests.\n');
}
