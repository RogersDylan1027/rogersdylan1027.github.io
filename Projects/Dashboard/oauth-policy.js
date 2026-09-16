/* My Dashboard · Shared OAuth account chooser policy · Dashboard 0.9.0 */
(function () {
  "use strict";

  function addAccountChooserPrompt(options = {}) {
    const queryParams = { ...(options.queryParams || {}) };
    const promptParts = String(queryParams.prompt || "")
      .split(/\s+/)
      .filter(Boolean);

    if (!promptParts.includes("select_account")) {
      promptParts.push("select_account");
    }

    queryParams.prompt = promptParts.join(" ");
    return { ...options, queryParams };
  }

  function patchAuth(auth) {
    if (!auth || auth.__dashboardAccountChooserPolicy) return;

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
  }

  function patchLibrary(library) {
    if (!library?.createClient || library.__dashboardOAuthPolicy) return library;

    const originalCreateClient = library.createClient.bind(library);
    library.createClient = function (...args) {
      const client = originalCreateClient(...args);
      patchAuth(client?.auth);
      return client;
    };

    Object.defineProperty(library, "__dashboardOAuthPolicy", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });

    return library;
  }

  if (window.supabase) {
    patchLibrary(window.supabase);
    return;
  }

  let supabaseLibrary;
  Object.defineProperty(window, "supabase", {
    configurable: true,
    enumerable: true,
    get() {
      return supabaseLibrary;
    },
    set(value) {
      supabaseLibrary = patchLibrary(value);
    }
  });
})();
