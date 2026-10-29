import type { ClientSession, Connection } from 'mongoose';
import {
  createMongoOrganizationRepository,
  decode,
} from '../organization/mongo-repository.js';
import type { OrganizationTransaction } from '../organization/repository.js';
import { createAuthorizationModels } from './models.js';
import type {
  AuthorizationRepository,
  AuthorizationTransaction,
} from './types.js';

/** Internal persistence port. Not an HTTP/application-service API. */
export function createMongoAuthorizationRepository(
  connection: Connection,
  onTransaction?: (
    tx: AuthorizationTransaction,
    session: ClientSession,
  ) => void,
) {
  const sessions = new WeakMap<OrganizationTransaction, ClientSession>();
  const base = createMongoOrganizationRepository(connection, (tx, session) =>
    sessions.set(tx, session),
  );
  const models = createAuthorizationModels(connection);
  const repository: AuthorizationRepository = {
    transaction: (work) =>
      base.transaction(async (tx) => {
        const session = sessions.get(tx)!;
        const authorizationTx: AuthorizationTransaction = {
          ...tx,
          role: async (organizationId, id) =>
            decode(
              await models.roleDefinitions
                .findOne({ organizationId, _id: id })
                .session(session)
                .lean(),
            ),
          latestRole: async (organizationId, code) =>
            decode(
              await models.roleDefinitions
                .findOne({ organizationId, code })
                .sort({ version: -1 })
                .session(session)
                .lean(),
            ),
          insertRole: async (value) =>
            decode(
              (
                await models.roleDefinitions.create([value], { session })
              )[0]!.toObject(),
            ),
          grants: async (organizationId, userId) =>
            decode(
              await models.roleGrants
                .find({ organizationId, userId })
                .session(session)
                .lean(),
            ),
          grant: async (organizationId, id) =>
            decode(
              await models.roleGrants
                .findOne({ organizationId, _id: id })
                .session(session)
                .lean(),
            ),
          insertGrant: async (value) =>
            decode(
              (
                await models.roleGrants.create([value], { session })
              )[0]!.toObject(),
            ),
          revokeGrant: async (value, actor, at, reason) =>
            decode(
              await models.roleGrants
                .findOneAndUpdate(
                  {
                    organizationId: value.organizationId,
                    _id: value.id,
                    revision: value.revision,
                    revokedAt: null,
                  },
                  {
                    $inc: { revision: 1 },
                    $set: {
                      revokedAt: at,
                      revokedBy: actor,
                      revocationReason: reason,
                      updatedBy: actor,
                    },
                  },
                  { session, returnDocument: 'after', runValidators: true },
                )
                .lean(),
            ),
        };
        onTransaction?.(authorizationTx, session);
        return work(authorizationTx);
      }),
  };
  return {
    ...repository,
    async initializeIndexes() {
      await base.initializeIndexes();
      for (const model of Object.values(models)) {
        await model.createCollection();
        await model.createIndexes();
      }
    },
  };
}
