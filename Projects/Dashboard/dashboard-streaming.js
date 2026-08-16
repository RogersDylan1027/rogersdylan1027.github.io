/*
  My Dashboard · Streaming Client · Version 0.6.11

  Load after dashboard-config.js and after the Dashboard's authenticated
  Supabase client is available.

  This file owns Dashboard-side streaming state. It intentionally does not
  contain a TMDB bearer token.
*/
(function () {
  "use strict";

  function getSupabaseClient() {
    return (
      window.DashboardEntryAuth?.client ||
      window.DashboardAuth?.client ||
      window.supabaseClient ||
      null
    );
  }

  function getCurrentUser() {
    return (
      window.DashboardEntryAuth?.user ||
      window.DashboardAuth?.user ||
      window.currentDashboardUser ||
      null
    );
  }

  function requireClient() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Streaming requires an authenticated Dashboard session.");
    }
    return client;
  }

  function isAdminUser(user = requireUser()) {
    const role =
      user?.app_metadata?.role ||
      user?.app_metadata?.dashboard_role ||
      user?.user_metadata?.role ||
      user?.user_metadata?.dashboard_role ||
      "";

    return String(role).toLowerCase() === "admin";
  }

  function requireUser() {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error("Streaming requires a signed-in Dashboard user.");
    }
    return user;
  }

  async function listProviders() {
    const client = requireClient();

    const { data, error } = await client
      .from("streaming_providers")
      .select(
        "id,slug,name,tmdb_provider_id,logo_path,supports_auth,supports_profiles,supports_dashboard_embed,supports_deep_link"
      )
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async function loadUserProviders() {
    const client = requireClient();
    const user = requireUser();

    const { data, error } = await client
      .from("user_streaming_providers")
      .select(
        "user_id,provider_id,enabled,connection_type,priority,provider_account_id,provider_profile_id,provider_profile_name,streaming_providers(id,slug,name,tmdb_provider_id,logo_path,supports_auth,supports_profiles,supports_dashboard_embed,supports_deep_link)"
      )
      .eq("user_id", user.id)
      .order("priority", { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data || [];
  }

  async function addProvider(providerId) {
    const client = requireClient();
    const user = requireUser();

    const current = await loadUserProviders();
    const priorities = current
      .filter((row) => row.enabled && Number.isInteger(row.priority))
      .map((row) => row.priority);

    const nextPriority = priorities.length ? Math.max(...priorities) + 1 : 1;

    const { data, error } = await client
      .from("user_streaming_providers")
      .upsert(
        {
          user_id: user.id,
          provider_id: providerId,
          enabled: true,
          connection_type: "added",
          priority: nextPriority,
        },
        { onConflict: "user_id,provider_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function removeProvider(providerId) {
    const client = requireClient();
    const user = requireUser();

    const { error } = await client
      .from("user_streaming_providers")
      .delete()
      .eq("user_id", user.id)
      .eq("provider_id", providerId);

    if (error) throw error;

    await normalizePriorities();
  }

  async function normalizePriorities() {
    const client = requireClient();
    const user = requireUser();
    const rows = await loadUserProviders();

    const enabled = rows.filter((row) => row.enabled);

    for (let index = 0; index < enabled.length; index += 1) {
      const desired = index + 1;
      if (enabled[index].priority === desired) continue;

      const { error } = await client
        .from("user_streaming_providers")
        .update({ priority: desired })
        .eq("user_id", user.id)
        .eq("provider_id", enabled[index].provider_id);

      if (error) throw error;
    }
  }

  async function savePriorityOrder(providerIds) {
    const client = requireClient();
    const user = requireUser();

    // Avoid unique-priority collisions while reordering.
    for (let index = 0; index < providerIds.length; index += 1) {
      const { error } = await client
        .from("user_streaming_providers")
        .update({ priority: 1000 + index })
        .eq("user_id", user.id)
        .eq("provider_id", providerIds[index]);

      if (error) throw error;
    }

    for (let index = 0; index < providerIds.length; index += 1) {
      const { error } = await client
        .from("user_streaming_providers")
        .update({ priority: index + 1 })
        .eq("user_id", user.id)
        .eq("provider_id", providerIds[index]);

      if (error) throw error;
    }

    return loadUserProviders();
  }

  async function loadPreferences() {
    const client = requireClient();
    const user = requireUser();

    const { data, error } = await client
      .from("streaming_preferences")
      .select(
        "user_id,region,prefer_dashboard_playback,provider_selection_mode,dashboard_playback_warning_acknowledged,dashboard_provider_priority,autoplay_next_episode,autoplay_next_seconds"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) return data;

    const defaults = {
      user_id: user.id,
      region: "US",
      prefer_dashboard_playback: true,
      provider_selection_mode: "priority",
      dashboard_playback_warning_acknowledged: false,
      dashboard_provider_priority: 1,
      autoplay_next_episode: true,
      autoplay_next_seconds: 30,
    };

    const { data: created, error: createError } = await client
      .from("streaming_preferences")
      .insert(defaults)
      .select()
      .single();

    if (createError) throw createError;
    return created;
  }

  async function savePreferences(changes) {
    const client = requireClient();
    const user = requireUser();

    const allowed = {};

    if ("region" in changes) {
      allowed.region = String(changes.region || "US").toUpperCase();
    }

    if ("prefer_dashboard_playback" in changes) {
      allowed.prefer_dashboard_playback =
        Boolean(changes.prefer_dashboard_playback);
    }

    if ("autoplay_next_episode" in changes) {
      allowed.autoplay_next_episode =
        Boolean(changes.autoplay_next_episode);
    }

    if ("autoplay_next_seconds" in changes) {
      allowed.autoplay_next_seconds =
        Math.max(
          0,
          Math.min(
            600,
            Number(changes.autoplay_next_seconds) || 30
          )
        );
    }

    if ("provider_selection_mode" in changes) {
      const mode = String(changes.provider_selection_mode);
      if (!["priority", "ask"].includes(mode)) {
        throw new Error("Invalid provider selection mode.");
      }
      allowed.provider_selection_mode = mode;
    }

    if ("dashboard_playback_warning_acknowledged" in changes) {
      allowed.dashboard_playback_warning_acknowledged =
        Boolean(changes.dashboard_playback_warning_acknowledged);
    }

    if ("dashboard_provider_priority" in changes) {
      const priority = Number(changes.dashboard_provider_priority);
      allowed.dashboard_provider_priority =
        Number.isInteger(priority) && priority > 0 ? priority : 1;
    }

    const { data, error } = await client
      .from("streaming_preferences")
      .upsert(
        { user_id: user.id, ...allowed },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function recordOpen({
    tmdbId,
    mediaType,
    providerId = null,
    seasonNumber = null,
    episodeNumber = null,
    playbackMethod = "deep_link",
  }) {
    const client = requireClient();

    const { error } = await client.rpc("record_streaming_open", {
      p_tmdb_id: Number(tmdbId),
      p_media_type: mediaType,
      p_provider_id: providerId,
      p_season_number: seasonNumber,
      p_episode_number: episodeNumber,
      p_playback_method: playbackMethod,
    });

    if (error) throw error;
  }

  async function loadTitleStates(limit = 500) {
    const client = requireClient();
    const user = requireUser();

    const { data, error } = await client
      .from("user_title_state")
      .select("*")
      .eq("user_id", user.id)
      .order("last_opened_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function loadAvailabilityEvents({
    eventType,
    region = "US",
    startDate = null,
    endDate = null,
    limit = 80,
  } = {}) {
    const client = requireClient();
    const type = String(eventType || "").trim();

    if (!["arriving", "leaving"].includes(type)) {
      throw new Error("Invalid availability event type.");
    }

    let query = client
      .from("provider_availability_events")
      .select("*")
      .eq("event_type", type)
      .eq("region", String(region || "US").toUpperCase())
      .order("effective_date", { ascending: true })
      .limit(limit);

    if (startDate) query = query.gte("effective_date", startDate);
    if (endDate) query = query.lte("effective_date", endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function loadContinueWatching(limit = 30) {
    const client = requireClient();
    const user = requireUser();

    const { data, error } = await client
      .from("user_title_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("in_continue_watching", true)
      .order("last_opened_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function setTitleReaction(tmdbId, mediaType, reaction) {
    const client = requireClient();
    const user = requireUser();

    const updates = {
      user_id: user.id,
      tmdb_id: Number(tmdbId),
      media_type: mediaType,
    };

    if (reaction === "like") {
      updates.liked = true;
      updates.disliked = false;
      updates.not_interested = false;
    } else if (reaction === "dislike") {
      updates.liked = false;
      updates.disliked = true;
    } else if (reaction === "not_interested") {
      updates.not_interested = true;
    } else if (reaction === "clear") {
      updates.liked = false;
      updates.disliked = false;
      updates.not_interested = false;
    } else {
      throw new Error("Unknown streaming reaction.");
    }

    const { data, error } = await client
      .from("user_title_state")
      .upsert(updates, { onConflict: "user_id,tmdb_id,media_type" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function setWatchlist(tmdbId, mediaType, inWatchlist) {
    const client = requireClient();
    const user = requireUser();

    const { data, error } = await client
      .from("user_title_state")
      .upsert(
        {
          user_id: user.id,
          tmdb_id: Number(tmdbId),
          media_type: mediaType,
          in_watchlist: Boolean(inWatchlist),
        },
        { onConflict: "user_id,tmdb_id,media_type" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function removeFromContinueWatching(tmdbId, mediaType) {
    const client = requireClient();
    const user = requireUser();

    const { error } = await client
      .from("user_title_state")
      .update({ in_continue_watching: false })
      .eq("user_id", user.id)
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType);

    if (error) throw error;
  }

  async function loadEpisodeProgress(tmdbShowId, seasonNumber, episodeNumber) {
    const client = requireClient();
    const user = requireUser();
    const { data, error } = await client
      .from("episode_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("tmdb_show_id", Number(tmdbShowId))
      .eq("season_number", Number(seasonNumber))
      .eq("episode_number", Number(episodeNumber))
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function loadLatestTvProgress(tmdbShowId) {
    const client = requireClient();
    const user = requireUser();
    const { data, error } = await client
      .from("episode_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("tmdb_show_id", Number(tmdbShowId))
      .neq("viewing_status", "watched")
      .order("last_opened_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function saveMovieProgress({ tmdbId, progressSeconds, durationSeconds, status = "watching" }) {
    const client = requireClient();
    const user = requireUser();
    const watched = status === "watched";
    const now = new Date().toISOString();
    const { error } = await client.from("user_title_state").upsert({
      user_id: user.id, tmdb_id: Number(tmdbId), media_type: "movie",
      viewing_status: watched ? "watched" : "watching",
      in_continue_watching: !watched, last_opened_at: now, watched_at: watched ? now : null
    }, { onConflict: "user_id,tmdb_id,media_type" });
    if (error) throw error;
    const { error: eventError } = await client.from("playback_events").insert({
      user_id: user.id, tmdb_id: Number(tmdbId), media_type: "movie",
      playback_method: "dashboard", event_type: watched ? "completed" : "paused",
      progress_seconds: Math.max(0, Math.round(Number(progressSeconds) || 0)),
      metadata: { duration_seconds: Math.max(0, Math.round(Number(durationSeconds) || 0)), resume_checkpoint: true }
    });
    if (eventError) throw eventError;
  }

  async function loadMovieResumeProgress(tmdbId) {
    const client = requireClient();
    const user = requireUser();
    const { data, error } = await client
      .from("playback_events")
      .select("progress_seconds,metadata,occurred_at,event_type")
      .eq("user_id", user.id).eq("tmdb_id", Number(tmdbId))
      .eq("media_type", "movie").eq("playback_method", "dashboard")
      .contains("metadata", { resume_checkpoint: true })
      .order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data || data.event_type === "completed") return null;
    return { progress_seconds: Number(data.progress_seconds) || 0, duration_seconds: Number(data.metadata?.duration_seconds) || 0 };
  }

  async function saveEpisodeProgress({ tmdbShowId, seasonNumber, episodeNumber, progressSeconds, durationSeconds, status = "watching" }) {
    const client = requireClient();
    const user = requireUser();
    const watched = status === "watched";
    const now = new Date().toISOString();
    const { error } = await client.from("episode_progress").upsert({
      user_id: user.id, tmdb_show_id: Number(tmdbShowId), season_number: Number(seasonNumber), episode_number: Number(episodeNumber),
      viewing_status: watched ? "watched" : "watching",
      progress_seconds: watched ? Math.max(0, Math.round(Number(durationSeconds) || 0)) : Math.max(0, Math.round(Number(progressSeconds) || 0)),
      duration_seconds: Math.max(0, Math.round(Number(durationSeconds) || 0)), last_opened_at: now, watched_at: watched ? now : null
    }, { onConflict: "user_id,tmdb_show_id,season_number,episode_number" });
    if (error) throw error;
    const { error: titleError } = await client.from("user_title_state").upsert({
      user_id: user.id, tmdb_id: Number(tmdbShowId), media_type: "tv", viewing_status: "watching", in_continue_watching: true, last_opened_at: now
    }, { onConflict: "user_id,tmdb_id,media_type" });
    if (titleError) throw titleError;
    const { error: eventError } = await client.from("playback_events").insert({
      user_id: user.id, tmdb_id: Number(tmdbShowId), media_type: "tv", season_number: Number(seasonNumber), episode_number: Number(episodeNumber),
      playback_method: "dashboard", event_type: watched ? "completed" : "paused",
      progress_seconds: Math.max(0, Math.round(Number(progressSeconds) || 0)),
      metadata: { duration_seconds: Math.max(0, Math.round(Number(durationSeconds) || 0)), resume_checkpoint: true }
    });
    if (eventError) throw eventError;
  }


  async function setTvWaitingState(
    tmdbShowId,
    {
      waiting,
      inContinueWatching,
      nextSeasonNumber,
      nextEpisodeNumber,
      nextEpisodeAirDate,
      lastCompletedSeasonNumber,
      lastCompletedEpisodeNumber,
      newEpisodeAvailable,
    } = {}
  ) {
    const client = requireClient();
    const user = requireUser();

    const updates = {
      user_id: user.id,
      tmdb_id: Number(tmdbShowId),
      media_type: "tv",
    };

    if (typeof waiting === "boolean") {
      updates.waiting_for_next_episode = waiting;
    }

    if (typeof inContinueWatching === "boolean") {
      updates.in_continue_watching = inContinueWatching;
      if (inContinueWatching) {
        updates.viewing_status = "watching";
      }
    }

    if (nextSeasonNumber !== undefined) {
      updates.next_episode_season_number =
        nextSeasonNumber == null ? null : Number(nextSeasonNumber);
    }

    if (nextEpisodeNumber !== undefined) {
      updates.next_episode_number =
        nextEpisodeNumber == null ? null : Number(nextEpisodeNumber);
    }

    if (nextEpisodeAirDate !== undefined) {
      updates.next_episode_air_date = nextEpisodeAirDate || null;
    }

    if (lastCompletedSeasonNumber !== undefined) {
      updates.last_completed_season_number =
        lastCompletedSeasonNumber == null
          ? null
          : Number(lastCompletedSeasonNumber);
    }

    if (lastCompletedEpisodeNumber !== undefined) {
      updates.last_completed_episode_number =
        lastCompletedEpisodeNumber == null
          ? null
          : Number(lastCompletedEpisodeNumber);
    }

    if (typeof newEpisodeAvailable === "boolean") {
      updates.new_episode_available =
        newEpisodeAvailable;
    }

    const { data, error } = await client
      .from("user_title_state")
      .upsert(
        updates,
        { onConflict: "user_id,tmdb_id,media_type" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function loadTitleState(tmdbId, mediaType) {
    const client = requireClient();
    const user = requireUser();
    const { data, error } = await client
      .from("user_title_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function saveProviderHierarchy(keys) {
    const ordered = Array.from(keys || []).map(String);
    const dashboardIndex = ordered.indexOf("dashboard");
    if (dashboardIndex >= 0) {
      await savePreferences({ dashboard_provider_priority: dashboardIndex + 1 });
    }

    const client = requireClient();
    const user = requireUser();
    const external = ordered.filter(key => key !== "dashboard");

    // Move rows temporarily to avoid unique-priority collisions.
    for (let index = 0; index < external.length; index += 1) {
      const { error } = await client
        .from("user_streaming_providers")
        .update({ priority: 1000 + index })
        .eq("user_id", user.id)
        .eq("provider_id", external[index]);
      if (error) throw error;
    }

    for (let index = 0; index < ordered.length; index += 1) {
      const key = ordered[index];
      if (key === "dashboard") continue;
      const { error } = await client
        .from("user_streaming_providers")
        .update({ priority: index + 1 })
        .eq("user_id", user.id)
        .eq("provider_id", key);
      if (error) throw error;
    }

    return Promise.all([loadUserProviders(), loadPreferences()]);
  }

  function getEdgeFunctionBase() {
    const supabaseUrl = window.DashboardConfig?.supabaseUrl;
    if (!supabaseUrl) throw new Error("DashboardConfig.supabaseUrl is missing.");
    return supabaseUrl.replace(/\/+$/, "") + "/functions/v1/tmdb-proxy";
  }

  async function tmdb(path, params = {}) {
    const client = requireClient();
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error("Dashboard session expired.");

    const url = new URL(getEdgeFunctionBase());
    url.searchParams.set("path", path);

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      url.searchParams.set(key, String(value));
    });

    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: window.DashboardConfig.supabasePublishableKey,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "TMDB request failed.");
    }

    return payload;
  }

  function normalizeProviderName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\+/g, " plus ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function providerNameAliases(provider) {
    const aliases = new Set([
      normalizeProviderName(provider?.name),
      normalizeProviderName(provider?.slug),
    ]);

    const slug = String(provider?.slug || "");

    if (slug === "disney-plus") aliases.add("disney plus");
    if (slug === "paramount-plus") aliases.add("paramount plus");
    if (slug === "prime-video") {
      aliases.add("amazon prime video");
      aliases.add("prime video");
    }
    if (slug === "apple-tv-plus") {
      aliases.add("apple tv plus");
      aliases.add("apple tv");
    }
    if (slug === "max") {
      aliases.add("max");
      aliases.add("hbo max");
    }
    if (slug === "peacock") {
      aliases.add("peacock");
      aliases.add("peacock premium");
    }

    return aliases;
  }

  async function resolveTmdbProviderIds(providerRows, region = "US") {
    const resolved = new Map();

    providerRows
      .filter((row) => row.enabled)
      .forEach((row) => {
        const id = row.streaming_providers?.tmdb_provider_id;
        if (Number.isInteger(id)) {
          resolved.set(String(row.provider_id), id);
        }
      });

    const missing = providerRows.filter(
      (row) => row.enabled && !resolved.has(String(row.provider_id))
    );

    if (!missing.length) {
      return Array.from(new Set(resolved.values()));
    }

    // Provider IDs are resolved from TMDB's current provider list instead of
    // being permanently hard-coded into the public Dashboard.
    const catalog = await tmdb("/watch/providers/movie", {
      watch_region: region,
    });

    const tmdbProviders = Array.isArray(catalog?.results)
      ? catalog.results
      : [];

    missing.forEach((row) => {
      const aliases = providerNameAliases(row.streaming_providers);

      const match = tmdbProviders.find((candidate) => {
        const candidateName = normalizeProviderName(candidate?.provider_name);

        return Array.from(aliases).some((alias) => {
          if (!alias || !candidateName) return false;
          return (
            candidateName === alias ||
            candidateName.startsWith(alias + " ") ||
            candidateName.includes(" " + alias + " ")
          );
        });
      });

      if (Number.isInteger(match?.provider_id)) {
        resolved.set(String(row.provider_id), match.provider_id);
      }
    });

    return Array.from(new Set(resolved.values()));
  }

  async function getAvailableProvidersForTitle(
    tmdbId,
    mediaType,
    region = "US"
  ) {
    const [availability, rows] =
      await Promise.all([
        tmdb(
          `/${mediaType}/${Number(tmdbId)}/watch/providers`
        ),
        loadUserProviders()
      ]);

    const regionData =
      availability?.results?.[
        String(region || "US").toUpperCase()
      ] || {};

    const tmdbProviders = [
      ...(regionData.flatrate || []),
      ...(regionData.free || []),
      ...(regionData.ads || []),
      ...(regionData.rent || []),
      ...(regionData.buy || []),
    ];

    const enabledIds =
      new Set(
        (rows || [])
          .filter(row => row.enabled !== false)
          .map(row =>
            Number(
              row.streaming_providers?.tmdb_provider_id ??
              row.tmdb_provider_id
            )
          )
          .filter(Number.isFinite)
      );

    const seen = new Set();

    return tmdbProviders.filter(provider => {
      const id = Number(provider.provider_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return enabledIds.has(id);
    });
  }

  async function getTitleDetails(tmdbId, mediaType) {
    const path =
      mediaType === "tv"
        ? `/tv/${Number(tmdbId)}`
        : `/movie/${Number(tmdbId)}`;

    return tmdb(path);
  }

  async function getWatchProviders(tmdbId, mediaType) {
    const path =
      mediaType === "tv"
        ? `/tv/${Number(tmdbId)}/watch/providers`
        : `/movie/${Number(tmdbId)}/watch/providers`;

    return tmdb(path);
  }

  async function getTvSeasonDetails(tmdbShowId, seasonNumber) {
    return tmdb(
      `/tv/${Number(tmdbShowId)}/season/${Number(seasonNumber)}`
    );
  }

  async function discoverCombined({ mediaType = "movie", page = 1 } = {}) {
    const [preferences, providers] = await Promise.all([
      loadPreferences(),
      loadUserProviders(),
    ]);

    const region = preferences.region || "US";
    const tmdbProviderIds = await resolveTmdbProviderIds(providers, region);

    if (!tmdbProviderIds.length) {
      return { page: 1, results: [], total_pages: 0, total_results: 0 };
    }

    const path = mediaType === "tv" ? "/discover/tv" : "/discover/movie";

    return tmdb(path, {
      watch_region: region,
      with_watch_providers: tmdbProviderIds.join("|"),
      with_watch_monetization_types: "flatrate",
      sort_by: "popularity.desc",
      page,
    });
  }

  window.DashboardStreaming = Object.freeze({
    getAvailableProvidersForTitle,
    isAdminUser,
    version: "0.6.11",
    listProviders,
    loadUserProviders,
    addProvider,
    removeProvider,
    savePriorityOrder,
    loadPreferences,
    savePreferences,
    recordOpen,
    loadTitleStates,
    loadAvailabilityEvents,
    loadContinueWatching,
    setTitleReaction,
    setWatchlist,
    removeFromContinueWatching,
    loadTitleState,
    saveProviderHierarchy,
    loadEpisodeProgress,
    loadLatestTvProgress,
    saveMovieProgress,
    loadMovieResumeProgress,
    saveEpisodeProgress,
    setTvWaitingState,
    tmdb,
    resolveTmdbProviderIds,
    getTitleDetails,
    getWatchProviders,
    getTvSeasonDetails,
    discoverCombined,
  });
})();
