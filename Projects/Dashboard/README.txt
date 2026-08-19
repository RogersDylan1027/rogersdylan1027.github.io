My Dashboard · Version 0.6.15
Multiple Watchlists & Custom Collections · 2026-08-18

CHANGELOG
=========
Version 0.6.15: Multiple Watchlists & Custom Collections

Description:
Adds multiple named Streaming watchlists that can mix movies and TV shows, keep a custom play order, use a single collection cover, and stay editable at any time. Each watchlist appears as its own collection card in Streaming, with controls to add, remove, reorder, skip, and complete titles.

MULTIPLE WATCHLISTS
===================
- Create as many named watchlists as you want.
- Each watchlist can contain both movies and TV shows.
- A Watchlists row appears in Streaming, and each card represents one collection.
- Each collection uses one cover poster. The first added title becomes the default cover, and any item can later be chosen as the cover.
- Watchlists stay editable at all times.

ORDERED QUEUES
==============
- Titles stay in a saved play order.
- Move items up or down at any time.
- Skip moves a queued title to the end without marking it completed.
- Done marks an item completed so the next queued title becomes Up Next.
- Queue Again restores a completed item to the active queue.
- Remove deletes only that item from the selected watchlist.
- Watch opens the normal Streaming title details/player flow.

ADDING TITLES
=============
- The title Details screen now has a Watchlists button.
- Card menus include Add to Watchlist…
- A title can belong to multiple watchlists at the same time.
- Creating a new watchlist while adding a title immediately puts that title into the new collection.

PRESERVED FROM 0.6.14
=====================
- Autoplay Next Episode remains removed.
- Manual Next Episode remains available.
- Open Full Page remains removed.
- iPhone/iPad Picture in Picture guidance and permissions remain in place.
- Mobile Streaming header alignment and centered three-dot menu fixes remain in place.

PRESERVED FROM 0.6.13
=====================
- Titles per Row: 10, 15, 20, 25, or 30.
- Cross-row duplicate reduction with Continue Watching exempt.
- Future-content filtering and caught-up-series hiding.
- Admin full-catalog access, provider priority, Dashboard Playback, and TV episode selection.

SUPABASE
========
Run Supabase/streaming-0.6.15-watchlists.sql before publishing the Dashboard files.
It creates the per-user streaming_watchlists and streaming_watchlist_items tables with RLS policies.
The existing 0.6.13 titles_per_row migration remains required if it has not already been run.

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
Supabase/streaming-0.6.15-watchlists.sql
