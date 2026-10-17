# Jobs — v0.3.1

## Version 0.3.1: Public Supabase Workspace

Open `/Projects/Dashboard/Jobs/` from the Dashboard Projects tile. The browser
interface is public source; records are private Supabase data. The Jobs route
requires no private network connection or local Jobs API. Sign in with your
existing Dashboard account. The page verifies the user, approved account access,
project access and stored role before opening a workspace. Existing project
rules determine which accounts may enter; this release grants no new access.

Main Admin uses `dashboard_job_records`, `dashboard_job_events` and the existing
`dashboard_job_action` RPC. Employer fields are read-only. Application answers,
cover letters and review explanations are private. Missing answers, input flags
and open questions block readiness until addressed. Each answer/letter edit
invalidates its own approval. All requirements and both approvals must be complete
before Ready to Apply. Saves carry the loaded version; stale writes fail. Actions
and their history are committed together by the existing backend.

Authorized non-Main-Admin accounts use the recommendations interface, with its
existing RLS and review RPC restrictions. AI Helpers cannot accept/decline jobs,
read private application records, or approve/submit applications. Project access
remains separate from the account's role.

The existing submission safety constraint still prevents recording submitted
applications. The UI explains the restriction. Nothing here submits an employer
application. PDF export and replacement Nova preparation pipeline are not included.

Eight existing private records and Nova's preparation draft are preserved in
Supabase. No records, resumes, answers, drafts, runtime backups, passwords,
service-role keys or worker credentials belong in GitHub. Only the browser-safe
publishable key is shipped in the shared Dashboard configuration. Existing Pi
services and automation remain separately managed and unchanged.

Source files: `index.html`, `jobs-page.js`, `supabase-workspace.js`,
`recommendations.js`; shared configuration and login are in the parent folder.
Workspace modules load relative to their own public asset location. Sign-out
clears the visible workspace. Requests use the authenticated Supabase client;
no session token is passed through a cross-origin iframe or URL.

Validation covers syntax, same-origin routing, role/access gating, synthetic UI
workflow, private-endpoint rejection, public asset loading and release-file scans.
Real account sign-in, mobile layout, session expiry and browser/PWA caching should
also be checked after publishing. The old tracked `server.py` remains historical
source; the public Jobs page neither executes it nor calls its endpoints.
