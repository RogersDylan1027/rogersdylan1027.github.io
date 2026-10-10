My Dashboard — Streaming
Version: 0.7.1
Last reviewed: 2026-10-10

Streaming lives at Projects/Dashboard/Streaming/index.html and uses the shared
Dashboard authentication, TMDB client, and user provider settings.

0.7.1 — Streaming Loading Reliability
- Show a separate full-screen loading screen with the existing logo-app.png.
- Track real completion of 15 observed startup work operations (not a timer).
- Note: progress is operation-based, not network-byte-based; percentages may pause
  while a slow request is in flight. It reaches 100% only after the rows render.
- Do not reveal the carousel rows while initial loading is underway.
- After 45 seconds show an explicit retry action so a stalled request does not
  leave the user without a recovery path.
- Dismiss the search loader on success or failure.
- Keep Dashboard's main version separate from Streaming's version.

Not included
- Calendar integration: not part of the Streaming scope.
- AirPlay casting of VidSrc iframe playback: cross-origin embedding does not
  expose an accessible HTMLVideoElement and cannot guarantee direct AirPlay.
- Native iPhone Picture in Picture for third-party iframe: provider/browser dependent.

Manual verification before publishing:
1. Sign in and cold-load Streaming: logo appears, percentage starts at zero,
   reaches 100 only after successful library assembly, then overlay disappears.
2. Confirm all carousels and search work on desktop and iPhone Safari.
3. Simulate slow/offline TMDB; after 45s a Retry Loading button appears.
4. Confirm account access and service authorization remain unchanged.
5. Confirm player, Continue Watching, watchlists, settings, and provider links.
6. Check iPhone Home Screen app against Safari for web view differences.
