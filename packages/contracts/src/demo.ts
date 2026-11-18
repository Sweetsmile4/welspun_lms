import { z } from 'zod';

export const demoCourseIds = [
  'pipe-process-101',
  'safety-essentials-102',
  'quality-basics-103',
  'coat',
  'vi',
] as const;
export const demoAssignmentSchema = z.strictObject({
  id: z.enum(demoCourseIds),
  title: z.string().min(1).max(200),
  code: z.string().min(1).max(80),
  category: z.enum([
    'Manufacturing Process',
    'Shop Floor Safety',
    'Quality & Compliance',
  ]),
  estimatedMinutes: z.number().int().min(1).max(480),
});
export const demoBootstrapSchema = z.strictObject({
  mode: z.literal('demo'),
  persistence: z.literal('browser-local'),
  courses: z
    .array(demoAssignmentSchema)
    .length(demoCourseIds.length)
    .refine(
      (courses) =>
        new Set(courses.map((course) => course.id)).size === courses.length,
      'Duplicate demo courses',
    ),
});
export const demoBootstrapEnvelopeSchema = z.strictObject({
  data: demoBootstrapSchema,
  meta: z.strictObject({ requestId: z.uuid(), nextCursor: z.null() }),
});
export type DemoBootstrap = z.infer<typeof demoBootstrapSchema>;
