# Identity provider boundary — Phase 1A

The identity interface in backend/src/modules/identity/provider.ts is an internal backend contract. It is not a chosen SSO implementation. Corporate provider, protocol, employee source, MFA and session requirements remain Q01 in the proposed architecture.

resolveIdentity accepts a future server-extracted opaque session token and returns a verified principal or null. A production adapter must validate provider/session credentials server-side, use stable issuer/subject identifiers, enforce expiry and revocation, and map to active internal employee records before allowing any business action. Never accept x-user-id, role, organization or scope claims from the browser. Identity is not authorization: future services must resolve current resource-scoped grants separately. No provider callback/login/session middleware or role grants are implemented here.

The default disabled adapter returns null. GET /api/v1/me returns the standard 401 envelope. No password tables, employee records or sessions exist.

## Fixed synthetic fixture

Only isolated local development/test can opt in by setting both IDENTITY_MODE=synthetic and ISOLATED_DEVELOPMENT=true, with NODE_ENV=development or test. The environment parser and provider factory both reject production/non-isolated use. API binds only to 127.0.0.1. The single fixture is labelled Synthetic development learner, has no employee ID, organization, role or permissions, and cannot be chosen or altered through request headers. No record is created and no client persistence is used.

PowerShell, one local terminal only:

    $env:NODE_ENV='development'
    $env:IDENTITY_MODE='synthetic'
    $env:ISOLATED_DEVELOPMENT='true'
    npm run dev:api

After stopping, remove the two fixture overrides or use a fresh terminal. Do not expose this mode through a tunnel, shared server or deployment. The marker is a deliberate operator opt-in, not automated proof of network isolation. The frontend always says authentication is unconfigured and never treats fixture responses as a real employee login.

## Future adapter acceptance boundary

Require approved provider discovery/issuer, secure code flow where applicable, validated state/nonce, session cookies with HTTP-only/secure settings, CSRF protection for state-changing cookie requests, logout/revocation, lifecycle integration, denial tests and audited security changes. None is implied by this scaffold. Do not implement it before the relevant decisions and phase authorization.
