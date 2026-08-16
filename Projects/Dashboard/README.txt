My Dashboard · Version 0.6.9
Watched Filtering & Expanded Discovery · 2026-08-16

CHANGELOG
=========
Version: 0.6.9
Title: Watched Filtering & Expanded Discovery

Description:
Expands Streaming discovery while keeping rows focused on titles you have not watched yet. Marking a title as Watched now asks whether you liked it, saves that preference, and removes the title from discovery rows immediately. Streaming also adds personalized recommendations, recently added availability, mixed trending rows, and source-backed coming/leaving sections.

WATCHED FLOW
============
- Mark as Watched now asks: Liked It, Didn't Like It, or Skip.
- Like/Dislike is saved as a recommendation signal.
- The watched title is removed from discovery rows immediately.
- Continue Watching contains only unfinished titles.
- Watchlist/discovery/recommendation/trending rows filter out watched titles.
- Search intentionally may still return watched titles.

STATE-AWARE THREE-DOT MENUS
============================
Normal / not started: Details, Add to Watchlist, Mark as Watched, Not Interested.
Watchlist: Details, Remove from Watchlist, Mark as Watched, Not Interested.
Continue Watching: Details, Resume, Restart, Remove from Continue Watching, Mark as Watched, Not Interested.
Watched: Details, Watch Again, Mark as Unwatched.

ROWS
====
1. Continue Watching
2. Recommended for You
3. Popular Movies Across Your Services
4. Because You Liked...
5. Recently Added to Your Services (only when provider availability-event data exists)
6. Movies You May Like
7. Popular TV Across Your Services
8. TV Shows You May Like
9. Trending on Your Services (mixed Movies + TV)
10. Trending Across Everything (mixed Movies + TV)
11. Coming Soon (only when sourced availability-event data exists)
12. Leaving Soon (only when sourced availability-event data exists)

TRENDING
========
Trending on Your Services combines TMDB weekly Movie and TV trending and filters it to the titles found in your current enabled-service discovery results.
Trending Across Everything combines TMDB weekly Movie and TV trending regardless of provider. Both exclude watched titles.

RECOMMENDATIONS
===============
Recommended for You and Movies/TV You May Like use genres from liked titles as a strong signal with TMDB popularity as a secondary signal. Because You Liked... uses genre overlap with a watched-and-liked title.

AVAILABILITY-DATE ROWS
======================
Recently Added, Coming Soon, and Leaving Soon only appear when provider_availability_events contains corresponding sourced records. My Dashboard does not invent provider arrival/removal dates. Coming Soon suppresses titles already available on an enabled external service; Leaving Soon suppresses titles that are also currently carried by another enabled external service.

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

SQL / EDGE FUNCTION
===================
No new SQL migration is required for 0.6.9.
No new Edge Function deployment is required.
The existing 0.6.8 SQL file remains included in this complete package for reference/replacement workflows.
