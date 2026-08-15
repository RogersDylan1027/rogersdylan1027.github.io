Dashboard Dylan · Version 0.6.5
Dashboard-Controlled Fullscreen Playback · 2026-08-14

CHANGELOG
=========
Version: 0.6.5
Title: Dashboard-Controlled Fullscreen Playback

Description:
Moves fullscreen control out of the third-party Streaming iframe and into Dashboard Dylan. The embedded player no longer receives fullscreen permission, while a Dashboard-owned fullscreen button expands the player container itself. This keeps normal playback and resume tracking intact while avoiding the embedded fullscreen action associated with unwanted tab launches.

Bug Fixes:
- Removes fullscreen permission from the third-party streaming iframe.
- Removes the iframe allowfullscreen capability so the embed cannot control browser fullscreen.
- Adds a Dashboard-owned Full Screen button over the player controls.
- Fullscreens the Dashboard player container rather than the embedded site.
- Keeps referrerpolicy="no-referrer" on the iframe.
- Preserves validated player postMessage origin/source checks and cross-device resume tracking.
- Keeps deep-linked provider launches classified as Opened rather than Watched.

FILES TO REPLACE
================
dashboard-config.js
dashboard-entry.js
dashboard-auth.js
dashboard-streaming.js
dashboard-streaming-ui.js
Streaming/index.html

No new SQL or Edge Function deployment is required for 0.6.5. Keep the existing 0.6.0 streaming schema and tmdb-proxy Edge Function.

The external embed source should only be used where you are authorized to use its content.
