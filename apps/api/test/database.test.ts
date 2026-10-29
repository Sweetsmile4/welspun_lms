import { describe, expect, it, vi } from 'vitest';
import { createMongoAdapter } from '../src/platform/database.js';
import {
  parseMongoConfiguration,
  assertLocalMongoTarget,
  mongoConfigurationFromEnvironment,
} from '../src/platform/database-config.js';
import { parseEnvironment } from '../src/platform/environment.js';

describe('explicit local database lifecycle', () => {
  it('rejects production, remote, credentialed, and incorrectly named targets without opening a socket', async () => {
    for (const config of [
      {
        environment: 'production' as const,
        uri: 'mongodb://127.0.0.1:27017/welspun_lms_test_synthetic',
      },
      { uri: 'mongodb://example.invalid:27017/welspun_lms_test_synthetic' },
      {
        uri: 'mongodb://user:secret@127.0.0.1:27017/welspun_lms_test_synthetic',
      },
      { uri: 'mongodb://127.0.0.1:27017/production' },
      { uri: 'mongodb+srv://example.invalid/welspun_lms_test_synthetic' },
    ]) {
      const adapter = createMongoAdapter({
        environment: 'test',
        isolated: true,
        ...config,
      });
      const open = vi.spyOn(adapter.connection, 'openUri');
      await expect(
        adapter.connect({ explicitlyAllowConnection: true }),
      ).rejects.toThrow();
      expect(open).not.toHaveBeenCalled();
      await adapter.disconnect();
    }
    expect(() =>
      assertLocalMongoTarget(
        parseMongoConfiguration({
          uri: 'mongodb://127.0.0.1:27017/welspun_lms_dev_synthetic',
        }),
      ),
    ).toThrow('isolated');
  });
  it('validates timeout settings and keeps server environment disconnected by default', () => {
    expect(() => parseEnvironment({ MONGODB_CONNECT_TIMEOUT_MS: '0' })).toThrow(
      'MONGODB_CONNECT_TIMEOUT_MS',
    );
    expect(() =>
      parseMongoConfiguration({ serverSelectionTimeoutMS: 99 }),
    ).toThrow('Invalid MongoDB configuration');
    const configuration = mongoConfigurationFromEnvironment(
      parseEnvironment({}),
    );
    expect(configuration.isolated).toBe(false);
    expect(configuration.environment).toBe('development');
  });
  it('sanitizes connection failures and can disconnect afterward', async () => {
    const adapter = createMongoAdapter({
      environment: 'test',
      isolated: true,
      uri: 'mongodb://127.0.0.1:27017/welspun_lms_test_synthetic',
      serverSelectionTimeoutMS: 100,
      connectTimeoutMS: 100,
    });
    const open = vi
      .spyOn(adapter.connection, 'openUri')
      .mockRejectedValue(new Error('secret URI and driver diagnostics'));
    await expect(
      adapter.connect({ explicitlyAllowConnection: true }),
    ).rejects.toThrow('MongoDB connection failed');
    expect(open).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        serverSelectionTimeoutMS: 100,
        connectTimeoutMS: 100,
        autoIndex: false,
        autoCreate: false,
        bufferCommands: false,
      }),
    );
    expect(adapter.state).toBe(0);
    await adapter.disconnect();
    open.mockRestore();
  });
});
