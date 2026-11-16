import type {
  CommandMetadata,
  Unavailable,
} from '@welspun/contracts/integration/v1';

// Unexported nominal markers, no constructors/issuers in this phase.
declare const sessionBrand: unique symbol;
declare const requestBrand: unique symbol;
declare const workloadBrand: unique symbol;
declare const csrfBrand: unique symbol;
export interface VerifiedCsrf {
  readonly [csrfBrand]: true;
}
export interface VerifiedSession {
  readonly [sessionBrand]: true;
  readonly userId: string;
  readonly expiresAt: string;
}
export interface VerifiedWorkload {
  readonly [workloadBrand]: true;
}
export interface TrustedRequestContext {
  readonly [requestBrand]: true;
  readonly session: VerifiedSession;
  readonly workload: VerifiedWorkload;
  readonly requestId: string;
}
export type Verification<T> =
  { readonly available: true; readonly value: T } | Unavailable;
export interface SessionVerifier {
  verify(opaqueToken: unknown): Promise<Verification<VerifiedSession>>;
}
export interface SessionRevoker {
  revoke(
    context: TrustedRequestContext,
  ): Promise<Verification<{ readonly revoked: true }>>;
}
export interface CsrfVerifier {
  verify(
    context: TrustedRequestContext,
    token: unknown,
    origin: unknown,
  ): Promise<Verification<VerifiedCsrf>>;
}
export interface WorkloadAuthenticator {
  verify(credential: unknown): Promise<Verification<VerifiedWorkload>>;
}
export interface RequestContextVerifier {
  verify(request: unknown): Promise<Verification<TrustedRequestContext>>;
}
/** This is metadata requiring a trusted context, not an authorization decision. */
export interface AuthorizedHttpCommand {
  readonly context: TrustedRequestContext;
  readonly organizationId: string;
  readonly metadata: CommandMetadata;
}
export interface FixedUpstreamRouter {
  resolve(
    operation: 'session.read' | 'draft.read' | 'catalog.list',
  ): Promise<Verification<{ readonly method: 'GET'; readonly url: string }>>;
}
export const unavailable: Unavailable = Object.freeze({
  available: false,
  code: 'INTEGRATION_UNAVAILABLE',
  message: 'Integration is unavailable.',
  retry: 'none',
});
const deny = async (): Promise<Unavailable> => unavailable;
export const disabledBoundaries: Readonly<{
  sessions: SessionVerifier;
  revocation: SessionRevoker;
  csrf: CsrfVerifier;
  workload: WorkloadAuthenticator;
  requests: RequestContextVerifier;
  upstream: FixedUpstreamRouter;
}> = Object.freeze({
  sessions: Object.freeze({ verify: deny }),
  revocation: Object.freeze({ revoke: deny }),
  csrf: Object.freeze({ verify: deny }),
  workload: Object.freeze({ verify: deny }),
  requests: Object.freeze({ verify: deny }),
  upstream: Object.freeze({ resolve: deny }),
});
/** Casts/JSON cannot create runtime trust. No accepting implementation exists here. */
export function requireTrustedRequest(_input: unknown): never {
  throw new Error('Integration request trust is unavailable.');
}
