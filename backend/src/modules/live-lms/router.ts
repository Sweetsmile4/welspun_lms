import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, createHash } from 'node:crypto';
import { Types, type Connection } from 'mongoose';
import { z } from 'zod';
import { success } from '@welspun/contracts';
import { HttpError } from '../../platform/errors.js';
import { hashPassword, verifyPassword } from './password.js';

type Account = {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: 'learner' | 'admin';
  active: boolean;
  createdAt: Date;
};
type Session = {
  _id: Types.ObjectId;
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
};
export type Lesson = {
  id: string;
  title: string;
  description: string;
  position: number;
  content: { type: 'text'; text: string };
  quiz?: {
    question: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      explanation: string;
    }[];
  };
  referenceRoute?: string;
  diagramType?: string;
  hasInteractiveVisualizer?: boolean;
};
export type LiveCourse = {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  code: string;
  published: boolean;
  publishedAt: Date;
  modules: {
    id: string;
    title: string;
    description: string;
    position: number;
    lessons: Lesson[];
  }[];
  sourcePdf?: string;
};
type Enrollment = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  completedLessonIds: string[];
  enrolledAt: Date;
  completedAt?: Date;
  certificateId?: string;
};
const cookieName = 'welspun_session';
const credentials = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(12).max(128),
});
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const publicUser = (user: Account) => ({
  id: String(user._id),
  email: user.email,
  name: user.name,
  role: user.role,
});
const lessons = (course: LiveCourse) =>
  course.modules.flatMap((module) => module.lessons);
