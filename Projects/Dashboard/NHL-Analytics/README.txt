NHL ANALYTICS PROJECT

Current version
0.3.5

Version 0.2.0: Roster Simulation & Admin Model Diagnostics

Adds the existing NHL Shiny simulator directly inside NHL Analytics as the user-facing Roster Simulation view, keeping users inside the Dashboard while they build custom rosters and simulate matchups. Model Diagnostics is now restricted to administrators so MSE, Log Loss, team error summaries, and other technical model-development metrics remain available for model review without cluttering the regular-user experience.

Version 0.2.1: Prediction Card & Time Display Polish

Simplifies each current-game prediction card to the predicted winner and confidence only, converts stored New York start times into the viewer’s local time zone using 12-hour AM/PM formatting, and changes Goalies Confirmed to show confirmed goalies over all available goalie slots.

VERSION 0.2.1 CHANGES
=====================
- Prediction cards now show only the predicted winner and confidence percentage.
- Removed the raw outcome/model string from beneath the prediction headline.
- Game start times are converted from the stored America/New_York time into the
  viewer's browser time zone.
- Start times use 12-hour AM/PM formatting.
- Goalies Confirmed now displays confirmed goalies over total goalie slots.
- The denominator is total current games × 2.
- Existing Roster Simulation, Betting, Games, Overview, and admin-only Model
  Diagnostics behavior remain unchanged.

Version 0.3.0: Per-Game Player Predictions

Adds expandable player-level predictions to each current NHL matchup, using allHomePoints and allAwayPoints to show every player’s model value and point percentage in separate team sections sorted from highest probability to lowest, while preserving the compact game-card view until the user chooses to expand it.

VERSION 0.3.0 FEATURES
======================
- Adds View Player Predictions to every current-game card.
- Keeps the main game card compact until the user chooses to expand it.
- Reads player data directly from allHomePoints and allAwayPoints.
- Displays every stored player, not only players above the scorer threshold.
- Shows each player's model value and point percentage.
- Sorts each team's players from highest point percentage to lowest.
- Away-team and home-team player predictions always appear in separate sections
  on desktop, tablet, and mobile.
- Players present in homeScorers or awayScorers receive an Expected scorer badge
  when that scorer data is available.
- Preserves Roster Simulation, local-time game starts, goalie confirmation
  fractions, Betting, Games, Overview, and admin-only Model Diagnostics.

Version 0.3.1: GitHub Model Refresh Timing

Changes the Today view’s Last Refresh metric to reflect the newest model run written by the Start Day or Loop for Games GitHub Actions workflow, using timeLastRun from Game Results.json instead of the viewer’s browser refresh time, with local-time conversion and 12-hour formatting.

VERSION 0.3.1 CHANGES
=====================
- Last Refresh now reflects the newest timeLastRun stored in Game Results.json.
- timeLastRun is written by the Start Day and Loop for Games model workflows.
- Pressing the Dashboard Refresh button no longer changes Last Refresh unless
  the underlying prediction JSON was actually updated.
- The stored America/New_York model-run time is converted into the viewer's
  local time zone.
- Last Refresh uses 12-hour AM/PM formatting.
- All Version 0.3.0 player-prediction features remain unchanged.

Version 0.3.2: Model-Driven Selectable Betting Picks

Adds selectable model picks to each current NHL matchup while limiting every choice to predictions the program actually generated: the predicted team’s moneyline and only players the model expects to record a point, with selected picks summarized in the Betting view and no arbitrary sportsbook lines.

VERSION 0.3.2 FEATURES
======================
- Adds a Model Picks section to each current-game card.
- The only team selection offered is the team the model predicts to win, as a
  Moneyline pick.
- The only player selections offered are players present in homeScorers or
  awayScorers, meaning the model expects them to record a point.
- Players who merely appear in allHomePoints/allAwayPoints are not selectable
  unless they also cross the model's expected-point threshold.
- Selected model picks are summarized in the Betting view.
- Selections can be toggled on/off and are stored locally for the current day.
- No opposing team, arbitrary player, spread, total, or sportsbook-generated
  line is offered unless the prediction program itself generates it.
- This feature tracks model selections only; it does not place wagers or connect
  to a sportsbook.

Version 0.3.3: Betting Accuracy Breakdowns

Adds three Betting-page accuracy breakdowns—Moneyline Accuracy, Player Pick Accuracy, and Overall Accuracy—calculated from the model’s historical bettingLines and matching correctBettingLines results, while preserving Selected Model Picks and the detailed betting history.

VERSION 0.3.3 FEATURES
======================
- Adds Moneyline Accuracy to the Betting page.
- Adds Player Pick Accuracy for model-generated +1 Point selections.
- Adds Overall Accuracy across all scored model betting picks.
- Moneyline uses the first bettingLines entry for each game and its matching
  first correctBettingLines result.
- Player Pick Accuracy uses all bettingLines entries after the moneyline and
  their matching correctBettingLines results.
- Historical records without scored betting results are excluded from the
  accuracy denominators.
- Handles both single-value and array-shaped correctBettingLines records.
- Preserves Selected Model Picks and the detailed historical betting table.

Version 0.3.4: Last Model Run Time Formatting

Updates each Today game card’s Last Model Run display to use the same localized 12-hour AM/PM format as game start times, while keeping the underlying model-run timestamp sourced from Game Results.json.

VERSION 0.3.4 CHANGES
=====================
- Last Model Run now displays in 12-hour AM/PM format.
- The stored America/New_York time is converted into the viewer's local time
  zone before display.
- Uses the same time-formatting behavior as the game Start field.
- The timestamp source remains timeLastRun from Game Results.json.
- Version 0.3.3 Betting Accuracy Breakdowns remain unchanged.

Version 0.3.5: Prediction Label Cleanup

Simplifies current-game prediction labels by showing only player names in Expected Point Scorers and keeping Model Picks concise for both moneylines and player point selections, while leaving the detailed Player Predictions section unchanged.

VERSION 0.3.5 CHANGES
=====================
- Expected Point Scorers now displays only each player's name.
- Removes team/model-value/percentage text from the compact scorer chips.
- Model Picks now uses concise labels such as "FLA Moneyline" and
  "Sam Reinhart 1+ Point".
- Removes extra team tags, explanatory text, and percentages from Model Picks.
- Player Predictions remains unchanged and continues to show the detailed model
  value and point percentage for every player.
- No prediction logic, thresholds, or betting accuracy calculations changed.

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

