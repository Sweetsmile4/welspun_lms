import { Schema, type Connection, type InferSchemaType } from 'mongoose';

const id = {
  type: Schema.Types.ObjectId,
  required: true,
  immutable: true,
} as const;
const code = {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
  match: /^[A-Z][A-Z0-9_-]{0,63}$/,
  immutable: true,
} as const;
const name = {
  type: String,
  required: true,
  trim: true,
  minlength: 1,
  maxlength: 200,
} as const;
const status = {
  type: String,
  enum: ['active', 'inactive'],
  required: true,
  default: 'active',
} as const;
const revision = {
  type: Number,
  required: true,
  default: 0,
  min: 0,
  validate: Number.isSafeInteger,
} as const;
const metadata = {
  createdBy: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    immutable: true,
  },
  updatedBy: { type: String, required: true, trim: true, maxlength: 200 },
  revision,
};
const options = {
  strict: 'throw',
  timestamps: true,
  versionKey: false,
  autoIndex: false,
  autoCreate: false,
  bufferCommands: false,
} as const;
export function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export const organizationSchema = new Schema(
  {
    ...metadata,
    code,
    name,
    status,
    timeZone: { type: String, required: true, validate: validTimeZone },
    treeRevision: revision,
  },
  options,
);
organizationSchema.index(
  { code: 1 },
  { unique: true, name: 'organization_code_unique' },
);

export const orgUnitSchema = new Schema(
  {
    ...metadata,
    organizationId: id,
    type: {
      type: String,
      enum: ['organization', 'plant', 'department'],
      required: true,
      immutable: true,
    },
    parentId: { type: Schema.Types.ObjectId, default: null },
    ancestorIds: { type: [Schema.Types.ObjectId], required: true, default: [] },
    code,
    name,
    status,
    treeRevision: revision,
  },
  options,
);
orgUnitSchema.index(
  { organizationId: 1, parentId: 1, code: 1 },
  { unique: true, name: 'unit_code_per_parent_unique' },
);
orgUnitSchema.index(
  { organizationId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'organization' },
    name: 'one_organization_root',
  },
);
orgUnitSchema.index({ organizationId: 1, ancestorIds: 1, status: 1 });
orgUnitSchema.pre('validate', function () {
  const isRoot = this.type === 'organization';
  if (
    isRoot
      ? this.parentId !== null || this.ancestorIds.length !== 0
      : this.parentId === null || this.ancestorIds.length === 0
  )
    this.invalidate('parentId', 'Invalid root or child shape');
  const ancestors = this.ancestorIds.map(String);
  if (
    ancestors.length > 32 ||
    new Set(ancestors).size !== ancestors.length ||
    ancestors.includes(String(this._id))
  )
    this.invalidate('ancestorIds', 'Invalid ancestry');
  if (!isRoot && ancestors.at(-1) !== String(this.parentId))
    this.invalidate('ancestorIds', 'Parent must be the final ancestor');
});

export const userSchema = new Schema(
  {
    ...metadata,
    organizationId: id,
    identityIssuer: {
      type: String,
      required: true,
      maxlength: 512,
      immutable: true,
      validate: (value: string) => value.trim().length > 0,
    },
    identitySubject: {
      type: String,
      required: true,
      maxlength: 256,
      immutable: true,
      validate: (value: string) => value.trim().length > 0,
    },
    employeeId: { type: String, trim: true, minlength: 1, maxlength: 100 },
    displayName: name,
    status,
  },
  options,
);
userSchema.index(
  { organizationId: 1, identityIssuer: 1, identitySubject: 1 },
  { unique: true, name: 'external_identity_unique' },
);
userSchema.index(
  { organizationId: 1, employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $type: 'string' } },
    name: 'optional_employee_id_unique',
  },
);

export const membershipSchema = new Schema(
  {
    ...metadata,
    organizationId: id,
    userId: id,
    orgUnitId: id,
    validFrom: { type: Date, required: true, immutable: true },
    validTo: { type: Date, default: null },
    primary: { type: Boolean, required: true, default: false, immutable: true },
  },
  options,
);
membershipSchema.pre('validate', function () {
  if (this.validTo && this.validTo <= this.validFrom)
    this.invalidate('validTo', 'Must be after validFrom');
});
membershipSchema.index(
  { organizationId: 1, userId: 1, orgUnitId: 1, validFrom: 1 },
  { unique: true, name: 'membership_interval_start_unique' },
);
membershipSchema.index(
  { organizationId: 1, userId: 1, orgUnitId: 1 },
  {
    unique: true,
    partialFilterExpression: { validTo: null },
    name: 'one_open_membership_per_unit',
  },
);
membershipSchema.index(
  { organizationId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { validTo: null, primary: true },
    name: 'one_open_primary_membership',
  },
);
membershipSchema.index({
  organizationId: 1,
  userId: 1,
  validFrom: 1,
  validTo: 1,
});
membershipSchema.index({ organizationId: 1, orgUnitId: 1, validTo: 1 });

export type OrganizationDocument = InferSchemaType<typeof organizationSchema>;
export type OrgUnitDocument = InferSchemaType<typeof orgUnitSchema>;
export type UserDocument = InferSchemaType<typeof userSchema>;
export type MembershipDocument = InferSchemaType<typeof membershipSchema>;
/** Registration has no network or collection/index creation side effect. */
export function createOrganizationModels(connection: Connection) {
  return {
    organizations: connection.model<OrganizationDocument>(
      'Organization',
      organizationSchema,
      'organizations',
    ),
    orgUnits: connection.model<OrgUnitDocument>(
      'OrgUnit',
      orgUnitSchema,
      'orgUnits',
    ),
    users: connection.model<UserDocument>(
      'OrganizationUser',
      userSchema,
      'users',
    ),
    memberships: connection.model<MembershipDocument>(
      'Membership',
      membershipSchema,
      'memberships',
    ),
  };
}
