/*
  My Dashboard · Shared Configuration · Version 0.7.2
  Login Initialization & Auth Recovery · 2026-09-08

  The Supabase publishable key is intentionally browser-safe.
  Never place a service_role key or another secret in browser JavaScript.
*/
(function () {
  "use strict";

  const BASE_PATH = "/Projects/Dashboard/";

  window.DashboardConfig = Object.freeze({
    version: "0.7.2",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json",
    streamingUrl: BASE_PATH + "Streaming/",
    budgetUrl: BASE_PATH + "Budget/",
    streamingClientUrl: BASE_PATH + "dashboard-streaming.js?v=0.7.2",
    streamingUiUrl: BASE_PATH + "dashboard-streaming-ui.js?v=0.7.2"
  });

  function applyCurrentVersionLabel() {
    const version = window.DashboardConfig.version;

    if (/My Dashboard/.test(document.title)) {
      document.title = document.title.replace(
        /Version \d+\.\d+\.\d+/,
        "Version " + version
      );
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

  function injectCurrentChangelogEntry() {
    const body = document.getElementById("changelog-table-body");
    if (!body) return;

    const alreadyPresent = Array.from(body.querySelectorAll("tr")).some(row => {
      const versionCell = row.querySelector(".changelog-version, td");
      return versionCell?.textContent?.trim() === "0.7.2";
    });

    if (alreadyPresent) return;

    const row = document.createElement("tr");
    row.dataset.dashboardRuntimeRelease = "0.7.2";

    const version = document.createElement("td");
    version.className = "changelog-version";
    version.textContent = "0.7.2";

    const title = document.createElement("td");
    title.className = "changelog-title";
    title.textContent = "Login Initialization & Auth Recovery";

    const description = document.createElement("td");
    description.textContent =
      "Bug Fixes: Restores the centralized Login page when the Supabase browser " +
      "library does not initialize from its primary source. Login now uses a " +
      "pinned library version, retries from a fallback CDN, and shows a visible " +
      "startup error instead of leaving Sign In and account buttons inactive.";

    row.append(version, title, description);
    body.prepend(row);
  }

  function applyDashboard072Runtime() {
    applyCurrentVersionLabel();
    injectCurrentChangelogEntry();
  }

  window.DashboardApplyCurrentVersionLabel = applyCurrentVersionLabel;
  window.DashboardApplyCurrentRelease = applyDashboard072Runtime;

  document.addEventListener("DOMContentLoaded", () => {
    applyDashboard072Runtime();
    setTimeout(applyDashboard072Runtime, 250);
    setTimeout(applyDashboard072Runtime, 1000);
  });
})();
