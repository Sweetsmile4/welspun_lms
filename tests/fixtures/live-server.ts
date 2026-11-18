import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { parseEnvironment } from '../../backend/src/platform/environment.js';
import { initializeLiveLms } from '../../backend/src/modules/live-lms/router.js';
import { hashPassword } from '../../backend/src/modules/live-lms/password.js';
import seeds from '../../backend/src/modules/live-lms/seed-courses.json';
const binary = process.env.MONGOD_BINARY;
if (!binary)
  throw new Error('Set MONGOD_BINARY for the disposable test server');
const reservation = createServer().listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = (reservation.address() as { port: number }).port;
await new Promise<void>((resolve) => reservation.close(() => resolve()));
await mkdir(resolve('work'), { recursive: true });
const directory = await mkdtemp(resolve('work/live-browser-'));
const mongo = spawn(
  binary,
  [
    '--dbpath',
    directory,
    '--port',
    String(port),
    '--bind_ip',
    '127.0.0.1',
    '--quiet',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
const connection = mongoose.createConnection();
await connection.openUri(`mongodb://127.0.0.1:${port}`, {
  dbName: 'welspun_lms_dev',
  autoIndex: false,
  serverSelectionTimeoutMS: 15000,
});
await initializeLiveLms(connection);
for (const seed of seeds)
  await connection.db!.collection('lms_courses').insertOne({
    ...seed,
    _id: new Types.ObjectId(),
    published: true,
    publishedAt: new Date(),
    modules: seed.modules.map((module) => ({
      ...module,
      id: String(new Types.ObjectId()),
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        id: String(new Types.ObjectId()),
      })),
    })),
  });
await connection.db!.collection('lms_courses').insertOne({
  _id: new Types.ObjectId(),
  slug: 'local-verification',
  title: 'Local verification course',
  description: 'Owned disposable test fixture',
  code: 'LOCAL-TEST',
  published: true,
  publishedAt: new Date(),
  modules: [
    {
      id: String(new Types.ObjectId()),
      title: 'Test module',
      description: '',
      position: 0,
      lessons: [
        {
          id: String(new Types.ObjectId()),
          title: 'Verification lesson',
          description: 'Read and answer',
          position: 0,
          content: {
            type: 'text',
            text: 'Synthetic lesson text for local validation only.',
          },
          quiz: {
            question: 'Which action completes this test?',
            options: [
              {
                id: 'yes',
                text: 'Verify the correct action',
                isCorrect: true,
                explanation: 'Correct test action',
              },
              {
                id: 'no',
                text: 'Choose the incorrect action',
                isCorrect: false,
                explanation: 'Try again',
              },
            ],
          },
        },
      ],
    },
  ],
});
await connection.db!.collection('lms_accounts').insertOne({
  _id: new Types.ObjectId(),
  name: 'Synthetic administrator',
  email: 'admin@example.invalid',
  passwordHash: await hashPassword('Synthetic admin password 123!'),
  role: 'admin',
  active: true,
  createdAt: new Date(),
});
const app = createApp(
  parseEnvironment({
    NODE_ENV: 'test',
    LMS_LIVE_ENABLED: 'true',
    LMS_REGISTRATION_ENABLED: 'true',
    LMS_FRONTEND_ORIGIN: 'http://127.0.0.1:4321',
    LOG_LEVEL: 'silent',
  }),
  { database: connection },
);
const server = app.listen(4401, '127.0.0.1', () =>
  console.log('Owned disposable live LMS test server ready on port 4401'),
);
async function close() {
  server.close();
  await connection.close();
  mongo.kill();
}
process.on('SIGINT', () => {
  void close();
});
process.on('SIGTERM', () => {
  void close();
});
