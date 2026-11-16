import { Types, type Connection, type ClientSession } from 'mongoose';
import { createOrganizationModels } from './models.js';
import type {
  OrganizationRepository,
  OrganizationTransaction,
} from './repository.js';
import { OrganizationError } from './types.js';

/** Maps database IDs into explicit internal records; never returns Mongoose documents to callers. */
export function decode<T>(value: unknown): T {
  function visit(item: unknown): unknown {
    if (item instanceof Types.ObjectId) return item.toHexString();
    if (item instanceof Date) return item;
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => [
          key === '_id' ? 'id' : key,
          visit(child),
        ]),
      );
    return item;
  }
  return visit(value) as T;
}
export function createMongoOrganizationRepository(
  connection: Connection,
  /** Internal composition hook: extensions use the SAME session, never nested transactions. */
  onTransaction?: (tx: OrganizationTransaction, session: ClientSession) => void,
) {
  const models = createOrganizationModels(connection);
  const repository: OrganizationRepository = {
    async transaction(work) {
      if (connection.readyState !== 1)
        throw new OrganizationError(
          'DATABASE_UNAVAILABLE',
          'Organization database is disconnected',
        );
      try {
        return await connection.transaction(
          async (session) => {
            const tx: OrganizationTransaction = {
              organization: async (id) =>
                decode(
                  await models.organizations
                    .findById(id)
                    .session(session)
                    .lean(),
                ),
              organizationByCode: async (code) =>
                decode(
                  await models.organizations
                    .findOne({ code })
                    .session(session)
                    .lean(),
                ),
              insertOrganization: async (value) =>
                decode(
                  (
                    await models.organizations.create([value], { session })
                  )[0]!.toObject(),
                ),
              lockOrganization: async (id, revision, treeChange, actor, at) =>
                decode(
                  await models.organizations
                    .findOneAndUpdate(
                      { _id: id, revision },
                      {
                        $inc: { revision: 1, treeRevision: treeChange ? 1 : 0 },
                        $set: { updatedBy: actor, updatedAt: at },
                      },
                      { session, returnDocument: 'after', runValidators: true },
                    )
                    .lean(),
                ),
              unit: async (organizationId, id) =>
                decode(
                  await models.orgUnits
                    .findOne({ _id: id, organizationId })
                    .session(session)
                    .lean(),
                ),
              unitByCode: async (organizationId, parentId, code) =>
                decode(
                  await models.orgUnits
                    .findOne({ organizationId, parentId, code })
                    .session(session)
                    .lean(),
                ),
              insertUnit: async (value) =>
                decode(
                  (
                    await models.orgUnits.create([value], { session })
                  )[0]!.toObject(),
                ),
              subtree: async (organizationId, id) =>
                decode(
                  await models.orgUnits
                    .find({
                      organizationId,
                      $or: [{ _id: id }, { ancestorIds: id }],
                    })
                    .limit(1001)
                    .session(session)
                    .lean(),
                ),
              moveUnit: async (
                record,
                parentId,
                ancestorIds,
                treeRevision,
                actor,
                at,
              ) =>
                decode(
                  await models.orgUnits
                    .findOneAndUpdate(
                      {
                        _id: record.id,
                        organizationId: record.organizationId,
                        revision: record.revision,
                      },
                      {
                        $set: {
                          parentId,
                          ancestorIds,
                          treeRevision,
                          updatedBy: actor,
                          updatedAt: at,
                        },
                        $inc: { revision: 1 },
                      },
                      { session, returnDocument: 'after', runValidators: true },
                    )
                    .lean(),
                ),
              user: async (organizationId, id) =>
                decode(
                  await models.users
                    .findOne({ _id: id, organizationId })
                    .session(session)
                    .lean(),
                ),
              userByIdentity: async (
                organizationId,
                identityIssuer,
                identitySubject,
              ) =>
                decode(
                  await models.users
                    .findOne({
                      organizationId,
                      identityIssuer,
                      identitySubject,
                    })
                    .session(session)
                    .lean(),
                ),
              userByEmployeeId: async (organizationId, employeeId) =>
                decode(
                  await models.users
                    .findOne({ organizationId, employeeId })
                    .session(session)
                    .lean(),
                ),
              insertUser: async (value) =>
                decode(
                  (
                    await models.users.create([value], { session })
                  )[0]!.toObject(),
                ),
              membership: async (organizationId, id) =>
                decode(
                  await models.memberships
                    .findOne({ _id: id, organizationId })
                    .session(session)
                    .lean(),
                ),
              memberships: async (organizationId, userId) =>
                decode(
                  await models.memberships
                    .find({ organizationId, userId })
                    .sort({ validFrom: 1, _id: 1 })
                    .session(session)
                    .lean(),
                ),
              insertMembership: async (value) =>
                decode(
                  (
                    await models.memberships.create([value], { session })
                  )[0]!.toObject(),
                ),
              closeMembership: async (record, validTo, actor, at) =>
                decode(
                  await models.memberships
                    .findOneAndUpdate(
                      {
                        _id: record.id,
                        organizationId: record.organizationId,
                        revision: record.revision,
                        validTo: null,
                      },
                      {
                        $set: { validTo, updatedBy: actor, updatedAt: at },
                        $inc: { revision: 1 },
                      },
                      { session, returnDocument: 'after', runValidators: true },
                    )
                    .lean(),
                ),
            };
            onTransaction?.(tx, session);
            return work(tx);
          },
          {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary',
            maxCommitTimeMS: 5000,
          },
        );
      } catch (error) {
        if ((error as { code?: number })?.code === 11000)
          throw new OrganizationError(
            'DUPLICATE',
            'A unique organization record already exists',
          );
        throw error;
      }
    },
  };
  return {
    ...repository,
    /** Explicit setup only, before transactions; never invoked by API/worker startup. */
    async initializeIndexes() {
      if (connection.readyState !== 1)
        throw new OrganizationError(
          'DATABASE_UNAVAILABLE',
          'Organization database is disconnected',
        );
      for (const model of Object.values(models)) {
        await model.createCollection();
        await model.createIndexes();
      }
    },
  };
}
