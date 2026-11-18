import { z } from 'zod';
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
    DEPLOYMENT_MODE: z.enum(['local', 'hosted']).default('local'),
    LMS_LIVE_ENABLED: z.enum(['true', 'false']).default('false'),
    LMS_REGISTRATION_ENABLED: z.enum(['true', 'false']).default('false'),
    LMS_FRONTEND_ORIGIN: z.string().url().default('http://127.0.0.1:3000'),
    DEMO_API_ENABLED: z.enum(['true', 'false']).default('false'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    IDENTITY_MODE: z.enum(['disabled', 'synthetic']).default('disabled'),
    ISOLATED_DEVELOPMENT: z.enum(['true', 'false']).default('false'),
    DATABASE_ENABLED: z.enum(['true', 'false']).default('false'),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(30_000)
      .default(5000),
    MONGODB_CONNECT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(30_000)
      .default(5000),
    MONGODB_URI: z
      .string()
      .regex(/^mongodb(?:\+srv)?:\/\/\S+$/, 'Expected a MongoDB URI')
      .optional(),
    MONGOURI: z
      .string()
      .regex(/^mongodb\+srv:\/\/\S+$/, 'Expected an Atlas MongoDB URI')
      .optional(),
    DATABASE_NAME: z.literal('welspun_lms_dev').optional(),
  })
  .superRefine((value, context) => {
    let frontend: URL;
    try {
      frontend = new URL(value.LMS_FRONTEND_ORIGIN);
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['LMS_FRONTEND_ORIGIN'],
        message: 'Invalid frontend origin',
      });
      return;
    }
    if (
      !['http:', 'https:'].includes(frontend.protocol) ||
      value.LMS_FRONTEND_ORIGIN !== frontend.origin ||
      frontend.username ||
      frontend.password ||
      (value.NODE_ENV === 'production' &&
        value.LMS_LIVE_ENABLED === 'true' &&
        frontend.protocol !== 'https:')
    )
      context.addIssue({
        code: 'custom',
        path: ['LMS_FRONTEND_ORIGIN'],
        message:
          'Configure an exact frontend origin; production requires HTTPS',
      });
    if (
      value.DATABASE_ENABLED === 'true' &&
      (value.MONGOURI === undefined ||
        value.DATABASE_NAME !== 'welspun_lms_dev')
    )
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_ENABLED'],
        message: 'Enabled database requires the approved shared target',
      });
    if (value.HOST === '0.0.0.0' && value.DEPLOYMENT_MODE !== 'hosted')
      context.addIssue({
        code: 'custom',
        path: ['HOST'],
        message: 'Network binding requires hosted deployment mode',
      });
    if (
      value.DEPLOYMENT_MODE === 'hosted' &&
      (value.IDENTITY_MODE !== 'disabled' ||
        value.ISOLATED_DEVELOPMENT !== 'false')
    )
      context.addIssue({
        code: 'custom',
        path: ['DEPLOYMENT_MODE'],
        message: 'Hosted demo cannot use isolated identities',
      });
    if (
      value.IDENTITY_MODE === 'synthetic' &&
      (value.NODE_ENV === 'production' || value.ISOLATED_DEVELOPMENT !== 'true')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['IDENTITY_MODE'],
        message:
          'Synthetic identities require isolated development or test mode',
      });
    }
  });
export type Environment = z.infer<typeof schema>;
export function parseEnvironment(
  input: Record<string, string | undefined>,
): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Never include input values: a failed URI may contain credentials.
    throw new Error(
      'Invalid environment fields: ' +
        [
          ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
        ].join(', '),
    );
  }
  return result.data;
}
