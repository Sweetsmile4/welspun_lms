import { z } from 'zod';
import type { Environment } from './environment.js';
const configurationSchema = z.strictObject({
  uri: z.string().optional(),
  environment: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  isolated: z.boolean().default(false),
  serverSelectionTimeoutMS: z.number().int().min(100).max(30_000).default(5000),
  connectTimeoutMS: z.number().int().min(100).max(30_000).default(5000),
});
export type MongoConfiguration = z.output<typeof configurationSchema>;
export function parseMongoConfiguration(
  input: z.input<typeof configurationSchema>,
): MongoConfiguration {
  const result = configurationSchema.safeParse(input);
  if (!result.success) throw new Error('Invalid MongoDB configuration');
  return result.data;
}
/** This phase permits only explicit, credential-free, isolated local development/test databases. */
export function assertLocalMongoTarget(config: MongoConfiguration) {
  if (!config.uri) throw new Error('MongoDB URI is not configured');
  if (config.environment === 'production' || !config.isolated)
    throw new Error('MongoDB requires isolated development/test mode');
  try {
    const uri = new URL(config.uri);
    const prefix =
      config.environment === 'test'
        ? '/welspun_lms_test_'
        : '/welspun_lms_dev_';
    if (
      uri.protocol !== 'mongodb:' ||
      !['127.0.0.1', '[::1]', 'localhost'].includes(uri.hostname) ||
      uri.username ||
      uri.password ||
      !uri.port ||
      !uri.pathname.startsWith(prefix) ||
      !/^\/[a-zA-Z0-9_]+$/.test(uri.pathname) ||
      uri.hash
    )
      throw new Error('target');
    for (const [key, value] of uri.searchParams) {
      if (
        !(key === 'replicaSet' && /^[a-zA-Z0-9_-]+$/.test(value)) &&
        !(key === 'directConnection' && ['true', 'false'].includes(value))
      )
        throw new Error('options');
    }
  } catch {
    throw new Error(
      'MongoDB target must be a credential-free local isolated development/test database',
    );
  }
}
export function mongoConfigurationFromEnvironment(
  environment: Environment,
): MongoConfiguration {
  return parseMongoConfiguration({
    uri: environment.MONGODB_URI,
    environment: environment.NODE_ENV,
    isolated: environment.ISOLATED_DEVELOPMENT === 'true',
    serverSelectionTimeoutMS: environment.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    connectTimeoutMS: environment.MONGODB_CONNECT_TIMEOUT_MS,
  });
}
