/*
  My Dashboard · Shared Configuration · Version 0.9.0
  Reviews Library & Streaming Review Queue · 2026-09-12

  The Supabase publishable key is intentionally browser-safe.
  Never place a service_role key or another secret in browser JavaScript.
*/
(function () {
  "use strict";

  const BASE_PATH = "/Projects/Dashboard/";

  window.DashboardConfig = Object.freeze({
    version: "0.9.0",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json",
    manifestUrl: BASE_PATH + "manifest.webmanifest?v=0.9.0",
    serviceWorkerUrl: BASE_PATH + "service-worker.js?v=0.9.0",
    pwaRuntimeUrl: BASE_PATH + "dashboard-pwa.js?v=0.9.0",
    logoUrl: BASE_PATH + "logo.svg",
    streamingUrl: BASE_PATH + "Streaming/",
    reviewsUrl: BASE_PATH + "Reviews/",
    budgetUrl: BASE_PATH + "Budget/",
    streamingClientUrl: BASE_PATH + "dashboard-streaming.js?v=0.9.0",
    streamingUiUrl: BASE_PATH + "dashboard-streaming-ui.js?v=0.9.0"
  });

  function installPwaHead() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = window.DashboardConfig.manifestUrl;
      document.head.appendChild(manifest);
    }

    const metas = [
      ["apple-mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-status-bar-style", "default"],
      ["apple-mobile-web-app-title", "My Dashboard"],
      ["mobile-web-app-capable", "yes"]
    ];

    metas.forEach(([name, content]) => {
      if (document.querySelector(`meta[name="${name}"]`)) return;
      const meta = document.createElement("meta");
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    });

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const icon = document.createElement("link");
      icon.rel = "apple-touch-icon";
      icon.href = window.DashboardConfig.logoUrl;
      document.head.appendChild(icon);
    }

    if (!document.querySelector('script[data-dashboard-pwa]')) {
      const script = document.createElement("script");
      script.src = window.DashboardConfig.pwaRuntimeUrl;
      script.async = false;
      script.dataset.dashboardPwa = "true";
      document.head.appendChild(script);
    }
  }

  function applyCurrentVersionLabel() {
    const version = window.DashboardConfig.version;

    if (/My Dashboard/.test(document.title)) {
      document.title = document.title.replace(
        /Version \d+\.\d+\.\d+/,
        "Version " + version
      );
    }

    const selectors = [".version", ".account-summary", "#loader h1"];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (!node.textContent) return;
        node.textContent = node.textContent.replace(
          /Version \d+\.\d+\.\d+|My Dashboard \d+\.\d+\.\d+/g,
          match => match.startsWith("My Dashboard ")
            ? "My Dashboard " + version
            : "Version " + version
        );
      });
    });
  }

  function injectCurrentChangelogEntry() {
    const body = document.getElementById("changelog-table-body");
    if (!body) return;

    const alreadyPresent = Array.from(body.querySelectorAll("tr")).some(row => {
      const versionCell = row.querySelector(".changelog-version, td");
      return versionCell?.textContent?.trim() === "0.9.0";
    });
    if (alreadyPresent) return;

    const row = document.createElement("tr");
    row.dataset.dashboardRuntimeRelease = "0.9.0";

    const version = document.createElement("td");
    version.className = "changelog-version";
    version.textContent = "0.9.0";

    const title = document.createElement("td");
    title.className = "changelog-title";
    title.textContent = "Reviews Library & Streaming Review Queue";

    const description = document.createElement("td");
    description.textContent =
      "Introduces the Reviews project with automatic movie, TV, and book metadata, " +
      "poster and cover artwork, and a personal review library backed by Supabase. " +
      "Finished Streaming movies and completed TV seasons automatically appear in a " +
      "review queue, while season reviews remain grouped under their parent show. " +
      "Review data is private to each signed-in user and the original Google Form " +
      "questions are retained as the opinion-focused review fields.";

    row.append(version, title, description);
    body.prepend(row);
  }

  function applyDashboard090Runtime() {
    applyCurrentVersionLabel();
    injectCurrentChangelogEntry();
  }

  window.DashboardApplyCurrentVersionLabel = applyCurrentVersionLabel;
  window.DashboardApplyCurrentRelease = applyDashboard090Runtime;

  installPwaHead();

  document.addEventListener("DOMContentLoaded", () => {
    applyDashboard090Runtime();
    setTimeout(applyDashboard090Runtime, 250);
    setTimeout(applyDashboard090Runtime, 1000);
  });
})();
