import type {
  CatalogDetail,
  CatalogEntry,
} from '@welspun/contracts/integration/v1';

export type CatalogQuery = {
  search?: string;
  cursor?: string;
  limit?: number;
};

export class IntegrationRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly retry: string;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
  ) {
    super(message);
    this.name = 'IntegrationRequestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.retry =
      status === 401
        ? 'reauthenticate'
        : status === 409
          ? 'reconcile'
          : status === 429 || status >= 500
            ? 'same-intent'
            : 'none';
  }
}

function errorMessage(status: number) {
  if (status === 401) return 'Sign in is required to view the course catalog.';
  if (status === 403)
    return 'Your account is not permitted to view this course.';
  if (status === 404) return 'This course is no longer available.';
  if (status === 429) return 'The catalog is busy. Please try again shortly.';
  if (status >= 500) return 'The learning service is temporarily unavailable.';
  return 'The learning service rejected this request.';
}

function parseCatalogPage(value: unknown) {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    !isRecord(value.meta) ||
    !Array.isArray(value.data.items) ||
    !value.data.items.every(isCatalogEntry) ||
    !(
      value.data.nextCursor === null ||
      typeof value.data.nextCursor === 'string'
    ) ||
    typeof value.meta.requestId !== 'string'
  ) {
    throw new IntegrationRequestError(
      502,
      'INVALID_RESPONSE',
      'The learning service returned an invalid response.',
    );
  }
  return value as {
    data: { items: CatalogEntry[]; nextCursor: string | null };
    meta: { requestId: string; nextCursor: string | null };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCatalogEntry(value: unknown): value is CatalogEntry {
  return (
    isRecord(value) &&
    typeof value.courseId === 'string' &&
    typeof value.releaseId === 'string' &&
    typeof value.releaseNumber === 'number' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.code === 'string' &&
    (value.scopeUnitId === null || typeof value.scopeUnitId === 'string') &&
    typeof value.publishedAt === 'string' &&
    typeof value.moduleCount === 'number' &&
    typeof value.lessonCount === 'number'
  );
}

async function request<T>(path: string, parse: (value: unknown) => T) {
  let response: Response;
  try {
    response = await fetch(path, {
      cache: 'no-store',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new IntegrationRequestError(
      503,
      'INTEGRATION_UNAVAILABLE',
      'The learning service could not be reached.',
    );
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const requestId =
      typeof body === 'object' &&
      body !== null &&
      'requestId' in body &&
      typeof body.requestId === 'string'
        ? body.requestId
        : undefined;
    const code =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null &&
      'code' in body.error &&
      typeof body.error.code === 'string'
        ? body.error.code
        : 'INTERNAL_ERROR';
    throw new IntegrationRequestError(
      response.status,
      code,
      errorMessage(response.status),
      requestId,
    );
  }

  try {
    return parse(body);
  } catch {
    throw new IntegrationRequestError(
      502,
      'INVALID_RESPONSE',
      'The learning service returned an invalid response.',
    );
  }
}

export async function listCatalog(query: CatalogQuery = {}) {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const suffix = params.toString();
  return request(
    `/api/backend/courses${suffix ? `?${suffix}` : ''}`,
    parseCatalogPage,
  );
}

export async function getCatalogDetail(
  courseId: string,
  releaseNumber: number,
) {
  return request(
    `/api/backend/courses/${encodeURIComponent(courseId)}/releases/${releaseNumber}`,
    (value) => {
      if (
        !isRecord(value) ||
        !isRecord(value.data) ||
        !isCatalogEntry(value.data) ||
        !Array.isArray((value.data as Record<string, unknown>).modules)
      )
        throw new Error('Invalid catalog detail');
      return value as {
        data: CatalogDetail;
        meta: { requestId: string; nextCursor: string | null };
      };
    },
  );
}

export type { CatalogDetail, CatalogEntry };
