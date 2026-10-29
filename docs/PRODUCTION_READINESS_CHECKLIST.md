# Production readiness checklist

29 October 2026. This is an evidence register, not approval to deploy. No production item is inferred from successful local tests. Phase 0 policies remain proposed.

| Item | Classification | Evidence / required completion |
| --- | --- | --- |
| Normal server excludes management routes, database activation disabled, worker inert | Implemented and locally verified | Startup and HTTP regressions; no production-enable switch added |
| Scoped authorization, active grants/latest roles, server-side identity lookup, transaction fence | Implemented and locally verified | Memory and isolated real Mongo regression suites; synthetic subjects only |
| DTO validation, envelopes, request IDs, sanitized logs/errors, Helmet and body bounds | Implemented and locally verified | Ordinary API tests and startup checks |
| Approved SSO provider and issuer/audience/signature/algorithm/key rotation/session validation | Blocked by corporate approval | No provider chosen or production verifier supplied; establish approved identity contract and then test lifecycle/revocation |
| Directory linkage, identity uniqueness and offboarding process | Blocked by corporate approval | Synthetic mapping only; approve authoritative source, sync/disable latency, rehire and tenant linkage |
| Bootstrap and security administrator governance | Blocked by corporate approval | No public bootstrap/superuser; approve initial trust ceremony, recovery, separation of duties and break-glass audit |
| Corporate role definitions, delegation and organizational scopes | Blocked by corporate approval | Engine verified; no real roles/hierarchy seeded; obtain permission ownership and scope approval |
| Employee privacy and visibility | Blocked by corporate approval | Scoped DTOs tested; approve fields, multi-membership visibility, reporting/export rules and data residency |
| Transactional mutation audit | Partially implemented | Reusable local append-only adapter verified; no database-level immutability or production composition |
| Identity/denial security-log durability | Not implemented | Hooks exist; approve destination for nontransactional and unattributed events, delivery failure behavior and reconciliation |
| Corporate audit retention/legal hold/archive/encryption-key policy | Blocked by corporate approval | No TTL or retention period selected; identify records owner, legal obligations and approved storage/IAM |
| Versioned receipt validation and current-authorization replay | Implemented and locally verified | Supported version/digest/binding/DTO checks; real commit/response-loss retry tests |
| Receipt retry window, retention, old-version migration and reconciliation | Blocked by corporate approval | No deletion; unsupported/corrupt receipts fail closed; approve archive/tombstone/migration process |
| Consistent backup, recovery objectives and restore procedures | Not implemented | No infrastructure provisioned; require domain/audit/receipt consistent restore, index verification and restore drills |
| Production database access controls, append-only audit credentials and privileged activity monitoring | Not implemented | Local test guard only; implement least privilege, TLS, network controls, secret rotation and approved admin procedures |
| Production connection configuration | Not implemented | Deliberately blocked; production URI alone must not activate test paths; design separately after approval |
| Monitoring, security alerting and incident response | Not implemented | Structured operational logs only; approve ownership, alerts, runbooks and escalation |
| API rate limits and abuse protection | Partially implemented | Process-local limiter/body/Bearer bounds verified; distributed quotas, identity limits and proxy trust need deployment design |
| CSRF/session protections | Not implemented | No cookie/session authentication; choose approved bearer or cookie approach, then implement CORS/CSRF/cookie settings accordingly |
| Fence contention and production performance capacity | Partially implemented | Small measured local baseline, significant retries; no production sizing/SLA or load envelope |
| CI, type/lint/test/build/dependency audit gates | Implemented and locally verified | Existing workflow and local checks; opt-in Mongo benchmark is separate, not a production performance gate |
| Deployment controls, infrastructure hardening and rollback | Not implemented | No deployment in this phase; require approved environments, secrets, release gates and restore-safe rollback |
| Independent security review and production acceptance | Not implemented | This developer source review does not replace independent review, penetration testing or corporate sign-off |

Production remains blocked. Approval-dependent policy decisions and implementation work both remain; approval alone does not make an item implemented.
