import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { expect, it } from 'vitest';

it('reports a listener failure without logging successful startup', async () => {
  const occupiedPort = createServer();
  occupiedPort.listen(0, '127.0.0.1');
  await once(occupiedPort, 'listening');
  const address = occupiedPort.address();
  if (!address || typeof address === 'string')
    throw new Error('Expected TCP port');
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: String(address.port),
    LOG_LEVEL: 'info',
    DATABASE_ENABLED: 'false',
    IDENTITY_MODE: 'disabled',
  };
  delete environment.MONGODB_URI;
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'backend/src/server.ts'],
    {
      env: environment,
      windowsHide: true,
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  try {
    const [exitCode] = await once(child, 'exit');
    expect(exitCode).toBe(1);
    expect(output).toContain('API listener failed');
    expect(output).not.toContain('API listening on loopback');
  } finally {
    if (child.exitCode === null) child.kill();
    await new Promise<void>((resolve) => occupiedPort.close(() => resolve()));
  }
}, 15_000);
