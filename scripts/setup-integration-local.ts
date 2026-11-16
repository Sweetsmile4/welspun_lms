import {
  createLocalIntegrationDatabase,
  LOCAL_INTEGRATION_MARKER,
} from '../backend/src/integration/local-database.js';
import { localIntegrationSchemaManifest } from '../backend/src/integration/schema-manifest.js';
import {
  setupLocalIntegrationSchema,
  compareLocalIntegrationSchema,
} from '../backend/src/integration/schema-setup.js';

const mode = process.argv[2];
if (!['--dry-run', '--apply'].includes(mode ?? '') || process.argv.length !== 3)
  throw new Error('Choose --dry-run or --apply');
if (
  process.env.NODE_ENV === 'production' ||
  process.env.LOCAL_INTEGRATION_SETUP !== 'true'
)
  throw new Error(
    'Set LOCAL_INTEGRATION_SETUP=true for explicit disposable-local schema setup',
  );
const uri = process.env.LOCAL_INTEGRATION_MONGOURI;
const databaseName = process.env.LOCAL_INTEGRATION_DATABASE_NAME;
if (!uri || !databaseName)
  throw new Error(
    'Local setup requires LOCAL_INTEGRATION_MONGOURI and LOCAL_INTEGRATION_DATABASE_NAME',
  );
const database = createLocalIntegrationDatabase({
  uri,
  databaseName,
  ownershipMarker: LOCAL_INTEGRATION_MARKER,
});
try {
  await database.connect({ explicitlyAllowConnection: true });
  const manifest = localIntegrationSchemaManifest(database.connection);
  if (mode === '--dry-run') {
    const comparison = await compareLocalIntegrationSchema(database.connection);
    console.log(JSON.stringify(comparison));
  } else {
    const expected = process.env.LOCAL_INTEGRATION_EXPECTED_CHECKSUM;
    if (!expected || expected !== manifest.checksum)
      throw new Error(
        'Explicit reviewed LOCAL_INTEGRATION_EXPECTED_CHECKSUM required',
      );
    const result = await setupLocalIntegrationSchema(database.connection, {
      explicitlyAllowSetup: true,
      expectedChecksum: expected,
    });
    if (
      result.drift.length ||
      result.duplicates.length ||
      result.ledger?.checksum !== result.manifest.checksum
    )
      throw new Error('Local integration schema setup did not converge');
    console.log(
      `Applied ${result.manifest.version} (${result.manifest.checksum}) to the owned local integration database`,
    );
  }
} catch {
  console.error(
    'Local integration setup failed; inspect target, manifest and permissions without logging secrets',
  );
  process.exitCode = 1;
} finally {
  await database.disconnect();
}
