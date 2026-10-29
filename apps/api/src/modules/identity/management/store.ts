import type { PipelineStage } from 'mongoose';
import type { AuthorizationTransaction } from '../authorization/types.js';
import type { ListQuery } from './contracts.js';
export interface ReceiptKey {
  organizationId: string;
  actorId: string;
  operation: string;
  keyHash: string;
}
export interface Receipt extends ReceiptKey {
  schemaVersion?: number;
  commandVersion?: number;
  responseVersion?: number;
  responseDigest?: string;
  fingerprint: string;
  data: unknown;
  createdAt: Date;
}
/** All implementations MUST use the domain transaction/session. Not an HTTP dependency. */
export interface ManagementStore {
  page(
    tx: AuthorizationTransaction,
    entity: 'employee' | 'unit' | 'role' | 'grant',
    stages: PipelineStage[],
    query: ListQuery,
  ): Promise<{
    items: Record<string, unknown>[];
    total: number;
    nextCursor: string | null;
  }>;
  receipt(
    tx: AuthorizationTransaction,
    key: ReceiptKey,
  ): Promise<Receipt | null>;
  saveReceipt(tx: AuthorizationTransaction, value: Receipt): Promise<void>;
}
