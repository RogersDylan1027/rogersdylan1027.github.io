My Dashboard · Version 0.10.4
Approved Logo Assets & Placement Verification · 2026-09-16

CHANGELOG
=========
Version 0.10.4: Approved Logo Assets & Placement Verification

Description:
Replaces the temporary branding assets with the approved Personal Logo 2,
Personal Logo 1, and Professional DR files, verifies each logo is used on its
intended app, Dashboard, and legal surfaces, and refreshes versioned PWA/cache
references so installed Home Screen apps receive the corrected branding without
changing account approval or other Dashboard behavior.

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
- service-worker.js uses the 0.10.4 cache and the app logo for notifications.
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
- These behaviors are preserved unchanged in 0.10.4.

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
