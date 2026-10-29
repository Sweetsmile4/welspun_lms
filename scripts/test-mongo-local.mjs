import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import mongoose from 'mongoose';

if (
  process.env.START_LOCAL_MONGO_FOR_TESTS !== 'true' ||
  process.env.NODE_ENV === 'production'
)
  throw new Error(
    'Set START_LOCAL_MONGO_FOR_TESTS=true in a non-production shell to start an isolated local test replica set',
  );
const binary = process.env.MONGOD_BINARY;
if (!binary || !path.isAbsolute(binary) || !fs.existsSync(binary))
  throw new Error(
    'MONGOD_BINARY must identify an already installed absolute mongod executable; this script never downloads it',
  );
if (!process.env.npm_execpath)
  throw new Error('Run this setup through npm run test:mongo:local');
const work = path.resolve('work');
fs.mkdirSync(work, { recursive: true });
const directory = fs.mkdtempSync(path.join(work, 'mongo-phase1b1-'));
const reserve = createServer().listen(0, '127.0.0.1');
await once(reserve, 'listening');
const { port } = reserve.address();
await new Promise((resolve) => reserve.close(resolve));
const server = spawn(
  binary,
  [
    '--dbpath',
    directory,
    '--port',
    String(port),
    '--bind_ip',
    '127.0.0.1',
    '--replSet',
    'phase1b1',
    '--logpath',
    path.join(directory, 'mongod.log'),
  ],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
);
let serverError;
server.on('error', (error) => {
  serverError = error;
});
let runner;
const stop = () => {
  runner?.kill();
  server.kill();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
let bootstrap;
try {
  console.log(
    `Starting an isolated synthetic-test replica set on 127.0.0.1:${port}; scratch data: ${directory}`,
  );
  for (let attempt = 0; attempt < 60; attempt++) {
    if (serverError || server.exitCode !== null)
      throw new Error(
        'Local mongod failed to start; inspect scratch mongod.log',
      );
    const candidate = mongoose.createConnection(
      `mongodb://127.0.0.1:${port}/welspun_lms_test_bootstrap?directConnection=true`,
      {
        serverSelectionTimeoutMS: 500,
        connectTimeoutMS: 500,
        autoIndex: false,
        autoCreate: false,
      },
    );
    candidate.on('error', () => {});
    try {
      await candidate.asPromise();
      bootstrap = candidate;
      break;
    } catch {
      await candidate.close().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!bootstrap) throw new Error('Local MongoDB startup timed out');
  await bootstrap.db.admin().command({
    replSetInitiate: {
      _id: 'phase1b1',
      members: [{ _id: 0, host: `127.0.0.1:${port}` }],
    },
  });
  let primary = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await bootstrap.db.admin().command({ hello: 1 })).isWritablePrimary) {
      primary = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!primary) throw new Error('Isolated replica set did not elect a primary');
  await bootstrap.close();
  bootstrap = undefined;
  runner = spawn(
    process.execPath,
    [process.env.npm_execpath, 'run', 'test:mongo'],
    {
      windowsHide: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        RUN_MONGO_INTEGRATION: 'true',
        MONGO_TEST_ALLOW_WRITE: 'true',
        MONGO_TEST_URI: `mongodb://127.0.0.1:${port}/welspun_lms_test_run?replicaSet=phase1b1`,
      },
    },
  );
  const [code] = await once(runner, 'exit');
  process.exitCode = code ?? 1;
} finally {
  await bootstrap?.close().catch(() => {});
  stop();
  console.log(
    'Temporary test processes stopped. Ignored scratch data/logs retained; no existing MongoDB service was touched.',
  );
}
