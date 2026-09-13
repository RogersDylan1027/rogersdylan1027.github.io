NEWS PROJECT

Current version
0.2.0

Version 0.2.0: Short-Form Video News
News is now video-first instead of article-card-first. The feed aggregates recent video uploads from official publisher channels and presents them one full-screen clip at a time in a TikTok-style vertical feed. The active video plays automatically while the previous video pauses, with mobile-safe muted autoplay, publisher captions when available, play/pause controls, sound controls, playback progress, save/share/source actions, category feeds, seen-video history, and a caught-up stopping point.

Version 0.2.0 features
- Full-screen short-form video feed with vertical CSS scroll snapping
- Real publisher videos supplied through the Supabase news-feed Edge Function
- Current video autoplays and previous videos pause as the user swipes
- Videos start muted by default for reliable iPhone/PWA autoplay
- Tap the video area to pause or resume
- Mute/unmute control
- YouTube/publisher captions requested automatically when available
- Real playback progress bar using the YouTube IFrame Player API
- Publisher name, age, headline, and short context text overlaid on the video
- Save, share, and open-original-source actions
- For You, Latest, U.S., World, Tech, Business, Sports, and Entertainment feeds
- Seen-video tracking after the user remains on a video for several seconds
- Option to show or hide already-seen videos
- Resettable video history
- Caught-up card at the end of the current feed
- Dashboard authentication continues to use the shared Dashboard auth system

Video sources
Version 0.2.0 aggregates recent uploads from official news publisher YouTube feeds through Supabase. Initial sources include Associated Press, NBC News, ABC News, CBS News, BBC News, and CNN. The backend prioritizes uploads marked or described as Shorts when available, then fills the feed with the newest publisher videos so the feed remains populated.

Backend
Supabase Edge Function: news-feed
Version 2 of news-feed fetches publisher video feeds server-side, normalizes the video metadata, deduplicates video IDs, prioritizes short-form uploads, applies lightweight category matching, and returns authenticated video-feed data to the Dashboard.

Current storage
Saved video IDs, seen video IDs, mute preference, and News settings are stored in localStorage on the current device. A future News update can move this state to Supabase for cross-device synchronization.

Previous version
Version 0.1.0: TikTok-Style News Feed
The first News build used full-screen scrolling article cards with live RSS stories, short summaries, source links, save/share controls, categories, search, read-history filtering, and a caught-up marker. Version 0.2.0 replaces the primary article-card experience with short-form video playback.

Future roadmap
- Cross-device saved videos and history through Supabase
- Following feed for explicit publishers and topics
- Better personalized ranking based on watch time, rewatches, saves, skips, and explicit feedback
- Not interested / Less like this / Hide source / Follow topic actions
- More publisher video sources
- Local-news video sources
- Better category-specific source pools for sports, technology, business, and entertainment
- Duplicate-event clustering across multiple publisher videos
- Multi-source context cards for major developing stories
- Article fallback cards only when an important story has no usable video
- Optional Dashboard-generated short explainers for important stories without publisher clips

Dashboard integration
Project id: news
Project name: News
Folder: News
Icon: 📰

Files
- index.html — News 0.2.0 full-screen video interface
- news.js — video feed loading, YouTube playback, swipe behavior, progress, controls, history, and settings
- README.txt — News project notes and changelog

Status
Version 0.2.0 is built and pushed. The Dashboard project registry already contains News, and the Supabase news-feed Edge Function has been upgraded to version 2.