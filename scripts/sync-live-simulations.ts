import { createMongoAdapter } from '../backend/src/platform/database.js';
import { mongoConfigurationFromEnvironment } from '../backend/src/platform/database-config.js';
import { parseEnvironment } from '../backend/src/platform/environment.js';
import type { LiveCourse } from '../backend/src/modules/live-lms/router.js';
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
  const courses = adapter.connection.db!.collection<LiveCourse>('lms_courses');
  let updated = 0;
  for (const seed of seeds) {
    const course = await courses.findOne({ slug: seed.slug, code: seed.code });
    if (!course) continue;
    const updates: Record<string, string | boolean> = {};
    for (let m = 0; m < seed.modules.length; m++) {
      const module = seed.modules[m]!;
      for (let l = 0; l < module.lessons.length; l++) {
        const lesson = module.lessons[l]!;
        if (course.modules[m]?.lessons[l]?.title !== lesson.title) continue;
        updates[`modules.${m}.lessons.${l}.diagramType`] = lesson.diagramType;
        if ('hasInteractiveVisualizer' in lesson)
          updates[`modules.${m}.lessons.${l}.hasInteractiveVisualizer`] =
            Boolean(lesson.hasInteractiveVisualizer);
      }
    }
    if (Object.keys(updates).length) {
      await courses.updateOne({ _id: course._id }, { $set: updates });
      updated++;
    }
  }
  console.log(
    `Updated simulation display metadata on ${updated} matching seeded courses; IDs, content, quiz answers and progress were preserved`,
  );
} catch {
  console.error(
    'Simulation metadata update failed; verify backend configuration and network access',
  );
  process.exitCode = 1;
} finally {
  await adapter.disconnect();
}
