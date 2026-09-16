/*
  My Dashboard · Account Approval Runtime · Version 0.10.0
  Account Approval & Admin Messaging · 2026-09-16
*/
(function () {
  "use strict";

  const config = window.DashboardConfig;
  if (!config) return;
  const SUPPORT_PARAM = "support";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function formatDate(value) {
    if (!value) return "";
    try { return new Date(value).toLocaleString(); } catch { return String(value); }
  }

  async function getClient() {
    if (window.DashboardEntryAuth?.client) return window.DashboardEntryAuth.client;
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = config.supabaseScriptUrl;
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", reject, { once: true });
        document.head.appendChild(script);
      });
    }
    window.__dashboardAccountClient ||= window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    return window.__dashboardAccountClient;
  }

  function styleButton(button, primary = false, danger = false) {
    button.style.cssText =
      "min-height:36px;padding:8px 13px;border-radius:18px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;" +
      (danger
        ? "border:1px solid #b3261e;background:#fff;color:#b3261e;"
        : primary
          ? "border:1px solid #2450a4;background:#2450a4;color:#fff;"
          : "border:1px solid #b9c0ca;background:#fff;color:#2450a4;");
  }

  async function invokeFunction(client, name, body) {
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function installAccountRequestView() {
    if (!location.pathname.endsWith("/login.html")) return;
    const signUpView = document.getElementById("sign-up-view");
    if (!signUpView || signUpView.dataset.accountRequestInstalled) return;
    signUpView.dataset.accountRequestInstalled = "true";
    signUpView.innerHTML = `
      <h2 class="view-title">Request Access</h2>
      <p class="view-description">
        My Dashboard is invite-only. Enter your email and the Main Admin will review your request.
      </p>
      <form id="dashboard-access-request-form">
        <div class="field">
          <label for="dashboard-access-request-email">Email</label>
          <input id="dashboard-access-request-email" type="email" autocomplete="email" required>
        </div>
        <button class="button primary" type="submit">Request Account</button>
      </form>
      <div class="links">
        <button class="link-button back-to-sign-in" type="button">Back to sign in</button>
      </div>
      <p id="dashboard-access-request-status" class="status" role="status"></p>
    `;

    const form = document.getElementById("dashboard-access-request-form");
    const status = document.getElementById("dashboard-access-request-status");
    form?.addEventListener("submit", async event => {
      event.preventDefault();
      const email = document.getElementById("dashboard-access-request-email")?.value?.trim();
      const button = form.querySelector("button[type=submit]");
      if (!email) return;
      button.disabled = true;
      status.textContent = "Sending your request…";
      status.className = "status";
      try {
        const client = await getClient();
        await invokeFunction(client, "dashboard-account-request", { email });
        status.textContent = "Request sent. You’ll receive an email after the Main Admin reviews it.";
        status.className = "status success";
      } catch (error) {
        console.error("Account request:", error);
        status.textContent = error?.message || "Your request could not be sent.";
        status.className = "status error";
      } finally {
        button.disabled = false;
      }
    });

    signUpView.querySelector(".back-to-sign-in")?.addEventListener("click", () => {
      signUpView.hidden = true;
      const signIn = document.getElementById("sign-in-view");
      if (signIn) signIn.hidden = false;
    });

    const params = new URLSearchParams(location.search);
    if (params.get("approved") === "1") {
      const status = document.getElementById("auth-status");
      if (status) {
        status.textContent = "Your My Dashboard account was approved. You can sign in now.";
        status.classList.add("success");
      }
    }
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError && /approved|request access|signup/i.test(oauthError)) {
      const status = document.getElementById("auth-status");
      if (status) {
        status.textContent = "That email is not approved for My Dashboard yet. Choose Create account to request access.";
        status.classList.add("error");
      }
    }
  }

  async function installSupportView() {
    if (!location.pathname.endsWith("/login.html")) return;
    const token = new URLSearchParams(location.search).get(SUPPORT_PARAM);
    if (!token) return;

    const card = document.querySelector(".login-card");
    if (!card || card.dataset.supportInstalled) return;
    card.dataset.supportInstalled = "true";
    card.innerHTML = `
      <div id="dashboard-support-view">
        <h2 class="view-title">Account Request Support</h2>
        <p class="view-description">
          This private conversation is only with the admin who reviewed your request.
          It closes 24 hours after the most recent message.
        </p>
        <div id="dashboard-support-messages" style="display:grid;gap:10px;max-height:48vh;overflow:auto;margin:18px 0;"></div>
        <form id="dashboard-support-form">
          <div class="field">
            <label for="dashboard-support-message">Message</label>
            <textarea id="dashboard-support-message" required maxlength="4000"
              style="min-height:100px;width:100%;padding:10px 12px;border:1px solid #d5d9df;border-radius:12px;font:inherit;resize:vertical;"></textarea>
          </div>
          <button class="button primary" type="submit">Send Message</button>
        </form>
        <p id="dashboard-support-status" class="status" role="status"></p>
      </div>
    `;

    const client = await getClient();
    const messages = document.getElementById("dashboard-support-messages");
    const status = document.getElementById("dashboard-support-status");
    const form = document.getElementById("dashboard-support-form");

    async function refresh() {
      const { data, error } = await client.rpc("dashboard_support_get_thread", { requested_token: token });
      if (error) throw error;
      if (!data?.ok) {
        messages.innerHTML = "";
        form.hidden = true;
        status.textContent = "This support link has expired. Submit a new account request if you still need access.";
        status.className = "status error";
        return;
      }
      const rows = Array.isArray(data.messages) ? data.messages : [];
      messages.innerHTML = rows.length ? rows.map(message => `
        <div style="padding:10px 12px;border-radius:12px;background:${message.sender_kind === "admin" ? "#e8f0fe" : "#f2f3f5"};">
          <div style="font-size:11px;font-weight:800;margin-bottom:4px;">${message.sender_kind === "admin" ? "Admin" : "You"}</div>
          <div style="white-space:pre-wrap;line-height:1.45;">${esc(message.message)}</div>
          <div style="font-size:10px;color:#777;margin-top:5px;">${esc(formatDate(message.created_at))}</div>
        </div>`).join("") : '<p style="color:#68707c;font-size:13px;">No messages yet. Send a message below if you need help.</p>';
      messages.scrollTop = messages.scrollHeight;
      status.textContent = `Support access remains active until ${formatDate(data.expires_at)} unless another message extends it.`;
      status.className = "status";
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const input = document.getElementById("dashboard-support-message");
      const text = input.value.trim();
      if (!text) return;
      const button = form.querySelector("button");
      button.disabled = true;
      status.textContent = "Sending…";
      try {
        const { data, error } = await client.rpc("dashboard_support_send_message", {
          requested_token: token,
          requested_message: text
        });
        if (error) throw error;
        if (!data?.ok) throw new Error("This support link has expired.");
        input.value = "";
        await refresh();
      } catch (error) {
        status.textContent = error?.message || "Your message could not be sent.";
        status.className = "status error";
      } finally {
        button.disabled = false;
      }
    });

    try { await refresh(); }
    catch (error) {
      status.textContent = error?.message || "Support could not be loaded.";
      status.className = "status error";
    }
  }

  function makeSection(title, description) {
    const section = document.createElement("section");
    section.className = "settings-section";
    section.style.cssText = "margin-top:24px;padding-top:20px;border-top:1px solid #e3e5e8;";
    const h = document.createElement("h3"); h.textContent = title;
    const p = document.createElement("p"); p.className = "settings-section-description"; p.textContent = description;
    section.append(h,p);
    return section;
  }

  async function installAdminAccessControls() {
    if (!location.pathname.endsWith("/index.html") && !location.pathname.endsWith("/Dashboard/")) return;
    const settings = document.getElementById("settings-view");
    const host = settings?.querySelector(".settings-content");
    if (!host || document.getElementById("dashboard-account-admin-section")) return;

    const client = await getClient();
    const { data: access, error } = await client.rpc("dashboard_account_access_state");
    if (error || !access?.admin) return;

    const section = makeSection(
      access.main_admin ? "Account Approvals & Administrators" : "Account Support",
      access.main_admin
        ? "Review account requests, control administrator access, and reply to support conversations assigned to you."
        : "Reply to declined-account support conversations assigned to you."
    );
    section.id = "dashboard-account-admin-section";
    const content = document.createElement("div");
    section.appendChild(content);
    host.appendChild(section);

    async function renderSupport() {
      const { data, error } = await client.rpc("admin_list_assigned_support_threads");
      if (error) throw error;
      const active = (data || []).filter(thread => thread.active);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `<h4 style="margin:18px 0 8px;">Assigned Support</h4>`;
      if (!active.length) {
        wrapper.insertAdjacentHTML("beforeend", '<p style="font-size:13px;color:#68707c;">No active support conversations.</p>');
        return wrapper;
      }
      active.forEach(thread => {
        const box = document.createElement("div");
        box.style.cssText = "margin:10px 0;padding:12px;border:1px solid #dfe3e8;border-radius:12px;background:#f7f8fa;";
        box.innerHTML = `<strong>${esc(thread.applicant_email)}</strong>
          <div style="font-size:11px;color:#68707c;margin:3px 0 8px;">Active until ${esc(formatDate(thread.expires_at))}</div>
          <div style="display:grid;gap:6px;margin-bottom:8px;">${
            (thread.messages || []).map(m => `<div style="font-size:12px;"><b>${m.sender_kind === "admin" ? "You" : "Applicant"}:</b> ${esc(m.message)}</div>`).join("") ||
            '<span style="font-size:12px;color:#68707c;">No messages yet.</span>'
          }</div>`;
        const form = document.createElement("form");
        form.style.cssText = "display:flex;gap:8px;";
        const input = document.createElement("input");
        input.placeholder = "Reply…"; input.required = true; input.maxLength = 4000;
        input.style.cssText = "flex:1;min-width:0;padding:8px 10px;border:1px solid #c8cdd5;border-radius:10px;";
        const send = document.createElement("button"); send.type="submit"; send.textContent="Send"; styleButton(send, true);
        form.append(input,send);
        form.addEventListener("submit", async e => {
          e.preventDefault(); send.disabled=true;
          try {
            const { data, error } = await client.rpc("admin_send_support_message", {
              requested_thread_id: thread.thread_id,
              requested_message: input.value.trim()
            });
            if (error) throw error;
            if (!data?.ok) throw new Error("This support conversation has expired.");
            await renderAll();
          } catch (err) { alert(err?.message || "Reply could not be sent."); }
          finally { send.disabled=false; }
        });
        box.appendChild(form); wrapper.appendChild(box);
      });
      return wrapper;
    }

    async function renderAll() {
      content.innerHTML = "";
      if (access.main_admin) {
        const requestHeader = document.createElement("h4");
        requestHeader.style.margin = "10px 0 8px";
        requestHeader.textContent = "Account Requests";
        content.appendChild(requestHeader);

        const { data: requests, error: requestError } = await client.rpc("main_admin_list_account_requests");
        if (requestError) throw requestError;
        const pending = (requests || []).filter(item => item.status === "pending");
        if (!pending.length) {
          content.insertAdjacentHTML("beforeend", '<p style="font-size:13px;color:#68707c;">No pending account requests.</p>');
        }
        pending.forEach(request => {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid #eee;";
          row.innerHTML = `<div><strong>${esc(request.email)}</strong><div style="font-size:11px;color:#68707c;">Requested ${esc(formatDate(request.requested_at))}</div></div>`;
          const actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:7px;";
          const approve = document.createElement("button"); approve.textContent="Approve"; styleButton(approve, true);
          const decline = document.createElement("button"); decline.textContent="Decline"; styleButton(decline, false, true);
          approve.addEventListener("click", () => review(request, "approved", null, approve, decline));
          decline.addEventListener("click", () => {
            const reason = window.prompt("Reason for declining (optional):", "");
            if (reason === null) return;
            review(request, "declined", reason, approve, decline);
          });
          actions.append(approve,decline); row.appendChild(actions); content.appendChild(row);
        });

        const userHeader = document.createElement("h4"); userHeader.style.margin="22px 0 8px"; userHeader.textContent="Administrator Accounts";
        content.appendChild(userHeader);
        const { data: users, error: userError } = await client.rpc("main_admin_list_dashboard_users");
        if (userError) throw userError;
        (users || []).forEach(user => {
          const row = document.createElement("div");
          row.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee;";
          const label=document.createElement("span"); label.textContent=user.email;
          if (user.role === "main_admin") {
            const badge=document.createElement("strong"); badge.textContent="Main Admin"; row.append(label,badge);
          } else {
            const select=document.createElement("select");
            select.innerHTML='<option value="user">User</option><option value="admin">Admin</option>';
            select.value=user.role === "admin" ? "admin" : "user";
            select.addEventListener("change", async () => {
              select.disabled=true;
              try {
                const { error } = await client.rpc("main_admin_set_user_role", {
                  requested_user_id:user.user_id, requested_role:select.value
                });
                if (error) throw error;
              } catch(err) { alert(err?.message || "Role could not be changed."); }
              finally { select.disabled=false; }
            });
            row.append(label,select);
          }
          content.appendChild(row);
        });
      }
      content.appendChild(await renderSupport());
    }

    async function review(request, decision, reason, ...buttons) {
      buttons.forEach(b => b.disabled=true);
      try {
        await invokeFunction(client, "dashboard-account-review", {
          requestId: request.request_id, decision, reason
        });
        await renderAll();
      } catch (error) {
        alert(error?.message || "The account request could not be reviewed.");
        buttons.forEach(b => b.disabled=false);
      }
    }

    try { await renderAll(); }
    catch (error) {
      content.textContent = error?.message || "Account administration could not be loaded.";
    }
  }

  async function showUnreadNotifications() {
    if (!window.DashboardEntryAuth?.user) return;
    const client = await getClient();
    const { data } = await client.from("dashboard_notifications")
      .select("id,title,body,created_at")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data?.length) return;
    const latest = data[0];
    const seenKey = "dashboard-notification-" + latest.id;
    if (window.Notification?.permission === "granted" && !sessionStorage.getItem(seenKey)) {
      try {
        const registration = await navigator.serviceWorker?.ready;
        await registration?.showNotification(latest.title, {
          body: latest.body, icon: config.logoUrl, badge: config.logoUrl,
          tag: "dashboard-admin-" + latest.id,
          data: { url: config.dashboardUrl + "?accountRequests=1" }
        });
        sessionStorage.setItem(seenKey, "1");
      } catch {}
    }
  }

  async function init() {
    installAccountRequestView();
    await installSupportView();
    setTimeout(() => installAdminAccessControls().catch(console.warn), 350);
    setTimeout(() => showUnreadNotifications().catch(console.warn), 1200);
  }

  document.addEventListener("DOMContentLoaded", () => { init().catch(console.error); });
})();
