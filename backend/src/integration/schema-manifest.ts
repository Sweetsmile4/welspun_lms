import { createHash } from 'node:crypto';
import type { Connection, Schema } from 'mongoose';
import { createAuthorizationModels } from '../modules/identity/authorization/models.js';
import { createOrganizationModels } from '../modules/identity/organization/models.js';
import { managementReceiptSchema } from '../modules/identity/management/mongo-store.js';
import { createDraftModels } from '../modules/catalog/drafts/models.js';
import {
  evidenceModelSchema,
  releaseModelSchema,
  reviewModelSchema,
} from '../modules/catalog/publishing/mongo-store.js';
import { securityAuditSchema } from '../platform/mongo-security-audit.js';
import { createIntegrationModels } from './session-models.js';
import { assertLocalIntegrationConnection } from './local-database.js';

export const LOCAL_SCHEMA_MANIFEST_VERSION = 'local-integration-schema-v1';
type IndexDefinition = {
  keys: Record<string, unknown>;
  keyOrder: string[];
  options: Record<string, unknown>;
};
export type SchemaManifestEntry = {
  collection: string;
  fields: {
    path: string;
    type: string;
    required: boolean;
    immutable: boolean;
  }[];
  indexes: IndexDefinition[];
};
export type SchemaManifest = {
  version: string;
  checksum: string;
  entries: SchemaManifestEntry[];
};

function indexDefinitions(schema: Schema): IndexDefinition[] {
  return schema.indexes().map(([keys, options]) => ({
    keys: { ...keys },
    keyOrder: Object.keys(keys),
    options: {
      ...options,
      name:
        options.name ??
        Object.entries(keys)
          .map(([key, direction]) => `${key}_${direction}`)
          .join('_'),
    },
  }));
}
function entry(collection: string, schema: Schema): SchemaManifestEntry {
  return {
    collection,
    indexes: indexDefinitions(schema),
    fields: Object.entries(schema.paths)
      .map(([path, type]) => ({
        path,
        type: type.instance,
        required: type.isRequired === true,
        immutable: type.options.immutable === true,
      }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

/** Registers only model metadata; it never opens a connection or mutates a collection. */
export function registerLocalIntegrationModels(connection: Connection) {
  const organization = createOrganizationModels(connection);
  const authorization = createAuthorizationModels(connection);
  const drafts = createDraftModels(connection);
  const integration = createIntegrationModels(connection);
  const models = {
    organizations: organization.organizations,
    orgUnits: organization.orgUnits,
    users: organization.users,
    memberships: organization.memberships,
    roleDefinitions: authorization.roleDefinitions,
    roleGrants: authorization.roleGrants,
    courses: drafts.courses,
    contentDrafts: drafts.drafts,
    managementCommandReceipts: connection.model(
      'ManagementCommandReceipt',
      managementReceiptSchema,
      'managementCommandReceipts',
    ),
    securityAuditEvents: connection.model(
      'SecurityAuditEvent',
      securityAuditSchema,
      'securityAuditEvents',
    ),
    reviewRequests: connection.model(
      'CourseReview',
      reviewModelSchema,
      'reviewRequests',
    ),
    reviewDecisions: connection.model(
      'CourseReviewEvidence',
      evidenceModelSchema,
      'reviewDecisions',
    ),
    courseReleases: connection.model(
      'CourseRelease',
      releaseModelSchema,
      'courseReleases',
    ),
    developmentSessions: integration.sessions,
    loginTransactions: integration.loginTransactions,
    securityOutcomes: integration.securityOutcomes,
    schemaMigrationLedger: integration.migrationLedger,
  };
  return models;
}

export function localIntegrationSchemaManifest(
  connection: Connection,
): SchemaManifest {
  const models = registerLocalIntegrationModels(connection);
  const entries = Object.entries(models)
    .map(([collection, model]) =>
      entry(
        collection === 'contentDrafts'
          ? 'contentDrafts'
          : model.collection.name,
        model.schema,
      ),
    )
    .sort((a, b) => a.collection.localeCompare(b.collection));
  const withoutChecksum = { version: LOCAL_SCHEMA_MANIFEST_VERSION, entries };
  return {
    ...withoutChecksum,
    checksum: createHash('sha256')
      .update(canonical(withoutChecksum))
      .digest('hex'),
  };
}

export function assertManifestConnection(connection: Connection) {
  assertLocalIntegrationConnection(connection);
}
