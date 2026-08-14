Dashboard Dylan · Version 0.6.0
Unified Streaming Foundation · 2026-08-14

WHAT TO REPLACE / ADD
=====================

Replace in Dashboard/
---------------------
dashboard-config.js
dashboard-entry.js
dashboard-auth.js
projects.json

Add in Dashboard/
-----------------
dashboard-streaming.js
dashboard-streaming-ui.js

Add folder
----------
Dashboard/Streaming/index.html

Supabase setup
--------------
1. Run streaming-phase1-schema.sql in the Supabase SQL Editor.
2. Create a Supabase Edge Function named tmdb-proxy.
3. Use tmdb-proxy-index.ts as its index.ts.
4. Set the secret:
     TMDB_READ_TOKEN
5. Deploy tmdb-proxy.

IMPORTANT
=========
The main Dashboard/index.html does NOT need to be replaced for this package.
The existing Version 0.5.5 loader/auth/project-access shell is preserved.

Version 0.6.0 is applied through the shared Dashboard configuration/runtime,
and the Streaming settings are injected after the authenticated Dashboard shell
loads. This avoids rebuilding or regressing the preserved 0.5.5 loader while
still adding the new feature cycle.

projects.json remains the single project catalog. Streaming is added with:
  id: streaming
  folder: Streaming
  icon: 🎬

Because it is in projects.json, the existing Admin project visibility/group
controls can manage Streaming exactly like Food Log, Reviews, and NHL Analytics.

CHANGELOG
=========
Version: 0.6.0
Title: Unified Streaming Foundation

Description:
Adds the foundation for Dashboard Dylan’s unified streaming experience,
including user-specific streaming services, Dashboard-first playback
preferences, Provider Priority and Ask Every Time routing, TMDB-powered
cross-provider discovery, Continue Watching, Watchlist, likes/dislikes,
playback history, and support for future provider authentication and profiles.
Deep-linked playback is tracked as Opened rather than Watched, allowing the
Dashboard to maintain its own viewing state even when a streaming provider
does not expose account or watch-history APIs.

Bug Fixes:
Preserves the 0.5.5 shared authentication and project-access architecture while
keeping TMDB secrets out of public browser code.

CURRENT PHASE 1 UI
==================
Dashboard Settings → Streaming:
- Add/remove subscription services without unnecessary provider login.
- Real authenticated providers remain supported by the data model when an API
  actually exists.
- Prefer Dashboard Playback.
- Provider Priority or Ask Every Time.
- Saved provider hierarchy.
- Link to the Streaming page.

Streaming page:
- Protected by the same project-access guard.
- Continue Watching first when state exists.
- Combined popular movies across enabled services.
- Missing TMDB provider IDs are resolved from TMDB's current provider list at runtime, so the combined catalog is not dependent on hard-coded provider IDs.
- Continue Watching resolves saved TMDB IDs back to real movie/show metadata.
- Combined popular TV across enabled services.
- Search.
- Large Details overlay.
- Card options: Details, Like, Dislike, Watchlist, Mark Watched,
  Remove from Continue Watching, Not Interested.
- Clicking a title records Opened rather than Watched.

NEXT PHASES
===========
- Exact title-provider availability on each card.
- Provider-specific deep links.
- Dashboard embed playback.
- Episode/season details.
- Personalized Recommended for You rows.
- Alternating provider/personalized rows.
- Coming Soon / Leaving Soon feeds and cross-provider suppression rule.

VALIDATION NOTES
================
- Streaming/index.html now waits on the actual DashboardAuth client/user state;
  it does not require a non-existent DashboardAuth.ready() method.
- Shared dashboard-auth.js is aligned to Version 0.6.0 while preserving the
  0.5.5 rule that denied project access returns the user to the Dashboard.
- The TMDB proxy permits read-only title detail and watch-provider routes used
  by Continue Watching and the large details overlay.
