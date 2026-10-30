# Phase 2D.2D.1 next steps

30 October 2026. Stop after server-side primitives and disposable-local evidence. Phase 2D.2D.2 is not automatically authorized.

Implemented: owned-local durable lifecycle with current principal checks, bounded idle/absolute expiry, revoke/atomic rotation; fresh-record CSRF/exact origin policy; secure-cookie serialization; fixed frozen gateway/header/query policy; offline content-bound workload integrity checks and disabled workload adapters. Existing fixture preview and test-only domain factories remain unchanged.

Intentionally disabled: functional login/OIDC/provisioner, browser session creation, cookies set by routes, CSRF endpoint, public gateway, Express business API, trusted request-context issuer, course CRUD, persistent frontend, Atlas, queues and deployment. Pure cookie/proof helpers are not active transport.

Before functional composition, supervisor/security must approve identity option, legitimate test principals and issuer/subject mapping, exact HTTPS origin/callback, bootstrap/grant authority, session lifetimes, logout/all-device revocation and rotate/logout race semantics, IdP/offboarding latency, and security-outcome retention/failure handling. Fictional accounts approved in principle do not authorize public test-login or browser role selection.

Choose workload/private ingress and secret/key lifecycle; implement durable one-use proof/nonce consumption if that scheme is selected. The current HMAC checker is not replay protection and the accepting adapter remains disabled. Exact AWS hosting and Next compatibility, certificates, private network access and gateway header/cookie behavior must be confirmed before deployment.

Phase 2D.2D.2 must first be narrowly scoped to reviewed trust composition: fresh durable sessions plus current user/org/grants inside the existing organization fence, approved CSRF/origin/workload controls, safe DTOs/no-store and revocation race tests. Do not remove existing isolated-test guards or call a synthetic-test service from a production-build browser. No domain route is approved by these tests. Keep Atlas gates and exact backend keys MONGOURI/DATABASE_NAME separate from disposable-local storage.

Readiness: ready for a security review and selection of the next limited increment; not ready to expose authenticated transport or domain services until the listed decisions and missing adapters are resolved.
