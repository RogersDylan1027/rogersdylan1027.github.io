Dashboard Dylan · Version 0.6.2
Streaming Embedded Player Popup Fix · 2026-08-14

CHANGELOG
=========
Version: 0.6.2
Title: Streaming Embedded Player Popup Fix

Description:
Prevents the Streaming embedded player from opening unwanted tabs or taking over the Dashboard page by sandboxing the iframe and withholding popup and top-navigation permissions, while preserving in-Dashboard playback, fullscreen support, resume tracking, and validated player progress events.

Bug Fixes:
- Prevents the embedded Streaming player from opening unwanted tabs or windows.
- Blocks the iframe from navigating the top-level Dashboard page.
- Preserves in-Dashboard playback, fullscreen support, cross-device resume tracking, and validated player progress events.
- Keeps deep-linked provider launches classified as Opened rather than Watched.

FILES TO REPLACE
================
dashboard-config.js
dashboard-entry.js
dashboard-auth.js
dashboard-streaming.js
dashboard-streaming-ui.js
Streaming/index.html

No new SQL or Edge Function deployment is required for 0.6.2. Keep the existing 0.6.0 streaming schema and tmdb-proxy Edge Function.

The external embed source should only be used where you are authorized to use its content.
