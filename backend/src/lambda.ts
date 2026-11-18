import serverless from 'serverless-http';
import { createApp } from './app.js';
import { parseEnvironment } from './platform/environment.js';
import { createMongoAdapter } from './platform/database.js';
import { mongoConfigurationFromEnvironment } from './platform/database-config.js';
import { initializeLiveLms } from './modules/live-lms/router.js';
let ready: Promise<ReturnType<typeof serverless>> | undefined;
export async function handler(event: object, context: object) {
  if (!ready)
    ready = (async () => {
      const environment = parseEnvironment(process.env);
      if (environment.LMS_LIVE_ENABLED !== 'true')
        return serverless(createApp(environment));
      const database = createMongoAdapter(
        mongoConfigurationFromEnvironment(environment),
      );
      await database.connect({
        explicitlyAllowConnection: environment.DATABASE_ENABLED === 'true',
      });
      await initializeLiveLms(database.connection);
      return serverless(
        createApp(environment, {
          database: database.connection,
          readiness: async () => database.state === 1,
        }),
      );
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  return (await ready)(event, context);
}
