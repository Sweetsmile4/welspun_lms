import type { AuthorizationTransaction } from '../../identity/authorization/types.js';
import type { Course, Draft } from './contracts.js';

/** Internal persistence only; application callers must use the authorized service. */
export interface DraftStore {
  course(
    tx: AuthorizationTransaction,
    org: string,
    id: string,
  ): Promise<Course | null>;
  draft(
    tx: AuthorizationTransaction,
    org: string,
    course: string,
  ): Promise<Draft | null>;
  insert(
    tx: AuthorizationTransaction,
    course: Course,
    draft: Draft,
  ): Promise<void>;
  replace(
    tx: AuthorizationTransaction,
    draft: Draft,
    expected: number,
  ): Promise<boolean>;
}
