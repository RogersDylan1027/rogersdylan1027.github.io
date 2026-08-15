My Dashboard · Version 0.6.6
TV Season & Episode Selection + My Dashboard Rebrand · 2026-08-14

CHANGELOG
=========
Version: 0.6.6
Title: TV Season & Episode Selection + My Dashboard Rebrand

Description:
Adds Dashboard-owned season and episode selection for TV playback and renames the product from Dashboard  to My Dashboard. TV details load real TMDB seasons and episodes into dropdowns, default to saved viewing progress when available, and launch the exact selected episode without manual number entry. All user-facing  branding is removed while the existing playback warning, cross-device resume, and Dashboard-controlled fullscreen behavior remain intact.

Branding Changes:
- Renames the product to My Dashboard.
- Removes the retired personal-name branding from user-facing pages, settings,
  warnings, comments, and changelog text.
- Changes the Login brand mark from DR to MD.
- Rebrands content loaded from the immutable legacy Dashboard base at runtime.
- Keeps the existing repository URL/account identifier unchanged because it is
  a technical hosting identifier required for the legacy source to load.

TV PLAYBACK
===========
- TV shows use Season and Episode dropdowns; users never type the numbers.
- Seasons and episodes come from TMDB.
- An unfinished saved episode is selected automatically when available.
- Otherwise Season 1 and its first episode are preferred.
- The Watch button shows the exact selection, such as Watch S2 E4.
- Existing cross-device resume and auto-next remain enabled.

PRESERVED FEATURES
==================
- Dashboard Playback warning and per-user Don't show again preference.
- Dashboard-controlled fullscreen player.
- Shared authentication and project-access enforcement.
- Provider settings, Continue Watching, Watchlist and playback state.

FILES IN THIS PACKAGE
=====================
Dashboard/index.html
Dashboard/login.html
Dashboard/dashboard-config.js
Dashboard/dashboard-auth.js
Dashboard/dashboard-entry.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/projects.json
Dashboard/Streaming/index.html
Dashboard/README.txt

No new SQL is required for this revision of 0.6.6.


0.6.6 SAME-VERSION BUG FIX
==========================
- Fixes "DashboardStreaming.getTvSeasonDetails is not a function".
- Adds cache-busting version parameters to shared Streaming JavaScript so an
  older browser/GitHub Pages cached runtime cannot be paired with the newer
  0.6.6 Streaming HTML.
- Adds a direct DashboardStreaming.tmdb() fallback for season loading.
- Prevents a season-picker loading error from making the TV player inaccessible.
- If season metadata fails, "Open TV Player" uses the series-level player as a
  fallback so playback can still open.
- Exposes DashboardStreaming.version = "0.6.6" for easier runtime verification.
