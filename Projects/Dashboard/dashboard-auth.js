/*
  Dashboard Dylan · Shared Authentication · Version 0.5.5
  Project Access Enforcement & Shared Auth Alignment · 2026-08-13

  Use on protected project pages:
    <script src="../dashboard-config.js"></script>
    <script src="../dashboard-auth.js"></script>

  Optional automatic project access check:
    <script
      src="../dashboard-auth.js"
      data-dashboard-project="food-log">
    </script>

  Existing project pages that already call
  can_access_dashboard_project themselves remain compatible.
*/
(function () {
  "use strict";

  const scriptElement = document.currentScript;
  const requestedProjectId =
    scriptElement?.dataset?.dashboardProject?.trim() || "";

  let authPromise = null;
  let supabaseLoadPromise = null;
  let guardStyle = null;

  function getConfig() {
    const config = window.DashboardConfig;
    if (!config) {
      throw new Error(
        "DashboardConfig is missing. Load dashboard-config.js before dashboard-auth.js."
      );
    }
    return config;
  }

  function hidePage() {
    if (guardStyle) return;
    guardStyle = document.createElement("style");
    guardStyle.id = "dashboard-auth-guard-style";
    guardStyle.textContent = "html{visibility:hidden!important}";
    (document.head || document.documentElement).appendChild(guardStyle);
  }

  function revealPage(detail = {}) {
    if (guardStyle?.isConnected) guardStyle.remove();
    guardStyle = null;
    document.documentElement.style.removeProperty("visibility");

    window.dispatchEvent(
      new CustomEvent("dashboard-auth-ready", {
        detail: {
          user: window.DashboardAuth.user || null,
          client: window.DashboardAuth.client || null,
          projectId: detail.projectId || null
        }
      })
    );
  }

  function safeReturnTo(value) {
    const config = getConfig();
    const fallback = new URL(config.dashboardIndexUrl, window.location.origin);

    if (!value) return fallback.href;

    try {
      const candidate = new URL(value, window.location.origin);
      if (candidate.origin !== window.location.origin) return fallback.href;
      if (candidate.pathname === new URL(config.loginUrl, window.location.origin).pathname) {
        return fallback.href;
      }
      return candidate.href;
    } catch {
      return fallback.href;
    }
  }

  function buildLoginUrl(returnTo = window.location.href) {
    const config = getConfig();
    const loginUrl = new URL(config.loginUrl, window.location.origin);
    loginUrl.searchParams.set("returnTo", safeReturnTo(returnTo));
    return loginUrl.href;
  }

  function redirectToLogin(returnTo = window.location.href) {
    window.location.replace(buildLoginUrl(returnTo));
  }

  function redirectToDashboard() {
    const config = getConfig();
    window.location.replace(
      new URL(config.dashboardIndexUrl, window.location.origin).href
    );
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve();
    if (supabaseLoadPromise) return supabaseLoadPromise;

    const config = getConfig();

    supabaseLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-dashboard-supabase="true"]'
      );

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Supabase authentication library could not load.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = config.supabaseScriptUrl;
      script.async = true;
      script.dataset.dashboardSupabase = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("Supabase authentication library could not load.")),
        { once: true }
      );
      document.head.appendChild(script);
    });

    return supabaseLoadPromise;
  }

  async function getClient() {
    if (window.DashboardAuth.client) return window.DashboardAuth.client;

    await loadSupabaseLibrary();
    const config = getConfig();

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

    window.DashboardAuth.client = client;
    return client;
  }

  async function getCurrentUser() {
    const client = await getClient();
    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) return null;

    window.DashboardAuth.user = data.user;
    return data.user;
  }

  async function requireProjectAccess(projectId) {
    const cleanProjectId = String(projectId || "").trim();
    if (!cleanProjectId) return true;

    const client = await getClient();

    const { data, error } = await client.rpc(
      "can_access_dashboard_project",
      { requested_project_id: cleanProjectId }
    );

    if (error) {
      console.error("Dashboard project access check:", error);
      throw new Error(
        "Dashboard Dylan could not verify access to this project."
      );
    }

    if (data !== true) {
      const denied = new Error(
        "This Dashboard account does not have access to this project."
      );
      denied.code = "DASHBOARD_PROJECT_ACCESS_DENIED";
      denied.projectId = cleanProjectId;
      throw denied;
    }

    return true;
  }

  async function requireLogin(options = {}) {
    const projectId =
      String(options.projectId || requestedProjectId || "").trim();

    if (authPromise && !options.force) return authPromise;

    authPromise = (async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          redirectToLogin(options.returnTo || window.location.href);
          return null;
        }

        if (projectId) {
          await requireProjectAccess(projectId);
        }

        revealPage({ projectId });
        return user;
      } catch (error) {
        if (error?.code === "DASHBOARD_PROJECT_ACCESS_DENIED") {
          window.dispatchEvent(
            new CustomEvent("dashboard-project-access-denied", {
              detail: { projectId, error }
            })
          );

          console.error(error);
          redirectToDashboard();
          return null;
        }

        console.error("Dashboard authentication guard:", error);
        redirectToLogin(options.returnTo || window.location.href);
        return null;
      } finally {
        authPromise = null;
      }
    })();

    return authPromise;
  }

  async function signOut(options = {}) {
    const client = await getClient();
    await client.auth.signOut();

    window.DashboardAuth.user = null;

    const config = getConfig();
    const target = options.redirectTo || config.loginUrl;
    window.location.replace(new URL(target, window.location.origin).href);
  }

  hidePage();

  window.DashboardAuth = {
    version: "0.5.5",
    client: null,
    user: null,
    getClient,
    getCurrentUser,
    requireLogin,
    requireProjectAccess,
    buildLoginUrl,
    redirectToLogin,
    redirectToDashboard,
    safeReturnTo,
    signOut,
    revealPage
  };

  requireLogin({ projectId: requestedProjectId });
})();
