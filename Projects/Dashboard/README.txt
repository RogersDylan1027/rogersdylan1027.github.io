My Dashboard · Version 0.6.16
Advanced Watchlists & Collection Browsing · 2026-08-19

CHANGELOG
=========
Version 0.6.16: Advanced Watchlists & Collection Browsing

Description:
Expands Streaming watchlists into advanced custom collections. Watchlists can
use the poster from any TMDB movie or TV show as their cover, even when that
title is not in the collection. Collections now support useful saved sort modes
and richer TV browsing, while 0.6.16 also corrects the iPhone Streaming header
and horizontal row alignment.

WATCHLISTS / COLLECTIONS
========================
- Multiple named watchlists remain supported.
- Movies and TV shows can be mixed in the same collection.
- Custom Order remains the default queue order.
- Skip, Done, Queue Again, move up/down, remove, rename, and delete remain.
- A title may belong to multiple watchlists.
- Collection covers are independent from collection contents.
- Search any TMDB movie or TV show and use its poster as the collection cover.
- Existing collection items can still be selected as the cover with Use Cover.
- If no custom cover is chosen, the existing automatic cover behavior remains.

SORTING
=======
Each watchlist can save one of these display modes:
- Custom Order
- Release Order
- Newest First
- Continue First
- Unwatched First
- Series First

Manual move controls are enabled in Custom Order. Using Skip returns the list
to Custom Order because Skip changes the actual queue position.

TV / EPISODE BROWSING
=====================
- TV entries in a watchlist open the normal Streaming show details.
- From there, the existing Season and Episode selectors remain available with
  episode title, release date, description, provider selection, and playback.
- Movies continue to open their normal Streaming details and Watch flow.

IPHONE / LAYOUT FIXES
=====================
- Streaming is now centered in its own top navigation row on iPhone.
- Search and Settings remain on the second row.
- The mobile rule now overrides the old absolute-position title rule reliably.
- All Streaming row headings and carousels use the same horizontal inset, so
  Watchlists, Continue Watching, and discovery rows line up consistently.

PRESERVED FROM 0.6.14 + 0.6.15
===============================
- Autoplay Next Episode remains removed.
- Manual Next Episode remains.
- Open Full Page remains removed.
- iPhone/iPad Picture in Picture handling remains.
- Three-dot card controls remain centered.
- Multiple named watchlists and ordered mixed queues remain.
- 0.6.13 titles-per-row and duplicate-reduction behavior remains.
- Continue Watching, future-content filtering, caught-up-series hiding,
  provider priority, admin access, and Dashboard Playback remain.

SUPABASE
========
Run Supabase/streaming-0.6.16-watchlists.sql before publishing the Dashboard
files. This one SQL file includes the 0.6.15 watchlist tables plus the 0.6.16
saved sort_mode field, so 0.6.15 does not need to be installed separately.

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
Supabase/streaming-0.6.16-watchlists.sql
