My Dashboard · Version 0.10.7
Persistent Admin Notification Bell · 2026-09-23

CHANGELOG
=========
Version 0.10.7: Persistent Admin Notification Bell

Description:
Keeps the notification bell permanently visible for administrators whether or not there are unread notifications, preserves the unread badge only when needed, and ensures the same admin notification control appears reliably in the installed Home Screen app.

NOTIFICATION BELL
=================
- Core bell wiring hotfix: the main Dashboard now owns the notification bell
  click handler and notification rendering directly. It no longer depends on the
  separate account-access runtime to make the bell interactive.
- Pending account-request notifications can now be approved or declined directly
  inside the bell panel by the Main Admin.
- Push server-auth hotfix: dashboard-push-config now verifies the authenticated
  user's role through the service-role lookup of user_roles after validating the
  signed-in user, avoiding a second auth-context RPC mismatch.
- Register This Device no longer overwrites a failed registration message with
  the generic "Notifications are enabled" permission status.
- Admin push-auth hotfix: Register This Device and Test Notification no longer
  depend on the cached DashboardEntryAuth.access.admin flag. They verify the
  current signed-in user directly through Supabase is_admin before registering,
  so Main Admin devices work even when the cached access object is unavailable.
- Bell-hydration hotfix: the static bell is no longer treated as "already
  initialized." The notification runtime now hydrates it, attaches its click
  handler, loads unread notifications, and opens the notification panel.
- Account-approval controls now retry until the authenticated admin session is
  available, so pending requests remain approvable after slower page loads.
- Push registration now retries automatically after Dashboard auth is ready when
  notification permission is already granted, restoring the server-side device
  subscription needed for real account-request push notifications.
- Login-startup hotfix: shared PWA/account runtimes now wait until the document
  is parsed before loading, preventing Request Access from replacing the legacy
  signup form while login.html is still attaching startup listeners.
- Login event binding now tolerates an already-replaced legacy signup element,
  eliminating the "could not start secure sign in" startup failure.
- Auth-timing hotfix: the bell now retries while the Dashboard session and admin
  access state are still loading, and it also listens for the Dashboard auth-ready
- Static-bell reliability fix: the bell now exists directly in Dashboard/index.html
  and the existing verified admin permission check controls its visibility. The
  notification runtime hydrates the existing bell instead of being responsible
  for creating it, so web and Home Screen admin sessions always have the control.
  event. This fixes the iPhone Home Screen case where the first check could run
  before the admin role was available and permanently skip the bell.
- Keeps the admin notification bell visible at all times, including when the
  unread count is zero.
- The red badge remains hidden when there are no unread notifications and
  appears only when an unread count exists.
- The bell remains usable with an empty notification list, which displays
  "No notifications yet."
- Restricts the persistent notification control to administrator accounts.
- Uses the normal Dashboard account bar when available.
- Adds a safe fixed-position fallback so the bell still appears for admins in
  the installed iPhone Home Screen app if the account bar is not available at
  the moment the notification runtime initializes.
- Preserves the Version 0.10.6 notification center, account-request routing,
  mark-read behavior, realtime/polling refresh, and push notifications.

HOME SCREEN APP
===============
- Refreshes PWA/service-worker/cache references to Version 0.10.7 (bell timing hotfix cache).
- dashboard-pwa.js and dashboard-account-access.js are loaded with new 0.10.7
  cache-busting references so the installed Home Screen app receives the
  persistent bell behavior.
- No Supabase schema or Edge Function changes are required for this release.

FILES UPDATED
=============
Dashboard/index.html
Dashboard/login.html
Dashboard/dashboard-config.js
Dashboard/dashboard-account-access.js
Dashboard/dashboard-pwa.js
Dashboard/service-worker.js
Dashboard/manifest.webmanifest
Dashboard/README.txt

CHECKED / NO CHANGE NEEDED
==========================
Dashboard/projects.json
Dashboard/Documents/privacy.html
Dashboard/Documents/tos.html

TEST CHECKLIST
==============
1. Fully close and reopen the installed My Dashboard Home Screen app.
2. Confirm Version 0.10.7 is shown.
3. Sign in as an administrator.
4. Confirm the bell is visible even when there are zero unread notifications.
5. Open the bell with no unread notifications and confirm the notification
   center still opens normally.
6. Submit a new account request and confirm the red unread badge appears.
7. Mark/read the notification and confirm the badge disappears while the bell
   remains visible.
8. Confirm the same behavior in a normal browser session.

BRANDING
========
- logo-app.png: Personal Logo 2. Used for app/PWA identity, favicon, login,
  loading, and notifications.
- logo-dashboard.png: Personal Logo 1. Used for primary Dashboard/header
  branding.
