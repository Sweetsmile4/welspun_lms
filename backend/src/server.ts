import { createApp } from './app.js';
import { parseEnvironment } from './platform/environment.js';
import { createLogger } from './platform/logger.js';
const environment = parseEnvironment(process.env);
const logger = createLogger(environment.LOG_LEVEL);
const server = createApp(environment, { logger }).listen(
  environment.PORT,
  environment.HOST,
  (error?: Error) => {
    // Express 5 also invokes the callback on listener failure.
    if (error) return;
    logger.info(
      { port: environment.PORT, phase: '1A', database: 'disabled' },
      environment.HOST === '127.0.0.1'
        ? 'API listening on loopback'
        : 'API listening on configured interface',
    );
  },
);
server.on('error', () => {
  logger.fatal('API listener failed');
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    logger.info({ signal }, 'API shutting down');
    server.close(() => {
      process.exitCode = 0;
    });
    setTimeout(() => {
      server.closeAllConnections();
    }, 5000).unref();
  });
