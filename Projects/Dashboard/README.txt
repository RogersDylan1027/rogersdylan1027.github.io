Dashboard Dylan · Version 0.6.1
Dashboard Playback & Cross-Device Resume · 2026-08-14

CHANGELOG
=========
Version: 0.6.1
Title: Dashboard Playback & Cross-Device Resume

Description:
Adds in-Dashboard movie and TV playback with TMDB-based player routing, cross-device resume progress stored in Supabase, player-event tracking, automatic watched/completed state updates, and TV episode-aware progress. Dashboard-first playback now has a working player path while provider deep-link routing remains available for services that must open externally.

Bug Fixes:
- Keeps deep-linked provider launches classified as Opened rather than Watched.
- Saves playback progress at controlled checkpoints rather than on every progress event.
- Saves immediately on pause, seek, close, and completion.
- Validates player postMessage origin and iframe source before accepting playback events.
- Preserves the 0.6.0 project-access and shared-auth architecture.

FILES TO REPLACE
================
dashboard-config.js
dashboard-entry.js
dashboard-auth.js
dashboard-streaming.js
dashboard-streaming-ui.js
Streaming/index.html

No new SQL or Edge Function deployment is required for 0.6.1. Keep the existing 0.6.0 streaming schema and tmdb-proxy Edge Function.

The external embed source should only be used where you are authorized to use its content.
