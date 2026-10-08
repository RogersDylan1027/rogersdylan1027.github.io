/*
  My Dashboard · Raspberry Pi Runtime · Version 0.11.0
  Raspberry Pi Controls · 2026-10-08

  Main Admin only. The tile is rendered only while an authenticated
  Main Admin can reach the Pi Control API over the local Pi host or Tailscale.
*/
(function () {
  "use strict";

  const config = window.DashboardConfig;
  if (!config || !location.pathname.startsWith("/Projects/Dashboard/")) return;
  if (location.pathname.endsWith("/login.html")) return;

  const TAILSCALE_API = "https://dashboard-pi.tail3c6bb3.ts.net";
  const TILE_ID = "dashboard-raspberry-pi-tile";
  const VIEW_ID = "raspberry-pi-view";
  const CHECK_INTERVAL_MS = 30000;
  const REQUEST_TIMEOUT_MS = 3500;

  let activeApiBase = null;
  let latestStatus = null;
  let checkTimer = null;
  let mutationTimer = null;

  function getAuthClient() {
    return window.DashboardEntryAuth?.client || null;
  }

  function isMainAdmin() {
    return window.DashboardEntryAuth?.access?.main_admin === true;
  }

  async function getAccessToken() {
    const client = getAuthClient();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token) return null;
    return data.session.access_token;
  }

  function apiCandidates() {
    const candidates = [];
    const host = location.hostname;

    // When My Dashboard itself is being served by the Pi/local network,
    // try the Pi's LAN API before Tailscale.
    if (
      location.protocol === "http:" &&
      host &&
      host !== "rogersdylan1027.github.io"
    ) {
      candidates.push(`http://${host}:5050`);
    }

    candidates.push(TAILSCALE_API);
    return [...new Set(candidates)];
  }

  async function apiFetch(base, path, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const token = await getAccessToken();
    if (!token) throw new Error("Dashboard session is not available.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(base + path, {
        ...options,
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });

      let payload = null;
      try { payload = await response.json(); } catch {}

      if (!response.ok) {
        const error = new Error(
          payload?.error || `Pi request failed (${response.status}).`
        );
        error.status = response.status;
        throw error;
      }

      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  async function discoverPi() {
    if (!isMainAdmin()) {
      activeApiBase = null;
      latestStatus = null;
      removeTile();
      closeView();
      return false;
    }

    for (const base of apiCandidates()) {
      try {
        const status = await apiFetch(base, "/api/status", {}, REQUEST_TIMEOUT_MS);
        activeApiBase = base;
        latestStatus = status;
        ensureTile();
        updateView(status, true);
        return true;
      } catch (error) {
        if (error?.status === 403) {
          activeApiBase = null;
          latestStatus = null;
          removeTile();
          closeView();
          return false;
        }
      }
    }

    activeApiBase = null;
    latestStatus = null;
    removeTile();
    updateView(null, false);
    return false;
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let amount = bytes;
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    const digits = unit >= 3 ? 1 : 0;
    return amount.toFixed(digits) + " " + units[unit];
  }

  function formatUptime(seconds) {
    let remaining = Math.max(0, Math.floor(Number(seconds || 0)));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);

    const parts = [];
    if (days) parts.push(days + "d");
    if (hours || days) parts.push(hours + "h");
    parts.push(minutes + "m");
    return parts.join(" ");
  }

  function percent(used, total) {
    const t = Number(total || 0);
    const u = Number(used || 0);
    if (!t) return "—";
    return Math.round((u / t) * 100) + "%";
  }

  function ensureStyles() {
    if (document.getElementById("dashboard-pi-styles")) return;
    const style = document.createElement("style");
    style.id = "dashboard-pi-styles";
    style.textContent = `
      #${TILE_ID} .tile-icon img{width:34px;height:34px;display:block;object-fit:contain}
      .pi-view-content{display:grid;gap:18px;padding:22px}
      .pi-status-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;border:1px solid #dfe3e8;border-radius:13px;background:#fff}
      .pi-status-identity{display:flex;align-items:center;gap:10px;min-width:0}
      .pi-status-dot{width:10px;height:10px;border-radius:50%;background:#2e8b57;box-shadow:0 0 0 3px rgba(46,139,87,.12)}
      .pi-status-dot.offline{background:#9aa0a8;box-shadow:none}
      .pi-status-name{font-weight:800;font-size:14px}
      .pi-status-route{margin-top:2px;color:#68707c;font-size:11px;overflow-wrap:anywhere}
      .pi-refresh-button,.pi-action-button{min-height:38px;padding:8px 13px;border:1px solid #2450a4;border-radius:18px;background:#2450a4;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
      .pi-refresh-button{background:#fff;color:#2450a4}
      .pi-action-button.secondary{background:#fff;color:#2450a4}
      .pi-action-button.danger{background:#fff;border-color:#b3261e;color:#b3261e}
      .pi-refresh-button:disabled,.pi-action-button:disabled{opacity:.55;cursor:wait}
      .pi-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .pi-stat-card{padding:15px;border:1px solid #dfe3e8;border-radius:13px;background:#fff}
      .pi-stat-label{display:block;color:#68707c;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
      .pi-stat-value{display:block;margin-top:6px;font-size:20px;font-weight:800;overflow-wrap:anywhere}
      .pi-stat-note{display:block;margin-top:4px;color:#777;font-size:11px}
      .pi-control-section{padding:18px;border:1px solid #d5d9df;border-radius:16px;background:#fff}
      .pi-control-section h3{margin:0 0 5px;font-size:17px}
      .pi-control-section p{margin:0 0 13px;color:#68707c;font-size:13px;line-height:1.45}
      .pi-action-row{display:flex;align-items:center;flex-wrap:wrap;gap:9px}
      .pi-action-status{min-height:18px;margin:11px 0 0;color:#68707c;font-size:12px;white-space:pre-wrap}
      @media(max-width:700px){.pi-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:460px){.pi-stat-grid{grid-template-columns:1fr}.pi-view-content{padding:14px}.pi-status-banner{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function makeTile() {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.id = TILE_ID;
    tile.className = "dashboard-tile";
    tile.setAttribute("aria-label", "Open Raspberry Pi controls");
    tile.innerHTML = `
      <span class="tile-icon">
        <img src="${config.raspberryPiLogoUrl || "/Projects/Dashboard/raspberry-pi.svg"}" alt="">
      </span>
      <span class="tile-title">Raspberry Pi</span>
    `;
    tile.addEventListener("click", openView);
    return tile;
  }

  function ensureTile() {
    if (!isMainAdmin() || !activeApiBase) {
      removeTile();
      return;
    }

    ensureStyles();
    if (document.getElementById(TILE_ID)) return;

    const grid = document.getElementById("dashboard-grid");
    if (!grid) return;

    const tile = makeTile();
    let lastRow = grid.querySelector(".dashboard-tile-row:last-child");

    if (!lastRow || lastRow.children.length >= 5) {
      lastRow = document.createElement("div");
      lastRow.className = "dashboard-tile-row";
      grid.appendChild(lastRow);
    }

    lastRow.appendChild(tile);
  }

  function removeTile() {
    const tile = document.getElementById(TILE_ID);
    if (!tile) return;
    const row = tile.parentElement;
    tile.remove();
    if (row?.classList.contains("dashboard-tile-row") && !row.children.length) {
      row.remove();
    }
  }

  function ensureView() {
    ensureStyles();
    let backdrop = document.getElementById(VIEW_ID);
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = VIEW_ID;
    backdrop.className = "internal-view-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="internal-view" role="dialog" aria-modal="true" aria-labelledby="raspberry-pi-view-title">
        <header class="internal-view-header">
          <button id="raspberry-pi-view-close" class="internal-view-close-button" type="button" aria-label="Close Raspberry Pi controls">×</button>
          <h2 id="raspberry-pi-view-title">Raspberry Pi</h2>
          <div class="internal-view-header-spacer" aria-hidden="true"></div>
        </header>

        <div class="pi-view-content">
          <div class="pi-status-banner">
            <div class="pi-status-identity">
              <span id="pi-status-dot" class="pi-status-dot"></span>
              <div>
                <div id="pi-status-name" class="pi-status-name">Checking Raspberry Pi…</div>
                <div id="pi-status-route" class="pi-status-route"></div>
              </div>
            </div>
            <button id="pi-refresh-status" class="pi-refresh-button" type="button">Refresh</button>
          </div>

          <div class="pi-stat-grid">
            <div class="pi-stat-card"><span class="pi-stat-label">Temperature</span><span id="pi-temperature" class="pi-stat-value">—</span><span class="pi-stat-note">CPU temperature</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Uptime</span><span id="pi-uptime" class="pi-stat-value">—</span><span class="pi-stat-note">Since last boot</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Load</span><span id="pi-load" class="pi-stat-value">—</span><span class="pi-stat-note">1 / 5 / 15 minutes</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">RAM</span><span id="pi-memory" class="pi-stat-value">—</span><span id="pi-memory-note" class="pi-stat-note">—</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Storage</span><span id="pi-storage" class="pi-stat-value">—</span><span id="pi-storage-note" class="pi-stat-note">—</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Hostname</span><span id="pi-hostname" class="pi-stat-value">—</span><span class="pi-stat-note">Pi device</span></div>
          </div>

          <section class="pi-control-section">
            <h3>Dashboard</h3>
            <p>Update the Pi's local Dashboard files from GitHub or restart the Dashboard web service.</p>
            <div class="pi-action-row">
              <button class="pi-action-button" type="button" data-pi-action="/api/dashboard/update">Update Dashboard</button>
              <button class="pi-action-button secondary" type="button" data-pi-action="/api/dashboard/restart">Restart Dashboard</button>
            </div>
            <div id="pi-dashboard-action-status" class="pi-action-status" role="status"></div>
          </section>

          <section class="pi-control-section">
            <h3>System Controls</h3>
            <p>These actions affect the Raspberry Pi itself and require confirmation.</p>
            <div class="pi-action-row">
              <button class="pi-action-button secondary" type="button" data-pi-action="/api/system/reboot" data-confirm="Reboot the Raspberry Pi now?">Reboot Pi</button>
              <button class="pi-action-button danger" type="button" data-pi-action="/api/system/shutdown" data-confirm="Shut down the Raspberry Pi now? You will need physical access to power it back on.">Shut Down Pi</button>
            </div>
            <div id="pi-system-action-status" class="pi-action-status" role="status"></div>
          </section>
        </div>
      </section>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelector("#raspberry-pi-view-close")?.addEventListener("click", closeView);
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeView();
    });
    backdrop.querySelector("#pi-refresh-status")?.addEventListener("click", refreshOpenView);

    backdrop.querySelectorAll("[data-pi-action]").forEach(button => {
      button.addEventListener("click", () => runAction(button));
    });

    return backdrop;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function updateView(status, online) {
    const backdrop = document.getElementById(VIEW_ID);
    if (!backdrop) return;

    const dot = backdrop.querySelector("#pi-status-dot");
    dot?.classList.toggle("offline", !online);

    setText("pi-status-name", online ? "Online" : "Raspberry Pi unavailable");
    setText("pi-status-route", online && activeApiBase ? activeApiBase : "Connect to the Pi network or Tailscale.");

    if (!online || !status) {
      ["pi-temperature","pi-uptime","pi-load","pi-memory","pi-storage","pi-hostname"].forEach(id => setText(id, "—"));
      setText("pi-memory-note", "—");
      setText("pi-storage-note", "—");
      return;
    }

    const memory = status.memory || {};
    const storage = status.storage || {};
    const load = Array.isArray(status.load_average) ? status.load_average : [];

    setText("pi-temperature", status.temperature_c == null ? "—" : status.temperature_c.toFixed(1) + " °C");
    setText("pi-uptime", formatUptime(status.uptime_seconds));
    setText("pi-load", load.length ? load.map(value => Number(value).toFixed(2)).join(" / ") : "—");
    setText("pi-memory", percent(memory.used, memory.total));
    setText("pi-memory-note", `${formatBytes(memory.used)} of ${formatBytes(memory.total)} used`);
    setText("pi-storage", percent(storage.used, storage.total));
    setText("pi-storage-note", `${formatBytes(storage.used)} of ${formatBytes(storage.total)} used`);
    setText("pi-hostname", status.hostname || "dashboard-pi");
  }

  async function refreshOpenView() {
    const button = document.getElementById("pi-refresh-status");
    if (button) button.disabled = true;
    try {
      if (!activeApiBase) await discoverPi();
      if (!activeApiBase) return;
      const status = await apiFetch(activeApiBase, "/api/status");
      latestStatus = status;
      updateView(status, true);
    } catch {
      await discoverPi();
    } finally {
      if (button) button.disabled = false;
    }
  }

  function openView() {
    if (!isMainAdmin() || !activeApiBase) return;
    const backdrop = ensureView();
    backdrop.hidden = false;
    updateView(latestStatus, Boolean(latestStatus));
    refreshOpenView();
  }

  function closeView() {
    const backdrop = document.getElementById(VIEW_ID);
    if (backdrop) backdrop.hidden = true;
  }

  async function runAction(button) {
    if (!activeApiBase) return;
    const confirmText = button.dataset.confirm;
    if (confirmText && !window.confirm(confirmText)) return;

    const path = button.dataset.piAction;
    const systemAction = path.startsWith("/api/system/");
    const statusId = systemAction ? "pi-system-action-status" : "pi-dashboard-action-status";
    const originalText = button.textContent;

    button.disabled = true;
    setText(statusId, "Working…");

    try {
      const result = await apiFetch(activeApiBase, path, { method: "POST", body: "{}" }, path.endsWith("/update") ? 20000 : REQUEST_TIMEOUT_MS);
      if (path.endsWith("/update")) {
        const message = [result?.output, result?.error].filter(Boolean).join("\n").trim();
        setText(statusId, message || "Dashboard update complete.");
      } else if (path.endsWith("/restart")) {
        setText(statusId, "Dashboard service restarted.");
      } else if (path.endsWith("/reboot")) {
        setText(statusId, "Reboot requested. The Pi will be unavailable briefly.");
        setTimeout(() => { activeApiBase = null; removeTile(); closeView(); }, 1500);
      } else if (path.endsWith("/shutdown")) {
        setText(statusId, "Shutdown requested. The Pi is going offline.");
        setTimeout(() => { activeApiBase = null; removeTile(); closeView(); }, 1500);
      } else {
        setText(statusId, "Done.");
      }
    } catch (error) {
      setText(statusId, error?.message || "The Pi action failed.");
      if (error?.status === 403) {
        activeApiBase = null;
        removeTile();
        closeView();
      }
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function startMonitoring() {
    clearInterval(checkTimer);
    discoverPi();
    checkTimer = setInterval(discoverPi, CHECK_INTERVAL_MS);
  }

  function watchGrid() {
    if (!window.MutationObserver) return;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(() => {
        if (isMainAdmin() && activeApiBase) ensureTile();
      }, 50);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener("dashboard-auth-ready", event => {
    const access = event.detail?.access || window.DashboardEntryAuth?.access;
    if (access?.main_admin === true) startMonitoring();
    else {
      clearInterval(checkTimer);
      activeApiBase = null;
      removeTile();
      closeView();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeView();
  });

  watchGrid();

  // dashboard-auth-ready can fire before this runtime finishes loading.
  if (window.DashboardEntryAuth?.access?.main_admin === true) {
    startMonitoring();
  }
})();
