# Jobs — v0.4.0

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
