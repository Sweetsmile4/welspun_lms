# identity

Phase 1B.1 adds four models and internal organization, hierarchy, provisioning-data and membership integrity services under `organization/`. Phase 1B.2 adds versioned role definitions, scoped grants, centralized policy evaluation and authorized application-service wrappers under `authorization/`. Future controllers must use those wrappers, not raw integrity services or repositories. No production SSO or employee-administration HTTP endpoints are enabled. See `docs/PHASE1B1_DATA_FOUNDATION.md` and `docs/PHASE1B2_AUTHORIZATION_GUIDE.md` from the repository root.

This module owns its future domain writes. Expose explicit application services; do not import another module's persistence internals.

Phase 1B.3B adds `management/` with test-only protected controllers, scoped query integration and atomic command receipts. `unit.read`, `role.read` and `grant.read` are explicit capabilities; management permissions do not imply them. Only isolated tests register the router. See `docs/PHASE1B3B_MANAGEMENT_API_GUIDE.md`.

Phase 1B.3A adds `http-security.ts`: server-owned HTTP identity verification, request-bound credentials, protected controller composition and a strictly test-only audited application-service factory. There are no normal management routes or production SSO. See `docs/PHASE1B3_HTTP_SECURITY_GUIDE.md`. The existing `/me` diagnostic principal is not an authorization credential.
