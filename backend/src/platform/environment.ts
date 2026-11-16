import { z } from 'zod';
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    HOST: z.literal('127.0.0.1').default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    IDENTITY_MODE: z.enum(['disabled', 'synthetic']).default('disabled'),
    ISOLATED_DEVELOPMENT: z.enum(['true', 'false']).default('false'),
    DATABASE_ENABLED: z.literal('false').default('false'),
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
  })
  .superRefine((value, context) => {
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
