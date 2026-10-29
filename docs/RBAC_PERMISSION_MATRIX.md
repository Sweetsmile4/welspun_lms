# RBAC and resource scope

Phase 0 proposal · role names are proposed capabilities, not Welspun job titles

## Authorization model

An allow requires an active verified actor, an explicit action grant, a matching resource scope, compatible lifecycle state and any ownership/separation-of-duties conditions. Everything else is denied. A role name alone never authorizes a request. Scope types are own learner record, department subtree, plant subtree, organization, or explicit course/resource. Resource grants do not confer access to employee records. Organizational roles are not inferred from hierarchy position or client-provided plant IDs.

The tree is configurable. Descendant access requires `includeDescendants`; a department grant never expands upward or sideways. Multiple valid grants form an allow union, with global safety constraints (inactive actor, revoked grant, self-approval prohibition, withdrawn content restrictions) always taking precedence. Do not introduce arbitrary deny rules initially; they make combined roles hard to reason about.

## Proposed permission matrix

Legend: O own; D authorized department subtree; P authorized plant subtree; G authorized organization; R explicit content/resource grant; — none. Each cell still requires an explicit grant and state checks. Roles can be combined through controlled grants.

| Action | Learner | Department learning coordinator | Plant learning admin | Content author | Technical SME | Policy approver | Publisher | Auditor | Organization security admin |
|---|---|---|---|---|---|---|---|---|---|
| Read eligible published content | O | O | O | R preview | R review | R review | R | granted scope | O |
| Self-enroll, submit own work | O | O | O | O | O | O | O | O | O |
| Read own progress/certificates | O | O | O | O | O | O | O | O | O |
| Read employee learning records | — | D | P | — | — | — | — | granted D/P/G | — |
| Create/cancel mandatory assignments | — | D | P | — | — | — | — | — | — |
| View/export compliance reports | — | D | P | — | — | — | — | granted D/P/G | security reports only |
| Edit course/lesson drafts and media | — | — | — | R | — | — | — | — | — |
| Edit technical configuration draft | — | — | — | R | R if separately authored | — | — | — | — |
| Approve technical parameters/criteria | — | — | — | — | R | — | — | — | — |
| Approve assessment/certificate policy | — | — | — | — | — | R | — | — | — |
| Publish/withdraw approved releases | — | — | — | — | — | — | R | — | — |
| Record practical competency observation | — | — | — | — | R plus explicit assessor permission | — | — | — | — |
| Revoke certificate with reason | — | — | — | — | — | explicit certificate scope | — | — | — |
| View business audit | — | D limited | P limited | own draft history | own review history | own review history | own publication history | granted D/P/G | security actions G |
| Configure hierarchy and identity lifecycle | — | — | limited plant metadata only | — | — | — | — | read if granted | G |
| Grant roles | — | — | — by default | — | — | — | — | — | G with bounded delegation policy |
| Change/delete final assessment evidence | — | — | — | — | — | — | — | — | — |

No role silently receives organization-wide employee visibility. A platform operator manages infrastructure using a separate operational identity; it is not an LMS superuser. Emergency access must be time-limited, justified, approved and audited under IT policy.

## Enforcement examples and delegation

An admin scoped to Plant A cannot fetch Plant B progress by changing an enrollment ID, aggregate filter, export parameter or asset ID. The API first resolves the object and checks its authoritative scope. Lists include the scope predicate in database queries and use authorized totals. Export workers recheck requester status and current grants before generating and before download; loss of access invalidates the job. S3 links are issued only after object authorization.

A content author for Course X cannot grant themselves SME authority, change an approved numeric threshold in a published release, or inspect another employee's attempts. Reviewers cannot approve a revision they authored or materially edited. Publisher permissions do not bypass missing technical/policy approvals. A user's multiple roles cannot override this rule. Welspun must identify independent reviewers; the sole developer can implement the workflow but cannot supply industrial approval.

Delegation, if enabled later, must restrict both actions and scope to a subset of the grantor's delegable authority; it must never authorize self-escalation or create organization scope from plant scope. Bootstrap initial security administrators through an audited deployment procedure. Role templates and permission changes require review because they change all grants referencing them; version grants and invalidate authorization caches on revocation.

## Transfers and historical access

Retain membership history and evidence scope at the time of learning. Current affiliation controls new assignments; transferring a learner must not rewrite completed records. Default proposal: learner retains own history; new plant staff see only records permitted by an explicitly approved transfer policy. Former plant reporting can show historical assignment compliance without exposing unrelated future activity. HR/privacy approval is required for cross-plant personal history visibility.

## Required security checks

Test own vs other learner, sibling department, parent/child subtree, separate plant, revoked/expired grant, disabled user, forged resource ID, unpublished/withdrawn release, mixed roles/self-approval, scope changes during export and tree moves. Check bulk endpoints and reports as rigorously as individual routes. Frontend hidden controls are usability only; authorization belongs in backend services and repository query scopes.

Trade-off: action grants plus a small set of scope types are more work than global admin flags, but substantially reduce accidental cross-plant access without an external policy engine. Adopt a policy engine only if the real delegation rules outgrow this model.
