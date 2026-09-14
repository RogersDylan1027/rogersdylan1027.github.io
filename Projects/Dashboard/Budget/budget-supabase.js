/*
  Budget 0.6.2 · Supabase cross-device sync

  This intentionally stores the complete Budget state as one JSON snapshot
  per authenticated Dashboard user. localStorage remains the immediate cache.
*/
(function () {
  "use strict";

  let client = null;
  let user = null;
  let ready = false;
  let saveTimer = null;
  let saving = false;
  let pending = false;

  const TABLE = "budget_sync_state_v1";

  function app() {
    return window.BudgetApp;
  }

  function setStatus(message, error = false) {
    const el = document.getElementById("syncStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "var(--red)" : "";
  }

  function currentState() {
    return app()?.getState?.() || null;
  }

  async function uploadState(state) {
    if (!ready || !client || !user || !state) return false;

    const { error } = await client
      .from(TABLE)
      .upsert({
        user_id: user.id,
        data: state
      }, { onConflict: "user_id" });

    if (error) throw error;
    return true;
  }

  async function getCloudRow() {
    const { data, error } = await client
      .from(TABLE)
      .select("data,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function saveNow(state) {
    if (!ready) return;

    if (saving) {
      pending = true;
      return;
    }

    saving = true;
    setStatus("Saving…");

    try {
      await uploadState(state || currentState());
      setStatus("Synced");
    } catch (error) {
      console.error("Budget sync save failed:", error);
      setStatus("Local only — sync failed", true);
    } finally {
      saving = false;
      if (pending) {
        pending = false;
        scheduleSave(currentState());
      }
    }
  }

  function scheduleSave(state) {
    if (!ready) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(state || currentState()), 450);
  }

  async function reloadFromCloud() {
    if (!ready) return false;
    try {
      const row = await getCloudRow();
      if (!row?.data) return false;
      app()?.replaceState?.(row.data);
      setStatus("Synced");
      return true;
    } catch (error) {
      console.error("Budget cloud reload failed:", error);
      setStatus("Local only — sync failed", true);
      return false;
    }
  }

  async function init(detail) {
    if (ready) return;

    client = detail?.client || window.DashboardAuth?.client || null;
    user = detail?.user || window.DashboardAuth?.user || null;

    if (!client || !user) {
      setStatus("Waiting for login…");
      return;
    }

    setStatus("Connecting…");

    try {
      const row = await getCloudRow();
      ready = true;

      if (row?.data) {
        // Cloud already exists: it is the shared copy for all devices.
        app()?.replaceState?.(row.data);
        setStatus("Synced");
      } else {
        // First device after setup: upload this device's existing local Budget.
        const local = currentState();
        if (local) {
          await uploadState(local);
          setStatus("Uploaded local Budget");
        } else {
          setStatus("Synced");
        }
      }
    } catch (error) {
      console.error("Budget Supabase initialization failed:", error);
      ready = false;
      setStatus("Local only — Supabase not ready", true);
    }
  }

  window.BudgetCloud = {
    scheduleSave,
    saveNow,
    reloadFromCloud,
    get userId() {
      return user?.id || null;
    }
  };

  window.addEventListener("dashboard-auth-ready", event => {
    init(event.detail);
  }, { once: true });

  // dashboard-auth-ready may have already fired before this module loads.
  setTimeout(() => {
    if (!ready && window.DashboardAuth?.client && window.DashboardAuth?.user) {
      init({
        client: window.DashboardAuth.client,
        user: window.DashboardAuth.user
      });
    }
  }, 0);
})();