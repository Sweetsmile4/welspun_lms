import type { AuthorizationTransaction as Tx } from '../../identity/authorization/types.js';
import type { Evidence, Release, Review } from './contracts.js';
export interface PublishingStore {
  review(tx: Tx, org: string, id: string): Promise<Review | null>;
  insertReview(tx: Tx, value: Review): Promise<void>;
  replaceReview(tx: Tx, value: Review, expected: number): Promise<boolean>;
  appendEvidence(tx: Tx, value: Evidence): Promise<void>;
  evidence(tx: Tx, org: string, review: string): Promise<Evidence[]>;
  release(tx: Tx, org: string, id: string): Promise<Release | null>;
  appendRelease(tx: Tx, value: Release): Promise<void>;
  latestNumber(tx: Tx, org: string, course: string): Promise<number>;
  reviews(
    tx: Tx,
    org: string,
    course: string,
    limit: number,
    cursor?: string,
  ): Promise<Review[]>;
  releases(
    tx: Tx,
    org: string,
    course: string,
    limit: number,
    cursor?: string,
  ): Promise<Release[]>;
}
