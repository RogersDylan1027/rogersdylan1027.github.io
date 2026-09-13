NEWS PROJECT

Current version
0.1.0

Version 0.1.0: TikTok-Style News Feed
Built the first working News project as a mobile-first vertical swipe feed. Stories load from a Supabase Edge Function, display publisher and publication age, support read-original, save, share, search, feed categories, feed-style settings, read-history filtering, and a caught-up stopping point.

Current experience
- Full-screen vertical swipe/scroll feed using CSS scroll snapping
- Live news supplied through the Supabase news-feed Edge Function
- Headline, short summary, source, category, and publication time on each card
- Read original story action
- Save and share actions
- Search the loaded feed by headline, source, summary, or topic text
- Categories: For You, U.S., World, Tech, Business, Sports, Entertainment, Science, Health, Apple, NHL
- Feed style setting: Personalized, Balanced, or Chronological
- Option to hide stories already seen
- Resettable local read history
- Caught-up card at the end of the current feed
- Dashboard authentication required through the shared Dashboard auth system

Current storage
Version 0.1.0 stores saved-story IDs, seen-story IDs, and News settings in localStorage on the current device. A future update can move these to Supabase for cross-device sync.

News backend
Supabase Edge Function: news-feed
The function fetches RSS feeds server-side so the browser/PWA does not depend on cross-origin RSS requests. Current feeds use Google News RSS topic/search feeds and return normalized story objects to the authenticated Dashboard client.

Future roadmap
- Following feed with explicit followed topics and sources
- Breaking, Local, Latest, Saved, and History top-level feed modes
- Cross-device saved stories and history through Supabase
- Better recommendation scoring based on saves, opens, dwell time, skips, and explicit feedback
- Mostly Personalized feed style
- Not interested / Less like this / Hide source / Follow topic actions
- Duplicate-story clustering across publishers
- Multi-source coverage cards for major stories
- Image/video enrichment where a reliable publisher-safe source is available
- Additional card types such as sports scores, live events, developing-story timelines, market updates, weather alerts, and explainers
- Gesture shortcuts for related coverage, save, and topic controls

Dashboard integration
Project id: news
Project name: News
Folder: News
Icon: 📰

Files
- index.html — News interface and vertical feed layout
- news.js — feed loading, ranking, filtering, save/share/history behavior
- README.txt — project notes and changelog

Status
Version 0.1.0 is built and pushed. The Dashboard project registry already contains News, so the News tile can open the working project.