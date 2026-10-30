# Jobs — v0.6.0

## Version 0.6.0: Employer Account Setup

Approved static release; authenticated handoff testing remains pending. Account notices use blocking `open_questions` entries, not a new credentials database. Nova uses Request secure account setup with a same-origin HTTPS account URL (no query or fragment). Main Admin sees an attention list and an application notice with a ready-to-copy Muse prompt. Complete Muse’s secure card, then optionally select I completed the secure setup. This is a report, not proof of access. Nova must explicitly confirm successful sign-in before clearing the blocker. Confirmation is a human/agent assertion, not independent employer verification. Existing authorization permits Main Admin to edit outstanding questions as before.

Passwords, verification codes and recovery links must never be entered in Dashboard fields. No API into Muse’s vault, wake-up, recurring task or terminal credential relay exists. Employer account creation, terms and consent require separate user decisions. Existing final approval, actual-form and document verification remain required; real submissions stay disabled.

Account updates use the existing version-checked save RPC and audit event; stale updates do not overwrite drafts. Save/discard other edits first. Original listing snapshots and unrelated questions are preserved. Reviewers should test mobile Safari and authenticated Nova/Main Admin flows before publishing. No production data or policies have been changed.

# Jobs — v0.5.1

## Version 0.5.1: Verified Application Requirements

Approved release. Dashboard remains 0.11.4 and Streaming remains 0.7.2. Matching Supabase guards are installed; existing real application/draft/queue fingerprints matched the pre-install backup. No new tables or RLS policy changes.

### Research is not an application form
For the new Nova queue workflow (`nova050_` job IDs), listing qualifications and document summaries are preliminary research. A boolean checked while viewing the listing does not establish actual-form provenance. The application panel and chooser show unverified research clearly; cover-letter, consent and hidden-question requirements remain unknown. The original snapshot is read-only. Missing company/title information displays a source host and application reference rather than null or an invented role; this does not fill the missing employer metadata.

Nova can create provisional research after an open-listing check. To reconcile it into actual form fields, she or Main Admin must inspect the actual application form, supply its same-host HTTPS URL, fresh timestamp and evidence, explicitly confirm it was the form rather than the listing, and record every observed question/document. Hidden/login-only questions cannot be inferred. Stop at unauthorized employer login, consent, attestations or submission. Evidence is an observer's statement, not independent website verification.

Recording actual form requirements saves the previous requirements and draft in private activity history, preserves current draft text, increments the revision and clears approval. If question IDs/documents differ, the current editor must be reconciled with the new fields; earlier research remains readable under Preserved earlier research drafts. No automatic answer mapping or fabricated content is introduced.

Required document text must be complete and explicitly reviewed by Main Admin, not merely a summary of resume facts. The text editor stores no binary attachment and never uploads a file to an employer. Document review is bound to exact content and revision; saving any content change invalidates it. Final approval remains separate and server-checked. Existing unresolved questions/input flags still block readiness.

These provenance/document gates target the new Nova-discovered workflow. The existing legacy Main Admin-defined assignment contract remains unchanged. Normal account/project/verified-Nova restrictions, optimistic concurrency, revocation and disabled real submission remain authoritative.

### Validation and installation boundary
590 local assertions passed: 538 regression/queue checks plus 31 new database and 21 new UI assertions. The new 31 checks also passed in native disposable PostgreSQL, with four additional simultaneous-session checks. Synthetic mobile/desktop preview and runtime syntax/whitespace checks cover the candidate. Positive hosted Auth/REST and real iPhone verification of 0.5.1 remain pending. No Main Admin or service credential was used for routine AI sign-in.

Three guarded authenticated RPCs and two browser-inaccessible private helpers are installed, alongside the approved save/admin/mock/start function updates with existing signatures and ACLs retained. No table or RLS change is needed. The local stage7 SQL is historical review material and must not be rerun against this installed project. Do not publish backend SQL/tests/private backups in the static ZIP. The migration was completed in separately verified steps after expired tool requests. Three correctly shaped anonymous hosted RPC requests were denied with HTTP 401/42501. Positive authenticated 0.5.1 browser checks remain a separate user validation step.

## Earlier release documentation (historical rollout states)

# Jobs — v0.5.0 controlled rollout

## Version 0.5.0: Quick Decisions and Nova Preparation

Supabase migration 20261029215506 is installed with quick decisions disabled. Static release targets the public Dashboard; no Pi testing dependency. Main Dashboard stays 0.11.4 and Streaming stays 0.7.2.

When enabled, Main Admin gets Approve and Decline on every recommendation card. Approve means preparation only: an atomic server action accepts the exact loaded recommendation and creates a Nova-only request. Decline queues no work and removes pending Nova access. Started applications cannot be silently declined; use explicit application revocation. Existing jobs with the exact source URL and duplicate queued sources are protected.

