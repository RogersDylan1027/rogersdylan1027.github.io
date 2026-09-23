/*
  My Dashboard · Shared Configuration · Version 0.10.6
  Reliable Admin Notifications & Notification Center · 2026-09-23

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
    version: "0.10.6",
    releaseTitle: "Reliable Admin Notifications & Notification Center",
    supabaseUrl: "https://pyefiovoicvhigkjhhts.supabase.co",
    supabasePublishableKey: "sb_publishable_sVrxppe8B1QkXYqAPm6ddQ_x4MA5j32",
    supabaseScriptUrl: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js",
    dashboardUrl: BASE_PATH,
    dashboardIndexUrl: BASE_PATH + "index.html",
    loginUrl: BASE_PATH + "login.html",
    projectsUrl: BASE_PATH + "projects.json",
    manifestUrl: BASE_PATH + "manifest.webmanifest?v=0.10.6",
    serviceWorkerUrl: BASE_PATH + "service-worker.js?v=0.10.6",
    pwaRuntimeUrl: BASE_PATH + "dashboard-pwa.js?v=0.10.6",
    accountAccessRuntimeUrl: BASE_PATH + "dashboard-account-access.js?v=0.10.6",
    logoUrl: BASE_PATH + "logo-app.png?v=0.10.6",
    appLogoUrl: BASE_PATH + "logo-app.png?v=0.10.6",
    dashboardLogoUrl: BASE_PATH + "logo-dashboard.png?v=0.10.6",
    professionalLogoUrl: BASE_PATH + "logo-professional.png?v=0.10.6",
    streamingUrl: BASE_PATH + "Streaming/",
    reviewsUrl: BASE_PATH + "Reviews/",
    budgetUrl: BASE_PATH + "Budget/",
    streamingClientUrl: BASE_PATH + "dashboard-streaming.js?v=0.10.6",
    streamingUiUrl: BASE_PATH + "dashboard-streaming-ui.js?v=0.10.6"
  });

  function installRuntimeScript(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute(`data-${marker}`, "true");
    document.head.appendChild(script);
  }

  function installBrandingStyles() {
    if (document.getElementById("dashboard-shared-branding-style")) return;
    const style = document.createElement("style");
    style.id = "dashboard-shared-branding-style";
    style.textContent = `
      .dashboard-brand-logo{width:58px;height:58px;display:block;object-fit:contain;border-radius:16px;flex:0 0 auto}
      .dashboard-header-brand{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
      .dashboard-header-brand .dashboard-brand-logo{width:46px;height:46px;border-radius:12px}
      .brand-mark.dashboard-logo-mark{padding:0!important;background:transparent!important;box-shadow:none!important;overflow:hidden!important}
      .brand-mark.dashboard-logo-mark img{width:100%;height:100%;display:block;object-fit:contain;border-radius:inherit}
      .dashboard-auth-brand{display:flex;justify-content:center;margin:0 0 14px}
      .dashboard-auth-brand .dashboard-brand-logo{width:58px;height:58px}
      .dashboard-loader-brand{display:block;width:58px;height:58px;object-fit:contain;margin:0 auto 12px;border-radius:16px}
      .google-mark.dashboard-google-mark{width:18px;height:18px;display:inline-grid;place-items:center;font-size:0;color:transparent}
      .google-mark.dashboard-google-mark svg{width:18px;height:18px;display:block}
      .dashboard-service-logo{width:17px;height:17px;display:inline-block;flex:0 0 auto;margin-right:7px;vertical-align:-3px}
      @media(max-width:600px){.dashboard-header-brand .dashboard-brand-logo{width:40px;height:40px}.dashboard-brand-logo{width:54px;height:54px}}
    `;
    document.head.appendChild(style);
  }

  function googleLogoSvg() {
    return '<svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.715v2.259h2.909c1.702-1.567 2.684-3.878 2.684-6.614z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.956v2.332A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.963 10.704A5.4 5.4 0 0 1 3.682 9c0-.592.102-1.168.281-1.704V4.964H.956A9 9 0 0 0 0 9c0 1.45.347 2.824.956 4.036l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.964l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58z"/></svg>';
  }

  function microsoftLogoSvg() {
    return '<svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#f25022" d="M0 0h8.5v8.5H0z"/><path fill="#7fba00" d="M9.5 0H18v8.5H9.5z"/><path fill="#00a4ef" d="M0 9.5h8.5V18H0z"/><path fill="#ffb900" d="M9.5 9.5H18V18H9.5z"/></svg>';
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
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    });

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const icon = document.createElement("link");
      icon.rel = "apple-touch-icon";
      icon.href = window.DashboardConfig.appLogoUrl;
      document.head.appendChild(icon);
    }

    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = window.DashboardConfig.appLogoUrl;
    favicon.type = "image/png";

    installRuntimeScript(window.DashboardConfig.pwaRuntimeUrl, "dashboard-pwa");
    installRuntimeScript(window.DashboardConfig.accountAccessRuntimeUrl, "dashboard-account-access");
  }

  function applyBranding() {
    installBrandingStyles();
    const appLogoUrl = window.DashboardConfig.appLogoUrl || window.DashboardConfig.logoUrl;
    const dashboardLogoUrl = window.DashboardConfig.dashboardLogoUrl || appLogoUrl;

    document.querySelectorAll(".brand-mark").forEach(mark => {
      if (mark.querySelector("img")) return;
      mark.classList.add("dashboard-logo-mark");
      mark.textContent = "";
      const img = document.createElement("img");
      img.src = appLogoUrl;
      img.alt = "My Dashboard";
      mark.appendChild(img);
    });

    document.querySelectorAll(".google-mark").forEach(mark => {
      mark.classList.add("dashboard-google-mark");
      mark.innerHTML = googleLogoSvg();
    });

    const headerTitle = document.querySelector(".dashboard-header h1");
    if (headerTitle && !headerTitle.parentElement?.classList.contains("dashboard-header-brand")) {
      const wrap = document.createElement("div");
      wrap.className = "dashboard-header-brand";
      const logo = document.createElement("img");
      logo.className = "dashboard-brand-logo";
      logo.src = dashboardLogoUrl;
      logo.alt = "My Dashboard logo";
      headerTitle.parentNode.insertBefore(wrap, headerTitle);
      wrap.append(logo, headerTitle);
    }

    document.querySelectorAll(".auth-card").forEach(card => {
      if (card.querySelector(".dashboard-auth-brand")) return;
      const holder = document.createElement("div");
      holder.className = "dashboard-auth-brand";
      const logo = document.createElement("img");
      logo.className = "dashboard-brand-logo";
      logo.src = appLogoUrl;
      logo.alt = "My Dashboard logo";
      holder.appendChild(logo);
      card.prepend(holder);
    });

    const loader = document.getElementById("loader");
    if (loader && !loader.querySelector(".dashboard-loader-brand")) {
      const logo = document.createElement("img");
      logo.className = "dashboard-loader-brand";
      logo.src = appLogoUrl;
      logo.alt = "My Dashboard logo";
      const heading = loader.querySelector("h1, h2, .loader-title");
      if (heading) heading.before(logo); else loader.prepend(logo);
    }

    document.querySelectorAll('.calendar-action-button.microsoft, button[id*="microsoft"]').forEach(button => {
      if (!/microsoft/i.test(button.textContent || "") || button.querySelector(".dashboard-service-logo")) return;
      const icon = document.createElement("span");
      icon.className = "dashboard-service-logo";
      icon.innerHTML = microsoftLogoSvg();
      button.prepend(icon);
    });

    document.querySelectorAll('button[id*="google"]').forEach(button => {
      if (!/(google|drive)/i.test(button.textContent || "") || button.querySelector(".dashboard-service-logo") || button.querySelector(".google-mark")) return;
      const icon = document.createElement("span");
      icon.className = "dashboard-service-logo";
      icon.innerHTML = googleLogoSvg();
      button.prepend(icon);
    });
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

  const runtimeChangelogEntries = [
    {
      version: "0.10.6",
      title: "Reliable Admin Notifications & Notification Center",
      description: "Fixes admin push-device registration so enabled devices are saved and verified in Supabase, adds a visible Dashboard notification bell with unread counts and account-request links, and keeps approval requests accessible in-app even when a push notification is missed."
    },
    {
      version: "0.10.5",
      title: "Account Request & Signup Initialization Fix",
      description: "Fixes the account request and signup initialization issue that could prevent the login flow from initializing correctly."
    },
    {
      version: "0.10.4",
      title: "Approved Logo Assets & Placement Verification",
      description: "Replaces the temporary branding assets with the approved Personal Logo 2, Personal Logo 1, and Professional DR files, verifies each logo is used on its intended app, Dashboard, and legal surfaces, and refreshes versioned PWA/cache references so installed Home Screen apps receive the corrected branding without changing account approval or other Dashboard behavior."
    },
    {
      version: "0.10.3",
      title: "Final Logo Asset Alignment",
      description: "Finalizes the approved logo set across My Dashboard by keeping Personal Logo 2 as the app/PWA, favicon, login, loading, and notification mark; Personal Logo 1 as the primary Dashboard/header identity; and the Professional DR mark on formal legal surfaces. Versioned logo URLs and PWA assets are refreshed so installed Home Screen apps pick up the finalized branding without changing the 0.10 account-approval workflow or other Dashboard behavior."
    },
    {
      version: "0.10.2",
      title: "Personal Logo Placement & Brand Assets",
      description: "Replaces the single generic Dashboard logo with dedicated app, Dashboard, and professional brand assets. Personal Logo 2 now powers the app/PWA, favicon, login, loading, and notification identity; Personal Logo 1 is used for primary Dashboard/header branding; and the Professional DR logo is used on formal legal pages. Also refreshes PWA cache/version references so installed Home Screen apps receive the new branding while preserving the 0.10.1 legal verification and 0.10.0 account-approval features."
    },
    {
      version: "0.10.1",
      title: "Branding & Legal Verification Polish",
      description: "Adds consistent My Dashboard branding across login, browser/PWA identity, loading, notification, and supported connected-service surfaces; replaces the login placeholder mark with the real Dashboard logo; and adds branded Privacy Policy and Terms of Service pages for OAuth verification with clear AI-assisted drafting and interpretation disclosures while preserving the 0.10.0 account-approval workflow."
    },
    {
      version: "0.10.0",
      title: "Account Approval & Admin Messaging",
      description: "Adds invite-only Dashboard account creation with Main Admin approval and decline controls, administrator role management, approval and decline emails through the configured Dashboard notification sender, secure declined-user support conversations assigned to the reviewing admin, rolling 24-hour support access after the most recent message, and administrator account-request notifications including PWA push support. Existing Dashboard users remain approved."
    }
  ];

  function injectCurrentChangelogEntries() {
    const body = document.getElementById("changelog-table-body");
    if (!body) return;
    runtimeChangelogEntries.slice().reverse().forEach(entry => {
      if (Array.from(body.querySelectorAll("tr")).some(row =>
        row.querySelector(".changelog-version, td")?.textContent?.trim() === entry.version
      )) return;
      const row = document.createElement("tr");
      row.dataset.dashboardRuntimeRelease = entry.version;
      const version = document.createElement("td");
      version.className = "changelog-version";
      version.textContent = entry.version;
      const title = document.createElement("td");
      title.className = "changelog-title";
      title.textContent = entry.title;
      const description = document.createElement("td");
      description.textContent = entry.description;
      row.append(version, title, description);
      body.prepend(row);
    });
  }

  function applyCurrentRelease() {
    applyCurrentVersionLabel();
    applyBranding();
    injectCurrentChangelogEntries();
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