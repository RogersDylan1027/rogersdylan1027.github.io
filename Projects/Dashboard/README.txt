My Dashboard · Version 0.6.8
Mobile Streaming Controls & Connected Project Settings · 2026-08-15

CHANGELOG
=========
Version: 0.6.8
Title: Mobile Streaming Controls & Connected Project Settings

Description:
Optimizes My Dashboard and Streaming for iPhone while redesigning playback controls around an always-visible Watch button and provider selector. My Dashboard now participates in the saved provider hierarchy, title action menus adapt to viewing state, and Streaming Settings open directly inside the Streaming project while remaining synchronized with the main Dashboard account settings.

New Features:
- Adds an always-visible provider dropdown beside the Watch button for every title.
- My Dashboard is a real option in the provider dropdown and the saved Provider Priority hierarchy.
- Prefer My Dashboard Playback temporarily puts My Dashboard first without removing its saved hierarchy position.
- Streaming Settings now open inside the Streaming project instead of sending the user back to the main Dashboard.
- Streaming Settings on both pages use the same Supabase-backed services, preferences and provider hierarchy.
- Title ••• menus now change according to Normal, Watchlist, Continue Watching and Watched state.

Mobile / iPhone Improvements:
- Adds viewport-fit=cover and safe-area support for iPhone notches, Dynamic Island and the Home indicator.
- Uses dynamic viewport units for full-screen dialogs and project overlays.
- Increases important touch targets to about 44px or larger.
- Prevents iOS input zoom by using 16px form controls on phone layouts.
- Improves horizontal carousel touch scrolling and snap behavior.
- Improves Streaming details, Settings, provider controls, menus and season/episode selectors on narrow screens.
- Adds touch and overflow safeguards to the main Dashboard and Login screen.

Playback Behavior:
- The button is always named Watch.
- The provider dropdown is always visible.
- Selecting My Dashboard uses the embedded player.
- Selecting an external provider opens that provider and records the title/episode as Opened, not Watched.
- TV Season and Episode selectors remain connected to the exact episode used by Watch.
- Native iframe fullscreen remains enabled.

FILES TO REPLACE
================
Dashboard/index.html
Dashboard/login.html
Dashboard/dashboard-config.js
Dashboard/dashboard-auth.js
Dashboard/dashboard-entry.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/Streaming/index.html
Dashboard/README.txt

Included unchanged for complete-folder replacement:
Dashboard/projects.json

SUPABASE
========
Run once:
streaming-0.6.8-dashboard-provider-priority.sql

This adds dashboard_provider_priority to streaming_preferences so My Dashboard's place in the provider hierarchy syncs across devices.
No Edge Function update is required.
