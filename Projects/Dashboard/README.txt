My Dashboard · Version 0.8.0
Home Screen App & Notification Foundation · 2026-09-10

CHANGELOG
=========
Version 0.8.0: Home Screen App & Notification Foundation

Description:
Introduces the Dashboard PWA foundation so My Dashboard can launch from the
iPhone Home Screen as a standalone app, keep Dashboard pages inside the
installed app, cache the core shell for faster and more resilient loading, and
provide notification permission and local test-notification controls. The
service worker is also prepared for secure Web Push. External websites continue
to open outside My Dashboard. Native WidgetKit Home Screen widgets remain a
later companion-app feature because iOS does not expose WidgetKit to a web-only
PWA.

HOME SCREEN APP / PWA
=====================
- Adds Dashboard/manifest.webmanifest.
- Adds Dashboard/service-worker.js.
- Adds Dashboard/dashboard-pwa.js.
- Uses display: standalone with Dashboard scope /Projects/Dashboard/.
- Keeps internal Dashboard links in the installed Dashboard app window, even
  when older Dashboard markup marked a link target=_blank.
- Leaves external websites outside the Dashboard app.
- Adds service-worker caching for the core Dashboard shell and visited internal
  Dashboard resources.
- Adds Home Screen metadata dynamically from dashboard-config.js so the existing
  optimized Dashboard/index.html does not need to be rebuilt or replaced.

NOTIFICATIONS
=============
- Adds an App & Notifications section to Dashboard Settings at runtime.
- Shows whether My Dashboard is running as an installed Home Screen app.
- Adds an Enable Notifications button that requests permission only after an
  explicit user action, as required by iOS.
- Adds Send Test Notification for verifying notification delivery locally.
- Adds service-worker push and notification-click handlers as the foundation for
  future server-triggered Web Push.
- Server-triggered push subscriptions/VAPID secrets are intentionally not stored
  in the public GitHub repository. That backend phase can be added securely with
  Supabase when notification sources are defined.

VERSION / EXISTING FEATURES
===========================
- Dashboard version advances from 0.7.2 to 0.8.0 because this is a new feature
  line rather than a patch.
- Preserves the 0.7.2 login initialization/auth recovery work.
- Preserves Google Calendar and TMDB Supabase Edge Functions.
- Preserves Streaming, Budget, Food Log, Whiteboard, Files, Projects, Settings,
  authentication, and existing project-access behavior.
- projects.json is unchanged because no Dashboard project is being added,
  removed, or renamed in this release.

FILES TO REPLACE
================
Dashboard/dashboard-config.js
Dashboard/README.txt

FILES TO ADD
============
Dashboard/manifest.webmanifest
Dashboard/dashboard-pwa.js
Dashboard/service-worker.js

LEAVE UNCHANGED
===============
Dashboard/index.html
Dashboard/login.html
Dashboard/dashboard-entry.js
Dashboard/dashboard-auth.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/projects.json
Dashboard/Streaming/index.html
Dashboard/Budget/index.html
Dashboard/Food-Log/index.html
Dashboard/Whiteboard/index.html

INSTALL / TEST ON IPHONE
========================
1. Open the Dashboard in Safari over HTTPS.
2. Use Share > Add to Home Screen.
3. Launch My Dashboard using the new Home Screen icon, not the Safari tab.
4. Open Dashboard Settings > App & Notifications.
5. Confirm App mode reports Installed Home Screen app.
6. Tap Enable Notifications and allow notification permission.
7. Tap Send Test Notification.
8. Open internal projects such as Streaming, Budget, or Whiteboard and confirm
   they remain inside the Dashboard app window.
