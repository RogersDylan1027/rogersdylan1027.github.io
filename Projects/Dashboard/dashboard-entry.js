/*
  My Dashboard · Dashboard Entry Guard · Version 0.7.0
  Dashboard Performance Optimization · 2026-08-23

  Load dashboard-config.js first, then this file as early as possible in
  Dashboard/index.html <head>. Logged-out visitors are sent to login.html.

  0.6.9 also loads the authenticated Streaming client and Settings integration
  after the legacy Dashboard shell has finished rendering.
*/
(function () {
  "use strict";

  const config = window.DashboardConfig;

  if (!config) {
    console.error("dashboard-entry.js requires dashboard-config.js.");
    return;
  }

  document.documentElement.style.visibility = "hidden";

  function redirectToLogin() {
    const loginUrl = new URL(config.loginUrl, window.location.origin);
    loginUrl.searchParams.set("returnTo", window.location.href);
    window.location.replace(loginUrl.href);
  }

  function loadSupabase() {
    if (window.supabase?.createClient) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = config.supabaseScriptUrl;
      script.async = true;
      script.dataset.dashboardSupabase = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function loadScriptOnce(src, marker) {
    if (document.querySelector(`script[data-dashboard-runtime="${marker}"]`)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.dashboardRuntime = marker;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function waitForDashboardShell(timeoutMs = 15000) {
    const ready = () =>
      document.getElementById("settings-view") &&
      document.getElementById("changelog-view");

    if (ready()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const finish = (error) => {
        observer?.disconnect();
        clearTimeout(timeout);
        error ? reject(error) : resolve();
      };
      const observer = window.MutationObserver
        ? new MutationObserver(() => { if (ready()) finish(); })
        : null;
      observer?.observe(document.documentElement, { childList: true, subtree: true });
      const timeout = setTimeout(() =>
        finish(new Error("Dashboard shell did not become ready.")),
        timeoutMs
      );
    });
  }

  async function startStreamingRuntime() {
    try {
      await waitForDashboardShell();

      window.DashboardApplyCurrentVersionLabel?.();

      await loadScriptOnce(
        config.streamingClientUrl,
        "streaming-client"
      );

      await loadScriptOnce(
        config.streamingUiUrl,
        "streaming-ui"
      );
    } catch (error) {
      console.warn("Streaming runtime:", error);
    }
  }

  (async function protectDashboard() {
    try {
      await loadSupabase();

      const client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

      // Expose the shared client immediately so the flattened Dashboard shell
      // can reuse it instead of creating a second Supabase client.
      window.DashboardEntryAuth = {
        client,
        user: null
      };

      const { data, error } = await client.auth.getUser();

      if (error || !data?.user) {
        redirectToLogin();
        return;
      }

      window.DashboardEntryAuth.user = data.user;

      document.documentElement.style.removeProperty("visibility");

      // The Dashboard shell is now static, so attach the Streaming runtime
      // as soon as the parsed Settings/Changelog shell is available.
      setTimeout(startStreamingRuntime, 0);
    } catch (error) {
      console.error("Dashboard entry authentication:", error);
      redirectToLogin();
    }
  })();
})();
