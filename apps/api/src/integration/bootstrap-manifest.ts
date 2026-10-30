import type { Action } from '../modules/identity/authorization/types.js';
export const LOCAL_BOOTSTRAP_MANIFEST_VERSION =
  'fictional-development-bootstrap-v1';

export type FictionalBootstrapRecord = Readonly<{
  kind: 'organization' | 'unit' | 'user' | 'grant';
  code: string;
  label: string;
  developmentOnly: true;
  issuer?: string;
  subject?: string;
  roleCode?: string;
  granteeCode?: string;
  scope: 'organization' | 'unit' | 'own';
}>;

/** Reviewable data only. There is deliberately no executable seed function. */
export const fictionalDevelopmentBootstrapManifest: readonly FictionalBootstrapRecord[] =
  [
    {
      kind: 'organization',
      code: 'SYNTHETIC_LAB',
      label: 'Fictional development organization',
      developmentOnly: true,
      scope: 'organization',
    },
    {
      kind: 'unit',
      code: 'SYNTHETIC_UNIT',
      label: 'Fictional development organization unit',
      developmentOnly: true,
      scope: 'unit',
    },
    {
      kind: 'user',
      code: 'SYNTHETIC_AUTHOR',
      label:
        'Placeholder author principal; issuer and subject require approval',
      developmentOnly: true,
      issuer: 'urn:placeholder:development-issuer',
      subject: 'placeholder-author',
      scope: 'own',
    },
    {
      kind: 'user',
      code: 'SYNTHETIC_REVIEWER',
      label:
        'Placeholder reviewer principal; issuer and subject require approval',
      developmentOnly: true,
      issuer: 'urn:placeholder:development-issuer',
      subject: 'placeholder-reviewer',
      scope: 'unit',
    },
    {
      kind: 'user',
      code: 'SYNTHETIC_PUBLISHER',
      label:
        'Placeholder publisher principal; issuer and subject require approval',
      developmentOnly: true,
      issuer: 'urn:placeholder:development-issuer',
      subject: 'placeholder-publisher',
      scope: 'unit',
    },
    {
      kind: 'grant',
      code: 'AUTHOR_CREATE_UNIT_GRANT',
      label: 'Fictional unit create permission; own scope cannot create',
      developmentOnly: true,
      roleCode: 'SYNTHETIC_AUTHOR_CREATE_ROLE',
      granteeCode: 'SYNTHETIC_AUTHOR',
      scope: 'unit',
    },
    {
      kind: 'grant',
      code: 'AUTHOR_SCOPED_GRANT',
      label: 'Minimal author grant placeholder; no executable role assignment',
      developmentOnly: true,
      roleCode: 'SYNTHETIC_AUTHOR_ROLE',
      granteeCode: 'SYNTHETIC_AUTHOR',
      scope: 'own',
    },
    {
      kind: 'grant',
      code: 'REVIEWER_SCOPED_GRANT',
      label:
        'Minimal reviewer grant placeholder; no executable role assignment',
      developmentOnly: true,
      roleCode: 'SYNTHETIC_REVIEWER_ROLE',
      granteeCode: 'SYNTHETIC_REVIEWER',
      scope: 'unit',
    },
    {
      kind: 'grant',
      code: 'PUBLISHER_SCOPED_GRANT',
      label:
        'Minimal publisher grant placeholder; no executable role assignment',
      developmentOnly: true,
      roleCode: 'SYNTHETIC_PUBLISHER_ROLE',
      granteeCode: 'SYNTHETIC_PUBLISHER',
      scope: 'unit',
    },
  ] as const;

export const fictionalBootstrapStatus = Object.freeze({
  executable: false,
  reason:
    'Identity issuer, subject mapping, role policy and bootstrap authority are not approved',
});

/** Proposed permissions for review, never installed as grants. No approval policy is inferred. */
export const proposedFictionalRoles = [
  {
    code: 'SYNTHETIC_AUTHOR_CREATE_ROLE',
    permissions: ['course.draft.create'],
  },
  {
    code: 'SYNTHETIC_AUTHOR_ROLE',
    permissions: [
      'course.draft.read',
      'course.draft.edit',
      'course.draft.archive',
      'course.review.submit',
      'course.review.read',
    ],
  },
  {
    code: 'SYNTHETIC_REVIEWER_ROLE',
    permissions: ['course.review.read', 'course.review.decide'],
  },
  {
    code: 'SYNTHETIC_PUBLISHER_ROLE',
    permissions: [
      'course.review.assign',
      'course.review.read',
      'course.release.publish',
      'course.release.read',
      'course.catalog.read',
    ],
  },
] as const satisfies readonly {
  code: string;
  permissions: readonly Action[];
}[];
