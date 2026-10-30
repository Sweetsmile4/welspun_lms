import { describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  createLocalIntegrationDatabase,
  LOCAL_INTEGRATION_MARKER,
  assertLocalIntegrationConnection,
} from '../src/integration/local-database.js';
import { localIntegrationSchemaManifest } from '../src/integration/schema-manifest.js';
import {
  fictionalBootstrapStatus,
  fictionalDevelopmentBootstrapManifest,
} from '../src/integration/bootstrap-manifest.js';

describe('isolated local integration storage foundation', () => {
  const valid = {
    uri:
      'mongodb://127.0.0.1:27017/welspun_lms_integration_test?appName=' +
      LOCAL_INTEGRATION_MARKER,
    databaseName: 'welspun_lms_integration_test',
    ownershipMarker: 'welspun-lms-local-integration-v1' as const,
  };

  it('rejects shared, remote, SRV, credentialed and unowned targets without echoing input', () => {
    for (const uri of [
      'mongodb+srv://cluster.example.invalid/welspun_lms_dev',
      'mongodb://remote.example.invalid/welspun_lms_integration_test?appName=' +
        LOCAL_INTEGRATION_MARKER,
      'mongodb://user:secret@127.0.0.1:27017/welspun_lms_integration_test?appName=' +
        LOCAL_INTEGRATION_MARKER,
      'mongodb://127.0.0.1:27017/welspun_lms_dev?appName=' +
        LOCAL_INTEGRATION_MARKER,
      'mongodb://127.0.0.1:27017/welspun_lms_integration_test',
      'mongodb://127.0.0.1/welspun_lms_integration_test?appName=' +
        LOCAL_INTEGRATION_MARKER,
      'mongodb://localhost:27017/welspun_lms_integration_test?appName=' +
        LOCAL_INTEGRATION_MARKER,
      'mongodb://127.0.0.1:27017/welspun_lms_integration_test?appName=' +
        LOCAL_INTEGRATION_MARKER +
        '&appName=other',
    ]) {
      expect(() => createLocalIntegrationDatabase({ ...valid, uri })).toThrow(
        'owned loopback MongoDB database',
      );
    }
    expect(() =>
      createLocalIntegrationDatabase({
        ...valid,
        ownershipMarker: 'wrong' as never,
      }),
    ).toThrow();
  });
  it('rejects unregistered connections and production construction, and freezes target configuration', async () => {
    const database = createLocalIntegrationDatabase(valid);
    expect(Object.isFrozen(database.configuration)).toBe(true);
    expect(() =>
      assertLocalIntegrationConnection({
        readyState: 1,
        host: '127.0.0.1',
        name: valid.databaseName,
        port: 27017,
      } as mongoose.Connection),
    ).toThrow('owned loopback');
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(() => createLocalIntegrationDatabase(valid)).toThrow(
        'unavailable in production',
      );
    } finally {
      vi.unstubAllEnvs();
      await database.disconnect();
    }
  });

  it('does not connect on construction and refuses cleanup without explicit ownership', async () => {
    const database = createLocalIntegrationDatabase(valid);
    expect(database.state).toBe(0);
    await expect(
      database.cleanup({
        explicitlyAllowCleanup: true,
        ownershipMarker: 'wrong',
      }),
    ).rejects.toThrow('ownership marker');
    await database.disconnect();
  });

  it('produces a stable versioned manifest over existing and additive models', () => {
    const connection = mongoose.createConnection();
    const first = localIntegrationSchemaManifest(connection);
    const second = localIntegrationSchemaManifest(connection);
    expect(first.version).toBe('local-integration-schema-v1');
    expect(first.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toEqual(second);
    expect(first.entries.map((entry) => entry.collection)).toEqual([
      ...first.entries
        .map((entry) => entry.collection)
        .sort((a, b) => a.localeCompare(b)),
    ]);
    expect(first.entries.map((entry) => entry.collection)).toContain('courses');
    expect(first.entries.map((entry) => entry.collection)).toContain(
      'developmentSessions',
    );
    expect(first.entries.map((entry) => entry.collection)).toContain(
      'schemaMigrationLedger',
    );
    void connection.close();
  });

  it('keeps fictional bootstrap reviewable but executable bootstrap disabled', () => {
    expect(fictionalBootstrapStatus.executable).toBe(false);
    expect(fictionalBootstrapStatus.reason).toBeTypeOf('string');
    expect(
      fictionalDevelopmentBootstrapManifest.every(
        (record) => record.developmentOnly,
      ),
    ).toBe(true);
    expect(
      fictionalDevelopmentBootstrapManifest.some((record) =>
        record.code.includes('ADMIN'),
      ),
    ).toBe(false);
    expect(
      fictionalDevelopmentBootstrapManifest.some(
        (record) => record.kind === 'grant',
      ),
    ).toBe(true);
  });
});