- logo-professional.png: Professional DR logo. Used on formal/legal surfaces,
  including Privacy Policy and Terms of Service.
- dashboard-config.js applies the shared logo placement rules across Dashboard
  surfaces and version-busts the logo URLs for this release.
- manifest.webmanifest points installed app icons to the versioned app logo.
- service-worker.js uses the 0.10.7 cache and the app logo for notifications.
- The legacy logo.svg asset is removed because current Dashboard code no longer
  references it.

ACCOUNT ACCESS / ADMIN SYSTEM
=============================
- Version 0.10.0 introduced approval-only account creation.
- The Main Admin controls account approvals, declines, and administrator roles.
- Declined applicants can use a secure support conversation assigned to the
  admin who declined them.
- Support access uses a rolling 24-hour expiration from the most recent message
  sent by either participant.
- These behaviors remain preserved.

LEGAL PAGES
===========
- Documents/privacy.html and Documents/tos.html were checked for this release.
- Both continue to reference ../logo-professional.png for formal branding.
- No legal-text changes were required for this logo-only patch.

PROJECT REGISTRY
================
- projects.json was checked and does not require a change for this release.

FILES UPDATED
=============
Dashboard/dashboard-config.js
Dashboard/service-worker.js
Dashboard/manifest.webmanifest
Dashboard/README.txt
Dashboard/logo-app.png
Dashboard/logo-dashboard.png
Dashboard/logo-professional.png

FILE REMOVED
============
Dashboard/logo.svg

UNCHANGED BUT INCLUDED IN RELEASE ZIP
=====================================
Dashboard/index.html

TEST CHECKLIST
==============
1. Open My Dashboard in a normal browser tab and confirm Version 0.10.4 appears.
2. Confirm Personal Logo 1 appears with the main Dashboard header.
3. Open login and loading surfaces and confirm Personal Logo 2 is used.
4. Confirm the browser favicon and installed PWA/Home Screen icon use Personal
   Logo 2 after the app cache refreshes.
5. Send a test notification and confirm the Personal Logo 2 notification icon.
6. Open Documents/privacy.html and Documents/tos.html and confirm the
   Professional DR logo remains in place.
7. Confirm there are no remaining code references to legacy logo.svg.
8. Confirm account approval, decline, support messaging, Calendar, Projects,
   Streaming, Reviews, Budget, Files, and other existing Dashboard behavior are
   unchanged.


PROJECT CHANGELOG · 2026-09-18
==============================
NHL Analytics · Version 0.1.0: NHL Analytics Foundation & Data Insights

Introduces the NHL Analytics project with live current-day predictions from Game Results.json and historical performance analysis from All Results.json, including overall line accuracy, game history, MSE/Log Loss trends, team filters, and tracked betting-line performance, while keeping the NHL-Predictions workflow as the single source of truth.

- Added Dashboard/NHL-Analytics/index.html.
- Added Dashboard/NHL-Analytics/nhl-analytics.js.
- Added Dashboard/NHL-Analytics/README.txt.
- Dashboard/projects.json was checked; NHL Analytics was already registered and
  did not require a registry change.
- Documents/privacy.html and Documents/tos.html were checked; no legal-text
  change is required because this project reads existing public JSON output and
  adds no new user-data collection.
- My Dashboard remains Version 0.10.4. This project changelog entry alone does
  not increment the Dashboard version.


NHL Analytics metric clarification · 2026-09-18
- Changed the NHL Analytics Overview card from "Games Analyzed" to "Bets".
- The displayed value now uses totalLines, representing all tracked prediction
  lines instead of counting only games.
- NHL Analytics remains Version 0.1.0; My Dashboard remains Version 0.10.4.


PROJECT CHANGELOG · 2026-09-18
==============================
NHL Analytics · Version 0.2.0: Roster Simulation & Admin Model Diagnostics

Adds the existing NHL Shiny simulator directly inside NHL Analytics as Roster Simulation so users can build custom rosters and simulate matchups without leaving the Dashboard, while restricting MSE, Log Loss, team error summaries, and other Model Diagnostics to administrators through the existing Dashboard admin system.

- Added embedded Roster Simulation using the existing deployed NHL Shiny app.
- Renamed Model to Model Diagnostics and restricted it to administrators.
- Reused the existing Dashboard admin/authentication system; no new Supabase
  tables or permission model were added.
- Dashboard/projects.json was checked and does not require a change.
- Documents/privacy.html and Documents/tos.html were checked; no legal-text
  change is required because this release adds no new user-data collection.
- My Dashboard remains Version 0.10.4 because the Dashboard page itself only
  received this project changelog entry.
