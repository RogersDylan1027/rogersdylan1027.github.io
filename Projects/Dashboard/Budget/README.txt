Budget · Version 0.6.5
Odometer-Only MPG Calculation · 2026-10-03

OVERVIEW
========
Budget is a My Dashboard project for managing income, expenses, multiple budgets,
Monthly Expenses purchases, paycheck estimates, and Car fuel costs.

CAR / GAS
=========
- Gas Calculator remains available for distance, MPG, fuel price, tank size,
  and oil-change estimates.
- Gas Fill-Up History stores a receipt date plus any 2 of total cost, gallons,
  or price per gallon; Budget calculates the missing third value.
- Fill-Up Date is editable so a receipt can be entered later using the actual
  purchase date.
- Odometer is optional. Users may enter it on any fill-up and skip it on others.
- When at least two usable odometer checkpoints exist, Budget estimates MPG by
  subtracting consecutive checkpoint odometers and dividing by the gallons on
  the later odometer-linked fill-up only.
- Fill-ups without odometer readings do not contribute gallons to MPG.
- Multiple valid odometer segments are combined using total miles / total
  odometer-linked gallons rather than averaging displayed MPG values.
- Average Gas Cost is a managed expense: it is created when missing and updated
  in place when it already exists.

SYNC / STORAGE
==============
- localStorage remains the immediate device cache.
- The complete Budget state syncs to public.budget_sync_state_v1 for the
  authenticated Dashboard user.
- Version 0.6.3 adds odometer values inside the existing JSON Budget state.
- No Supabase schema migration is required for 0.6.3.

FILES
=====
- index.html — Budget interface and calculations.
- budget-supabase.js — cross-device Supabase state synchronization.
- CHANGELOG.txt — Budget release history.
- README.txt — project behavior and maintenance notes.

PRIVACY / TERMS CHECK
=====================
Documents/privacy.html and Documents/tos.html were checked for this feature.
No legal-text change is required because 0.6.3 only adds an optional odometer
value to the existing private per-account Budget state and introduces no new
external service or data-sharing behavior.

CHANGELOG
=========
Version 0.6.3: Estimated MPG Tracking

Adds optional odometer readings to Car fill-ups and calculates an estimated MPG
from valid odometer checkpoints while still allowing users to skip odometer
entry on any fill-up.


CHANGELOG
=========
Version 0.6.4: Main Budget Layout Refinement

Moves Budgets Included in Main above Budget Items so the Main Budget's included
sources are visible before the item list. No calculations, sync behavior, or
data model changed.


LAYOUT · 0.6.4
==============
On the Budget page, Budgets Included in Main now appears above Budget Items.
This is a presentation-only reorder; existing budget calculations and controls
are unchanged.


CHANGELOG
=========
Version 0.6.5: Odometer-Only MPG Calculation

Corrects Estimated MPG so only fill-ups that include odometer readings
participate in the MPG calculation. Non-odometer fill-ups still count toward
the normal gas-cost and price averages.
