import { execSync } from 'child_process';

export default async function globalTeardown() {
  const pid = process.env.__TEST_SERVER_PID__;
  if (pid) {
    try {
      // Kill the server process group
      process.kill(-parseInt(pid, 10), 'SIGTERM');
      console.log(`\n[teardown] Server process ${pid} terminated`);
    } catch {
      // Already gone
    }
  }

  // Clean up .env.test
  try {
    execSync('rm -f /home/silence/Projects/remote-team/.env.test');
  } catch {
    // ignore
  }
}
