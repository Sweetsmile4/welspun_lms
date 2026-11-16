import { createLogger } from '@welspun/api/platform/logger';
// Same backend platform; no worker-owned domain, database, queue or network connection.
createLogger().info(
  { phase: '1A', queues: 'disabled' },
  'Worker foundation validated; no jobs registered. Exiting.',
);
