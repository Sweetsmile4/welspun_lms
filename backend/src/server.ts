import { initializeLiveLms } from './modules/live-lms/router.js';
import { createApp } from './app.js';
import { parseEnvironment } from './platform/environment.js';
import { createLogger } from './platform/logger.js';
import { createMongoAdapter } from './platform/database.js';
import { mongoConfigurationFromEnvironment } from './platform/database-config.js';
const environment = parseEnvironment(process.env);
const logger = createLogger(environment.LOG_LEVEL);
const database = createMongoAdapter(
  mongoConfigurationFromEnvironment(environment),
);
if (environment.DATABASE_ENABLED === 'true')
  await database.connect({ explicitlyAllowConnection: true });
if (environment.LMS_LIVE_ENABLED === 'true') {
  if (database.state !== 1)
    throw new Error('Enable the database before enabling the live LMS');
  await initializeLiveLms(database.connection);
}
const server = createApp(environment, {
  logger,
  database: database.connection,
  readiness: async () =>
    environment.DATABASE_ENABLED !== 'true' || database.state === 1,
}).listen(environment.PORT, environment.HOST, (error?: Error) => {
  // Express 5 also invokes the callback on listener failure.
  if (error) return;
  logger.info(
    {
      port: environment.PORT,
      phase: '1A',
      database:
        environment.DATABASE_ENABLED === 'true'
          ? 'welspun_lms_dev'
          : 'disabled',
    },
    environment.HOST === '127.0.0.1'
      ? 'API listening on loopback'
      : 'API listening on configured interface',
  );
});
server.on('error', () => {
  logger.fatal('API listener failed');
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    logger.info({ signal }, 'API shutting down');
    server.close(async () => {
      await database.disconnect();
      process.exitCode = 0;
    });
    setTimeout(() => {
      server.closeAllConnections();
    }, 5000).unref();
  });
