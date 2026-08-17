My Dashboard · Version 0.6.13
Streaming Row Personalization & Duplicate Reduction · 2026-08-17

CHANGELOG
=========
Version 0.6.13: Streaming Row Personalization & Duplicate Reduction

Description:
Adds a per-account titles-per-row preference and reduces repeated movies and
shows across Streaming discovery rows. Streaming now favors fresh titles as
users move down the page while preserving user-specific rows and the existing
0.6 playback, availability, and watched-state behavior.

TITLES PER ROW
==============
- Adds a Titles per Row setting with 10, 15, 20, 25, and 30 options.
- The setting is saved to streaming_preferences for the signed-in Dashboard account.
- The same saved value is available from both Dashboard Settings and Streaming Settings.
- The default remains 20 titles per row.
- The selected limit applies whenever Streaming builds its carousel rows.

DUPLICATE REDUCTION
===================
- Discovery, recommendation, popular, trending, arriving, and leaving rows now
  strongly prefer titles that have not appeared in an earlier discovery row.
- If a later row needs more titles, a title may appear a second time, but it is
  capped at two discovery-row appearances instead of repeating throughout the page.
- Row order still determines which row gets first claim on a title.
- Continue Watching is exempt from cross-row de-duplication because it is a
  user-specific state row.
- Search results are also exempt from cross-row de-duplication so searches show
  the requested results normally, while still respecting the chosen row size.

PRESERVED 0.6 BEHAVIOR
======================
- Continue Watching remains exclusive from normal discovery rows.
- Movies with future release dates remain hidden.
- TV shows with no released episodes remain hidden.
- Caught-up ongoing shows remain hidden until a new episode actually releases.
- Admin full-catalog access remains unchanged.
- Dashboard Picture in Picture remains unchanged.
- Provider selection and provider priority remain unchanged.
- Autoplay Next Episode remains unchanged.

SUPABASE
========
Run streaming-0.6.13-preferences.sql once in the Supabase SQL Editor before
publishing the updated files. It adds streaming_preferences.titles_per_row with
a default of 20 and constrains it to 10, 15, 20, 25, or 30.

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
Dashboard/streaming-0.6.13-preferences.sql
