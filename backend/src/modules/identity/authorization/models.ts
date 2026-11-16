import { Schema, type Connection } from 'mongoose';
import { actions, scopeSchema } from './types.js';
const options = {
  strict: 'throw',
  timestamps: true,
  versionKey: false,
  autoIndex: false,
  autoCreate: false,
  bufferCommands: false,
} as const;
const id = {
  type: Schema.Types.ObjectId,
  required: true,
  immutable: true,
} as const;
const revision = {
  type: Number,
  required: true,
  min: 0,
  default: 0,
  validate: Number.isSafeInteger,
} as const;
const metadata = {
  createdBy: { type: String, required: true, immutable: true },
  updatedBy: { type: String, required: true },
  revision,
};
export const roleDefinitionSchema = new Schema(
  {
    ...metadata,
    organizationId: id,
    code: {
      type: String,
      required: true,
      immutable: true,
      match: /^[A-Z][A-Z0-9_-]{0,63}$/,
    },
    version: {
      type: Number,
      required: true,
      immutable: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    permissions: {
      type: [{ type: String, enum: actions }],
      required: true,
      immutable: true,
      validate: (v: string[]) => v.length > 0 && new Set(v).size === v.length,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive'],
      immutable: true,
    },
  },
  options,
);
roleDefinitionSchema.index(
  { organizationId: 1, code: 1, version: -1 },
  { unique: true, name: 'role_code_version_unique' },
);
const scope = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ['own', 'organization', 'unit', 'resource'],
    },
    unitId: String,
    includeDescendants: Boolean,
    resourceType: String,
    resourceId: String,
  },
  { _id: false, strict: 'throw' },
);
export const roleGrantSchema = new Schema(
  {
    ...metadata,
    organizationId: id,
    userId: id,
    roleDefinitionId: id,
    roleVersion: {
      type: Number,
      required: true,
      immutable: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    scope: { type: scope, required: true, immutable: true },
    validFrom: { type: Date, required: true, immutable: true },
    validTo: { type: Date, default: null, immutable: true },
    grantedBy: { type: String, required: true, immutable: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: String, default: null },
    revocationReason: { type: String, default: null, maxlength: 500 },
  },
  options,
);
roleGrantSchema.pre('validate', function () {
  if (!scopeSchema.safeParse(this.toObject().scope).success)
    this.invalidate('scope', 'Invalid grant scope');
  if (this.validTo && this.validTo <= this.validFrom)
    this.invalidate('validTo', 'Expiry must follow start');
  if (
    !!this.revokedAt !== !!this.revokedBy ||
    !!this.revokedAt !== !!this.revocationReason
  )
    this.invalidate('revokedAt', 'Revocation metadata must be complete');
});
roleGrantSchema.index(
  { organizationId: 1, userId: 1, revokedAt: 1, validFrom: 1, validTo: 1 },
  { name: 'actor_grant_evaluation' },
);
roleGrantSchema.index(
  { organizationId: 1, roleDefinitionId: 1, roleVersion: 1 },
  { name: 'role_grants' },
);
export function createAuthorizationModels(connection: Connection) {
  return {
    roleDefinitions: connection.model(
      'RoleDefinition',
      roleDefinitionSchema,
      'roleDefinitions',
    ),
    roleGrants: connection.model('RoleGrant', roleGrantSchema, 'roleGrants'),
  };
}
