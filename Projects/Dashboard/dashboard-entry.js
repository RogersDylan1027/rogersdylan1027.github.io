/*
  My Dashboard · Dashboard Entry Guard · Version 0.6.6
  TV Season & Episode Selection · 2026-08-14

  Load dashboard-config.js first, then this file as early as possible in
  Dashboard/index.html <head>. Logged-out visitors are sent to login.html.

  0.6.6 also loads the authenticated Streaming client and Settings integration
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
    return new Promise((resolve, reject) => {
      const started = Date.now();

      const timer = setInterval(() => {
        if (
          document.getElementById("settings-view") &&
          document.getElementById("changelog-view")
        ) {
          clearInterval(timer);
          resolve();
          return;
        }

        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error("Dashboard shell did not become ready."));
        }
      }, 100);
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

      const { data, error } = await client.auth.getUser();

      if (error || !data?.user) {
        redirectToLogin();
        return;
      }

      window.DashboardEntryAuth = {
        client,
        user: data.user
      };

      document.documentElement.style.removeProperty("visibility");

      // document.write() in the preserved Dashboard shell may happen after
      // this script returns. The timer intentionally survives and waits for
      // that final shell before attaching 0.6.6 Streaming UI.
      setTimeout(startStreamingRuntime, 0);
    } catch (error) {
      console.error("Dashboard entry authentication:", error);
      redirectToLogin();
    }
  })();
})();
