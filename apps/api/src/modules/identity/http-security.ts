import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { success } from '@welspun/contracts';
import type { AuthorizationIdentityProvider } from './authorization/types.js';
import { HttpError } from '../../platform/errors.js';
import {
  securityEvent,
  type SecurityAuditSink,
} from '../../platform/security-audit.js';
import type { TransactionalSecurityAudit } from '../../platform/security-audit.js';
import type { AuthorizationRepository } from './authorization/types.js';
import { createAuthorizationService } from './authorization/service.js';

const verifiedSchema = z.strictObject({
  issuer: z.string().min(1).max(512),
  subject: z.string().min(1).max(256),
  synthetic: z.boolean(),
  expiresAt: z.number().finite(),
});
const httpBoundaries = new WeakSet<object>();
export function assertHttpSecurity(value: unknown) {
  if (!value || typeof value !== 'object' || !httpBoundaries.has(value))
    throw new Error('Trusted HTTP boundary required');
}
export type VerifiedHttpIdentity = z.infer<typeof verifiedSchema>;
/** Server-owned port only. No SSO implementation or organization/role claims are accepted. */
export interface HttpIdentityVerifier {
  readonly mode: 'disabled' | 'approved-sso' | 'synthetic-test';
  verifyBearer(token: string): Promise<VerifiedHttpIdentity | null>;
}
export const disabledHttpIdentityVerifier: HttpIdentityVerifier = Object.freeze(
  { mode: 'disabled', verifyBearer: async () => null },
);
export function createHttpSecurity(options: {
  verifier?: HttpIdentityVerifier;
  audit: SecurityAuditSink;
  isolatedTest?: boolean;
  clock?: () => Date;
}) {
  const verifier = options.verifier ?? disabledHttpIdentityVerifier;
  const clock = options.clock ?? (() => new Date());
  const requests = new WeakMap<Request, object>();
  const credentials = new WeakMap<
    object,
    { identity: VerifiedHttpIdentity; requestId: string }
  >();
  function allowedEnvironment() {
    return (
      verifier.mode === 'approved-sso' ||
      (verifier.mode === 'synthetic-test' &&
        process.env.NODE_ENV === 'test' &&
        options.isolatedTest === true)
    );
  }
  if (verifier.mode === 'synthetic-test' && !allowedEnvironment())
    throw new Error('Synthetic HTTP identities require isolated tests');
  function resolve(credential: unknown) {
    if (!allowedEnvironment() || !credential || typeof credential !== 'object')
      return null;
    const value = credentials.get(credential);
    return value && value.identity.expiresAt > clock().getTime() ? value : null;
  }
  const provider: AuthorizationIdentityProvider = {
    mode: verifier.mode,
    authenticate: async (credential) => {
      const value = resolve(credential);
      if (!value) return null;
      const { issuer, subject, synthetic } = value.identity;
      return { issuer, subject, synthetic };
    },
  };
  async function record(
    requestId: string,
    type: 'identity.verified' | 'identity.rejected',
    outcome: 'allowed' | 'denied',
  ) {
    await options.audit.append(
      securityEvent({ requestId, type, outcome }, clock()),
    );
  }
  const authenticate: RequestHandler = async (request, response, next) => {
    requests.delete(request);
    const requestId: string = response.locals.requestId;
    const headers = request.rawHeaders.filter(
      (_value, index) =>
        index % 2 === 0 &&
        request.rawHeaders[index]!.toLowerCase() === 'authorization',
    );
    const header = request.get('authorization');
    let identity: VerifiedHttpIdentity | null = null;
    if (
      allowedEnvironment() &&
      headers.length === 1 &&
      header &&
      header.length <= 4096
    ) {
      const match = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i.exec(header);
      if (match) {
        try {
          const candidate = verifiedSchema.safeParse(
            await verifier.verifyBearer(match[1]!),
          );
          if (
            candidate.success &&
            candidate.data.expiresAt > clock().getTime() &&
            candidate.data.synthetic === (verifier.mode === 'synthetic-test')
          )
            identity = candidate.data;
        } catch {
          /* Never disclose verifier diagnostics or credentials. */
        }
      }
    }
    if (!identity) {
      try {
        await record(requestId, 'identity.rejected', 'denied');
      } catch {
        /* Preserve safe denial when audit infrastructure is unavailable. */
      }
      response.setHeader('www-authenticate', 'Bearer');
      return next(
        new HttpError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Valid authentication is required',
        ),
      );
    }
    try {
      await record(requestId, 'identity.verified', 'allowed');
    } catch {
      return next(
        new HttpError(
          503,
          'SECURITY_AUDIT_UNAVAILABLE',
          'Security verification is unavailable',
        ),
      );
    }
    const credential = Object.freeze({});
    credentials.set(credential, {
      identity: Object.freeze({ ...identity }),
      requestId,
    });
    requests.set(request, credential);
    response.once('finish', () => {
      credentials.delete(credential);
      requests.delete(request);
    });
    response.once('close', () => {
      credentials.delete(credential);
      requests.delete(request);
    });
    next();
  };
  const boundary = {
    provider,
    authenticate,
    credential(request: Request): unknown {
      const credential = requests.get(request);
      if (!resolve(credential))
        throw new HttpError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Valid authentication is required',
        );
      return credential;
    },
    requestId(credential: unknown): string {
      const value = resolve(credential);
      if (!value)
        throw new HttpError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Valid authentication is required',
        );
      return value.requestId;
    },
    /** This phase cannot enable production management, regardless of caller-supplied capability claims. */
    isolatedMutation: ((_request, _response, next) => {
      if (
        process.env.NODE_ENV !== 'test' ||
        options.isolatedTest !== true ||
        verifier.mode !== 'synthetic-test'
      )
        return next(
          new HttpError(
            503,
            'MANAGEMENT_DISABLED',
            'Management operations are unavailable',
          ),
        );
      next();
    }) satisfies RequestHandler,
    async denial(requestId: string) {
      try {
        await options.audit.append(
          securityEvent(
            { requestId, type: 'authorization.denied', outcome: 'denied' },
            clock(),
          ),
        );
      } catch {
        /* Deny even if the nontransactional audit sink fails. */
      }
    },
  };
  httpBoundaries.add(boundary);
  return boundary;
}
export type HttpSecurity = ReturnType<typeof createHttpSecurity>;
/** Only isolated integration composition in this phase; mandatory transactional mutation auditing. */
export function createHttpApplicationService(
  repository: AuthorizationRepository,
  security: HttpSecurity,
  audit: TransactionalSecurityAudit,
  options: { isolatedTest: true; clock?: () => Date },
) {
  assertHttpSecurity(security);
  if (
    process.env.NODE_ENV !== 'test' ||
    options.isolatedTest !== true ||
    audit.durability !== 'isolated-test' ||
    security.provider.mode !== 'synthetic-test'
  )
    throw new Error(
      'Management HTTP integration is restricted to isolated tests',
    );
  return createAuthorizationService(repository, security.provider, {
    ...options,
    requireMutationAudit: true,
    mutationAudit: { sink: audit, requestId: security.requestId },
  });
}
/** Validate request input and explicitly project output; never serialize a domain/Mongoose record wholesale. */
export function protectedController<I, R, O>(
  security: HttpSecurity,
  input: z.ZodType<I>,
  read: (request: Request) => unknown,
  invoke: (credential: unknown, value: I) => Promise<R>,
  project: (record: R) => unknown,
  output: z.ZodType<O>,
  status = 200,
  nextCursor?: (dto: O) => string | null,
): RequestHandler {
  assertHttpSecurity(security);
  return async (request, response, next) => {
    try {
      const credential = security.credential(request);
      const value = input.parse(read(request));
      const record = await invoke(credential, value);
      let dto: O;
      try {
        dto = output.parse(project(record));
      } catch {
        throw new HttpError(
          500,
          'INTERNAL_ERROR',
          'An unexpected error occurred',
        );
      }
      const envelope = success(dto, response.locals.requestId);
      if (nextCursor) envelope.meta.nextCursor = nextCursor(dto);
      response.status(status).json(envelope);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'FORBIDDEN'
      )
        await security.denial(response.locals.requestId);
      next(error);
    }
  };
}
