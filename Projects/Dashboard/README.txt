My Dashboard · Version 0.10.3
Final Logo Asset Alignment · 2026-09-16

CHANGELOG
=========
Version 0.10.3: Final Logo Asset Alignment

Description:
Finalizes the approved logo set across My Dashboard by keeping Personal Logo 2
as the app/PWA, favicon, login, loading, and notification mark; Personal Logo 1
as the primary Dashboard/header identity; and the Professional DR mark on
formal legal surfaces. Versioned logo URLs and PWA assets are refreshed so
installed Home Screen apps pick up the finalized branding without changing the
0.10 account-approval workflow or other Dashboard behavior.

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
- service-worker.js uses the 0.10.3 cache and the app logo for notifications.

ACCOUNT ACCESS / ADMIN SYSTEM
=============================
- Version 0.10.0 introduced approval-only account creation.
- The Main Admin controls account approvals, declines, and administrator roles.
- Declined applicants can use a secure support conversation assigned to the
  admin who declined them.
- Support access uses a rolling 24-hour expiration from the most recent message
  sent by either participant.
- These behaviors are preserved unchanged in 0.10.3.

LEGAL PAGES
===========
- Documents/privacy.html and Documents/tos.html were checked for this release.
- Both continue to use the Professional DR logo for formal branding.
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

BRAND ASSETS USED
=================
Dashboard/logo-app.png
Dashboard/logo-dashboard.png
Dashboard/logo-professional.png

UNCHANGED BUT INCLUDED IN RELEASE ZIP
=====================================
Dashboard/index.html

TEST CHECKLIST
==============
1. Open My Dashboard in a normal browser tab and confirm Version 0.10.3 appears.
2. Confirm Personal Logo 1 appears with the main Dashboard header.
3. Open login and loading surfaces and confirm Personal Logo 2 is used.
4. Confirm the browser favicon and installed PWA/Home Screen icon use Personal
   Logo 2 after the app cache refreshes.
5. Send a test notification and confirm the Personal Logo 2 notification icon.
6. Open Documents/privacy.html and Documents/tos.html and confirm the
   Professional DR logo remains in place.
7. Confirm account approval, decline, support messaging, Calendar, Projects,
   Streaming, Reviews, Budget, Files, and other existing Dashboard behavior are
   unchanged.