Nova opens/refreshes Jobs to see assigned preparation requests. She reviews the exact original employer listing, records fresh open-position evidence, transcribes the actual questions/documents and creates the draft fields. No job or practice requirement is preselected. The original approved employer snapshot stays read-only. This evidence is an authorized observer’s statement, not independent website verification. An inaccessible or closed page must stop preparation; nothing claims a CAPTCHA/404 means closure.

Existing application draft editing, optional Answer/Skip, unresolved-input gates, corrections, separate exact-revision final approval, audit and revocation remain unchanged. Any edit invalidates approval. Real employer submissions remain disabled; a Submit control is not part of this stage.

Automatic wake-up/notification is **not connected**. A saved Muse browser login cannot receive Dashboard events. No API connector, polling, recurring task, secret or external transmission has been created. Queue visibility is ready for a later separately authorized integration.

### Backend review required
The reviewed additive SQL was installed after native PostgreSQL testing and dependency backup. The local `stage6/queue-prototype.sql` remains development material and must not be rerun against hosted Supabase. It adds three private RLS-enabled, browser-inaccessible tables and four RPCs guarded by the existing fresh Main Admin/verified-Nova checks. The feature defaults off. Existing functions and their permissions are not replaced. Private queue snapshots, reviewer IDs, revisions and audit are retained without automatic purge, matching the existing manual retention model. Existing acceptance triggers remain untouched: the new path uses an internal reviewing status plus the private approval record, avoiding the old acceptance publisher.

The old publisher/shared prep-agent queue is not reused or granted to Nova. No existing job/application/draft/recommendation data changed during installation (full-row fingerprints matched). The new private flag row defaults false; request and event tables are empty.

### Testing and package
Run `node --run test` and `node --run test:quick-decisions` from the local `stage1` test harness using its pinned dependencies. Tests use synthetic in-memory PostgreSQL and simulated browser transport. 538 local assertions, 42 native PostgreSQL assertions, five simultaneous-session native checks and four hosted anonymous denial checks passed. Positive hosted Main Admin/Nova browser checks and authenticated iPhone testing of 0.5.0 remain pending; no account credentials were used by these tests. A development ZIP includes original file paths plus separately marked prototype/tests; it is not safe to publish wholesale to GitHub Pages.

## Earlier release documentation

# Jobs — v0.4.1

## Version 0.4.1: Clearer Jobs Workspace

This release simplifies the existing Jobs interface for phones and desktop
browsers. It does not change Supabase schema, account permissions or automation.
Publication approved by Dylan after Pi installation and iPhone usability review on 2026-10-28.

Main Admin sections:
- **Recommendations:** open the original listing, search/filter suggestions and
  review their details/decision. A URL-only recommendation shows its source site
  until company/title details are added; the UI does not invent them.
- **Saved jobs:** see existing listings and earlier preparation drafts. Search
  without losing the current editor; use the job picker on mobile.
- **Applications:** review assigned drafts, read the next step/readiness checks,
  request corrections or approve the exact saved revision. Past assignments are
  hidden by default but remain available under Show past assignments.
- **Check listing availability:** review closure evidence. A listing with any
  application record is clearly protected and cannot be removed through this form.

To assign a job, expand Start an application with Nova, deliberately choose the
job, add its actual questions/documents, select required/optional and confirm the
requirements were checked. No practice question, CV filename or job is preselected.
Assignment prepares work; it does not approve or submit an application.

Nova retains only her existing assigned-application interface and recommendation
URL submission. She does not receive Main Admin navigation or deletion/approval
controls. All existing server authorization, question/input gates, optimistic
versions, separate approval rules and edit invalidation remain authoritative.

Switching sections keeps their loaded content and unfinished edits. Explicit
refresh checks for unsaved edits across applications, saved jobs and recommendations.
Logout/account changes clear private views. A verified same-account sign-in
notification preserves work while rechecking authorization. Failed/uncertain
mutations do not automatically retry.

467 automated local checks passed, including 49 new guided-form/section tests and
one same-account Auth-event check. Browser preview uses only synthetic data and
was checked at phone/tablet/desktop widths. Dylan also confirmed the installed
Pi redesign and all three new recommendations on iPhone, and reported navigation
feels good. This was a usability review, not a fresh complete authenticated security
audit. Existing native Auth/REST evidence is historical; no SQL or new
authenticated endpoint was introduced here.

Horizon and its original draft remain on hold, the revoked assignment/history are
preserved, and the six recommendations (including Nova’s three latest) are not
changed by this redesign. Real submissions and recurring work remain disabled.

### Prior 0.4.0 workflow documentation


## Version 0.4.0: Main Admin Listing Availability Review

