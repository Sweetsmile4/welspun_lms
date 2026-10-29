# Phase 1B.1 implementation report

28 October 2026 · Repository: `C:\MY FOLDER\Work\welspun-lms`

## 1. Architecture summary

Implemented the MongoDB organization-data foundation inside the existing Express modular monolith. Read the required README, Phase 1A reports and six named Phase 0 design/requirements documents before implementation. The Phase 0 files remain unchanged. This phase implements the requested data structure, not an actual Welspun hierarchy, identity provider or HR policy.

The identity module now owns four Mongoose models, a typed repository/transaction port, a MongoDB implementation and internal services. No HTTP route, frontend component, shared public DTO or worker domain was added. Existing routes, middleware and synthetic-identity behavior are preserved. No real employee records, passwords, role grants, scoped permission enforcement, learning features, simulations or deployments were implemented.

The existing connection adapter was extended, not replaced. Ordinary API/worker startup stays disconnected. Its legacy optional URI argument still constructs a disconnected adapter; typed local configuration supports explicit test/development lifecycle. No packages or package versions changed and the lockfile remains unchanged.

**Reasoning:** keep data integrity behind one internal boundary and prove it before Phase 1B.2 adds access control. One organization-level transaction serialization point is simpler to reason about than independent per-entity checks that allow concurrent write skew. It limits administrative write throughput, an explicit trade-off at the initial scale.

## 2. Models and indexes

All collections have creator/modifier metadata, creation/update timestamps and explicit revisions. Schemas reject unknown fields, apply enum/length/date validation and disable automatic collection/index creation and buffering.

| Collection      | Main fields                                                                                                                    | Secondary indexes                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `organizations` | Stable normalized code, name, time zone, active/inactive status, generic revision and authoritative tree revision              | Unique code                                                                                                                                                                          |
| `orgUnits`      | Organization, organization/plant/department type, parent, ordered ancestors, stable code/name, status, placement tree revision | Unique organization/parent/code; partial unique organization/type for organization roots; organization/ancestors/status lookup                                                       |
| `users`         | Organization, external issuer/subject, optional employee ID, display name, active/inactive status                              | Unique organization/issuer/subject; partial unique organization/employeeId only when it is a string                                                                                  |
| `memberships`   | Organization, user, unit, valid-from/to, primary flag, revision/history metadata                                               | Unique organization/user/unit/start; partial unique open membership per user/unit; partial unique open primary per user; organization/user/date lookup; organization/unit/end lookup |

There are 11 declared secondary indexes, in addition to MongoDB's `_id` indexes. Index creation is an explicit `initializeIndexes()` setup operation. It was executed only against generated local test databases. There is no automatic production index synchronization or infrastructure provisioning.

Organization/unit codes are trimmed uppercase technical identifiers; employee IDs are trimmed and case-sensitive. External identity values are opaque, case-sensitive and not silently normalized. Optional employee IDs do not collide as missing/null unique values. These are documented implementation choices, not assumed Welspun identifier policies.

## 3. Repository and service structure

```text
apps/api/src/modules/identity/organization/
  types.ts               Internal records, metadata, errors and actor context
  models.ts              Four strict Mongoose schemas and index definitions
  repository.ts          Typed transaction/repository interfaces
  mongo-repository.ts    Connection-bound Mongo implementation
  service.ts             Cross-document integrity and hierarchy/membership rules
  index.ts               Internal backend exports
apps/api/src/platform/
  database.ts            Extended explicit lifecycle adapter
  database-config.ts     Typed local target and timeout validation
```

Services support organization/root creation, unit creation, hierarchy validation, move preview/execution, provisioning data, membership creation/closure/atomic transfer, current membership lookup and history lookup. They remain independent of frontend components and HTTP.

Every organization-owned repository query includes organization scope. A foreign or missing referenced user/unit produces scoped `NOT_FOUND`; it does not disclose existence in another organization. Actor context supplies attribution only. Phase 1B.2 must authorize both actor and resource scope before calling these services; current internal service access is not RBAC.

## 4. Data-integrity rules

- Organization creation atomically inserts the organization and its single organization-type root unit.
- Plants belong directly to that root. Departments belong to plants or other departments. Nested departments therefore have a single plant ancestor and clear descendant semantics. No real units or locations are seeded.
- Parent/type relationships, same-organization references and ancestor paths are checked using stored records, not caller-provided ancestor arrays.
- Self/descendant movement and root movement are rejected. Move preview and execution both validate subtree size/depth. Moves rewrite the entire affected subtree in one transaction.
- Hierarchy limits are 32 ancestors and 1,000 affected units per move. Larger operations fail atomically; chunked maintenance is deferred.
- Unique indexes protect the declared code, external identity, employee ID and open-membership constraints. Application checks provide clearer failures; indexes remain the race-safe final uniqueness boundary.
- Membership intervals use `[validFrom, validTo)` with null as no upper bound. Ends must follow starts; adjacent intervals are valid. Different non-primary units may overlap, but same-user/unit intervals cannot overlap and only one primary membership may apply at any instant, including bounded intervals.
- Open membership closure requires its revision and is allowed once. Bounded/closed history has no edit/delete path. Transfers atomically close the old row and insert a successor at the same instant, preserving its primary marker; rejected transfers leave the original open.
- Current lookup evaluates interval boundaries at an explicit instant. It returns affiliation data, not permission grants. History lookup preserves prior row identity, dates and creation metadata.

