My Dashboard — Streaming
Version: 0.7.2
Last reviewed: 2026-10-24

0.7.2 — .DD Playlist Sharing & Provider Fallback Reliability
- Adds portable .DD files for Streaming watchlists.
- Export .DD is available from the watchlist editor and includes the collection
  name, order, sort mode, cover metadata, TMDB IDs, and movie/TV type.
- Personal viewing state is intentionally excluded: watched/completed state,
  Continue Watching progress, likes/dislikes, provider subscriptions, account IDs,
  credentials, and other account-specific data are not written into the .DD file.
- Import .DD Playlist is available from the Watchlists manager.
- Every import creates a new watchlist owned by the importing Dashboard account.
  Nothing is linked or synchronized to the creator after import.
- Importing the same .DD file again creates another independent copy. If the
  original name already exists, the new list is named Copy, Copy 2, and so on.
- Imported titles begin queued/unwatched for the recipient while retaining the
  shared playlist order, sorting choice, and cover where available.
- Streaming rejects Whiteboard .DD files and other unsupported .DD types with a
  clear wrong-file-type message.
- Uses the existing streaming_watchlists and streaming_watchlist_items tables;
  no Supabase schema or policy change is required.
- AirPlay remains planned for Streaming 0.7.3 and is not part of 0.7.2.

PLAYBACK PROVIDER FALLBACK · 0.7.2
==================================
- Dashboard Playback now centralizes its hidden provider priority:
    1. https://vidsrc.sh
    2. https://vidsrc.mov
- Ordinary viewers continue to see one My Dashboard player. Provider names,
  URLs, fallback state, and provider selection are not shown in the player UI.
- The primary provider is preflighted through its documented CORS-enabled
  /info endpoint. A 404, non-success status, network failure, or bounded
  preflight timeout is treated as a detectable failure and causes one fallback
  attempt.
- A 15-second iframe load timeout and browser iframe error event can also trigger
  the single fallback attempt when the player document itself does not load.
- Infinite retry loops are prevented by recording which configured providers
  have already been attempted for the current playback session.
- Movie TMDB IDs and TV TMDB ID / season / episode mappings are preserved across
  provider attempts.
- vidsrc.sh keeps the existing startAt resume behavior because that provider
  documents the parameter. vidsrc.mov does not currently document an equivalent
  resume parameter, so My Dashboard does not invent one for fallback playback.
- vidsrc.sh PLAYER_EVENT messages continue to confirm actual playback and save
  progress. If a fallback provider emits the same event contract, My Dashboard
  can process it, but vidsrc.mov does not document that contract and is not
  assumed to support it.
- An iframe load event is recorded only as embed-loaded evidence. It is never
  treated as proof that video playback started.
- Silent failures that occur after a cross-origin player document loads cannot
  be detected reliably unless the provider exposes an error/playback signal.
  My Dashboard intentionally does not switch providers simply because a viewer
  has not pressed Play within an arbitrary amount of time.
- Internal diagnostics are written only for users already recognized by the
  Streaming admin check. Diagnostics record provider stage/reason/evidence but
  avoid title IDs, titles, account IDs, credentials, and unnecessary viewing data.
- If every configured provider produces a detectable failure, the existing
  Dashboard player area shows a normal playback failure message.


Manual verification before publishing:
1. Export a mixed movie/TV watchlist and confirm the downloaded filename ends in .DD.
2. Inspect the exported file and confirm no user ID, credentials, providers,
   viewing progress, likes/dislikes, or completion state are present.
3. Import the file into another account and confirm a new editable watchlist is created.
4. Import the same file again and confirm a second independent copy is created.
5. Rename/reorder/edit one imported copy and confirm the other copy is unchanged.
6. Try importing a Whiteboard .DD file and confirm Streaming rejects it.
7. Confirm existing watchlists, loading, player, search, Continue Watching,
   settings, and provider behavior remain unchanged.

Previous release
================
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
