/*
  Dashboard Dylan · Dashboard Entry Guard · Version 0.5.5
  Project Access Enforcement & Shared Auth Alignment · 2026-08-13

  Load dashboard-config.js first, then this file as early as possible in
  Dashboard/index.html <head>. This prevents the Dashboard's old embedded
  logged-out view from becoming the primary login experience.
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
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
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
    } catch (error) {
      console.error("Dashboard entry authentication:", error);
      redirectToLogin();
    }
  })();
})();