**MongoDB limitations:** indexes cannot enforce cross-document foreign keys, parent type/organization equality, graph acyclicity, derived ancestry or arbitrary interval exclusion. Services plus transaction locking enforce these. Direct database writes can bypass the conventions. Future production credentials/controllers must not expose raw model/repository mutations.

## 5. Transactions and concurrency

Mongo operations use snapshot reads, primary read preference, majority write concern and a bounded commit-time setting. Operations within a transaction are sequential. Mongoose's transaction helper retries transient transaction errors; callbacks contain no external side effects.

Every organization write conditionally updates the organization document revision first. Hierarchy, user provisioning and membership writes therefore contend on the same document instead of independently passing stale cross-document checks. Retries re-read the current state. An explicitly stale tree revision fails rather than silently overwriting changes.

`organizations.treeRevision` changes only for structural operations. Unit create/move requires `expectedTreeRevision`; a unit's own tree revision records its last placement update. Generic revisions protect compare-and-set membership closure and unit updates. Subtree paths and membership transfers commit together or roll back entirely.

**Trade-offs:** serializing administrative writes within an organization favors correctness over throughput. Per-user locks or a more specialized exclusion mechanism can be considered only after measurement. This is not the future learning-event write path. Historical membership records retain unit identity and intervals; a temporal archive of all prior hierarchy paths is not implemented. Future learning evidence must capture the approved historical scope snapshot.

## 6. Database connection behavior

`createMongoAdapter` remains disconnected on construction/import. Explicit `connect({ explicitlyAllowConnection: true })` and isolated development/test configuration are required. Production, non-isolated, remote/SRV, credentialed and incorrectly named targets are rejected before opening. This phase permits only loopback `mongodb://` URLs with explicit ports and development/test database prefixes; future Atlas/production connection policy is deliberately not implemented.

Connect/selection timeouts default to five seconds and are validated between 100 and 30,000 ms. Socket timeout is 30 seconds; pool size is five. Connection opening is deduplicated; disconnect waits for pending open and blocks a new open while closing. Failed opens close the adapter and return a sanitized error without raw URI/driver diagnostics.

The environment-to-config helper does not connect. `DATABASE_ENABLED=true` is still rejected. Neither ordinary API nor worker startup calls the adapter or repository setup. Existing foundation readiness continues to report database disabled and production readiness false.

See `docs/PHASE1B1_DATA_FOUNDATION.md` for the complete local setup and service semantics. No real database credentials were added to examples or source.

## 7. New tests and actual MongoDB verification

Two distinct layers were executed:

1. **Offline tests:** schema validation, strict fields/index declarations, internal service rules against a rollback-capable in-memory test double, configuration guards and mocked connection failure handling. These alone are not database integration evidence.
2. **Real MongoDB tests:** the same service scenarios plus direct database index and rollback checks, using the actual Mongo repository on a temporary local MongoDB **8.0.4** one-member replica set.

The existing binary at `C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe` was identified without installing anything. Before starting it, the action and isolation were documented in chat. The explicit opt-in helper used new ignored scratch dbpaths and ephemeral `127.0.0.1` ports. It initialized only its own replica set, ran synthetic tests and stopped its processes. No existing MongoDB service, external cluster or real Welspun database was contacted. The suite generated and dropped only its own `welspun_lms_test_<UUID>` database. Scratch logs/data remain ignored under `work/`.

Final real integration run: **12 tests passed**, including valid/nested hierarchies, invalid relationships, cross-organization references, cycles, subtree moves, concurrent/stale changes, scoped duplicate codes, identity/optional-ID uniqueness, multiple memberships, primary-overlap races, date boundaries, closure/history, atomic transfer, direct organization/root/unit/user indexes and rollback of a partial transaction. These results are real local MongoDB evidence, not mocked results.

The first integration run exposed a Mongoose deprecation warning for `new: true`; repository updates now use `returnDocument: 'after'`, and the final run passed without that warning. A lint unused-variable error and helper formatting issue were also corrected before final validation.

## 8. Regression checks executed

