My Dashboard · Version 0.6.7
Restored Player Fullscreen & Provider Deep Links · 2026-08-14

CHANGELOG
=========
Version: 0.6.7
Title: Restored Player Fullscreen & Provider Deep Links

Description:
Restores the embedded streaming player's normal fullscreen capability and removes the Dashboard-owned fullscreen replacement. Provider routing is now active: Provider Priority automatically opens the highest-priority enabled service carrying a title, Ask Every Time shows an enabled-provider chooser, and Change Provider always opens the chooser. Provider launches are recorded as Opened rather than Watched.

Playback Changes:
- Restores fullscreen permission and allowfullscreen to the embedded player.
- Removes the Dashboard-owned fullscreen button and custom fullscreen code.
- Keeps the Dashboard Playback safety notice.

Provider Deep Links:
- Provider Priority opens the highest-priority enabled provider carrying the title.
- Ask Every Time shows only enabled providers currently carrying the title.
- Change Provider always opens the chooser.
- Provider launches are recorded as Opened, not Watched.
- TV provider launches preserve the selected season and episode in history.
- Major providers use official provider search/deep-link pages for the title.

TV Selection:
- Season and episode dropdowns remain in place.
- Saved episode progress remains the default selection when available.
- Dashboard Playback still launches the exact selected episode.

No new SQL or Edge Function deployment is required for 0.6.7.
