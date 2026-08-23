My Dashboard · Version 0.7.0
Dashboard Performance Optimization · 2026-08-23

CHANGELOG
=========
Version 0.7.0: Dashboard Performance Optimization

Description:
Optimizes My Dashboard without changing its existing features or workflows. Reduces startup and Streaming wait time with browser caching, shared in-flight request reuse, fewer duplicate Supabase/TMDB calls, batched availability processing, and smarter TV refresh checks while preserving current Dashboard, Streaming, Projects, Settings, account, and playback behavior.

PERFORMANCE CHANGES
===================
- Adds short-lived shared request caching for TMDB title details, season/provider lookups, Streaming preferences, provider catalog, and user provider state.
- Reuses in-flight requests so duplicate calls made during the same render resolve from one network request.
- Processes Coming Soon / Leaving Soon / availability titles in small parallel batches and stops once enough row results are collected.
- Skips TMDB refreshes for caught-up TV shows whose saved next-episode air date is still in the future.
- Flattens the preserved historical Dashboard shell directly into Dashboard/index.html, removing the runtime raw.githubusercontent.com download, patch step, and document.write() page reconstruction entirely.
- Replaces polling for the Dashboard shell with MutationObserver-based readiness detection.
- Keeps all current Dashboard, Streaming, Projects, Settings, authentication, watchlists, playback, and project-access behavior.

STATIC DASHBOARD ARCHITECTURE
=============================
Dashboard/index.html now contains the fully patched Dashboard shell directly. It no longer downloads the historical 0.4.2 source at runtime, no longer applies a giant browser-side patch before startup, and no longer rebuilds the page with document.write(). The preserved 0.4.2 source remains historical build provenance only and is not required by visitors.

SUPABASE / EXTERNAL SERVICES
============================
No Supabase schema, Google Cloud, Microsoft Entra, or Edge Function changes are required.

FILES TO REPLACE
================
Dashboard/index.html
Dashboard/dashboard-config.js
Dashboard/dashboard-entry.js
Dashboard/dashboard-auth.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/login.html
Dashboard/Streaming/index.html
Dashboard/README.txt
