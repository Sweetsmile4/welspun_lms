import { z } from 'zod';

export const requestIdSchema = z.uuid();
export const resourceIdSchema = z.string().regex(/^[a-f\d]{24}$/);
export const employeeSummarySchema = z.strictObject({
  id: resourceIdSchema,
  displayName: z.string(),
  status: z.enum(['active', 'inactive']),
  revision: z.number().int().nonnegative(),
});
export const membershipSummarySchema = z.strictObject({
  id: resourceIdSchema,
  userId: resourceIdSchema,
  orgUnitId: resourceIdSchema,
  validFrom: z.iso.datetime(),
  validTo: z.iso.datetime().nullable(),
  primary: z.boolean(),
  revision: z.number().int().nonnegative(),
});
export const foundationQuerySchema = z.strictObject({
  detail: z.enum(['summary', 'modules']).default('summary'),
});
export const syntheticIdentitySchema = z.strictObject({
  subject: z.literal('synthetic-development-learner'),
  displayName: z.literal('Synthetic development learner'),
  synthetic: z.literal(true),
});
export type SyntheticIdentity = z.infer<typeof syntheticIdentitySchema>;
export type SuccessEnvelope<T> = {
  data: T;
  meta: { requestId: string; nextCursor: string | null };
};
export type ErrorEnvelope = {
  error: { code: string; message: string; details: unknown[] };
  requestId: string;
};
export const errorEnvelopeSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()),
  }),
  requestId: requestIdSchema,
});
export function success<T>(data: T, requestId: string): SuccessEnvelope<T> {
  return { data, meta: { requestId, nextCursor: null } };
}

const objectId = z.string().regex(/^[a-f\d]{24}$/);

const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine(
      (s) =>
        !/[<>]/.test(s) &&
        [...s].every((char) => {
          const code = char.charCodeAt(0);
          return (code >= 32 && code !== 127) || [9, 10, 13].includes(code);
        }),
      'Unsupported text characters',
    );
export const title = text(200).trim().min(1);
export const description = text(2000);
const fragment = text(2000).min(1);
export const content = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: text(8000).min(1) }),
  z.strictObject({
    type: z.literal('structured'),
    blocks: z
      .array(
        z.discriminatedUnion('type', [
          z.strictObject({ type: z.literal('paragraph'), text: fragment }),
          z.strictObject({
            type: z.literal('heading'),
            text: fragment,
            level: z.union([z.literal(2), z.literal(3)]),
          }),
          z.strictObject({
            type: z.literal('list'),
            items: z.array(fragment).min(1).max(20),
          }),
        ]),
      )
      .min(1)
      .max(20),
  }),
]);
export const metadata = z.strictObject({
  language: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/),
  tags: z
    .array(text(40).trim().min(1))
    .max(10)
    .refine((v) => new Set(v).size === v.length),
  audienceUnitIds: z
    .array(objectId)
    .max(20)
    .refine((v) => new Set(v).size === v.length),
});

export {
  title as courseTitleSchema,
  description as courseDescriptionSchema,
  content as courseContentSchema,
  metadata as courseMetadataSchema,
};
