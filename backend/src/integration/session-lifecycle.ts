import { Types, type ClientSession, type Connection } from 'mongoose';
import { z } from 'zod';
import { decode } from '../modules/identity/organization/mongo-repository.js';
import { createIntegrationModels } from './session-models.js';
import { assertLocalIntegrationConnection } from './local-database.js';
import {
  assertOpaqueSecret,
  createOpaqueSecret,
  hashOpaqueSecret,
} from './session-crypto.js';
import {
  isSessionUsable,
  type DevelopmentSessionRecord,
} from './session-store.js';

export type SessionPrincipal = Readonly<{
  organizationId: string;
  userId: string;
}>;
export type IssuedSession = Readonly<{
  sessionToken: string;
  csrfToken: string;
  record: DevelopmentSessionRecord;
}>;
export type SessionLifetime = Readonly<{
  idleMs: number;
  absoluteMs: number;
}>;

const ownedStores = new WeakMap<DurableSessionStore, () => void>();
export interface DurableSessionStore {
  principalActive(principal: SessionPrincipal): Promise<boolean>;
  touch(tokenHash: string, at: Date, idleExpiresAt: Date): Promise<boolean>;
  create(record: DevelopmentSessionRecord): Promise<void>;
  findActive(
    tokenHash: string,
    now: Date,
  ): Promise<DevelopmentSessionRecord | null>;
  revoke(tokenHash: string, at: Date, reason: string): Promise<boolean>;
  rotate(
    currentTokenHash: string,
    replacement: DevelopmentSessionRecord,
    at: Date,
    reason: string,
  ): Promise<void>;
}

const defaultLifetime: SessionLifetime = Object.freeze({
  idleMs: 30 * 60 * 1000,
  absoluteMs: 8 * 60 * 60 * 1000,
});
function validateLifetime(lifetime: SessionLifetime) {
  if (
    !Number.isSafeInteger(lifetime.idleMs) ||
    !Number.isSafeInteger(lifetime.absoluteMs) ||
    lifetime.idleMs < 1_000 ||
    lifetime.absoluteMs < lifetime.idleMs ||
    lifetime.absoluteMs > 24 * 60 * 60 * 1000
  )
    throw new Error('Session lifetime is invalid');
}
function sessionRecord(
  principal: SessionPrincipal,
  sessionToken: string,
  csrfToken: string,
  now: Date,
  lifetime: SessionLifetime,
  absoluteExpiresAt?: Date,
): DevelopmentSessionRecord {
  return {
    sessionTokenHash: hashOpaqueSecret(sessionToken),
    organizationId: principal.organizationId,
    userId: principal.userId,
    issuedAt: now,
    authenticatedAt: now,
    idleExpiresAt: new Date(
      Math.min(
        now.getTime() + lifetime.idleMs,
        absoluteExpiresAt?.getTime() ?? Infinity,
      ),
    ),
    expiresAt:
      absoluteExpiresAt ?? new Date(now.getTime() + lifetime.absoluteMs),
    revokedAt: null,
    revocationReason: null,
    csrfBindingHash: hashOpaqueSecret(csrfToken),
  };
}

/** Server-only lifecycle operations. This class has no HTTP, cookie or identity-issuer behavior. */
export function createSessionLifecycle(
  store: DurableSessionStore,
  options: {
    clock?: () => Date;
    lifetime?: SessionLifetime;
    isolatedTest?: true;
  } = {},
) {
  const clock = options.clock ?? (() => new Date());
  const lifetime = Object.freeze({ ...(options.lifetime ?? defaultLifetime) });
  function guard() {
    const assertOwned = ownedStores.get(store);
    if (assertOwned) assertOwned();
    else if (process.env.NODE_ENV !== 'test' || options.isolatedTest !== true)
      throw new Error(
        'Session lifecycle requires owned local storage or isolated unit tests',
      );
  }
  guard();
  const nowAt = () => {
    guard();
    const now = clock();
    if (!Number.isFinite(now.getTime()))
      throw new Error('Session clock is invalid');
    return new Date(now.getTime());
  };
  const principalSchema = z.strictObject({
    organizationId: z.string().regex(/^[a-f0-9]{24}$/),
    userId: z.string().regex(/^[a-f0-9]{24}$/),
  });
  validateLifetime(lifetime);
  async function issue(principal: SessionPrincipal): Promise<IssuedSession> {
    guard();
    const parsed = principalSchema.safeParse(principal);
    if (!parsed.success || !(await store.principalActive(parsed.data)))
      throw new Error('Session principal is unavailable');
    principal = parsed.data;
    const sessionToken = createOpaqueSecret();
    const csrfToken = createOpaqueSecret();
    const record = sessionRecord(
      principal,
      sessionToken,
      csrfToken,
      nowAt(),
      lifetime,
    );
    await store.create(record);
    return Object.freeze({ sessionToken, csrfToken, record });
  }
  async function verify(sessionToken: unknown) {
    guard();
    try {
      assertOpaqueSecret(sessionToken);
    } catch {
      return null;
    }
    const now = nowAt();
    const hash = hashOpaqueSecret(sessionToken);
    const record = await store.findActive(hash, now);
    if (
      !record ||
      !isSessionUsable(record, now) ||
      !(await store.principalActive(record))
    )
      return null;
    return record;
  }
  async function refreshIdle(sessionToken: unknown) {
    const current = await verify(sessionToken);
    if (!current) return null;
    const now = nowAt(),
      idleExpiresAt = new Date(
        Math.min(now.getTime() + lifetime.idleMs, current.expiresAt.getTime()),
      );
    if (
      !(await store.touch(hashOpaqueSecret(sessionToken), now, idleExpiresAt))
    )
      return null;
    return { ...current, idleExpiresAt };
  }
  async function revoke(
    sessionToken: unknown,
    reason: string,
  ): Promise<boolean> {
    guard();
    assertOpaqueSecret(sessionToken);
    return store.revoke(hashOpaqueSecret(sessionToken), nowAt(), reason);
  }
  async function rotate(
    sessionToken: unknown,
    reason: string,
  ): Promise<IssuedSession | null> {
    assertOpaqueSecret(sessionToken);
    guard();
    const current = await verify(sessionToken);
    if (!current) return null;
    const replacementToken = createOpaqueSecret();
    const csrfToken = createOpaqueSecret();
    const now = nowAt();
    const replacement = sessionRecord(
      { organizationId: current.organizationId, userId: current.userId },
      replacementToken,
      csrfToken,
      now,
      {
        idleMs: Math.min(
          current.idleExpiresAt.getTime() - now.getTime(),
          lifetime.idleMs,
        ),
        absoluteMs: current.expiresAt.getTime() - current.issuedAt.getTime(),
      },
      current.expiresAt,
    );
    const boundReplacement = {
      ...replacement,
      authenticatedAt: current.authenticatedAt,
    };
    await store.rotate(
      hashOpaqueSecret(sessionToken),
      boundReplacement,
      now,
      reason,
    );
    return Object.freeze({
      sessionToken: replacementToken,
      csrfToken,
      record: boundReplacement,
    });
  }
  return Object.freeze({ issue, verify, refreshIdle, revoke, rotate });
}

