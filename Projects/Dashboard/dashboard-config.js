/*
  My Dashboard · Shared Configuration · Version 0.6.6
  TV Season & Episode Selection · 2026-08-14

  The Supabase publishable key is intentionally browser-safe.
  Never place a service_role key or another secret in browser JavaScript.
*/
(function () {
  "use strict";

  const BASE_PATH = "/Projects/Dashboard/";

  window.DashboardConfig = Object.freeze({
    version: "0.6.6",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json",
    streamingUrl: BASE_PATH + "Streaming/",
    streamingClientUrl: BASE_PATH + "dashboard-streaming.js?v=0.6.6",
    streamingUiUrl: BASE_PATH + "dashboard-streaming-ui.js?v=0.6.6"
  });

  // Keep shared pages visually aligned with the current Dashboard version
  // even when an older protected-page shell is still being used.
  function applyCurrentVersionLabel() {
    const version = window.DashboardConfig.version;

    if (/My Dashboard/.test(document.title)) {
      document.title = document.title.replace(/Version \d+\.\d+\.\d+/, "Version " + version);
    }

    const selectors = [
      ".version",
      ".account-summary",
      "#loader h1"
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (node.textContent) {
          node.textContent = node.textContent.replace(
            /Version \d+\.\d+\.\d+|My Dashboard \d+\.\d+\.\d+/g,
            match => match.startsWith("My Dashboard ")
              ? "My Dashboard " + version
              : "Version " + version
          );
        }
      });
    });
  }

  window.DashboardApplyCurrentVersionLabel = applyCurrentVersionLabel;

  document.addEventListener("DOMContentLoaded", () => {
    applyCurrentVersionLabel();
    setTimeout(applyCurrentVersionLabel, 250);
    setTimeout(applyCurrentVersionLabel, 1000);
  });
})();
