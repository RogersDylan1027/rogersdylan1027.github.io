My Dashboard · Version 0.7.1
Budget Project Integration · 2026-08-25

CHANGELOG
=========
Version 0.7.1: Budget Project Integration

Description:
Adds Budget to My Dashboard as a protected project in the Projects Hub. Budget
keeps its own Version 0.2.8 release line while using the shared Dashboard
session and project-access controls, and projects.json remains the single
project catalog.

BUDGET INTEGRATION
==================
- Adds Budget to Dashboard/projects.json with project id "budget" and folder
  "Budget".
- Adds Dashboard/Budget/index.html while keeping Budget at Version 0.2.8.
- Protects direct Budget URLs with the existing shared Dashboard authentication
  and project-access guard.
- Uses data-dashboard-project="budget", so the existing Everyone / Admins Only /
  Specific Groups project-access system can manage Budget.
- Preserves Budget's existing localStorage data model. This release does not
  migrate Budget data into Supabase.

DASHBOARD 0.7.0 ARCHITECTURE PRESERVED
======================================
Dashboard/index.html from Version 0.7.0 stays exactly as it is. Version 0.7.0
flattened the Dashboard into a static optimized page and removed the old
raw.githubusercontent.com runtime loader. This update does not restore that
older loader or rebuild the optimized page.

The Dashboard 0.7.1 version label and changelog entry are applied by the shared
dashboard-config.js after the existing static Dashboard renders. The Budget
project tile itself is loaded from projects.json, so no structural edit to
Dashboard/index.html is required.

IMPORTANT
=========
Do NOT replace Dashboard/index.html with an older 0.6.18 copy. Keep the current
0.7.0 optimized Dashboard/index.html that is already in the repository.

SUPABASE / EXTERNAL SERVICES
============================
No Supabase schema, Google Cloud, Microsoft Entra, or Edge Function changes are
required. This update reuses the existing Dashboard authentication and project-
access system.

FILES TO REPLACE / ADD
======================
Replace:
Dashboard/dashboard-config.js
Dashboard/projects.json
Dashboard/README.txt

Add:
Dashboard/Budget/index.html

Leave unchanged:
Dashboard/index.html
Dashboard/dashboard-entry.js
Dashboard/dashboard-auth.js
Dashboard/dashboard-streaming.js
Dashboard/dashboard-streaming-ui.js
Dashboard/login.html
Dashboard/Streaming/index.html
