import { Types } from 'mongoose';
import { createMongoAdapter } from '../backend/src/platform/database.js';
import { mongoConfigurationFromEnvironment } from '../backend/src/platform/database-config.js';
import { parseEnvironment } from '../backend/src/platform/environment.js';
import { initializeLiveLms } from '../backend/src/modules/live-lms/router.js';
import seeds from '../backend/src/modules/live-lms/seed-courses.json';
process.loadEnvFile('backend/.env');
const environment = parseEnvironment(process.env);
const adapter = createMongoAdapter(
  mongoConfigurationFromEnvironment(environment),
);
try {
  await adapter.connect({
    explicitlyAllowConnection: environment.DATABASE_ENABLED === 'true',
  });
  await initializeLiveLms(adapter.connection);
  const db = adapter.connection.db!;
  if (process.argv[2] === 'grant-admin') {
    const email = process.argv[3]?.trim().toLowerCase();
    if (!email || !email.includes('@'))
      throw new Error('Specify the email of an already registered account');
    const result = await db
      .collection('lms_accounts')
      .updateOne({ email, active: true }, { $set: { role: 'admin' } });
    if (result.matchedCount !== 1)
      throw new Error('Registered account not found');
    console.log('Administrator role granted to the specified existing account');
  } else {
    let added = 0;
    for (const seed of seeds) {
      const result = await db.collection('lms_courses').updateOne(
        { slug: seed.slug },
        {
          $setOnInsert: {
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
          },
        },
        { upsert: true },
      );
      added += result.upsertedCount;
    }
    console.log(
      `welspun_lms_dev: added ${added} courses; existing courses were preserved`,
    );
  }
} catch {
  console.error(
    'Live LMS setup failed. Check backend database configuration, network access and the registered account. No connection details are printed.',
  );
  process.exitCode = 1;
} finally {
  await adapter.disconnect();
}
