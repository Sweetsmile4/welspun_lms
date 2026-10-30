import { Schema, type Connection } from 'mongoose';

const options = {
  strict: 'throw' as const,
  versionKey: false as const,
  autoCreate: false,
  autoIndex: false,
  bufferCommands: false,
};
const objectId = {
  type: Schema.Types.ObjectId,
  required: true,
  immutable: true,
} as const;
const hash = {
  type: String,
  required: true,
  immutable: true,
  match: /^[a-f0-9]{64}$/,
} as const;

export const developmentSessionSchema = new Schema(
  {
    sessionTokenHash: hash,
    organizationId: objectId,
    userId: objectId,
    issuedAt: { type: Date, required: true, immutable: true },
    authenticatedAt: { type: Date, required: true, immutable: true },
    idleExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, immutable: true },
    revokedAt: { type: Date, default: null },
    revocationReason: { type: String, default: null, maxlength: 200 },
    csrfBindingHash: hash,
  },
  options,
);
developmentSessionSchema.index(
  { sessionTokenHash: 1 },
  { unique: true, name: 'development_session_token_unique' },
);
developmentSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'development_session_expiry_cleanup' },
);
developmentSessionSchema.index(
  { organizationId: 1, userId: 1, revokedAt: 1 },
  { name: 'development_session_actor_state' },
);

export const loginTransactionSchema = new Schema(
  {
    transactionHash: hash,
    stateHash: hash,
    issuer: { type: String, required: true, immutable: true, maxlength: 512 },
    subject: { type: String, required: true, immutable: true, maxlength: 256 },
    createdAt: { type: Date, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
    consumedAt: { type: Date, default: null },
  },
  options,
);
loginTransactionSchema.index(
  { transactionHash: 1 },
  { unique: true, name: 'login_transaction_identity' },
);
loginTransactionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'login_transaction_expiry_cleanup' },
);

export const securityOutcomeSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f0-9-]{36}$/,
    },
    requestId: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f0-9-]{36}$/,
    },
    occurredAt: { type: Date, required: true, immutable: true },
    category: {
      type: String,
      required: true,
      immutable: true,
      enum: ['authentication', 'authorization', 'session', 'infrastructure'],
    },
    outcome: {
      type: String,
      required: true,
      immutable: true,
      enum: ['denied', 'failure'],
    },
    organizationId: { type: Schema.Types.ObjectId, immutable: true },
    userId: { type: Schema.Types.ObjectId, immutable: true },
    reasonCode: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 80,
      enum: [
        'AUTHENTICATION_REQUIRED',
        'FORBIDDEN',
        'SESSION_EXPIRED',
        'SESSION_REVOKED',
        'DEPENDENCY_UNAVAILABLE',
      ],
    },
  },
  options,
);
securityOutcomeSchema.index(
  { eventId: 1 },
  { unique: true, name: 'security_outcome_identity' },
);
securityOutcomeSchema.index(
  { organizationId: 1, occurredAt: 1, eventId: 1 },
  { name: 'security_outcome_scope_page' },
);

export const schemaMigrationLedgerSchema = new Schema(
  {
    manifestVersion: { type: String, required: true, immutable: true },
    checksum: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f0-9]{64}$/,
    },
    appliedAt: { type: Date, required: true, immutable: true },
    operation: {
      type: String,
      required: true,
      immutable: true,
      enum: ['additive-index-schema'],
    },
  },
  options,
);
schemaMigrationLedgerSchema.index(
  { manifestVersion: 1 },
  { unique: true, name: 'schema_manifest_version_unique' },
);

export function createIntegrationModels(connection: Connection) {
  return {
    sessions: connection.model(
      'DevelopmentSession',
      developmentSessionSchema,
      'developmentSessions',
    ),
    loginTransactions: connection.model(
      'LoginTransaction',
      loginTransactionSchema,
      'loginTransactions',
    ),
    securityOutcomes: connection.model(
      'SecurityOutcome',
      securityOutcomeSchema,
      'securityOutcomes',
    ),
    migrationLedger: connection.model(
      'SchemaMigrationLedger',
      schemaMigrationLedgerSchema,
      'schemaMigrationLedger',
    ),
  };
}
