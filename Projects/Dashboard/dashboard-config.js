/*
  My Dashboard · Shared Configuration · Version 0.10.0
  Account Approval & Admin Messaging · 2026-09-16

  The Supabase publishable key is intentionally browser-safe.
  Never place a service_role key or another secret in browser JavaScript.
*/
(function () {
  "use strict";

  const BASE_PATH = "/Projects/Dashboard/";
  const supportMode =
    location.pathname.endsWith("/login.html") &&
    new URLSearchParams(location.search).has("support");

  function addAccountChooserPrompt(options = {}) {
    const queryParams = { ...(options.queryParams || {}) };
    const promptParts = String(queryParams.prompt || "").split(/\s+/).filter(Boolean);
    if (!promptParts.includes("select_account")) promptParts.push("select_account");
    queryParams.prompt = promptParts.join(" ");
    return { ...options, queryParams };
  }

  function patchSupabaseAuth(auth) {
    if (!auth || auth.__dashboardAccountChooserPolicy) return;
    const originalSignInWithOAuth = auth.signInWithOAuth?.bind(auth);
    const originalLinkIdentity = auth.linkIdentity?.bind(auth);
    const originalGetSession = auth.getSession?.bind(auth);
    const originalOnAuthStateChange = auth.onAuthStateChange?.bind(auth);

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

    if (supportMode && originalGetSession) {
      auth.getSession = async () => ({ data: { session: null }, error: null });
    }
    if (supportMode && originalOnAuthStateChange) {
      auth.onAuthStateChange = callback =>
        originalOnAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") callback(event, session);
          else callback(event, null);
        });
    }

    Object.defineProperty(auth, "__dashboardAccountChooserPolicy", {
      value: true, configurable: false, enumerable: false, writable: false
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
      value: true, configurable: false, enumerable: false, writable: false
    });
    return library;
  }

  if (window.supabase) patchSupabaseLibrary(window.supabase);
  else {
    let supabaseLibrary;
    Object.defineProperty(window, "supabase", {
      configurable: true, enumerable: true,
      get() { return supabaseLibrary; },
      set(value) { supabaseLibrary = patchSupabaseLibrary(value); }
    });
  }

  window.DashboardConfig = Object.freeze({
    version: "0.10.0",
    releaseTitle: "Account Approval & Admin Messaging",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json",
    manifestUrl: BASE_PATH + "manifest.webmanifest?v=0.10.0",
    serviceWorkerUrl: BASE_PATH + "service-worker.js?v=0.10.0",
    pwaRuntimeUrl: BASE_PATH + "dashboard-pwa.js?v=0.10.0",
    accountAccessRuntimeUrl: BASE_PATH + "dashboard-account-access.js?v=0.10.0",
    logoUrl: BASE_PATH + "logo.svg",
    streamingUrl: BASE_PATH + "Streaming/",
    reviewsUrl: BASE_PATH + "Reviews/",
    budgetUrl: BASE_PATH + "Budget/",
    streamingClientUrl: BASE_PATH + "dashboard-streaming.js?v=0.10.0",
    streamingUiUrl: BASE_PATH + "dashboard-streaming-ui.js?v=0.10.0"
  });

  function installRuntimeScript(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute(`data-${marker}`, "true");
    document.head.appendChild(script);
  }

  function installPwaHead() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = window.DashboardConfig.manifestUrl;
      document.head.appendChild(manifest);
    }

    [
      ["apple-mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-status-bar-style", "default"],
      ["apple-mobile-web-app-title", "My Dashboard"],
      ["mobile-web-app-capable", "yes"]
    ].forEach(([name, content]) => {
      if (document.querySelector(`meta[name="${name}"]`)) return;
      const meta = document.createElement("meta");
      meta.name = name; meta.content = content; document.head.appendChild(meta);
    });

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const icon = document.createElement("link");
      icon.rel = "apple-touch-icon";
      icon.href = window.DashboardConfig.logoUrl;
      document.head.appendChild(icon);
    }

    installRuntimeScript(window.DashboardConfig.pwaRuntimeUrl, "dashboard-pwa");
    installRuntimeScript(window.DashboardConfig.accountAccessRuntimeUrl, "dashboard-account-access");
  }

  function applyCurrentVersionLabel() {
    const version = window.DashboardConfig.version;
    if (/My Dashboard/.test(document.title)) {
      if (/Version \d+\.\d+\.\d+/.test(document.title)) {
        document.title = document.title.replace(/Version \d+\.\d+\.\d+/, "Version " + version);
      } else if (/Login/.test(document.title)) {
        document.title = `My Dashboard · Login · Version ${version}`;
      }
    }
    [".version", ".account-summary", "#loader h1"].forEach(selector => {
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
    if (Array.from(body.querySelectorAll("tr")).some(row =>
      row.querySelector(".changelog-version, td")?.textContent?.trim() === "0.10.0"
    )) return;

    const row = document.createElement("tr");
    row.dataset.dashboardRuntimeRelease = "0.10.0";
    const version = document.createElement("td");
    version.className = "changelog-version"; version.textContent = "0.10.0";
    const title = document.createElement("td");
    title.className = "changelog-title"; title.textContent = "Account Approval & Admin Messaging";
    const description = document.createElement("td");
    description.textContent =
      "Adds invite-only Dashboard account creation with Main Admin approval and decline controls, administrator role management, approval and decline emails through the configured Dashboard notification sender, secure declined-user support conversations assigned to the reviewing admin, rolling 24-hour support access after the most recent message, and administrator account-request notifications including PWA push support. Existing Dashboard users remain approved.";
    row.append(version, title, description);
    body.prepend(row);
  }

  function applyCurrentRelease() {
    applyCurrentVersionLabel();
    injectCurrentChangelogEntry();
  }

  window.DashboardApplyCurrentVersionLabel = applyCurrentVersionLabel;
  window.DashboardApplyCurrentRelease = applyCurrentRelease;

  installPwaHead();
  document.addEventListener("DOMContentLoaded", () => {
    applyCurrentRelease();
    setTimeout(applyCurrentRelease, 250);
    setTimeout(applyCurrentRelease, 1000);
  });
})();
