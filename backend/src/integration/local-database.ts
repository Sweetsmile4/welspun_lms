import mongoose, { type Connection } from 'mongoose';
import { z } from 'zod';

export const LOCAL_INTEGRATION_MARKER = 'welspun-lms-local-integration-v1';
const databaseNamePattern =
  /^welspun_lms_integration_[a-z0-9][a-z0-9_-]{2,62}$/;
const ownedConnections = new WeakMap<
  Connection,
  { databaseName: string; port: number }
>();
const inputSchema = z.strictObject({
  uri: z.string().min(1),
  databaseName: z.string().regex(databaseNamePattern),
  ownershipMarker: z.literal(LOCAL_INTEGRATION_MARKER),
  serverSelectionTimeoutMS: z.number().int().min(100).max(10_000).default(3000),
  connectTimeoutMS: z.number().int().min(100).max(10_000).default(3000),
  maxPoolSize: z.number().int().min(1).max(5).default(5),
});
export type LocalIntegrationDatabaseInput = z.input<typeof inputSchema>;
export type LocalIntegrationDatabaseConfiguration = z.output<
  typeof inputSchema
>;

function assertTarget(configuration: LocalIntegrationDatabaseConfiguration) {
  try {
    const target = new URL(configuration.uri);
    if (
      target.protocol !== 'mongodb:' ||
      !['127.0.0.1', '[::1]'].includes(target.hostname) ||
      !target.port ||
      Number(target.port) < 1 ||
      Number(target.port) > 65535 ||
      target.username ||
      target.password ||
      target.hash ||
      target.pathname !== `/${configuration.databaseName}` ||
      !databaseNamePattern.test(configuration.databaseName) ||
      configuration.databaseName === 'welspun_lms_dev' ||
      target.searchParams.get('appName') !== LOCAL_INTEGRATION_MARKER
    )
      throw new Error('target');
    for (const [key, value] of target.searchParams) {
      if (
        target.searchParams.getAll(key).length !== 1 ||
        !['appName', 'replicaSet'].includes(key) ||
        !/^[a-zA-Z0-9_-]+$/.test(value)
      )
        throw new Error('options');
    }
  } catch {
    throw new Error(
      'Local integration target must be an owned loopback MongoDB database',
    );
  }
}

/** Construction is inert; only connect() with explicit intent can open a socket. */
export function createLocalIntegrationDatabase(
  input: LocalIntegrationDatabaseInput,
) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Local integration storage is unavailable in production');
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    throw new Error('Invalid local integration database configuration');
  const configuration = Object.freeze(parsed.data);
  assertTarget(configuration);
  const connection = mongoose.createConnection();
  ownedConnections.set(connection, {
    databaseName: configuration.databaseName,
    port: Number(new URL(configuration.uri).port),
  });
  connection.on('error', () => {});
  let opening: Promise<void> | undefined;
  let closing: Promise<void> | undefined;
  return {
    connection,
    configuration,
    get state() {
      return connection.readyState;
    },
    async connect(options: { explicitlyAllowConnection: true }) {
      if (process.env.NODE_ENV === 'production')
        throw new Error(
          'Local integration storage is unavailable in production',
        );
      if (options.explicitlyAllowConnection !== true)
        throw new Error(
          'Local integration connection requires explicit operator intent',
        );
      if (closing) throw new Error('Local integration connection is closing');
      if (connection.readyState === 1) return;
      if (opening) return opening;
      opening = (async () => {
        try {
          await connection.openUri(configuration.uri, {
            dbName: configuration.databaseName,
            autoCreate: false,
            autoIndex: false,
            bufferCommands: false,
            serverSelectionTimeoutMS: configuration.serverSelectionTimeoutMS,
            connectTimeoutMS: configuration.connectTimeoutMS,
            socketTimeoutMS: 10_000,
            maxPoolSize: configuration.maxPoolSize,
            appName: LOCAL_INTEGRATION_MARKER,
          });
          assertLocalIntegrationConnection(connection);
          if (connection.name !== configuration.databaseName)
            throw new Error('Unexpected local integration database');
        } catch {
          await connection.close().catch(() => {});
          throw new Error('Local integration MongoDB connection failed');
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
    async cleanup(options: {
      explicitlyAllowCleanup: true;
      ownershipMarker: string;
    }) {
      if (
        options.explicitlyAllowCleanup !== true ||
        options.ownershipMarker !== LOCAL_INTEGRATION_MARKER
      )
        throw new Error(
          'Local integration cleanup requires the ownership marker',
        );
      assertTarget(configuration);
      if (connection.readyState !== 1)
        throw new Error(
          'Local integration cleanup requires a connected database',
        );
      assertLocalIntegrationConnection(connection);
      if (connection.name !== configuration.databaseName)
        throw new Error(
          'Local integration cleanup target does not match the owned database',
        );
      await connection.dropDatabase();
    },
  };
}

export function assertLocalIntegrationConnection(connection: Connection) {
  const owned = ownedConnections.get(connection);
  if (
    process.env.NODE_ENV === 'production' ||
    !owned ||
    connection.readyState !== 1 ||
    !['127.0.0.1', '::1'].includes(connection.host) ||
    connection.name !== owned.databaseName ||
    connection.port !== owned.port
  )
    throw new Error(
      'Local integration storage requires an owned loopback connection',
    );
}
