import {
  Types,
  type Connection,
  type ClientSession,
  type PipelineStage,
} from 'mongoose';
import type { AuthorizationTransaction as Tx } from '../../identity/authorization/types.js';
import { decode } from '../../identity/organization/mongo-repository.js';
import type { CatalogStore } from './service.js';
export function createMongoCatalogStore(
  connection: Connection,
  sessionFor: (tx: Tx) => ClientSession | undefined,
): CatalogStore {
  return {
    async query(tx, org, scope, query, details) {
      const session = sessionFor(tx);
      if (!session?.inTransaction())
        throw new Error('Catalog store requires domain transaction');
      const scopePath = 'payload.snapshot.course.scopeUnitId';
      const stages: PipelineStage[] = [
        {
          $match: {
            organizationId: new Types.ObjectId(org),
            'payload.lifecycle': 'published',
            ...(query.courseId
              ? { courseId: new Types.ObjectId(query.courseId) }
              : {}),
            $and: [
              {
                $or: [
                  { [scopePath]: null },
                  { [scopePath]: { $in: scope.activeUnitIds } },
                ],
              },
              ...(scope.organizationWide
                ? []
                : [
                    {
                      $or: [
                        { [scopePath]: { $in: scope.unitIds } },
                        {
                          courseId: {
                            $in: scope.courseIds.map(
                              (id) => new Types.ObjectId(id),
                            ),
                          },
                        },
                      ],
                    },
                  ]),
              ...(scope.filterUnitIds
                ? [{ [scopePath]: { $in: scope.filterUnitIds } }]
                : []),
            ],
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            pipeline: [{ $match: { organizationId: new Types.ObjectId(org) } }],
            as: '_course',
          },
        },
        { $unwind: '$_course' },
        {
          $match: {
            $expr: {
              $and: [
                {
                  $eq: [
                    '$payload.snapshot.course.scopeUnitId',
                    { $ifNull: [{ $toString: '$_course.scopeUnitId' }, null] },
                  ],
                },
                {
                  $eq: [
                    '$payload.snapshot.course.id',
                    { $toString: '$courseId' },
                  ],
                },
                { $eq: ['$payload.snapshot.course.organizationId', org] },
              ],
            },
          },
        },
        { $sort: { courseId: 1, number: -1 } },
        { $group: { _id: '$courseId', release: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$release' } },
      ];
      if (query.search) {
        const literal = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        stages.push({
          $match: {
            $or: [
              {
                'payload.snapshot.draft.title': {
                  $regex: literal,
                  $options: 'i',
                },
              },
              {
                'payload.snapshot.course.code': {
                  $regex: literal,
                  $options: 'i',
                },
              },
            ],
          },
        });
      }
      const projection = {
        _id: 0,
        courseId: { $toString: '$courseId' },
        releaseId: { $toString: '$_id' },
        releaseNumber: '$number',
        title: '$payload.snapshot.draft.title',
        description: '$payload.snapshot.draft.description',
        code: '$payload.snapshot.course.code',
        scopeUnitId: '$payload.snapshot.course.scopeUnitId',
        publishedAt: {
          $dateToString: {
            date: '$payload.publishedAt',
            format: '%Y-%m-%dT%H:%M:%S.%LZ',
            timezone: 'UTC',
          },
        },
        moduleCount: { $size: '$payload.snapshot.draft.modules' },
        lessonCount: {
          $sum: {
            $map: {
              input: '$payload.snapshot.draft.modules',
              as: 'm',
              in: { $size: '$$m.lessons' },
            },
          },
        },
        ...(details
          ? {
              modules: {
                $map: {
                  input: '$payload.snapshot.draft.modules',
                  as: 'm',
                  in: {
                    id: '$$m.id',
                    title: '$$m.title',
                    description: '$$m.description',
                    position: '$$m.position',
                    lessons: {
                      $map: {
                        input: '$$m.lessons',
                        as: 'l',
                        in: {
                          id: '$$l.id',
                          title: '$$l.title',
                          description: '$$l.description',
                          position: '$$l.position',
                          content: '$$l.content',
                        },
                      },
                    },
                  },
                },
              },
            }
          : {}),
      };
      stages.push({
        $facet: {
          items: [
            ...(query.cursor
              ? [
                  {
                    $match: {
                      courseId: { $gt: new Types.ObjectId(query.cursor) },
                    },
                  },
                ]
              : []),
            { $sort: { courseId: 1 } },
            { $limit: query.limit + 1 },
            { $project: projection },
          ],
          total: [{ $count: 'value' }],
        },
      });
      const rows = await connection
        .db!.collection('courseReleases')
        .aggregate(stages, { session })
        .toArray();
      const page = decode<{
        items: { courseId: string }[];
        total: { value: number }[];
      }>(rows[0]);
      const items = page.items.slice(0, query.limit);
      return {
        items,
        total: page.total[0]?.value ?? 0,
        nextCursor:
          page.items.length > query.limit ? items.at(-1)!.courseId : null,
      };
    },
  };
}
