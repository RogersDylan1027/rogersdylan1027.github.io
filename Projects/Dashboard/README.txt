My Dashboard · Version 0.6.18
Streaming Loading Experience · 2026-08-19

CHANGELOG
=========
Version 0.6.18: Streaming Loading Experience

Description:
Replaces the plain Streaming loading message with a responsive skeleton-style
loading screen. The Streaming header remains visible while My Dashboard loads
account preferences, watchlists, title state, provider data, and discovery rows.

STREAMING LOADING SCREEN
========================
- Replaces the plain “Loading Streaming…” text with a structured loading state.
- Shows animated poster-shaped skeleton cards and placeholder row headings while
  the Streaming library is being built.
- Keeps Search, Settings, and the Streaming header visible during loading.
- Uses a spinner and short status message to explain what Streaming is doing.
- Uses the same loading presentation while Streaming searches are being prepared.
- Fades back to the normal Streaming rows as soon as data is ready.
- If loading fails, the skeleton is removed and the existing error message is
  shown instead.
- If no streaming services are configured, the normal Settings guidance appears
  after the loading state finishes.
- Respects the device’s reduced-motion preference by disabling the spinner and
  shimmer animations when reduced motion is requested.

SUPABASE / EXTERNAL SERVICES
============================
No Supabase, Google Cloud, Microsoft Entra, or other external-service changes
are required for Version 0.6.18.

FILES UPDATED FROM 0.6.17
=========================
Dashboard/index.html
Dashboard/dashboard-config.js
Dashboard/dashboard-streaming-ui.js
Dashboard/Streaming/index.html
Dashboard/README.txt
