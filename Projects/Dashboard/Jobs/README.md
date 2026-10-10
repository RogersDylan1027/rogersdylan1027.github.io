# Jobs — Nova the Recruiter
Version 0.1.0: Private Recruiter Data Foundation (2026-10-10)

## Purpose
Jobs is a future My Dashboard project for Nova the Recruiter: discovering jobs, displaying an approval/decline queue, preparing application drafts, learning from approved answer history, and tracking offers and interviews. Nova **must not submit** an application without the user's review and explicit approval.

## Privacy architecture
Source code is maintained on GitHub. **No resumes, contact details, applications, answers, API tokens or runtime SQLite/JSON data go into GitHub.** Runtime records belong on the Raspberry Pi. `server.py` binds to loopback only and refuses to start without a strong JOBS_API_KEY. Expose it privately using Tailscale Serve on the Pi (not Funnel), after validating access controls. The public GitHub Pages site must never host a live Jobs app or proxy its private records.

## Startup on Raspberry Pi
1. Install Python 3.10+ and connect the Pi and your client devices to the same authorized Tailscale tailnet.
2. Copy this folder onto the Pi, but keep writable data outside the Git checkout.
3. Set `JOBS_API_KEY` to an independently generated random 32+ character secret, e.g. run `python3 -c 'import secrets; print(secrets.token_urlsafe(48))'`. Never commit or paste it into chat.
4. Run `JOBS_API_KEY=... python3 server.py` using a protected environment file (mode 0600), a service manager, or an interactive terminal. The default data directory is `~/.local/share/dashboard-jobs/`, with SQLite database `jobs.sqlite3`.
5. Configure private Tailscale Serve for localhost port 8765 following current Tailscale docs; do not use public Funnel. Confirm it is inaccessible from a device disconnected from the tailnet.
6. Test with a tailnet device: `curl -H "Authorization: Bearer YOUR_SECRET" https://YOUR-PI-TAILSCALE-HOST/health`. Treat the API secret as sensitive.
7. Back up the Pi database regularly to an encrypted location. Secure filesystem permissions and protect tokens.

## API
All endpoints require `Authorization: Bearer <JOBS_API_KEY>`. No CORS is enabled.
- `GET /health`
- `GET /api/jobs`, `GET /api/jobs/:id`
- `PUT /api/jobs/:id`: JSON job record; allowed statuses: pending_review, accepted, declined, drafting, answers_review, ready_to_submit, submitted (read-only transition), interviewing, offer, rejected, withdrawn.
- `DELETE /api/jobs/:id`: mark declined, retaining its ID to prevent resurfacing
- The same GET/PUT conventions apply for `profile`, `preferences`, `answers`, and `activity` collections.
Use stable IDs for job postings and persist their original source URLs. Do not store credentials in any record. Submitted status cannot be newly set through this API; a future separately authorized submission integration must supply that workflow.

## Release boundaries
This release provides **an API foundation only**. Nova is not connected, the Pi has not been configured through this repository, and the Dashboard tile has not been linked because the private Pi hostname and human authorization flow are not yet verified. This avoids publishing a fake VPN gate on GitHub Pages. Only register the Jobs URL in `projects.json` after Tailscale Serve and authenticated UI work and testing. Keep the Dashboard homepage version untouched until its page is materially changed. On later release, update project README, changelog, Dashboard changelog, project registry and privacy/terms as appropriate.

## Deployment guardrails
For any future agent: never expose Jobs via a publicly reachable host; never use Tailscale Funnel or bypass Dashboard access controls; do not push runtime data; validate proposed write operations before committing. Protect and rotate JOBS_API_KEY. For concurrent writers SQLite is authoritative, JSON is an exchange format, and CSV is export-only. Do not claim production readiness without real connectivity, auth and UI tests.
