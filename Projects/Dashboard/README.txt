My Dashboard · Version 0.9.0
Reviews Library & Streaming Review Queue · 2026-09-12

CHANGELOG
=========
Version 0.9.0: Reviews Library & Streaming Review Queue

Description:
Introduces the Reviews project with automatic movie, TV, and book metadata,
poster and cover artwork, and a personal review library backed by Supabase.
Finished Streaming movies and completed TV seasons automatically appear in a
review queue, while season reviews remain grouped under their parent show.
Review data is private to each signed-in user and the original Google Form
questions are retained as the opinion-focused review fields.

REVIEWS PROJECT
===============
- Adds Dashboard/Reviews/index.html.
- Adds automatic movie and TV lookup through the existing authenticated TMDB
  proxy already used by Streaming.
- Adds automatic book lookup through Open Library, including cover artwork,
  author, publish year, and available subjects/genres.
- Removes the old manual cover-image URL workflow; poster/book artwork is used
  automatically as the review cover.
- Preserves the original Google Form review concepts: focus, revisit, plot,
  pace, ending, expectations, favorite characters, short summary, overall
  rating, recommendation, tags, and spoiler flag.
- Stores reviews in Supabase under the signed-in Dashboard user.
- Uses RLS so users can only read and change their own review records.

STREAMING -> REVIEWS
====================
- Adds a From Streaming section to Reviews.
- Watched movies automatically become Ready to Review items.
- TV seasons become Ready to Review only when the season has finished airing
  and every episode is marked watched in Streaming.
- Reviewed items disappear from the queue automatically.
- Queue items may also be dismissed without creating a review.
- TV reviews are grouped by show, with each season review kept under the same
  show card.
- Uses the main show poster for the grouped show and the season poster while
  reviewing a particular season when TMDB provides one.

SUPABASE
========
- Adds public.reviews.
- Adds public.review_queue_dismissals.
- Enables RLS and authenticated-user ownership policies on both tables.
- Adds indexes for user review history, media filters, TMDB grouping, and queue
  dismissals.
- Existing Dashboard project access remains unchanged: Reviews is currently an
  admin-only project, matching its pre-existing project-access setting.

VERSION / EXISTING FEATURES
===========================
- Dashboard version advances from 0.8.0 to 0.9.0 because Reviews is a new
  feature line.
- Preserves the 0.8.0 Home Screen/PWA and notification foundation.
- Preserves existing Streaming, Budget, Food Log, Whiteboard, Files, Projects,
  Calendar, account, authentication, and project-access behavior.
- projects.json is unchanged because Reviews was already registered there.

FILES TO REPLACE
================
Dashboard/dashboard-config.js
Dashboard/README.txt
Dashboard/service-worker.js

FILES TO ADD
============
Dashboard/Reviews/index.html

UNCHANGED BUT INCLUDED IN RELEASE ZIP
=====================================
Dashboard/index.html
Dashboard/projects.json

TEST CHECKLIST
==============
1. Open Dashboard > Projects > Reviews while signed in with an account that has
   Reviews access.
2. Add a movie review and confirm TMDB fills the poster and metadata.
3. Add a TV review and confirm an aired season can be selected and uses season
   artwork when available.
4. Add a book review and confirm Open Library supplies the cover and author.
5. Finish a movie in Streaming and confirm it appears in From Streaming.
6. Finish every episode of a fully aired TV season and confirm that season
   appears in From Streaming.
7. Save the TV season review and confirm multiple seasons group under one show.
8. Reload on another signed-in device and confirm the Supabase-backed reviews
   appear there.
