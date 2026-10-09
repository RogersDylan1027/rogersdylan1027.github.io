/*
  My Dashboard · Raspberry Pi Runtime · Version 0.11.2
  Raspberry Pi Scheduler · 2026-10-09

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
  const TEMP_REFERENCE_F = 120;

  let activeApiBase = null;
  let latestStatus = null;
  let latestSchedulerStatus = null;
  let latestSchedulerHistory = [];
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

  function toFahrenheit(celsius) {
    const value = Number(celsius);
    if (!Number.isFinite(value)) return null;
    return (value * 9 / 5) + 32;
  }

  function formatTemperature(celsius) {
    const fahrenheit = toFahrenheit(celsius);
    if (fahrenheit == null) return "—";
    const rounded = Math.round(fahrenheit);
    const delta = rounded - TEMP_REFERENCE_F;
    const deltaText = delta === 0 ? "±0°F" : `${delta > 0 ? "+" : ""}${delta}°F`;
    return `${rounded}°F (${deltaText})`;
  }

  function temperatureStatus(celsius) {
    const fahrenheit = toFahrenheit(celsius);
    if (fahrenheit == null) return "—";
    if (fahrenheit >= 176) return "Hot";
    if (fahrenheit >= 158) return "Warm";
    return "Normal";
  }

  function loadPercent(load) {
    const value = Number(load);
    if (!Number.isFinite(value)) return "—";
    return Math.max(0, Math.round(value * 100)) + "%";
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function describeSchedule(schedule = {}) {
    const type = String(schedule.type || "cron").toLowerCase();

    if (type === "interval") {
      const units = ["weeks", "days", "hours", "minutes", "seconds"];
      const parts = units
        .filter(unit => Number(schedule[unit]) > 0)
        .map(unit => {
          const value = Number(schedule[unit]);
          return `${value} ${unit.replace(/s$/, value === 1 ? "" : "s")}`;
        });
      return parts.length ? "Every " + parts.join(", ") : "Interval";
    }

    if (type === "date") {
      return schedule.run_at ? "Once · " + formatDateTime(schedule.run_at) : "One-time";
    }

    const day = schedule.day_of_week ? `${schedule.day_of_week} · ` : "";
    const hour = schedule.hour != null ? String(schedule.hour).padStart(2, "0") : "*";
    const minute = schedule.minute != null ? String(schedule.minute).padStart(2, "0") : "*";

    if (schedule.minute && String(schedule.minute).startsWith("*/") && schedule.hour == null) {
      return `Every ${String(schedule.minute).slice(2)} minutes`;
    }
    if (schedule.hour != null && schedule.minute != null && !String(schedule.hour).includes("*") && !String(schedule.minute).includes("*")) {
      const parsedHour = Number(schedule.hour);
      const parsedMinute = Number(schedule.minute);
      if (Number.isFinite(parsedHour) && Number.isFinite(parsedMinute)) {
        const date = new Date();
        date.setHours(parsedHour, parsedMinute, 0, 0);
        const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
        return day + time;
      }
    }

    return `${day}Cron · ${hour}:${minute}`;
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
      .pi-scheduler-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      .pi-scheduler-header h3{margin:0}
      .pi-scheduler-summary{margin:4px 0 0;color:#68707c;font-size:12px}
      .pi-scheduler-list{display:grid;gap:10px}
      .pi-automation-card{padding:14px;border:1px solid #dfe3e8;border-radius:13px;background:#f8f9fb}
      .pi-automation-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .pi-automation-name{font-size:14px;font-weight:800;overflow-wrap:anywhere}
      .pi-automation-state{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;color:#68707c;font-size:11px;font-weight:800}
      .pi-automation-state::before{content:"";width:8px;height:8px;border-radius:50%;background:#9aa0a8}
      .pi-automation-state.enabled::before{background:#2e8b57}
      .pi-automation-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 14px;margin-top:10px;color:#68707c;font-size:12px}
      .pi-automation-meta strong{display:block;margin-bottom:2px;color:#3f4752;font-size:10px;text-transform:uppercase;letter-spacing:.35px}
      .pi-automation-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .pi-automation-actions .pi-action-button{min-height:34px;padding:6px 11px;font-size:12px}
      .pi-scheduler-message{min-height:18px;margin:10px 0 0;color:#68707c;font-size:12px}
      .pi-history{display:grid;gap:8px;margin-top:15px;padding-top:14px;border-top:1px solid #e3e6ea}
      .pi-history-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#68707c}
      .pi-history-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eceef1;font-size:12px}
      .pi-history-item:last-child{border-bottom:0}
      .pi-history-main{min-width:0}
      .pi-history-name{display:block;font-weight:800;color:#333;overflow-wrap:anywhere}
      .pi-history-time{display:block;margin-top:2px;color:#777}
      .pi-history-status{white-space:nowrap;font-weight:800;text-transform:capitalize}
      .pi-history-status.success{color:#267348}
      .pi-history-status.failed,.pi-history-status.configuration_error{color:#b3261e}
      .pi-empty-state{padding:14px;border:1px dashed #cfd4db;border-radius:12px;color:#68707c;font-size:12px;text-align:center}
      @media(max-width:700px){.pi-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.pi-automation-meta{grid-template-columns:1fr}.pi-scheduler-header{align-items:stretch;flex-direction:column}.pi-scheduler-header .pi-refresh-button{align-self:flex-start}}
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
            <div class="pi-stat-card"><span class="pi-stat-label">Temperature</span><span id="pi-temperature" class="pi-stat-value">—</span><span id="pi-temperature-note" class="pi-stat-note">Reference: 120°F</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Uptime</span><span id="pi-uptime" class="pi-stat-value">—</span><span class="pi-stat-note">Since last boot</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">CPU Load</span><span id="pi-load" class="pi-stat-value">—</span><span id="pi-load-note" class="pi-stat-note">1 / 5 / 15 minute CPU load</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">RAM</span><span id="pi-memory" class="pi-stat-value">—</span><span id="pi-memory-note" class="pi-stat-note">—</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Storage</span><span id="pi-storage" class="pi-stat-value">—</span><span id="pi-storage-note" class="pi-stat-note">—</span></div>
            <div class="pi-stat-card"><span class="pi-stat-label">Hostname</span><span id="pi-hostname" class="pi-stat-value">—</span><span class="pi-stat-note">Pi device</span></div>
          </div>

          <section class="pi-control-section">
            <div class="pi-scheduler-header">
              <div>
                <h3>Scheduler</h3>
                <p id="pi-scheduler-summary" class="pi-scheduler-summary">Loading scheduler…</p>
              </div>
              <button id="pi-scheduler-refresh" class="pi-refresh-button" type="button">Refresh Scheduler</button>
            </div>
            <div id="pi-scheduler-list" class="pi-scheduler-list">
              <div class="pi-empty-state">Loading automations…</div>
            </div>
            <div id="pi-scheduler-message" class="pi-scheduler-message" role="status"></div>
            <div class="pi-history">
              <div class="pi-history-title">Recent Runs</div>
              <div id="pi-scheduler-history">
                <div class="pi-empty-state">Loading history…</div>
              </div>
            </div>
          </section>

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
    backdrop.querySelector("#pi-scheduler-refresh")?.addEventListener("click", refreshSchedulerData);

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
      setText("pi-temperature-note", "Reference: 120°F");
      setText("pi-load-note", "1 / 5 / 15 minute CPU load");
      setText("pi-memory-note", "—");
      setText("pi-storage-note", "—");
      return;
    }

    const memory = status.memory || {};
    const storage = status.storage || {};
    const load = Array.isArray(status.load_average) ? status.load_average : [];

    setText("pi-temperature", formatTemperature(status.temperature_c));
    setText("pi-temperature-note", status.temperature_c == null ? "Reference: 120°F" : `${temperatureStatus(status.temperature_c)} · Reference: ${TEMP_REFERENCE_F}°F`);
    setText("pi-uptime", formatUptime(status.uptime_seconds));
    setText("pi-load", load.length ? loadPercent(load[0]) : "—");
    setText("pi-load-note", load.length ? `${load.map(value => loadPercent(value)).join(" / ")} · 1 / 5 / 15 min` : "1 / 5 / 15 minute CPU load");
    setText("pi-memory", percent(memory.used, memory.total));
    setText("pi-memory-note", `${formatBytes(memory.used)} of ${formatBytes(memory.total)} used`);
    setText("pi-storage", percent(storage.used, storage.total));
    setText("pi-storage-note", `${formatBytes(storage.used)} of ${formatBytes(storage.total)} used`);
    setText("pi-hostname", status.hostname || "dashboard-pi");
  }

  function latestRunFor(automationId) {
    return latestSchedulerHistory.find(item => item?.automation_id === automationId) || null;
  }

  function renderScheduler() {
    const summary = document.getElementById("pi-scheduler-summary");
    const list = document.getElementById("pi-scheduler-list");
    const history = document.getElementById("pi-scheduler-history");
    if (!summary || !list || !history) return;

    const automations = Array.isArray(latestSchedulerStatus?.automations)
      ? latestSchedulerStatus.automations
      : [];

    const running = latestSchedulerStatus?.running === true;
    summary.textContent = latestSchedulerStatus
      ? `${running ? "Running" : "Unavailable"} · ${automations.length} automation${automations.length === 1 ? "" : "s"} · ${latestSchedulerStatus.timezone || "Pi timezone"}`
      : "Scheduler unavailable.";

    list.innerHTML = "";

    if (!automations.length) {
      const empty = document.createElement("div");
      empty.className = "pi-empty-state";
      empty.textContent = "No YAML automations were found on the Pi.";
      list.appendChild(empty);
    } else {
      automations.forEach(automation => {
        const card = document.createElement("div");
        card.className = "pi-automation-card";

        const top = document.createElement("div");
        top.className = "pi-automation-top";

        const name = document.createElement("div");
        name.className = "pi-automation-name";
        name.textContent = automation.name || automation.id || "Automation";

        const state = document.createElement("span");
        state.className = "pi-automation-state" + (automation.enabled ? " enabled" : "");
        state.textContent = automation.enabled ? "Enabled" : "Disabled";

        top.append(name, state);

        const meta = document.createElement("div");
        meta.className = "pi-automation-meta";

        const schedule = document.createElement("div");
        schedule.innerHTML = "<strong>Schedule</strong>";
        schedule.append(document.createTextNode(describeSchedule(automation.schedule || {})));

        const next = document.createElement("div");
        next.innerHTML = "<strong>Next Run</strong>";
        next.append(document.createTextNode(automation.enabled ? formatDateTime(automation.next_run) : "Disabled"));

        const lastRun = latestRunFor(automation.id);
        const last = document.createElement("div");
        last.innerHTML = "<strong>Last Run</strong>";
        last.append(document.createTextNode(lastRun ? formatDateTime(lastRun.timestamp) : "—"));

        const result = document.createElement("div");
        result.innerHTML = "<strong>Last Result</strong>";
        result.append(document.createTextNode(lastRun?.status ? String(lastRun.status).replaceAll("_", " ") : "—"));

        meta.append(schedule, next, last, result);

        const actions = document.createElement("div");
        actions.className = "pi-automation-actions";

        const runButton = document.createElement("button");
        runButton.type = "button";
        runButton.className = "pi-action-button";
        runButton.textContent = "Run Now";
        runButton.addEventListener("click", () => runSchedulerCommand(automation.id, "run", runButton));

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "pi-action-button secondary";
        toggleButton.textContent = automation.enabled ? "Disable" : "Enable";
        toggleButton.addEventListener("click", () =>
          runSchedulerCommand(automation.id, automation.enabled ? "disable" : "enable", toggleButton)
        );

        actions.append(runButton, toggleButton);
        card.append(top, meta, actions);
        list.appendChild(card);
      });
    }

    history.innerHTML = "";
    const recent = latestSchedulerHistory.slice(0, 8);
    if (!recent.length) {
      const empty = document.createElement("div");
      empty.className = "pi-empty-state";
      empty.textContent = "No scheduler runs recorded yet.";
      history.appendChild(empty);
    } else {
      recent.forEach(item => {
        const row = document.createElement("div");
        row.className = "pi-history-item";

        const main = document.createElement("div");
        main.className = "pi-history-main";

        const runName = document.createElement("span");
        runName.className = "pi-history-name";
        runName.textContent = item.name || item.automation_id || "Automation";

        const time = document.createElement("span");
        time.className = "pi-history-time";
        time.textContent = formatDateTime(item.timestamp);

        const status = document.createElement("span");
        status.className = "pi-history-status " + String(item.status || "");
        status.textContent = String(item.status || "unknown").replaceAll("_", " ");

        main.append(runName, time);
        row.append(main, status);
        history.appendChild(row);
      });
    }
  }

  async function refreshSchedulerData() {
    const refreshButton = document.getElementById("pi-scheduler-refresh");
    if (refreshButton) refreshButton.disabled = true;

    try {
      if (!activeApiBase) throw new Error("Raspberry Pi is unavailable.");

      const [schedulerStatus, historyPayload] = await Promise.all([
        apiFetch(activeApiBase, "/api/scheduler"),
        apiFetch(activeApiBase, "/api/scheduler/history?limit=50")
      ]);

      latestSchedulerStatus = schedulerStatus;
      latestSchedulerHistory = Array.isArray(historyPayload?.history) ? historyPayload.history : [];
      renderScheduler();
    } catch (error) {
      latestSchedulerStatus = null;
      latestSchedulerHistory = [];
      renderScheduler();
      setText("pi-scheduler-message", error?.message || "Scheduler data could not be loaded.");
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  async function runSchedulerCommand(automationId, action, button) {
    if (!activeApiBase || !automationId || !action) return;
    const originalText = button?.textContent || "";

    if (button) {
      button.disabled = true;
      button.textContent = action === "run" ? "Starting…" : "Saving…";
    }

    setText("pi-scheduler-message", action === "run" ? "Requesting manual run…" : "Updating automation…");

    try {
      await apiFetch(
        activeApiBase,
        `/api/scheduler/${encodeURIComponent(automationId)}/${action}`,
        { method: "POST", body: "{}" }
      );

      setText(
        "pi-scheduler-message",
        action === "run"
          ? "Run requested. The scheduler will execute it on the Pi."
          : action === "enable"
            ? "Automation enabled."
            : "Automation disabled."
      );

      await new Promise(resolve => setTimeout(resolve, action === "run" ? 2300 : 1200));
      await refreshSchedulerData();
    } catch (error) {
      setText("pi-scheduler-message", error?.message || "Scheduler action failed.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
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
      await refreshSchedulerData();
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