Main Admin can open **Check listing availability**. The selector shows saved jobs,
not a list of confirmed closures. Keep open/on-hold jobs unchanged. Before removal,
review the exact original employer or authorized ATS position, record the check
time and closure excerpt, confirm readable/matched/nonconflicting evidence and
type the exact REMOVE CLOSED job-ID confirmation. Errors, login/CAPTCHA, 404s,
search snippets and uncertain results do not prove closure.

The existing reviewed Supabase RPC checks fresh Main Admin authorization, source,
loaded version and evidence freshness. It creates a private recovery snapshot of
the entire record, legacy history, evidence, reviewer and time before removing the
active listing, in one transaction. A failed backup preserves the active listing.
Any application/attempt record (even revoked) blocks this operation for separate
reconciliation. Nova has no removal or private-backup-read access. Backups remain
until an authorized operator removes them; no automatic purge or offsite backup.

Do not retry an uncertain outcome. Reload and reconcile the listing/private backup
through authorized operator support. A restore is deliberate maintenance, not a
Nova/browser action. Source evidence is human-reviewed, not independently verified
by the form. No crawler, scheduled deletion or automatic searching is activated.

Current operational state: earlier user-authorized cleanup removed seven closed
listings. Horizon Media is the sole remaining job, on hold; its existing draft and
revoked assignment/audit are preserved. Older eight-job counts below are historical
validation baselines. Nothing assigns Horizon or removes it by publishing this UI.

417 local checks and 46 previously completed native Auth/REST checks cover the
candidate. Added connected UI/PostgreSQL tests cover exact selection, application
protection, Nova denial and a committed lost-response outcome without retry. Pi
backend smoke/export/restore/cleanup passed, and the user confirmed empty-field
removal is disabled. Public post-publication checks remain a distinct step.

No new database migration, account grant, version bump, paid service, recurring
preparation or real employer submission is part of this static release.

## Earlier 0.4.0 application workflow documentation

## Version 0.4.0: Nova-Assisted Job Applications

Open `/Projects/Dashboard/Jobs/` on the public Dashboard origin. GitHub Pages
hosts only the interface; Supabase protects private data and authenticated RPCs.
No Tailscale, private Pi API, API-key connector or additional service is required.
Sign in using the existing Dashboard login and your own approved account.

Main Admin approves an eligible job and assigns explicit question/document/cover
letter requirements to Nova. Assignment approval is not submission approval.
Nova's verified account may read and edit only explicitly assigned active
applications. Main Admin reviews, edits, requests corrections, grants final
approval and revokes assignments. Other AI Helpers cannot access these new
application tables merely by having the same role. Server-side authorization
checks account/project access and the fixed Nova identity on each action.

Final approval requires complete sourced answers/documents, a cover letter when
required, resolved input/open-question markers and reviewed consent/attestation
requirements. Optional questions use Answer/Skip: choosing Answer requires a
complete sourced response; Skip explicitly omits it. Edits invalidate approval
and return complete drafts to review or incomplete drafts to drafting. Approval
is bound to the saved version/content and expiry. Stale saves fail without an
automatic retry. Activity history records each workflow action.

Employer snapshots are read-only. The Existing Jobs workspace remains available
to Main Admin, preserving eight legacy jobs, Nova's earlier preparation draft,
legacy status and activity features. These legacy rows are not imported or
silently synchronized with the new application workflow. Its v0.3.1 label refers
to that retained component. Documents in the new editor are plain text, not a
binary file-upload pipeline. Source labels are not independent fact verification.

Real submissions remain disabled by the private database guard and rejecting
live RPC. There is no employer executor, authenticated submission/mock button,
activated worker or recurring task. Final approval alone does not submit anything.
Muse/Nova browser access still requires a separate secure sign-in and verification;
no browser vault or custom API-key integration is enabled by publishing this UI.

Legacy recommendations retain their pre-existing role-based AI Helper rules;
those RPCs are not Nova-exclusive and must not carry private application answers.
Existing project/account gates and Main Admin acceptance controls remain intact.

The reviewed additive 0.4.0 schema and Nova-only project grant are already installed
in Supabase. This static package applies no SQL or authorization changes. SQL,
test fixtures, development runners, private backups, credentials, employer data
and Pi configuration are excluded from the public release. Dashboard remains
0.11.4 and Streaming remains 0.7.2.

Validation: 309 local workflow/security checks passed; prior native Auth/REST
checks and user-guided iPhone synthetic assignment/review/correction/optional/
revocation checks passed separately. The test record/history were cleaned up;
eight originals and their combined fingerprint were unchanged. GitHub Pages
post-publication loading, cache refresh and Nova's cloud-browser sign-in remain
to be verified after explicit publication authorization. Nothing is published by
preparing this package.
