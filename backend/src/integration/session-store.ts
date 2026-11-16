export type DevelopmentSessionRecord = Readonly<{
  sessionTokenHash: string;
  organizationId: string;
  userId: string;
  issuedAt: Date;
  authenticatedAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
  csrfBindingHash: string;
}>;

export interface DevelopmentSessionStore {
  findActive(
    tokenHash: string,
    now: Date,
  ): Promise<DevelopmentSessionRecord | null>;
  revoke(tokenHash: string, at: Date, reason: string): Promise<void>;
}

export type LoginTransactionRecord = Readonly<{
  transactionHash: string;
  stateHash: string;
  issuer: string;
  subject: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export interface LoginTransactionStore {
  consume(
    transactionHash: string,
    stateHash: string,
    now: Date,
  ): Promise<LoginTransactionRecord | null>;
}

export function isLoginTransactionConsumable(
  record: LoginTransactionRecord,
  now: Date,
): boolean {
  return (
    record.createdAt.getTime() <= now.getTime() &&
    record.consumedAt === null &&
    record.expiresAt.getTime() > now.getTime()
  );
}

/** Implementations must reject expired/revoked records before returning them; TTL is cleanup only. */
export function isSessionUsable(
  record: DevelopmentSessionRecord,
  now: Date,
): boolean {
  return (
    record.issuedAt.getTime() <= now.getTime() &&
    record.authenticatedAt.getTime() <= now.getTime() &&
    record.idleExpiresAt.getTime() <= record.expiresAt.getTime() &&
    record.revokedAt === null &&
    record.idleExpiresAt.getTime() > now.getTime() &&
    record.expiresAt.getTime() > now.getTime()
  );
}
