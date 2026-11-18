import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  assertLocalMongoTarget,
  parseMongoConfiguration,
} from '../src/platform/database-config.js';
import { parseEnvironment } from '../src/platform/environment.js';
import {
  initializeLiveLms,
  type LiveCourse,
} from '../src/modules/live-lms/router.js';
import {
  hashPassword,
  verifyPassword,
} from '../src/modules/live-lms/password.js';
it('hashes passwords with independent salts and verifies without storing cleartext', async () => {
  const first = await hashPassword('Correct horse battery staple');
  const second = await hashPassword('Correct horse battery staple');
  expect(first).not.toBe(second);
  expect(await verifyPassword('Correct horse battery staple', first)).toBe(
    true,
  );
  expect(await verifyPassword('Incorrect password', first)).toBe(false);
  expect(await verifyPassword('x', 'invalid')).toBe(false);
});
const binary = process.env.MONGOD_BINARY;
describe.skipIf(!binary)('live LMS on owned disposable MongoDB', () => {
  let child: ChildProcess;
  let directory: string;
  let connection: mongoose.Connection;
  let app: ReturnType<typeof createApp>;
  let courseId: string;
  const origin = 'http://127.0.0.1:3000';
  beforeAll(async () => {
    const reserve = createServer().listen(0, '127.0.0.1');
    await once(reserve, 'listening');
    const port = (reserve.address() as { port: number }).port;
    await new Promise<void>((resolve) => reserve.close(() => resolve()));
    await mkdir(resolve('work'), { recursive: true });
    directory = await mkdtemp(resolve('work/live-lms-'));
    child = spawn(
      binary!,
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
    connection = mongoose.createConnection();
    await connection.openUri(`mongodb://127.0.0.1:${port}`, {
      dbName: 'welspun_lms_dev',
      serverSelectionTimeoutMS: 15000,
      autoIndex: false,
    });
    await initializeLiveLms(connection);
    app = createApp(
      parseEnvironment({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        LMS_LIVE_ENABLED: 'true',
        LMS_REGISTRATION_ENABLED: 'true',
        LMS_FRONTEND_ORIGIN: origin,
      }),
      { database: connection },
    );
    const course: LiveCourse = {
      _id: new Types.ObjectId(),
      slug: 'synthetic-course',
      title: 'Synthetic training course',
      description: 'Synthetic local test',
      code: 'TEST-01',
      published: true,
      publishedAt: new Date(),
      modules: [
        {
          id: String(new Types.ObjectId()),
          title: 'Module',
          description: '',
          position: 0,
          lessons: [
            {
              id: String(new Types.ObjectId()),
              title: 'Lesson',
              description: '',
              position: 0,
              content: { type: 'text', text: 'Synthetic learning text' },
              quiz: {
                question: 'Choose the correct action',
                options: [
                  {
                    id: 'yes',
                    text: 'Correct action',
                    isCorrect: true,
                    explanation: 'Correct response',
                  },
                  {
                    id: 'no',
                    text: 'Incorrect action',
                    isCorrect: false,
                    explanation: 'Try the correct action',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    await connection
      .db!.collection<LiveCourse>('lms_courses')
      .insertOne(course);
    courseId = String(course._id);
  }, 25000);
  afterAll(async () => {
    await connection?.close();
    if (child && !child.killed) {
      child.kill();
      await once(child, 'exit').catch(() => {});
    }
    if (directory && directory.startsWith(resolve('work/live-lms-')))
      await rm(directory, { recursive: true, force: true });
  });
  it('requires real sessions and origin checks, grades on the server, saves progress and isolates learners', async () => {
    expect((await request(app).get('/api/v1/courses')).status).toBe(401);
    expect(
      (
        await request(app).post('/api/v1/auth/register').send({
          name: 'Learner',
          email: 'learner@example.invalid',
          password: 'Correct horse battery staple',
        })
      ).status,
    ).toBe(403);
    const signup = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        name: 'Learner',
        email: 'learner@example.invalid',
        password: 'Correct horse battery staple',
      });
    expect(signup.status).toBe(200);
    expect(signup.body.data.role).toBe('learner');
    expect(JSON.stringify(signup.body)).not.toContain('password');
    const cookie = String(signup.headers['set-cookie']![0]).split(';')[0]!;
    expect(String(signup.headers['set-cookie']![0])).toContain('HttpOnly');
    const sessionRecord = await connection
      .db!.collection('lms_sessions')
      .findOne({});
    expect(sessionRecord?.tokenHash).not.toBe(cookie.split('=')[1]);
    expect(
      (
        await request(app)
          .post('/api/v1/admin/courses')
          .set('Origin', origin)
          .set('Cookie', cookie)
          .send({})
      ).status,
    ).toBe(403);
    const list = await request(app)
      .get('/api/v1/courses')
      .set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    const detail = await request(app)
      .get(`/api/v1/courses/${courseId}/releases/1`)
      .set('Cookie', cookie);
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.body)).not.toContain('isCorrect');
    const lessonId = detail.body.data.modules[0].lessons[0].id;
    const post = (answerId: string) =>
      request(app)
        .post(`/api/v1/learning/${courseId}/lessons/${lessonId}/complete`)
        .set('Origin', origin)
        .set('Cookie', cookie)
        .send({ answerId });
    const wrong = await post('no');
    expect(wrong.body.data.correct).toBe(false);
    expect(wrong.body.data.progress.percent).toBe(0);
    const right = await post('yes');
    expect(right.body.data.correct).toBe(true);
    expect(right.body.data.progress.percent).toBe(100);
    expect(right.body.data.progress.certificateId).toHaveLength(32);
    expect(
      (await request(app).get('/api/v1/certificates').set('Cookie', cookie))
        .body.data,
    ).toHaveLength(1);
    const another = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .send({
        name: 'Other learner',
        email: 'other@example.invalid',
        password: 'Another correct password',
      });
    const otherCookie = String(another.headers['set-cookie']![0]).split(
      ';',
    )[0]!;
    expect(
      (await request(app).get('/api/v1/learning').set('Cookie', otherCookie))
        .body.data,
    ).toEqual([]);
    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .send({});
    expect(logout.status).toBe(200);
    expect(
      (await request(app).get('/api/v1/auth/session').set('Cookie', cookie))
        .status,
    ).toBe(401);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({
        email: 'learner@example.invalid',
        password: 'Correct horse battery staple',
      });
    expect(login.status).toBe(200);
    expect(
      (
        await request(app)
          .get('/api/v1/learning')
          .set('Cookie', String(login.headers['set-cookie']![0]).split(';')[0]!)
      ).body.data[0].percent,
    ).toBe(100);
  }, 20000);
  it('prevents role injection on registration', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/auth/register')
          .set('Origin', origin)
          .send({
            name: 'Forged admin',
            email: 'forged@example.invalid',
            password: 'Correct horse battery staple',
            role: 'admin',
          })
      ).status,
    ).toBe(422);
  });
});

it('pins shared connections to welspun_lms_dev and requires encrypted transport', () => {
  expect(() =>
    assertLocalMongoTarget(
      parseMongoConfiguration({
        uri: 'mongodb+srv://cluster.example/',
        databaseName: 'welspun_lms_dev',
        environment: 'production',
      }),
    ),
  ).not.toThrow();
  for (const uri of [
    'mongodb+srv://cluster.example/other',
    'mongodb+srv://cluster.example/?tls=false',
    'mongodb+srv://cluster.example/welspun_lms_dev?ssl=false',
  ])
    expect(() =>
      assertLocalMongoTarget(
        parseMongoConfiguration({
          uri,
          databaseName: 'welspun_lms_dev',
          environment: 'production',
        }),
      ),
    ).toThrow();
});
