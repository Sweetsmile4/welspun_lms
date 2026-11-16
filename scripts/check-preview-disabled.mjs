import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const web = fileURLToPath(new URL('../frontend/', import.meta.url));
const reservation = createServer().listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const guardEnv = { ...process.env, NODE_ENV: 'production' };
guardEnv.LMS_UI_PREVIEW = 'false';
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('./preview-guard-server.mjs', import.meta.url)),
    String(port),
    ...(process.argv.includes('--unset') ? ['--unset'] : []),
  ],
  {
    cwd: web,
    env: guardEnv,
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
  for (const path of [
    '/development/catalog',
    '/development/catalog/synthetic-course-1',
  ]) {
    const page = await (await fetch(`http://127.0.0.1:${port}${path}`)).text();
    assert.ok(page.includes('Catalog preview disabled'));
    assert.ok(
      !page.includes('Simulated catalog · shared tab-memory fixtures only'),
    );
  }
  assert.equal(
    (await fetch(`http://127.0.0.1:${port}/api/preview`)).status,
    404,
  );
  console.log(
    'Preview opt-out guard passed: all development workspaces disabled; no preview API route.',
  );
} finally {
  child.kill();
}
