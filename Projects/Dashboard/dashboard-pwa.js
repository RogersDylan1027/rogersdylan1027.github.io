/* My Dashboard · PWA Runtime · Version 0.10.7 · Persistent Admin Notification Bell · 2026-09-23 */
(function () {
  "use strict";
  const config = window.DashboardConfig;
  if (!config) return;
  const BASE_PATH = "/Projects/Dashboard/";

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }
  function isInternalDashboardUrl(url) {
    try { const parsed = new URL(url, window.location.href); return parsed.origin === window.location.origin && parsed.pathname.startsWith(BASE_PATH); }
    catch { return false; }
  }
  function keepDashboardNavigationInApp() {
    document.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]"); if (!anchor) return;
      const rawHref = anchor.getAttribute("href"); if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;
      if (!isInternalDashboardUrl(anchor.href)) return;
      if (isStandalone() && anchor.target === "_blank") { event.preventDefault(); window.location.href = anchor.href; }
    }, true);
  }
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    try { return await navigator.serviceWorker.register(config.serviceWorkerUrl, { scope: BASE_PATH, updateViaCache: "none" }); }
    catch (error) { console.warn("Dashboard service worker registration failed:", error); return null; }
  }
  function findSettingsHost() {
    const settings = document.getElementById("settings-view");
    return settings?.querySelector(".settings-content, .settings-container, .settings-panel") || settings || null;
  }
  function statusText() {
    if (!window.isSecureContext) return "Unavailable: secure HTTPS is required.";
    if (!("Notification" in window)) return "Notifications are not supported by this browser.";
    if (!isStandalone() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) return "Add My Dashboard to your Home Screen first, then open it from the new icon to enable iPhone notifications.";
    if (Notification.permission === "granted") return "Notifications are enabled.";
    if (Notification.permission === "denied") return "Notifications are blocked. Change notification permission in iPhone Settings to enable them.";
    return "Notifications have not been enabled yet.";
  }
  function base64UrlToUint8Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }
  async function syncPushSubscription() {
    if (Notification.permission !== "granted" || !("serviceWorker" in navigator)) {
      throw new Error("Notification permission is not enabled on this device.");
    }
    const authClient = window.DashboardEntryAuth?.client;
    const access = window.DashboardEntryAuth?.access;
    if (!authClient || !access?.admin) {
      throw new Error("Administrator access is required to register notifications.");
    }

    const registration = await navigator.serviceWorker.ready;
    const { data: configData, error: configError } =
      await authClient.functions.invoke("dashboard-push-config", { body: {} });
    if (configError) throw configError;
    if (!configData?.publicKey) throw new Error("Push configuration is unavailable.");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(configData.publicKey)
      });
    }

    const json = subscription.toJSON();
    const { data: saveData, error: saveError } =
      await authClient.functions.invoke("dashboard-push-config", {
        body: {
          subscription: {
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            userAgent: navigator.userAgent
          }
        }
      });
    if (saveError) throw saveError;
    if (saveData?.registered !== true) {
      throw new Error("This device could not be verified for Dashboard push notifications.");
    }
    return true;
  }
  async function showTestNotification() {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("My Dashboard", { body: "Notifications are working on this device.", icon: config.logoUrl, badge: config.logoUrl, tag: "dashboard-test-notification", data: { url: config.dashboardUrl } });
  }
  function addSettingsSection() {
    if (document.getElementById("dashboard-pwa-settings")) return;
    const host = findSettingsHost(); if (!host) return;
    const section = document.createElement("section"); section.id = "dashboard-pwa-settings"; section.style.cssText = "margin-top:24px;padding:18px;border:1px solid #d5d9df;border-radius:14px;background:#fff;";
    const heading = document.createElement("h3"); heading.textContent = "App & Notifications"; heading.style.margin = "0 0 8px";
    const appStatus = document.createElement("p"); appStatus.style.cssText = "margin:0 0 8px;color:#666;font-size:14px;line-height:1.45;"; appStatus.textContent = isStandalone() ? "App mode: Installed Home Screen app" : "App mode: Browser tab. Add My Dashboard to your Home Screen for the full app experience.";
    const notificationStatus = document.createElement("p"); notificationStatus.style.cssText = "margin:0 0 14px;color:#666;font-size:14px;line-height:1.45;"; notificationStatus.textContent = statusText();
    const actions = document.createElement("div"); actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
    const enableButton = document.createElement("button"); enableButton.type = "button"; enableButton.textContent = "Enable Notifications"; enableButton.style.cssText = "padding:9px 14px;border:1px solid #2450a4;border-radius:18px;background:#2450a4;color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;";
    const testButton = document.createElement("button"); testButton.type = "button"; testButton.textContent = "Send Test Notification"; testButton.style.cssText = "padding:9px 14px;border:1px solid #2450a4;border-radius:18px;background:#fff;color:#2450a4;font:inherit;font-size:13px;font-weight:600;cursor:pointer;";
    const refresh = () => {
      notificationStatus.textContent = statusText();
      enableButton.disabled = !("Notification" in window) || Notification.permission === "denied";
      enableButton.textContent = Notification.permission === "granted" ? "Register This Device" : "Enable Notifications";
      testButton.disabled = !("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator);
    };
    enableButton.addEventListener("click", async () => {
      try {
        await registerServiceWorker();
        if (Notification.permission !== "granted") await Notification.requestPermission();
        if (Notification.permission === "granted") {
          notificationStatus.textContent = "Registering this admin device…";
          await syncPushSubscription();
          notificationStatus.textContent = "Notifications are enabled and this admin device is registered with My Dashboard.";
        }
      } catch (error) { console.warn("Notification permission/subscription failed:", error); notificationStatus.textContent = error?.message || "Notifications could not be enabled on this device."; }
      refresh();
    });
    testButton.addEventListener("click", async () => {
      try {
        notificationStatus.textContent = "Verifying this device…";
        await syncPushSubscription();
        await showTestNotification();
        notificationStatus.textContent = "Test notification sent and this admin device is registered.";
      } catch (error) {
        console.warn("Test notification failed:", error);
        notificationStatus.textContent = error?.message || "The test notification could not be sent on this device.";
      }
    });
    actions.append(enableButton, testButton); section.append(heading, appStatus, notificationStatus, actions); host.appendChild(section); refresh();
    if (Notification.permission === "granted") setTimeout(() => syncPushSubscription().catch(console.warn), 0);
  }
  keepDashboardNavigationInApp();
  registerServiceWorker();

  function initializePwaSettings() {
    addSettingsSection();
    setTimeout(addSettingsSection, 500);
    setTimeout(addSettingsSection, 1500);
  }

  function ensurePushRegistration(attempt = 0) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    syncPushSubscription().catch(error => {
      if (attempt < 60) {
        setTimeout(() => ensurePushRegistration(attempt + 1), 250);
      } else {
        console.warn("Automatic push registration failed:", error);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializePwaSettings();
      ensurePushRegistration();
    }, { once: true });
  } else {
    initializePwaSettings();
    ensurePushRegistration();
  }

  window.addEventListener("dashboard-auth-ready", () => {
    initializePwaSettings();
    ensurePushRegistration();
  }, { passive: true });
})();
