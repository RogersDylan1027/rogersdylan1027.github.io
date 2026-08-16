My Dashboard · Version 0.6.11
TV Autoplay, Admin Catalog & Streaming UX · 2026-08-16

CHANGELOG
=========
Version: 0.6.11
Title: TV Autoplay, Admin Catalog & Streaming UX

Description:
Adds configurable TV autoplay and a permanent Next Episode control, improves Continue Watching with episode labels and New Episode state, keeps caught-up shows hidden until new content arrives, keeps full-catalog search available to everyone while gating Watch for regular users by their added services, centers the Streaming navbar title as a quiet home shortcut, and makes main Dashboard Settings sections collapsible.

ADMIN FULL CATALOG / REGULAR USER WATCH GATE
============================================
- Everyone can search the full TMDB catalog.
- Everyone can open normal title Details before starting playback.
- Admin accounts retain unrestricted full-catalog playback access.
- Regular users are checked only when they press Watch.
- If a regular user does not have an added streaming service that carries the
  selected title, a "Streaming Service Required" popup appears.
- The popup can open Streaming Settings so the user can add a service.
- Admin-only Full Catalog status is shown in Streaming Settings for admins.

AUTOPLAY NEXT EPISODE
=====================
- Autoplay Next Episode is enabled by default.
- Default countdown: 30 seconds before the current episode ends.
- Streaming Settings lets the user turn autoplay on/off.
- Streaming Settings lets the user choose 0–600 countdown seconds.
- These preferences are saved to the user's My Dashboard account.
- When the countdown begins, an Up Next popup shows the next S# E#.
- The user can choose Play Now or Cancel.
- Cancel suppresses autoplay for the rest of that episode's playback session.
- A countdown is not repeatedly restarted while seeking near the end.

NEXT EPISODE
============
- TV Details always include a Next Episode control.
- If another released episode exists, the button is enabled.
- It can advance into the next released season automatically.
- If no released episode exists, it says "No Next Episode" and is disabled.
- Manually pressing Next Episode does not mark the current episode completed.
- Season and Episode selectors update to the episode that starts.

CONTINUE WATCHING
=================
- TV cards show S# E#.
- When a waiting series gets a newly released episode, its card shows:
    New Episode · S# E#
- As soon as the user starts that episode, the label returns to:
    Continue Watching · S# E#
- Active Continue Watching titles remain excluded from other rows.
- waiting_for_next_episode titles remain excluded from recommendation,
  popular, trending, recently added, coming soon, and leaving soon rows.
- Not Interested titles are excluded from those discovery rows as well.

STREAMING NAVBAR
================
- Streaming is centered in the top navbar.
- It looks like a normal page title rather than a conventional link/button.
- Clicking Streaming returns to Streaming/index.html.

MAIN DASHBOARD SETTINGS
=======================
- Dashboard Settings sections are collapsible.
- Clicking a section heading expands/collapses that section.
- Keyboard Enter/Space also toggles the section.
- The open/collapsed state is remembered locally.

SUPABASE
========
Run once:
streaming-0.6.11-autoplay-admin-catalog.sql

FILES UPDATED
=============
Dashboard/index.html
Dashboard/login.html
Dashboard/dashboard-config.js
Dashboard/dashboard-auth.js
Dashboard/dashboard-entry.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/Streaming/index.html
Dashboard/README.txt

SQL:
streaming-0.6.11-autoplay-admin-catalog.sql


0.6.11 BUG-FIX REVISION
=======================
ADMIN ACCESS
- Streaming now uses the same Supabase is_admin() RPC as the regular Dashboard.
- An account recognized as Admin by the Dashboard can Watch any available
  current/released TMDB title without the added-service warning.
- Streaming no longer relies on user metadata containing an "admin" role.

CONTINUE WATCHING EPISODE LABELS
- TV cards now use the following priority for S# E#:
    1. queued next released episode
    2. current unfinished episode_progress
    3. last completed episode
- This fixes existing shows that showed only "Continue Watching · TV".

FUTURE CONTENT
- Movies are hidden until their release_date has arrived.
- Brand-new TV series are hidden until at least one episode has aired.
- Existing TV series remain allowed even if future episodes or seasons exist.
- A caught-up show with waiting_for_next_episode remains hidden from Continue
  Watching and all normal discovery/recommendation rows.
- Once a new episode actually releases, it returns as New Episode · S# E#.
- This future-content rule also applies to admins.

No additional SQL migration is required for this 0.6.11 bug-fix revision.
