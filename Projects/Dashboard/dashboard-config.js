/*
  My Dashboard · Shared Configuration · Version 0.9.1
  Connected Account Recovery & Account Selection · 2026-09-16

  The Supabase publishable key is intentionally browser-safe.
  Never place a service_role key or another secret in browser JavaScript.
*/
(function () {
  "use strict";

  const BASE_PATH = "/Projects/Dashboard/";

  function addAccountChooserPrompt(options = {}) {
    const queryParams = { ...(options.queryParams || {}) };
    const promptParts = String(queryParams.prompt || "")
      .split(/\s+/)
      .filter(Boolean);

    if (!promptParts.includes("select_account")) {
      promptParts.push("select_account");
    }

    queryParams.prompt = promptParts.join(" ");
    return { ...options, queryParams };
  }

  function patchSupabaseAuth(auth) {
    if (!auth || auth.__dashboardAccountChooserPolicy) return;

    const originalSignInWithOAuth = auth.signInWithOAuth?.bind(auth);
    const originalLinkIdentity = auth.linkIdentity?.bind(auth);

    if (originalSignInWithOAuth) {
      auth.signInWithOAuth = (credentials = {}) =>
        originalSignInWithOAuth({
          ...credentials,
          options: addAccountChooserPrompt(credentials.options)
        });
    }

    if (originalLinkIdentity) {
      auth.linkIdentity = (credentials = {}) =>
        originalLinkIdentity({
          ...credentials,
          options: addAccountChooserPrompt(credentials.options)
        });
    }

    Object.defineProperty(auth, "__dashboardAccountChooserPolicy", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  function patchSupabaseLibrary(library) {
    if (!library?.createClient || library.__dashboardOAuthPolicy) return library;

    const originalCreateClient = library.createClient.bind(library);
    library.createClient = function (...args) {
      const client = originalCreateClient(...args);
      patchSupabaseAuth(client?.auth);
      return client;
    };

    Object.defineProperty(library, "__dashboardOAuthPolicy", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });

    return library;
  }

  if (window.supabase) {
    patchSupabaseLibrary(window.supabase);
  } else {
    let supabaseLibrary;
    Object.defineProperty(window, "supabase", {
      configurable: true,
      enumerable: true,
      get() {
        return supabaseLibrary;
      },
      set(value) {
        supabaseLibrary = patchSupabaseLibrary(value);
      }
    });
  }

  window.DashboardConfig = Object.freeze({
    version: "0.9.1",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json",
    manifestUrl: BASE_PATH + "manifest.webmanifest?v=0.9.1",
    serviceWorkerUrl: BASE_PATH + "service-worker.js?v=0.9.1",
    pwaRuntimeUrl: BASE_PATH + "dashboard-pwa.js?v=0.9.1",
    logoUrl: BASE_PATH + "logo.svg",
    streamingUrl: BASE_PATH + "Streaming/",
    reviewsUrl: BASE_PATH + "Reviews/",
    budgetUrl: BASE_PATH + "Budget/",
    streamingClientUrl: BASE_PATH + "dashboard-streaming.js?v=0.9.1",
    streamingUiUrl: BASE_PATH + "dashboard-streaming-ui.js?v=0.9.1"
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
      return versionCell?.textContent?.trim() === "0.9.1";
    });
    if (alreadyPresent) return;

    const row = document.createElement("tr");
    row.dataset.dashboardRuntimeRelease = "0.9.1";

    const version = document.createElement("td");
    version.className = "changelog-version";
    version.textContent = "0.9.1";

    const title = document.createElement("td");
    title.className = "changelog-title";
    title.textContent = "Connected Account Recovery & Account Selection";

    const description = document.createElement("td");
    description.textContent =
      "Adds a Refresh Connected Accounts action in Settings to reload saved Google and Microsoft connections, re-fetch available account data, and repopulate Calendar-related account state after cache clears or stale sessions. OAuth account connections now request explicit account selection where supported so linking Google, Microsoft, and future providers is less likely to auto-sign into the wrong account. Also refreshes the PWA cache path so Home Screen installs pick up the corrected authentication files.";

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
