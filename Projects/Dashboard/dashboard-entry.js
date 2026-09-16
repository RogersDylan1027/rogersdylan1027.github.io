/*
  My Dashboard · Dashboard Entry Guard · Version 0.10.0
  Account Approval & Admin Messaging · 2026-09-16
*/
(function () {
  "use strict";
  const config = window.DashboardConfig;
  if (!config) { console.error("dashboard-entry.js requires dashboard-config.js."); return; }
  document.documentElement.style.visibility = "hidden";

  function redirectToLogin(reason = "") {
    const loginUrl = new URL(config.loginUrl, window.location.origin);
    loginUrl.searchParams.set("returnTo", window.location.href);
    if (reason) loginUrl.searchParams.set("access", reason);
    window.location.replace(loginUrl.href);
  }
  function loadSupabase() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = config.supabaseScriptUrl; script.async = true;
      script.dataset.dashboardSupabase = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }
  function loadScriptOnce(src, marker) {
    if (document.querySelector(`script[data-dashboard-runtime="${marker}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src; script.async = false; script.dataset.dashboardRuntime = marker;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }
  function waitForDashboardShell(timeoutMs = 15000) {
    const ready = () => document.getElementById("settings-view") && document.getElementById("changelog-view");
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = error => { observer?.disconnect(); clearTimeout(timeout); error ? reject(error) : resolve(); };
      const observer = window.MutationObserver ? new MutationObserver(() => { if (ready()) finish(); }) : null;
      observer?.observe(document.documentElement, { childList: true, subtree: true });
      const timeout = setTimeout(() => finish(new Error("Dashboard shell did not become ready.")), timeoutMs);
    });
  }
  function installConnectedAccountRefresh(client) {
    if (document.getElementById("connected-accounts-refresh-button")) return;
    const googleConnectButton = document.getElementById("calendar-connect-button");
    const section = googleConnectButton?.closest(".settings-section");
    const description = section?.querySelector(".settings-section-description");
    if (!section || !description) return;
    const controls = document.createElement("div"); controls.className = "settings-account-buttons"; controls.style.margin = "12px 0 6px";
    const button = document.createElement("button"); button.id = "connected-accounts-refresh-button"; button.className = "calendar-action-button secondary"; button.type = "button"; button.textContent = "Refresh Connected Accounts";
    const status = document.createElement("p"); status.id = "connected-accounts-refresh-status"; status.className = "calendar-connection-status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); status.textContent = "Reload saved account connections and their available data.";
    controls.appendChild(button); description.insertAdjacentElement("afterend", controls); controls.insertAdjacentElement("afterend", status);
    button.addEventListener("click", async () => {
      button.disabled = true; status.textContent = "Refreshing connected accounts…";
      try {
        const { error: refreshError } = await client.auth.refreshSession(); if (refreshError) throw refreshError;
        const { data: userData, error: userError } = await client.auth.getUser(); if (userError) throw userError; if (!userData?.user) throw new Error("Your Dashboard session is no longer signed in.");
        window.updateMicrosoftConnectionView?.(userData.user); await window.refreshDashboardServicePreferencesFromUser?.();
        let googleAccounts = null; if (typeof window.listGoogleAccounts === "function") googleAccounts = await window.listGoogleAccounts();
        if (Array.isArray(googleAccounts) && googleAccounts.length && typeof window.loadGoogleCalendarEvents === "function") await window.loadGoogleCalendarEvents();
        window.renderCalendarAccountPreferences?.(); window.renderFilesAccountSidebar?.(); window.updateFilesGoogleAccountSelector?.();
        const count = Array.isArray(googleAccounts) ? googleAccounts.length : null;
        status.textContent = count === null ? "Connected accounts refreshed." : `Refresh complete · ${count} Google account${count === 1 ? "" : "s"} reloaded.`;
      } catch (error) {
        console.error("Connected account refresh:", error); status.textContent = error?.message || "Connected accounts could not be refreshed. Reconnect any account that asks you to sign in again.";
      } finally { button.disabled = false; }
    });
  }
  async function startStreamingRuntime() {
    try {
      await waitForDashboardShell(); window.DashboardApplyCurrentVersionLabel?.();
      await loadScriptOnce(config.streamingClientUrl, "streaming-client"); await loadScriptOnce(config.streamingUiUrl, "streaming-ui");
    } catch (error) { console.warn("Streaming runtime:", error); }
  }
  (async function protectDashboard() {
    try {
      await loadSupabase();
      const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      window.DashboardEntryAuth = { client, user: null, access: null };
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user) { redirectToLogin(); return; }
      const { data: access, error: accessError } = await client.rpc("dashboard_account_access_state");
      if (accessError || access?.allowed !== true) {
        try { await client.auth.signOut({ scope: "local" }); } catch {}
        redirectToLogin(access?.status || "not-approved"); return;
      }
      window.DashboardEntryAuth.user = data.user; window.DashboardEntryAuth.access = access;
      document.documentElement.style.removeProperty("visibility");
      setTimeout(async () => { try { await waitForDashboardShell(); installConnectedAccountRefresh(client); } catch (error) { console.warn("Connected account recovery controls:", error); } }, 0);
      setTimeout(startStreamingRuntime, 0);
    } catch (error) { console.error("Dashboard entry authentication:", error); redirectToLogin(); }
  })();
})();
