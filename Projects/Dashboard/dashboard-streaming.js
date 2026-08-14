/*
  Dashboard Dylan · Streaming Client · Phase 1

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
        "user_id,region,prefer_dashboard_playback,provider_selection_mode"
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

    if ("provider_selection_mode" in changes) {
      const mode = String(changes.provider_selection_mode);
      if (!["priority", "ask"].includes(mode)) {
        throw new Error("Invalid provider selection mode.");
      }
      allowed.provider_selection_mode = mode;
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
    listProviders,
    loadUserProviders,
    addProvider,
    removeProvider,
    savePriorityOrder,
    loadPreferences,
    savePreferences,
    recordOpen,
    loadContinueWatching,
    setTitleReaction,
    setWatchlist,
    removeFromContinueWatching,
    tmdb,
    resolveTmdbProviderIds,
    getTitleDetails,
    getWatchProviders,
    discoverCombined,
  });
})();