/** Mongo persistence is explicit and requires the already-owned connected local integration target. */
export function createMongoSessionStore(
  connection: Connection,
  options: { clock?: () => Date } = {},
): DurableSessionStore {
  assertLocalIntegrationConnection(connection);
  const { sessions } = createIntegrationModels(connection);
  function effectiveTime(at: Date) {
    const time = Math.max(
      at.getTime(),
      (options.clock ?? (() => new Date()))().getTime(),
    );
    if (!Number.isFinite(time)) throw new Error('Session clock is invalid');
    return new Date(time);
  }
  const active = (tokenHash: string, now: Date) => ({
    sessionTokenHash: tokenHash,
    revokedAt: null,
    idleExpiresAt: { $gt: now },
    expiresAt: { $gt: now },
  });
  async function activePrincipal(
    principal: SessionPrincipal,
    session?: ClientSession,
  ) {
    const org = await connection
      .db!.collection('organizations')
      .findOne(
        { _id: new Types.ObjectId(principal.organizationId), status: 'active' },
        { session },
      );
    const user = await connection.db!.collection('users').findOne(
      {
        _id: new Types.ObjectId(principal.userId),
        organizationId: new Types.ObjectId(principal.organizationId),
        status: 'active',
      },
      { session },
    );
    return !!org && !!user;
  }
  const store: DurableSessionStore = {
    async principalActive(principal) {
      assertLocalIntegrationConnection(connection);
      return activePrincipal(principal);
    },
    async touch(tokenHash, at, idleExpiresAt) {
      assertLocalIntegrationConnection(connection);
      at = effectiveTime(at);
      const row = await sessions.findOneAndUpdate(
        {
          ...active(tokenHash, at),
          expiresAt: { $gt: at, $gte: idleExpiresAt },
          issuedAt: { $lte: at },
          authenticatedAt: { $lte: at },
        },
        { $max: { idleExpiresAt } },
        { returnDocument: 'after' },
      );
      return !!row;
    },
    async create(record) {
      assertLocalIntegrationConnection(connection);
      if (!(await activePrincipal(record)))
        throw new Error('Session principal is unavailable');
      await sessions.create([record]);
    },
    async findActive(tokenHash, now) {
      assertLocalIntegrationConnection(connection);
      now = effectiveTime(now);
      return decode<DevelopmentSessionRecord | null>(
        await sessions.findOne(active(tokenHash, now)).lean(),
      );
    },
    async revoke(tokenHash, at, reason) {
      assertLocalIntegrationConnection(connection);
      at = effectiveTime(at);
      const result = await sessions.updateOne(
        { sessionTokenHash: tokenHash, revokedAt: null },
        { $set: { revokedAt: at, revocationReason: reason } },
      );
      return result.modifiedCount === 1;
    },
    async rotate(currentTokenHash, replacement, at, reason) {
      assertLocalIntegrationConnection(connection);
      await connection.transaction(
        async (session: ClientSession) => {
          const currentTime = effectiveTime(at);
          const revoked = await sessions.findOneAndUpdate(
            {
              ...active(currentTokenHash, currentTime),
              issuedAt: { $lte: currentTime },
              authenticatedAt: { $lte: currentTime },
            },
            { $set: { revokedAt: currentTime, revocationReason: reason } },
            { session, returnDocument: 'after' },
          );
          if (
            !revoked ||
            !(await activePrincipal(
              {
                organizationId: revoked.organizationId.toString(),
                userId: revoked.userId.toString(),
              },
              session,
            )) ||
            revoked.organizationId.toString() !== replacement.organizationId ||
            revoked.userId.toString() !== replacement.userId ||
            revoked.expiresAt.getTime() !== replacement.expiresAt.getTime() ||
            revoked.authenticatedAt.getTime() !==
              replacement.authenticatedAt.getTime() ||
            !isSessionUsable(replacement, currentTime)
          )
            throw new Error(
              'Session rotation requires a current active session',
            );
          await sessions.create([replacement], { session });
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
          maxCommitTimeMS: 5000,
        },
      );
    },
  };
  ownedStores.set(store, () => assertLocalIntegrationConnection(connection));
  return Object.freeze(store);
}
