/*
  Dashboard Dylan · Shared Configuration · Version 0.5.5
  Project Access Enforcement & Shared Auth Alignment · 2026-08-13

  The Supabase publishable key is intentionally browser-safe.
  Never place a service_role key or another secret in browser JavaScript.
*/
(function () {
  "use strict";

  const BASE_PATH = "/Projects/Dashboard/";

  window.DashboardConfig = Object.freeze({
    version: "0.5.5",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json"
  });
})();
