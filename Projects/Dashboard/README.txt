My Dashboard · Version 0.6.10
Caught-Up TV & Continue Watching Cleanup · 2026-08-16

CHANGELOG
=========
Version: 0.6.10
Title: Caught-Up TV & Continue Watching Cleanup

Description:
Adds episode-aware Continue Watching behavior for TV shows and makes Continue Watching exclusive from the rest of Streaming. Ongoing shows hide while waiting for their next episode or season and return automatically when new content is released. Ended series trigger the completion feedback prompt, and anything currently in Continue Watching is filtered out of every other discovery row.

CONTINUE WATCHING IS EXCLUSIVE
==============================
If a movie or TV show is currently in Continue Watching, it appears only in
the Continue Watching row.

It is filtered out of:
- Recommended for You
- Popular Movies Across Your Services
- Because You Liked...
- Recently Added to Your Services
- Movies You May Like
- Popular TV Across Your Services
- TV Shows You May Like
- Trending on Your Services
- Trending Across Everything
- Coming Soon
- Leaving Soon

This applies to both movies and TV shows.

CAUGHT-UP TV
============
More released episodes available:
- Keep the show in Continue Watching.
- Queue the next released episode, including across seasons.

Caught up but show is still ongoing:
- Remove the show from Continue Watching.
- Save it as waiting for the next episode/season.
- Weekly shows disappear after the newest released episode.
- Shows between seasons stay hidden.
- Streaming rechecks waiting shows each time it loads.
- Once a newer episode is released, the show automatically returns to
  Continue Watching.

True ending of an ended/canceled series:
- Show the "Did you like it?" prompt.
- Save Liked It / Didn't Like It / Skip.
- Mark the whole TV series Watched.
- Remove it from Continue Watching and discovery rows.

SUPABASE
========
Run once:
streaming-0.6.10-caught-up-tv.sql

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

No Edge Function update is required.