export async function initializeLiveLms(connection: Connection) {
  if (connection.name !== 'welspun_lms_dev' || !connection.db)
    throw new Error('Live LMS requires welspun_lms_dev');
  const db = connection.db;
  await db
    .collection('lms_accounts')
    .createIndex({ email: 1 }, { unique: true });
  await db
    .collection('lms_sessions')
    .createIndex({ tokenHash: 1 }, { unique: true });
  await db
    .collection('lms_sessions')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('lms_courses').createIndex({ slug: 1 }, { unique: true });
  await db
    .collection('lms_enrollments')
    .createIndex({ userId: 1, courseId: 1 }, { unique: true });
}
export function createLiveLmsRouter(
  connection: Connection,
  options: {
    frontendOrigin: string;
    production: boolean;
    registrationEnabled: boolean;
  },
) {
  if (connection.name !== 'welspun_lms_dev' || !connection.db)
    throw new Error('Live LMS requires welspun_lms_dev');
  const db = connection.db,
    accounts = db.collection<Account>('lms_accounts'),
    sessions = db.collection<Session>('lms_sessions'),
    courses = db.collection<LiveCourse>('lms_courses'),
    enrollments = db.collection<Enrollment>('lms_enrollments');
  const router = express.Router();
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));
  const sessionCookie = (token: string, maxAge = 28800) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${options.production ? '; Secure' : ''}`;
  const authenticate = async (request: express.Request) => {
    const matches = (request.headers.cookie ?? '')
      .split(';')
      .map((v) => v.trim())
      .filter((v) => v.startsWith(cookieName + '='));
    if (matches.length !== 1)
      throw new HttpError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Sign in is required',
      );
    const token = matches[0]!.slice(cookieName.length + 1);
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new HttpError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Sign in is required',
      );
    const session = await sessions.findOne({
      tokenHash: sha(token),
      expiresAt: { $gt: new Date() },
    });
    const user =
      session &&
      (await accounts.findOne({ _id: session.userId, active: true }));
    if (!user)
      throw new HttpError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Session has expired',
      );
    return { user, tokenHash: sha(token) };
  };
  router.use((request, _response, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.get('origin') !== options.frontendOrigin
    )
      return next(
        new HttpError(403, 'ORIGIN_DENIED', 'Request origin is not permitted'),
      );
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !request.is('application/json')
    )
      return next(
        new HttpError(415, 'UNSUPPORTED_CONTENT_TYPE', 'Use application/json'),
      );
    next();
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_q, _s, next) =>
      next(new HttpError(429, 'RATE_LIMITED', 'Too many sign-in attempts')),
  });
  async function establish(user: Account, response: express.Response) {
    const token = randomBytes(32).toString('hex');
    await sessions.insertOne({
      _id: new Types.ObjectId(),
      tokenHash: sha(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + 28800000),
    });
    response.setHeader('Set-Cookie', sessionCookie(token));
    response.json(success(publicUser(user), response.locals.requestId));
  }
  router.post('/auth/register', authLimit, async (request, response) => {
    if (!options.registrationEnabled)
      throw new HttpError(
        403,
        'REGISTRATION_DISABLED',
        'Registration is disabled',
      );
    const input = credentials
      .extend({ name: z.string().trim().min(2).max(100) })
      .parse(request.body);
    const user: Account = {
      _id: new Types.ObjectId(),
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: 'learner',
      active: true,
      createdAt: new Date(),
    };
    try {
      await accounts.insertOne(user);
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new HttpError(
          409,
          'ACCOUNT_EXISTS',
          'An account with this email already exists',
        );
      throw error;
    }
    await establish(user, response);
  });
  router.post('/auth/login', authLimit, async (request, response) => {
    const input = credentials.parse(request.body);
    const user = await accounts.findOne({ email: input.email });
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await dummyHash),
    );
    if (!valid || !user?.active)
      throw new HttpError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect',
      );
    await establish(user, response);
  });
  router.get('/auth/session', async (request, response) => {
    const { user } = await authenticate(request);
    response.json(success(publicUser(user), response.locals.requestId));
  });
  router.post('/auth/logout', async (request, response) => {
    const { tokenHash } = await authenticate(request);
    await sessions.deleteOne({ tokenHash });
    response.setHeader('Set-Cookie', sessionCookie('', 0));
    response.json(success({ signedOut: true }, response.locals.requestId));
  });
  const entry = (course: LiveCourse) => ({
    courseId: String(course._id),
    releaseId: String(course._id),
    releaseNumber: 1,
    title: course.title,
    description: course.description,
    code: course.code,
    scopeUnitId: null,
    publishedAt: course.publishedAt.toISOString(),
    moduleCount: course.modules.length,
    lessonCount: lessons(course).length,
  });
  router.get('/courses', async (request, response) => {
    await authenticate(request);
    const query = z
      .strictObject({
        search: z.string().trim().max(100).optional(),
        cursor: objectId.optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      })
      .parse(request.query);
    const rows = await courses
      .find({
        published: true,
        ...(query.cursor
          ? { _id: { $gt: new Types.ObjectId(query.cursor) } }
          : {}),
      })
      .sort({ _id: 1 })
      .limit(1000)
      .toArray();
    const filtered = rows.filter(
      (c) =>
        !query.search ||
        `${c.title} ${c.description} ${c.code}`
          .toLowerCase()
          .includes(query.search.toLowerCase()),
    );
    const page = filtered.slice(0, query.limit);
    response.json(
      success(
        {
          items: page.map(entry),
          total: filtered.length,
          nextCursor:
            filtered.length > query.limit ? String(page.at(-1)!._id) : null,
        },
        response.locals.requestId,
      ),
    );
  });
  async function findCourse(id: string) {
    const course = await courses.findOne({
      _id: new Types.ObjectId(objectId.parse(id)),
      published: true,
    });
    if (!course) throw new HttpError(404, 'NOT_FOUND', 'Course not found');
    return course;
  }
  router.get(
    '/courses/:courseId/releases/:releaseNumber',
    async (request, response) => {
      await authenticate(request);
      if (request.params.releaseNumber !== '1')
        throw new HttpError(404, 'NOT_FOUND', 'Course release not found');
      const course = await findCourse(String(request.params.courseId));
      response.json(
        success(
          {
            ...entry(course),
            sourcePdf: course.sourcePdf,
            modules: course.modules.map((module) => ({
              ...module,
              lessons: module.lessons.map(({ quiz, ...lesson }) => ({
                ...lesson,
                ...(quiz
                  ? {
                      quiz: {
                        question: quiz.question,
                        options: quiz.options.map(({ id, text }) => ({
                          id,
                          text,
                        })),
                      },
                    }
                  : {}),
              })),
            })),
          },
          response.locals.requestId,
        ),
      );
    },
  );
  async function enrollment(userId: Types.ObjectId, courseId: Types.ObjectId) {
    await enrollments.updateOne(
      { userId, courseId },
      {
        $setOnInsert: {
          _id: new Types.ObjectId(),
          userId,
          courseId,
          completedLessonIds: [],
          enrolledAt: new Date(),
        },
      },
      { upsert: true },
    );
    return (await enrollments.findOne({ userId, courseId }))!;
  }
  const progress = (record: Enrollment, course: LiveCourse) => ({
    courseId: String(course._id),
    completedLessonIds: record.completedLessonIds,
    totalLessons: lessons(course).length,
    percent: Math.round(
      (record.completedLessonIds.length / Math.max(1, lessons(course).length)) *
        100,
    ),
    certificateId: record.certificateId ?? null,
  });
  router.get('/learning', async (request, response) => {
    const { user } = await authenticate(request);
    const records = await enrollments
      .find({ userId: user._id })
      .limit(1000)
      .toArray();
    const result = [];
    for (const record of records) {
      const course = await courses.findOne({
        _id: record.courseId,
        published: true,
      });
      if (course)
        result.push({ ...entry(course), ...progress(record, course) });
    }
    response.json(success(result, response.locals.requestId));
  });
  router.post('/learning/:courseId/enroll', async (request, response) => {
    const { user } = await authenticate(request);
    z.strictObject({}).parse(request.body);
    const course = await findCourse(String(request.params.courseId));
    response.json(
      success(
        progress(await enrollment(user._id, course._id), course),
        response.locals.requestId,
      ),
    );
  });
  router.post(
    '/learning/:courseId/lessons/:lessonId/complete',
    async (request, response) => {
      const { user } = await authenticate(request);
      const input = z
        .strictObject({ answerId: z.string().max(80).optional() })
        .parse(request.body);
      const course = await findCourse(String(request.params.courseId));
      const lesson = lessons(course).find(
        (l) => l.id === request.params.lessonId,
      );
      if (!lesson) throw new HttpError(404, 'NOT_FOUND', 'Lesson not found');
      const answer = lesson.quiz?.options.find(
        (option) => option.id === input.answerId,
      );
      if (lesson.quiz && !answer)
        throw new HttpError(422, 'ANSWER_REQUIRED', 'Choose a quiz answer');
      await enrollment(user._id, course._id);
      const correct = !lesson.quiz || answer?.isCorrect === true;
      await db.collection('lms_attempts').insertOne({
        userId: user._id,
        courseId: course._id,
        lessonId: lesson.id,
        answerId: input.answerId ?? null,
        correct,
        createdAt: new Date(),
      });
      if (correct)
        await enrollments.updateOne(
          { userId: user._id, courseId: course._id },
          { $addToSet: { completedLessonIds: lesson.id } },
        );
      let record = (await enrollments.findOne({
        userId: user._id,
        courseId: course._id,
      }))!;
      if (record.completedLessonIds.length === lessons(course).length) {
        await enrollments.updateOne(
          { _id: record._id, certificateId: { $exists: false } },
          {
            $set: {
              certificateId: randomBytes(16).toString('hex'),
              completedAt: new Date(),
            },
          },
        );
        record = (await enrollments.findOne({ _id: record._id }))!;
      }
      response.json(
        success(
          {
            correct,
            explanation: answer?.explanation ?? 'Lesson completed',
            progress: progress(record, course),
          },
          response.locals.requestId,
        ),
      );
    },
  );
  router.get('/certificates', async (request, response) => {
    const { user } = await authenticate(request);
    const records = await enrollments
      .find({ userId: user._id, certificateId: { $exists: true } })
      .toArray();
    const result = [];
    for (const record of records) {
      const course = await courses.findOne({ _id: record.courseId });
      if (course)
        result.push({
          certificateId: record.certificateId,
          courseTitle: course.title,
          learnerName: user.name,
          completedAt: record.completedAt,
        });
    }
    response.json(success(result, response.locals.requestId));
  });
  router.get('/admin/overview', async (request, response) => {
    const { user } = await authenticate(request);
    if (user.role !== 'admin')
      throw new HttpError(403, 'FORBIDDEN', 'Administrator access is required');
    const rows = await accounts
      .find({ active: true }, { projection: { passwordHash: 0 } })
      .limit(500)
      .toArray();
    const records = await enrollments.find({}).limit(5000).toArray();
    const courseIds = [...new Set(records.map((record) => record.courseId))];
    const courseRows = await courses
      .find({ _id: { $in: courseIds } })
      .toArray();
    const courseById = new Map(
      courseRows.map((course) => [String(course._id), course]),
    );
    response.json(
      success(
        {
          users: rows.map(publicUser),
          enrollments: records.flatMap((record) => {
            const course = courseById.get(String(record.courseId));
            if (!course) return [];
            const totalLessons = lessons(course).length;
            return [
              {
                userId: String(record.userId),
                courseId: String(record.courseId),
                courseTitle: course.title,
                completedLessons: record.completedLessonIds.length,
                totalLessons,
                percent: Math.round(
                  (record.completedLessonIds.length /
                    Math.max(1, totalLessons)) *
                    100,
                ),
                certificateId: record.certificateId ?? null,
              },
            ];
          }),
        },
        response.locals.requestId,
      ),
    );
  });
  router.post('/admin/courses', async (request, response) => {
    const { user } = await authenticate(request);
    if (user.role !== 'admin')
      throw new HttpError(403, 'FORBIDDEN', 'Administrator access is required');
    const input = z
      .strictObject({
        title: z.string().trim().min(3).max(200),
        description: z.string().max(2000),
        code: z.string().trim().min(2).max(64),
        lessonTitle: z.string().trim().min(2).max(200),
        lessonText: z.string().min(10).max(8000),
      })
      .parse(request.body);
    const id = new Types.ObjectId();
    const course: LiveCourse = {
      _id: id,
      slug: `custom-${id}`,
      title: input.title,
      description: input.description,
      code: input.code,
      published: true,
      publishedAt: new Date(),
      modules: [
        {
          id: String(new Types.ObjectId()),
          title: input.title,
          description: input.description,
          position: 0,
          lessons: [
            {
              id: String(new Types.ObjectId()),
              title: input.lessonTitle,
              description: '',
              position: 0,
              content: { type: 'text', text: input.lessonText },
            },
          ],
        },
      ],
    };
    await courses.insertOne(course);
    response
      .status(201)
      .json(success(entry(course), response.locals.requestId));
  });
  return router;
}
