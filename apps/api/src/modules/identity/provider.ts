import type { SyntheticIdentity } from '@welspun/contracts';
import type { Environment } from '../../platform/environment.js';
/** Only verified credentials go into a future approved provider. No browser user/role headers. */
export type VerifiedSsoIdentity = {
  readonly issuer: string;
  readonly subject: string;
  readonly authenticatedAt: string;
  readonly synthetic: false;
};
export interface IdentityProvider {
  readonly mode: 'disabled' | 'synthetic' | 'approved-sso';
  resolveIdentity(context: {
    sessionToken?: string;
  }): Promise<SyntheticIdentity | VerifiedSsoIdentity | null>;
}
export function createIdentityProvider(
  environment: Environment,
): IdentityProvider {
  if (environment.IDENTITY_MODE === 'synthetic') {
    if (
      environment.NODE_ENV === 'production' ||
      environment.ISOLATED_DEVELOPMENT !== 'true'
    )
      throw new Error('Synthetic identity is forbidden');
    return {
      mode: 'synthetic',
      async resolveIdentity() {
        return {
          subject: 'synthetic-development-learner',
          displayName: 'Synthetic development learner',
          synthetic: true,
        };
      },
    };
  }
  return {
    mode: 'disabled',
    async resolveIdentity() {
      return null;
    },
  };
}
