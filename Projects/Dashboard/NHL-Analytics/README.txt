NHL ANALYTICS PROJECT

Current version
0.2.0

Version 0.2.0: Roster Simulation & Admin Model Diagnostics

Adds the existing NHL Shiny simulator directly inside NHL Analytics as the user-facing Roster Simulation view, keeping users inside the Dashboard while they build custom rosters and simulate matchups. Model Diagnostics is now restricted to administrators so MSE, Log Loss, team error summaries, and other technical model-development metrics remain available for model review without cluttering the regular-user experience.

PURPOSE
=======
NHL Analytics is the Dashboard visualization and analysis layer for the existing
RogersDylan1027/NHL-Predictions project.

The NHL-Predictions repository remains responsible for generating predictions.
This Dashboard project reads the finished JSON outputs and does not duplicate or
recalculate the prediction model.

DATA SOURCES
============
Historical source:
- /All Results.json
- Canonical historical dataset.
- Each stored day contains a date and a games array.
- Used for completed-game analytics, line accuracy, MSE, Log Loss, team
  summaries, and betting analytics.

Current-day source:
- /Game Results.json
- Used for today's/current prediction cards.
- Shows matchup, predicted outcome, starting goalies, expected point scorers,
  betting lines, start time, and the model's most recent run time.

Not used:
- /All Results2.json
- This was a troubleshooting copy and is intentionally not used by NHL
  Analytics 0.1.0.

VERSION 0.1.0 FEATURES
======================
Overview
- Overall correct-line accuracy.
- Total bets/prediction lines tracked.
- Number of historical prediction days.
- Seven-day and 30-day accuracy windows based on the most recent stored date.
- Daily accuracy trend chart.
- Recent completed-game table.

Today
- Current games from Game Results.json.
- Predicted winner and parsed win percentage when available.
- Starting goalies.
- Expected point scorers.
- Betting selections.
- Start time and timeLastRun.
- Expected difference from the model outcome string.

Games
- Historical game table.
- Search across teams, goalies, outcome text, scorers, and betting lines.
- Team filter.
- Start-date and end-date filters.
- Incremental rendering for larger history files.

Model
- Average Mean Squared Error.
- Average Log Loss.
- Overall line accuracy.
- Daily MSE and Log Loss trend chart.
- Team-level MSE, Log Loss, games, and line-accuracy summaries.

Betting
- Games containing betting data.
- Recorded betting selections.
- Sum of correctBettingLines.
- Parsed betting-pick accuracy where a pick count can be derived.
- Historical betting table.

DATA NORMALIZATION
==================
Historical NHL data has changed over time. Version 0.1.0 is intentionally
defensive about schema differences:
- homeScorers and awayScorers can be arrays, strings, or empty objects.
- homeGoalie and awayGoalie can be strings or empty objects.
- MSE, Log Loss, bettingLines, and correctBettingLines may be missing from older
  games.
- Missing optional fields are displayed as unavailable instead of causing the
  page to fail.

AUTHENTICATION
==============
- Uses the shared Dashboard authentication guard.
- Project id: nhl-analytics.
- Existing Dashboard visibility/admin rules remain authoritative.
- No NHL-specific Supabase tables are introduced in version 0.1.0.

DASHBOARD INTEGRATION
=====================
Project id: nhl-analytics
Project name: NHL Analytics
Folder: NHL-Analytics
Icon: 🏒

Dashboard/projects.json already contained this project before the 0.1.0 build,
so the project registry did not require a change.

FILES
=====
- index.html — NHL Analytics 0.1.0 interface and responsive styling.
- nhl-analytics.js — JSON loading, normalization, filtering, analytics, charts,
  tables, and current-day rendering.
- README.txt — project architecture, data-source notes, feature list, and
  changelog.

PRIVACY / TERMS CHECK
=====================
Documents/privacy.html and Documents/tos.html do not require a change for this
release. NHL Analytics 0.1.0 reads existing public JSON model outputs and adds no
new user-data collection or NHL-specific database storage.

FUTURE ROADMAP
==============
- Additional player-specific analytics using allHomePoints/allAwayPoints.
- More detailed prediction-type accuracy when historical output exposes a
  reliable per-line type/result structure.
- Season selector when multiple complete seasons are stored.
- Deeper team matchup comparisons.
- Additional visualizations and export options.
- Database-backed analytics only if the JSON history becomes too large for
  practical browser-side analysis.


Dashboard label clarification · 2026-09-18
- The Overview metric previously labeled "Games Analyzed" now displays "Bets".
- Its value is the sum of totalLines across historical results, so it represents
  the number of tracked prediction lines rather than the number of games.


VERSION 0.2.0 FEATURES
======================
Roster Simulation
- Adds a new Roster Simulation tab for all approved NHL Analytics users.
- Embeds the existing deployed NHL Game Simulator directly in NHL Analytics.
- Users remain inside the Dashboard while using the Shiny app.
- Uses responsive iframe sizing for desktop, iPhone, PWA, and app-shell use.
- Shows an in-page loading state while the Shiny session starts.

Admin Model Diagnostics
- Renames the former Model view to Model Diagnostics.
- Restricts the Model Diagnostics navigation tab and view to administrators.
- Uses the Dashboard's existing authenticated admin state, with the existing
  is_admin RPC as a fallback.
- Regular users do not render the MSE, Log Loss, or team model-error panels.
- Direct navigation to #model falls back to Overview for non-admin users.

Regular-user navigation
Overview | Today | Games | Betting | Roster Simulation

Admin navigation
Overview | Today | Games | Betting | Roster Simulation | Model Diagnostics

