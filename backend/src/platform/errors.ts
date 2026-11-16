import { ZodError } from 'zod';
import { AuthorizationError } from '../modules/identity/authorization/types.js';
import { OrganizationError } from '../modules/identity/organization/types.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

export function securityHttpError(error: unknown): HttpError | undefined {
  if (error instanceof AuthorizationError)
    return new HttpError(403, 'FORBIDDEN', 'Operation is not authorized');
  if (error instanceof ZodError)
    return new HttpError(422, 'VALIDATION_ERROR', 'Invalid request fields');
  if (error instanceof OrganizationError) {
    if (error.code === 'NOT_FOUND')
      return new HttpError(404, 'NOT_FOUND', 'Resource not found');
    if (error.code === 'DATABASE_UNAVAILABLE')
      return new HttpError(
        503,
        'DEPENDENCY_UNAVAILABLE',
        'Required service is unavailable',
      );
    if (error.code === 'CROSS_ORGANIZATION')
      return new HttpError(403, 'FORBIDDEN', 'Operation is not authorized');
    if (
      [
        'STALE_REVISION',
        'DUPLICATE',
        'MEMBERSHIP_OVERLAP',
        'HISTORY_CLOSED',
        'CYCLE',
        'INVALID_HIERARCHY',
      ].includes(error.code)
    )
      return new HttpError(
        409,
        'CONFLICT',
        'Operation conflicts with current state',
      );
    return new HttpError(422, 'VALIDATION_ERROR', 'Invalid request fields');
  }
  return undefined;
}
