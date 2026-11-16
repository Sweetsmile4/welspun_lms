import { z } from 'zod';
import { objectId } from '../../identity/authorization/types.js';
import {
  courseTitleSchema as title,
  courseDescriptionSchema as description,
  courseContentSchema as content,
  courseMetadataSchema as metadata,
} from '@welspun/contracts';
export { title, description, content, metadata };

const revision = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER - 1);
export const lessonSchema = z.strictObject({
  id: objectId,
  moduleId: objectId,
  courseId: objectId,
  position: z.number().int().min(0).max(19),
  revision,
  title,
  description,
  content,
});
export const moduleSchema = z.strictObject({
  id: objectId,
  courseId: objectId,
  position: z.number().int().min(0).max(19),
  revision,
  title,
  description,
  lessons: z.array(lessonSchema).max(20),
});
export const courseSchema = z.strictObject({
  id: objectId,
  organizationId: objectId,
  code: z.string().regex(/^[A-Z][A-Z0-9_-]{0,63}$/),
  ownerId: objectId,
  scopeUnitId: objectId.nullable(),
  createdBy: objectId,
  createdAt: z.date(),
});
export const draftSchema = z
  .strictObject({
    id: objectId,
    courseId: objectId,
    organizationId: objectId,
    title,
    description,
    metadata,
    status: z.enum(['draft', 'archived']),
    revision,
    modules: z.array(moduleSchema).max(20),
    createdBy: objectId,
    updatedBy: objectId,
    editedBy: z
      .array(objectId)
      .min(1)
      .max(100)
      .refine((v) => new Set(v).size === v.length)
      .optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine((draft, context) => {
    const seen = new Set<string>();
    let lessons = 0;
    for (const [position, module] of draft.modules.entries()) {
      if (
        module.position !== position ||
        module.courseId !== draft.courseId ||
        seen.has(module.id)
      )
        context.addIssue({
          code: 'custom',
          message: 'Invalid module relationship or ordering',
        });
      seen.add(module.id);
      for (const [index, lesson] of module.lessons.entries()) {
        if (
          lesson.position !== index ||
          lesson.moduleId !== module.id ||
          lesson.courseId !== draft.courseId ||
          seen.has(lesson.id)
        )
          context.addIssue({
            code: 'custom',
            message: 'Invalid lesson relationship or ordering',
          });
        seen.add(lesson.id);
        lessons++;
      }
    }
    if (
      lessons > 100 ||
      Buffer.byteLength(JSON.stringify(draft), 'utf8') > 256 * 1024
    )
      context.addIssue({
        code: 'custom',
        message: 'Draft exceeds supported aggregate bounds',
      });
  });
export type Course = z.infer<typeof courseSchema>;
export type Draft = z.infer<typeof draftSchema>;
const common = { title, description };
const ids = z
  .array(objectId)
  .max(20)
  .refine(
    (v) => new Set(v).size === v.length,
    'Duplicate ordering identifiers',
  );
export const changeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('create'),
    code: courseSchema.shape.code,
    scopeUnitId: objectId.nullable(),
    ...common,
    metadata,
  }),
  z.strictObject({ kind: z.literal('metadata'), ...common, metadata }),
  z.strictObject({ kind: z.literal('addModule'), ...common }),
  z.strictObject({
    kind: z.literal('updateModule'),
    moduleId: objectId,
    ...common,
  }),
  z.strictObject({ kind: z.literal('removeModule'), moduleId: objectId }),
  z.strictObject({ kind: z.literal('reorderModules'), ids }),
  z.strictObject({
    kind: z.literal('addLesson'),
    moduleId: objectId,
    ...common,
    content,
  }),
  z.strictObject({
    kind: z.literal('updateLesson'),
    moduleId: objectId,
    lessonId: objectId,
    ...common,
    content,
  }),
  z.strictObject({
    kind: z.literal('removeLesson'),
    moduleId: objectId,
    lessonId: objectId,
  }),
  z.strictObject({
    kind: z.literal('reorderLessons'),
    moduleId: objectId,
    ids,
  }),
  z.strictObject({ kind: z.literal('archive') }),
]);
export const commandSchema = z.strictObject({
  organizationId: objectId,
  courseId: objectId.optional(),
  expectedRevision: revision.optional(),
  key: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
  requestId: z.uuid(),
  change: changeSchema,
});
export type Change = z.infer<typeof changeSchema>;
export const acknowledgement = z.strictObject({
  courseId: objectId,
  draftId: objectId,
  revision,
});
