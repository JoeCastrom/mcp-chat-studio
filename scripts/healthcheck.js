import { spawn } from 'child_process';

const port = process.env.HEALTHCHECK_PORT || 3090;
const timeoutMs = 20000;
const start = Date.now();

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHealth() {
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) {
        return true;
      }
    } catch (error) {
      // ignore until timeout
    }
    await wait(500);
  }
  return false;
}

async function run() {
  const child = spawn('node', ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test'
    },
    stdio: 'inherit'
  });

  const ok = await waitForHealth();

  child.kill('SIGTERM');

  if (!ok) {
    console.error('[healthcheck] Server did not become healthy in time.');
    process.exit(1);
  }

  console.log('[healthcheck] Server responded to /api/health');
}

run().catch(error => {
  console.error('[healthcheck] Failed:', error.message);
  process.exit(1);
});