| Check                                              | Final result                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                    | Passed: TypeScript, lint, formatting, ordinary tests, all application builds and worker smoke                                                |
| Ordinary `npm test`                                | **31 passed**, 12 Mongo tests deliberately skipped without opt-in                                                                            |
| `npm run test:mongo:local` with explicit flags     | **12 passed** against actual isolated MongoDB                                                                                                |
| Existing Phase 1A unit/API cases                   | All **15** preserved and passed within the ordinary suite                                                                                    |
| API/web/worker builds                              | All passed; original six frontend placeholder routes remain                                                                                  |
| Existing Playwright suite                          | **6 passed** across desktop/mobile Chromium, owned loopback test server on port 4318                                                         |
| Current built API with outbound sockets blocked    | Passed: liveness, envelopes, disabled-database readiness, default identity denial and error behavior; no attempted connection or URI logging |
| Current built worker with outbound sockets blocked | Passed: queues disabled, exit 0, no connection/jobs                                                                                          |
| Full and runtime-only dependency audits            | Both report **zero vulnerabilities**                                                                                                         |
| Diff checks                                        | No whitespace errors; no frontend source/public-contract/Phase 0 proposal changes                                                            |

The 31 ordinary cases include 15 preserved Phase 1A cases and 16 new offline/service cases. The separate 12 Mongo cases reuse some service scenarios against a real persistence implementation; these are not 43 distinct functional scenarios. Connection failure tests use mocks to avoid contacting an unavailable external database. The test setup exercises local single-member transactions, not production failover or disaster recovery.

No hosted CI/Linux database test job has been executed or silently provisioned. Normal CI runs offline/API/browser checks; the database suite remains explicitly opt-in.

## 9. Files created and modified

Created:

- `apps/api/src/modules/identity/organization/{types,models,repository,mongo-repository,service,index}.ts`
- `apps/api/src/platform/database-config.ts`
- `apps/api/test/database.test.ts`
- `apps/api/test/organization-memory.ts`, `organization-scenarios.ts`
- `apps/api/test/organization-models.test.ts`, `organization.test.ts`, `organization.mongo.test.ts`
- `scripts/test-mongo-local.mjs`
- `docs/PHASE1B1_DATA_FOUNDATION.md`
- `PHASE1B1_IMPLEMENTATION_REPORT.md`

Modified in this phase:

- `apps/api/src/platform/database.ts`: typed, guarded lifecycle extension.
- `apps/api/src/platform/environment.ts`: validated timeout settings.
- `apps/api/.env.example`: local synthetic database example and timeout documentation.
- `apps/api/src/modules/identity/README.md`: current internal data-module boundary.
- `package.json`: only two opt-in Mongo test commands added; dependencies unchanged.
- `vitest.config.ts`: bounded test/hook timeouts for real transaction tests.
- `README.md`: current phase and data/test instructions.

Earlier Phase 1A review changes and staged files were preserved. Generated Next type declarations/build artifacts may change during validation; no frontend implementation was changed. No existing report or original prototype was rewritten. No commit, push or deployment was made.

## 10. Unresolved risks and external dependencies

- Real identity provider/lifecycle, employee-ID conventions, organizational units, delegated authority, HR effective-date policy and retention remain Welspun decisions. The implemented defaults do not settle them.
- Services are **not authorized entry points for HTTP callers**. Phase 1B.2 must enforce action and resource scope, handle membership/tree cache invalidation and define historical-access rules. No role/permission records exist yet.
- This phase accepts isolated local targets only. Production Atlas connectivity, credentials/secrets, network controls, migrations, backups, monitoring and RPO/RTO require separate approval and implementation.
- Cross-document rules depend on all writes going through the services and common lock. Raw writes can corrupt references/history. A future database validator can harden local field shape but cannot replace graph/interval services.
- Administrative serialization, 32-ancestor depth and 1,000-unit atomic moves are documented bounds. Larger trees and long histories need measured query/performance review, not an assumption of unlimited scalability.
- Existing open-source toolchain warnings from Phase 1A remain: ESLint 9 compatibility/deprecation and the existing esbuild override. No dependency upgrade was forced. MongoDB 8.0.4 is the available local test binary, not a recommended production patch level.
- Normal tests/CI do not automatically start MongoDB. An installed local binary or independently supplied isolated replica set is required to repeat the opt-in database tests. Hosted Linux execution and production topology/failover remain unverified.

## 11. Readiness for Phase 1B.2

**Ready for review as the data foundation for Phase 1B.2**, with actual local database integration evidence and preserved Phase 1A regressions. Internal scoped interfaces, explicit revisions and history rules are available for the future authorization layer. This is not production readiness or approval of Welspun HR/security policies.

**Stopped after Phase 1B.1. Phase 1B.2 has not begun.**
