Dashboard Dylan · Version 0.6.3
Streaming Player Compatibility Fix · 2026-08-14

CHANGELOG
=========
Version: 0.6.3
Title: Streaming Player Compatibility Fix

Description:
Restores in-Dashboard streaming playback after the popup-blocking iframe sandbox proved incompatible with the embedded player. The sandbox restriction is removed so the player can load normally, while the no-referrer policy and existing validated player-event protections remain in place.

Bug Fixes:
- Restores the embedded Streaming player by removing the incompatible iframe sandbox.
- Keeps referrerpolicy="no-referrer" on the player iframe.
- Preserves validated player postMessage origin/source checks and cross-device resume tracking.
- Keeps deep-linked provider launches classified as Opened rather than Watched.
- Reverts the 0.6.2 sandbox approach because this player explicitly refuses sandboxed embedding.

FILES TO REPLACE
================
dashboard-config.js
dashboard-entry.js
dashboard-auth.js
dashboard-streaming.js
dashboard-streaming-ui.js
Streaming/index.html

No new SQL or Edge Function deployment is required for 0.6.3. Keep the existing 0.6.0 streaming schema and tmdb-proxy Edge Function.

The external embed source should only be used where you are authorized to use its content.
