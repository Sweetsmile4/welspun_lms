import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const web = fileURLToPath(new URL('../apps/web/', import.meta.url));
const require = createRequire(
  new URL('../apps/web/package.json', import.meta.url),
);
const reservation = createServer().listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const child = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    cwd: web,
    env: { ...process.env, NODE_ENV: 'production', LMS_UI_PREVIEW: 'false' },
    windowsHide: true,
    stdio: 'ignore',
  },
);
try {
  let started = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error('Preview guard server exited early');
    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/development/courses`,
      );
      if (response.ok) {
        const html = await response.text();
        assert.ok(html.includes('Course preview disabled'));
        assert.ok(!html.includes('UI fixture mode · simulated actions only'));
        started = true;
        break;
      }
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(started, 'Guard server startup timed out');
  const html = await (
    await fetch(`http://127.0.0.1:${port}/development/reviews`)
  ).text();
  assert.ok(html.includes('Review preview disabled'));
  assert.equal(
    (await fetch(`http://127.0.0.1:${port}/api/preview`)).status,
    404,
  );
  console.log(
    'Preview opt-out guard passed: both workspaces disabled; no preview API route.',
  );
} finally {
  child.kill();
}
