My Dashboard · Version 0.6.17
Episode Release-Order Watchlists & Cover Fixes · 2026-08-19

CHANGELOG
=========
Version 0.6.17: Episode Release-Order Watchlists & Cover Fixes

Description:
Improves advanced Streaming watchlists without repeating the earlier 0.6.16
package. Release Order now works at the episode level across multiple TV shows
and blends released episodes with movies by release date. Custom collection
covers are made persistent, and every normal Streaming row is aligned to the
same left edge as the Watchlists row.

RELEASE-ORDER WATCHING
======================
- Release Order no longer sorts only whole shows.
- Every released TV episode is expanded into the watchlist timeline.
- Episodes from different shows are blended together by episode air date.
- Movies are inserted into the same timeline using their movie release date.
- Each TV entry shows show name, season/episode number, episode title, date, and
  episode description when available.
- Selecting an episode opens the existing Streaming details directly on that
  exact season and episode.
- Added Next Unwatched · Release Order.
- Next Unwatched hides watched movies/episodes while preserving release order.
- Skip is available for unreleased-order queue entries without marking them
  watched; skipped-for-now entries move behind active unwatched entries in the
  Next Unwatched view.

COLLECTION COVER FIX
====================
- Cover search now uses the same movie + TV search endpoints as Streaming.
- Any TMDB movie or TV poster can be selected, even if it is not in the list.
- The chosen poster path and title are saved with the collection so the cover
  persists without depending on a later detail lookup.
- Existing Use Cover controls now save the same persistent cover information.
- Existing 0.6.16 cover IDs remain supported as a fallback.

STREAMING ROW ALIGNMENT
=======================
- Watchlists remains the alignment reference.
- Continue Watching and every discovery/recommendation row now use the same
  left inset as Watchlists.
- Carousel positioning uses a fixed outer inset rather than relying on scroll
  container padding, preventing rows from visually starting at the screen edge.

SUPABASE
========
Run Supabase/streaming-0.6.17-watchlists-upgrade.sql after 0.6.16.
It adds persistent collection-cover fields, adds the new release-unwatched sort
mode, and adds per-watchlist skip state for release-order movie/episode entries.

FILES UPDATED FROM 0.6.16
=========================
Dashboard/index.html
Dashboard/dashboard-config.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/Streaming/index.html
Dashboard/README.txt
Supabase/streaming-0.6.17-watchlists-upgrade.sql
