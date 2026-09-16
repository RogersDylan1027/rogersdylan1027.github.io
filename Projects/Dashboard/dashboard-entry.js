/*
  My Dashboard · Dashboard Entry Guard · Version 0.7.3
  Account Selection & Connection Recovery · 2026-09-16

  Loads the shared Dashboard authentication client, applies the account-choice
  policy to OAuth sign-in/linking flows, and installs Connected Accounts
  recovery controls after the Dashboard shell is available.
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
    const ready = () =>
      document.getElementById("settings-view") &&
      document.getElementById("changelog-view");

    if (ready()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const finish = (error) => {
        observer?.disconnect();
        clearTimeout(timeout);
        error ? reject(error) : resolve();
      };
      const observer = window.MutationObserver
        ? new MutationObserver(() => { if (ready()) finish(); })
        : null;
      observer?.observe(document.documentElement, { childList: true, subtree: true });
      const timeout = setTimeout(() =>
        finish(new Error("Dashboard shell did not become ready.")),
        timeoutMs
      );
    });
  }

  function addAccountChooserPrompt(options = {}) {
    const queryParams = { ...(options.queryParams || {}) };
    const promptParts = String(queryParams.prompt || "")
      .split(/\s+/)
      .filter(Boolean);

    if (!promptParts.includes("select_account")) {
      promptParts.push("select_account");
    }

    queryParams.prompt = promptParts.join(" ");

    return {
      ...options,
      queryParams
    };
  }

  function enforceAccountChooserForOAuth(client) {
    const auth = client?.auth;
    if (!auth || auth.__dashboardAccountChooserPolicy) return client;

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

    return client;
  }

  function installConnectedAccountRefresh(client) {
    if (document.getElementById("connected-accounts-refresh-button")) return;

    const googleConnectButton = document.getElementById("calendar-connect-button");
    const connectedAccountsSection = googleConnectButton?.closest(".settings-section");
    const description = connectedAccountsSection?.querySelector(".settings-section-description");

    if (!connectedAccountsSection || !description) return;

    const controls = document.createElement("div");
    controls.className = "settings-account-buttons";
    controls.style.margin = "12px 0 6px";

    const button = document.createElement("button");
    button.id = "connected-accounts-refresh-button";
    button.className = "calendar-action-button secondary";
    button.type = "button";
    button.textContent = "Refresh Connected Accounts";

    const status = document.createElement("p");
    status.id = "connected-accounts-refresh-status";
    status.className = "calendar-connection-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "Reload saved account connections and their available data.";

    controls.appendChild(button);
    description.insertAdjacentElement("afterend", controls);
    controls.insertAdjacentElement("afterend", status);

    button.addEventListener("click", async () => {
      button.disabled = true;
      status.textContent = "Refreshing connected accounts…";

      try {
        const { error: refreshError } = await client.auth.refreshSession();
        if (refreshError) throw refreshError;

        const { data: userData, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        if (!userData?.user) throw new Error("Your Dashboard session is no longer signed in.");

        if (typeof window.updateMicrosoftConnectionView === "function") {
          window.updateMicrosoftConnectionView(userData.user);
        }

        let googleAccounts = null;
        if (typeof window.listGoogleAccounts === "function") {
          googleAccounts = await window.listGoogleAccounts();
        }

        if (
          Array.isArray(googleAccounts) &&
          googleAccounts.length &&
          typeof window.loadGoogleCalendarEvents === "function"
        ) {
          await window.loadGoogleCalendarEvents();
        }

        window.renderCalendarAccountPreferences?.();
        window.renderFilesAccountSidebar?.();
        window.updateFilesGoogleAccountSelector?.();

        const googleSummary = Array.isArray(googleAccounts)
          ? `${googleAccounts.length} Google account${googleAccounts.length === 1 ? "" : "s"}`
          : "connected accounts";
        status.textContent = `Refresh complete · ${googleSummary} reloaded.`;
      } catch (error) {
        console.error("Connected account refresh:", error);
        status.textContent =
          error?.message ||
          "Connected accounts could not be refreshed. Reconnect any account that asks you to sign in again.";
      } finally {
        button.disabled = false;
      }
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

      const client = enforceAccountChooserForOAuth(
        window.supabase.createClient(
          config.supabaseUrl,
          config.supabasePublishableKey,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        )
      );

      // Expose the shared client immediately so the flattened Dashboard shell
      // can reuse it instead of creating a second Supabase client.
      window.DashboardEntryAuth = {
        client,
        user: null
      };

      const { data, error } = await client.auth.getUser();

      if (error || !data?.user) {
        redirectToLogin();
        return;
      }

      window.DashboardEntryAuth.user = data.user;

      document.documentElement.style.removeProperty("visibility");

      // The Dashboard shell is now static, so attach account recovery controls
      // and Streaming as soon as the parsed Settings/Changelog shell exists.
      setTimeout(async () => {
        try {
          await waitForDashboardShell();
          installConnectedAccountRefresh(client);
        } catch (error) {
          console.warn("Connected account recovery controls:", error);
        }
      }, 0);
      setTimeout(startStreamingRuntime, 0);
    } catch (error) {
      console.error("Dashboard entry authentication:", error);
      redirectToLogin();
    }
  })();
})();
