My Dashboard · Version 0.6.12
Picture in Picture & Caught-Up Series Hiding · 2026-08-16

CHANGELOG
=========
Version: 0.6.12
Title: Picture in Picture & Caught-Up Series Hiding

Description:
Adds Picture in Picture support for Dashboard Playback and tightens caught-up
TV behavior. Shows with no remaining released episodes are hidden while waiting
for future episodes or seasons, then return to Continue Watching only when a
new episode has actually released.

PICTURE IN PICTURE
==================
- Dashboard Playback now includes a Picture in Picture button.
- The player iframe keeps explicit picture-in-picture permission.
- In browsers supporting Document Picture-in-Picture, the active Dashboard
  player can be moved into an always-on-top Picture in Picture window.
- Closing that window restores the iframe to the Streaming page.
- If Dashboard-controlled PiP is not supported by the browser, My Dashboard
  shows a clear fallback message.
- The embedded player's own native PiP control remains permitted.

CAUGHT-UP TV HIDING
===================
- Continue Watching is reconciled against saved episode history when Streaming
  loads.
- For each ongoing TV show still in Continue Watching, My Dashboard checks:
    1. all saved episode progress for that show
    2. the latest episode that has actually aired
    3. whether every released episode through that point has been watched
    4. whether another released episode exists
    5. whether the series is ended or still ongoing
- If the user has watched through the latest released episode and no newer
  released episode exists:
    - the show is removed from Continue Watching
    - waiting_for_next_episode is enabled
    - future episode/season information is saved when available
    - the show remains hidden from recommendation/discovery rows
- A future announced season or episode does not keep a caught-up show visible.
- The show returns only after a new episode actually releases.
- When it returns, the card shows:
    New Episode · S# E#
- Starting that new episode changes the card back to:
    Continue Watching · S# E#

FUTURE CONTENT
==============
- Movies remain hidden until their release date.
- TV series with no released episodes remain hidden.
- Existing TV series are still discoverable when they have released content,
  even if later episodes/seasons are in the future.
- If a specific user is caught up on that existing show, the show stays hidden
  for that user until new content actually releases.
- The same future-content rules apply to admins.

AUTOPLAY BUG FIX
================
- Corrected the progress/duration variables used by the 0.6.11 Next Episode
  countdown so the configured end-of-episode autoplay threshold can evaluate
  the player's reported progress correctly.

SUPABASE
========
No new SQL migration is required for Version 0.6.12.
This update uses the waiting/new-episode fields already added in 0.6.x.

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
