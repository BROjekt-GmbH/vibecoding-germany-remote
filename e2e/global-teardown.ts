import { unlinkSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '..');

export default async function globalTeardown() {
  const pid = process.env.__TEST_SERVER_PID__;
  if (pid) {
    try {
      process.kill(-parseInt(pid, 10), 'SIGTERM');
      console.log(`\n[teardown] Server process ${pid} terminated`);
    } catch {
      // Already gone
    }
  }

  // Clean up test files
  try { unlinkSync(resolve(PROJECT_ROOT, '.env.test')); } catch {}
  try { unlinkSync(resolve(PROJECT_ROOT, 'data', 'test.db')); } catch {}
  try { unlinkSync(resolve(PROJECT_ROOT, 'data', 'test.db-wal')); } catch {}
  try { unlinkSync(resolve(PROJECT_ROOT, 'data', 'test.db-shm')); } catch {}
}
