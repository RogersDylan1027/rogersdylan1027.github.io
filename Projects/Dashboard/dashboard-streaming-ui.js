/*
  My Dashboard · Streaming Settings UI · Version 0.6.6
  TV Season & Episode Selection · 2026-08-14
*/
(function () {
  "use strict";

  const VERSION = "0.6.6";
  const TITLE = "TV Season & Episode Selection + My Dashboard Rebrand";
  const DESCRIPTION =
    "Adds Dashboard-owned season and episode selection for TV playback and renames the product from Dashboard  to My Dashboard. TV details load real TMDB seasons and episodes into dropdowns, default to saved viewing progress when available, and launch the exact selected episode without manual number entry. All user-facing  branding is removed while the existing playback warning, cross-device resume, and Dashboard-controlled fullscreen behavior remain intact.";

  let initialized = false;

  const get = id => document.getElementById(id);

  function css() {
    if (get("dashboard-streaming-settings-style")) return;

    const style = document.createElement("style");
    style.id = "dashboard-streaming-settings-style";
    style.textContent = `
      .streaming-provider-list{display:grid;gap:10px}
      .streaming-provider-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid #dfe3e8;border-radius:12px;background:#f7f8fa}
      .streaming-provider-main{display:flex;align-items:center;gap:10px;min-width:0}
      .streaming-provider-logo{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:9px;background:white;border:1px solid #dfe3e8;overflow:hidden;font-weight:900;color:#28487e}
      .streaming-provider-logo img{width:100%;height:100%;object-fit:cover}
      .streaming-provider-name{font-size:13px;font-weight:800}
      .streaming-provider-note{display:block;margin-top:2px;color:#777;font-size:11px;line-height:1.35}
      .streaming-action{min-height:34px;padding:7px 11px;border:1px solid #28487e;border-radius:9px;background:white;color:#28487e;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .streaming-action.primary{background:#28487e;color:white}
      .streaming-choice-grid{display:grid;gap:8px}
      .streaming-choice{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid #dfe3e8;border-radius:11px;background:#f7f8fa}
      .streaming-choice strong{display:block;font-size:13px}
      .streaming-choice small{display:block;margin-top:2px;color:#777;line-height:1.35}
      .streaming-priority-list{display:grid;gap:8px}
      .streaming-priority-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px;padding:10px 11px;border:1px solid #dfe3e8;border-radius:10px;background:white}
      .streaming-priority-number{width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:#eef3fb;color:#28487e;font-size:12px;font-weight:900}
      .streaming-priority-controls{display:flex;gap:5px}
      .streaming-priority-controls button{width:31px;height:31px;border:1px solid #c8cdd5;border-radius:8px;background:white;cursor:pointer;font-weight:900}
      .streaming-status{margin:10px 0 0;color:#777;font-size:11px;line-height:1.45}
      .streaming-status.error{color:#b3261e}
      .streaming-settings-link{display:inline-flex;margin-top:12px;min-height:36px;align-items:center;padding:8px 12px;border-radius:10px;background:#28487e;color:white;text-decoration:none;font-size:12px;font-weight:800}
      .streaming-warning-backdrop{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.48)}
      .streaming-warning-backdrop[hidden]{display:none}
      .streaming-warning-dialog{width:min(100%,470px);padding:22px;border:1px solid #d5d9df;border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.22);color:#252525}
      .streaming-warning-dialog h3{margin:0 0 8px;font-size:20px}
      .streaming-warning-dialog p{margin:0 0 12px;color:#606873;font-size:13px;line-height:1.55}
      .streaming-warning-check{display:flex;align-items:flex-start;gap:9px;margin:16px 0 0;padding:11px;border:1px solid #dfe3e8;border-radius:11px;background:#f7f8fa;font-size:12px;font-weight:700;line-height:1.4}
      .streaming-warning-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
      .streaming-warning-actions button{min-height:38px;padding:8px 12px;border-radius:10px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .streaming-warning-cancel{border:1px solid #c8cdd5;background:#fff;color:#252525}
      .streaming-warning-enable{border:1px solid #28487e;background:#28487e;color:#fff}
      .streaming-reset-warning{margin-top:8px;padding:0;border:0;background:transparent;color:#28487e;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
      @media(max-width:520px){.streaming-provider-row{align-items:stretch;flex-direction:column}.streaming-action{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function makeSection() {
    const section = document.createElement("section");
    section.id = "streaming-settings-section";
    section.className = "settings-section";
    section.innerHTML = `
      <h3>Streaming</h3>
      <p class="settings-section-description">
        Choose the streaming services you use and how My Dashboard should
        choose between providers when the same title is available in more than one place.
      </p>

      <div class="settings-provider-block">
        <p class="settings-provider-title">Your Streaming Services</p>
        <div id="streaming-provider-list" class="streaming-provider-list"></div>
        <p id="streaming-provider-status" class="streaming-status" role="status"></p>
      </div>

      <div class="settings-provider-block">
        <p class="settings-provider-title">Playback Preference</p>
        <label class="streaming-choice">
          <input id="streaming-dashboard-first" type="checkbox">
          <span>
            <strong>Prefer Dashboard Playback</strong>
            <small>Use an approved in-Dashboard player first whenever one is available.</small>
          </span>
        </label>
        <button
          id="streaming-reset-playback-warning"
          class="streaming-reset-warning"
          type="button"
        >Show Dashboard Playback warning again</button>
      </div>

      <div class="settings-provider-block">
        <p class="settings-provider-title">When Multiple Providers Have a Title</p>
        <div class="streaming-choice-grid">
          <label class="streaming-choice">
            <input type="radio" name="streaming-provider-mode" value="priority">
            <span>
              <strong>Use Provider Priority</strong>
              <small>Choose the highest available provider from your saved order.</small>
            </span>
          </label>

          <label class="streaming-choice">
            <input type="radio" name="streaming-provider-mode" value="ask">
            <span>
              <strong>Ask Every Time</strong>
              <small>Show only the providers that currently have the title and let me choose.</small>
            </span>
          </label>
        </div>
      </div>

      <div id="streaming-priority-block" class="settings-provider-block">
        <p class="settings-provider-title">Provider Priority</p>
        <div id="streaming-priority-list" class="streaming-priority-list"></div>
        <p class="streaming-status">Use the arrows to set the hierarchy. The first available provider wins.</p>
      </div>

      <div class="settings-provider-block">
        <p class="settings-provider-title">Streaming Page</p>
        <p class="settings-section-description">
          Continue Watching, combined provider discovery, Watchlist and future personalized rows live on the Streaming page.
        </p>
        <a class="streaming-settings-link" href="./Streaming/">Open Streaming</a>
      </div>
    `;

    const admin = get("admin-settings-section");
    if (admin?.parentNode) {
      admin.parentNode.insertBefore(section, admin);
    } else {
      const settings = get("settings-view");
      const content =
        settings?.querySelector(".settings-content") ||
        settings?.querySelector(".internal-view-content") ||
        settings?.querySelector(".internal-view");
      content?.appendChild(section);
    }
  }


  function ensurePlaybackWarningModal() {
    let backdrop = get("streaming-playback-warning-backdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "streaming-playback-warning-backdrop";
    backdrop.className = "streaming-warning-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="streaming-warning-dialog" role="dialog" aria-modal="true" aria-labelledby="streaming-playback-warning-title">
        <h3 id="streaming-playback-warning-title">Dashboard Playback Notice</h3>
        <p>Dashboard Playback uses a third-party player. Third-party tabs, windows, advertisements, or other content may open while using it. Close any tabs or windows you do not want to use.</p>
        <p>My Dashboard is not affiliated with, endorsed by, responsible for, or associated with third-party advertisements, pop-ups, websites, or other content that may appear.</p>
        <label class="streaming-warning-check">
          <input id="streaming-warning-dont-show" type="checkbox">
          <span>Don’t show this warning again</span>
        </label>
        <div class="streaming-warning-actions">
          <button id="streaming-warning-cancel" class="streaming-warning-cancel" type="button">Cancel</button>
          <button id="streaming-warning-enable" class="streaming-warning-enable" type="button">Enable Dashboard Playback</button>
        </div>
      </section>`;
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function showPlaybackWarning() {
    const backdrop = ensurePlaybackWarningModal();
    const checkbox = get("streaming-warning-dont-show");
    const cancel = get("streaming-warning-cancel");
    const enable = get("streaming-warning-enable");

    checkbox.checked = false;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    return new Promise(resolve => {
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        backdrop.hidden = true;
        document.body.style.overflow = "";
        cancel.removeEventListener("click", cancelHandler);
        enable.removeEventListener("click", enableHandler);
        backdrop.removeEventListener("click", backdropHandler);
        document.removeEventListener("keydown", keyHandler);
        resolve(result);
      };
      const cancelHandler = () => finish({ accepted:false, dontShowAgain:false });
      const enableHandler = () => finish({ accepted:true, dontShowAgain:checkbox.checked });
      const backdropHandler = event => { if (event.target === backdrop) cancelHandler(); };
      const keyHandler = event => { if (event.key === "Escape") cancelHandler(); };

      cancel.addEventListener("click", cancelHandler);
      enable.addEventListener("click", enableHandler);
      backdrop.addEventListener("click", backdropHandler);
      document.addEventListener("keydown", keyHandler);
      setTimeout(() => enable.focus(), 0);
    });
  }

  async function refresh() {
    if (!window.DashboardStreaming) return;

    const list = get("streaming-provider-list");
    const status = get("streaming-provider-status");

    try {
      status.textContent = "Loading streaming services…";
      status.classList.remove("error");

      const [providers, enabledRows, prefs] = await Promise.all([
        DashboardStreaming.listProviders(),
        DashboardStreaming.loadUserProviders(),
        DashboardStreaming.loadPreferences()
      ]);

      const enabledMap = new Map(
        enabledRows.map(row => [String(row.provider_id), row])
      );

      list.innerHTML = "";

      providers.forEach(provider => {
        const current = enabledMap.get(String(provider.id));
        const row = document.createElement("div");
        row.className = "streaming-provider-row";

        const main = document.createElement("div");
        main.className = "streaming-provider-main";

        const logo = document.createElement("div");
        logo.className = "streaming-provider-logo";
        if (provider.logo_path) {
          const img = document.createElement("img");
          img.alt = "";
          img.src = "https://image.tmdb.org/t/p/w92" + provider.logo_path;
          logo.appendChild(img);
        } else {
          logo.textContent = provider.name.slice(0, 1);
        }

        const text = document.createElement("div");
        const name = document.createElement("span");
        name.className = "streaming-provider-name";
        name.textContent = provider.name;

        const note = document.createElement("span");
        note.className = "streaming-provider-note";
        note.textContent = current
          ? (current.connection_type === "authenticated"
              ? "Connected account"
              : "Added · used for availability and playback")
          : (provider.supports_auth
              ? "Account connection available"
              : "Add this subscription; no unnecessary provider login");

        text.append(name, note);
        main.append(logo, text);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "streaming-action " + (current ? "" : "primary");
        button.textContent = current ? "Remove" : (provider.supports_auth ? "Connect" : "Add");
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            if (current) {
              await DashboardStreaming.removeProvider(provider.id);
            } else {
              await DashboardStreaming.addProvider(provider.id);
            }
            await refresh();
          } catch (error) {
            status.textContent = error.message || "Streaming service could not be updated.";
            status.classList.add("error");
          } finally {
            button.disabled = false;
          }
        });

        row.append(main, button);
        list.appendChild(row);
      });

      get("streaming-dashboard-first").checked =
        Boolean(prefs.prefer_dashboard_playback);


      const resetWarningButton = get("streaming-reset-playback-warning");
      if (resetWarningButton) {
        resetWarningButton.hidden =
          !Boolean(prefs.dashboard_playback_warning_acknowledged);
      }

      document.querySelectorAll('input[name="streaming-provider-mode"]').forEach(input => {
        input.checked = input.value === prefs.provider_selection_mode;
      });

      renderPriority(enabledRows, prefs.provider_selection_mode);
      status.textContent = enabledRows.length
        ? enabledRows.length + (enabledRows.length === 1 ? " streaming service added." : " streaming services added.")
        : "Add the services this Dashboard user can watch.";
    } catch (error) {
      console.error("Streaming settings:", error);
      status.textContent =
        error.message ||
        "Streaming settings are unavailable. Run the 0.6.0 streaming schema first.";
      status.classList.add("error");
    }
  }

  function renderPriority(rows, mode) {
    const block = get("streaming-priority-block");
    const list = get("streaming-priority-list");
    block.hidden = mode !== "priority";
    list.innerHTML = "";

    const sorted = rows
      .filter(row => row.enabled)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

    if (!sorted.length) {
      list.innerHTML = '<p class="streaming-status">Add at least one streaming service first.</p>';
      return;
    }

    sorted.forEach((row, index) => {
      const item = document.createElement("div");
      item.className = "streaming-priority-row";

      const number = document.createElement("span");
      number.className = "streaming-priority-number";
      number.textContent = String(index + 1);

      const name = document.createElement("strong");
      name.textContent = row.streaming_providers?.name || "Provider";

      const controls = document.createElement("div");
      controls.className = "streaming-priority-controls";

      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.title = "Move up";
      up.disabled = index === 0;

      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.title = "Move down";
      down.disabled = index === sorted.length - 1;

      async function move(direction) {
        const target = index + direction;
        if (target < 0 || target >= sorted.length) return;

        const ids = sorted.map(entry => entry.provider_id);
        [ids[index], ids[target]] = [ids[target], ids[index]];

        await DashboardStreaming.savePriorityOrder(ids);
        await refresh();
      }

      up.addEventListener("click", () => move(-1));
      down.addEventListener("click", () => move(1));
      controls.append(up, down);
      item.append(number, name, controls);
      list.appendChild(item);
    });
  }

  function bind() {
    get("streaming-dashboard-first")?.addEventListener("change", async event => {
      const checkbox = event.target;
      try {
        if (!checkbox.checked) {
          await DashboardStreaming.savePreferences({
            prefer_dashboard_playback: false
          });
          return;
        }

        const prefs = await DashboardStreaming.loadPreferences();

        if (prefs.dashboard_playback_warning_acknowledged) {
          await DashboardStreaming.savePreferences({
            prefer_dashboard_playback: true
          });
          return;
        }

        checkbox.checked = false;
        const decision = await showPlaybackWarning();

        if (!decision.accepted) {
          await DashboardStreaming.savePreferences({
            prefer_dashboard_playback: false
          });
          return;
        }

        await DashboardStreaming.savePreferences({
          prefer_dashboard_playback: true,
          dashboard_playback_warning_acknowledged:
            Boolean(decision.dontShowAgain)
        });

        checkbox.checked = true;
        await refresh();
      } catch (error) {
        checkbox.checked = false;
        console.error("Dashboard Playback preference:", error);
      }
    });

    get("streaming-reset-playback-warning")?.addEventListener("click", async () => {
      try {
        await DashboardStreaming.savePreferences({
          dashboard_playback_warning_acknowledged: false
        });
        await refresh();
      } catch (error) {
        console.error("Reset Dashboard Playback warning:", error);
      }
    });

    document.querySelectorAll('input[name="streaming-provider-mode"]').forEach(input => {
      input.addEventListener("change", async event => {
        if (!event.target.checked) return;
        try {
          await DashboardStreaming.savePreferences({
            provider_selection_mode: event.target.value
          });
          await refresh();
        } catch (error) {
          console.error(error);
        }
      });
    });

    // Refresh each time Settings opens, including changes made on another device.
    const settings = get("settings-view");
    if (settings && window.MutationObserver) {
      new MutationObserver(() => {
        if (!settings.hidden) refresh();
      }).observe(settings, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  function addChangelogRuntimeEntry() {
    // Existing Dashboard changelog is rendered from its own array. Rather than
    // mutate legacy source, add a visible 0.6.0 summary at the top when the
    // changelog modal opens.
    const view = get("changelog-view");
    if (!view) return;

    const inject = () => {
      const body =
        view.querySelector(".changelog-list") ||
        view.querySelector("tbody") ||
        view.querySelector(".internal-view-content") ||
        view.querySelector(".changelog-content");

      if (!body || get("streaming-066-changelog-entry")) return;

      if (body.tagName === "TBODY") {
        const tr = document.createElement("tr");
        tr.id = "streaming-066-changelog-entry";
        tr.innerHTML =
          `<td>${VERSION}</td><td>${TITLE}</td><td>${DESCRIPTION}<br><strong>Bug Fixes:</strong> Preserves the Dashboard Playback warning and Dashboard-owned fullscreen behavior while adding TMDB-driven TV season and episode selection.</td>`;
        body.prepend(tr);
      } else {
        const card = document.createElement("div");
        card.id = "streaming-066-changelog-entry";
        card.style.cssText =
          "margin:0 0 12px;padding:14px;border:1px solid #dfe3e8;border-radius:12px;background:#f7f8fa";
        card.innerHTML =
          `<strong>${VERSION} · ${TITLE}</strong><p style="margin:7px 0 0;line-height:1.5">${DESCRIPTION}</p><p style="margin:7px 0 0;line-height:1.5"><strong>Bug Fixes:</strong> Preserves the Dashboard Playback warning and Dashboard-owned fullscreen behavior while adding TMDB-driven TV season and episode selection.</p>`;
        body.prepend(card);
      }
    };

    new MutationObserver(inject).observe(view, {
      attributes: true,
      childList: true,
      subtree: true
    });
    inject();
  }

  async function init() {
    if (initialized) return;
    if (!get("settings-view") || !window.DashboardStreaming) return;

    initialized = true;
    css();
    makeSection();
    bind();
    addChangelogRuntimeEntry();
    window.DashboardApplyCurrentVersionLabel?.();
    await refresh();
  }

  const timer = setInterval(() => {
    if (initialized) {
      clearInterval(timer);
      return;
    }
    init().catch(console.error);
  }, 150);

  setTimeout(() => clearInterval(timer), 20000);
})();
