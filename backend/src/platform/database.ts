import mongoose from 'mongoose';
import { runtimeMongoUri } from './windows-mongo-dns.js';
import {
  assertLocalMongoTarget,
  parseMongoConfiguration,
  type MongoConfiguration,
} from './database-config.js';
/** No connection on import/construction. Runtime connection requires explicit configuration. */
export function createMongoAdapter(
  input?: string | Partial<MongoConfiguration>,
) {
  const configuration = parseMongoConfiguration(
    typeof input === 'string' ? { uri: input } : (input ?? {}),
  );
  const connection = mongoose.createConnection();
  // Keep emitted driver errors handled, without logging credentials or raw connection errors.
  connection.on('error', () => {});
  let opening: Promise<void> | undefined;
  let closing: Promise<void> | undefined;
  return {
    connection,
    get state() {
      return connection.readyState;
    },
    async connect(options: { explicitlyAllowConnection: boolean }) {
      if (!options.explicitlyAllowConnection)
        throw new Error('Database connection is disabled');
      assertLocalMongoTarget(configuration);
      if (closing) throw new Error('MongoDB connection is closing');
      if (connection.readyState === 1) return;
      if (opening) return opening;
      opening = (async () => {
        try {
          await connection.openUri(await runtimeMongoUri(configuration.uri!), {
            ...(configuration.databaseName
              ? { dbName: configuration.databaseName }
              : {}),
            autoIndex: false,
            autoCreate: false,
            bufferCommands: false,
            serverSelectionTimeoutMS: configuration.serverSelectionTimeoutMS,
            connectTimeoutMS: configuration.connectTimeoutMS,
            socketTimeoutMS: 30_000,
            maxPoolSize: 5,
          });
        } catch {
          await connection.close().catch(() => {});
          throw new Error(
            'MongoDB connection failed; check isolated test configuration and availability',
          );
        } finally {
          opening = undefined;
        }
      })();
      return opening;
    },
    async disconnect() {
      if (closing) return closing;
      closing = (async () => {
        if (opening) await opening.catch(() => {});
        try {
          await connection.close();
        } finally {
          closing = undefined;
        }
      })();
      return closing;
    },
  };
}
