(function (scope) {
  "use strict";

  const LOAD_TIMEOUT_MS = 30000;

  if (!scope.browser) scope.browser = scope.chrome;

  scope.browser.runtime.onMessage.addListener((request) => {
    if (request.type !== "RV_REVEAL_LENS") return undefined;
    scope.RavueLoadingScreen?.remove();
    return Promise.resolve({ ok: true });
  });

  async function launch() {
    const probe = await scope.browser.runtime.sendMessage({ type: "RV_LENS_RESULT_PROBE" });
    if (!probe?.pending) {
      scope.RavueLoadingScreen?.remove();
      return;
    }
    scope.RavueLoadingScreen?.mount();
    let timer;
    let onLoad;
    try {
      // The cover is cosmetic, never a reason to leave a tab unusable. A single
      // deadline also bounds an unresponsive background message after load.
      const deadline = new Promise((resolve) => {
        timer = scope.setTimeout(() => resolve(false), LOAD_TIMEOUT_MS);
      });
      const loaded = scope.document?.readyState === "complete"
        ? Promise.resolve(true)
        : new Promise((resolve) => {
          onLoad = () => resolve(true);
          scope.addEventListener("load", onLoad, { once: true });
        });
      if (await Promise.race([loaded, deadline])) {
        await Promise.race([
          scope.browser.runtime.sendMessage({ type: "RV_LENS_DOCUMENT_READY" }),
          deadline,
        ]);
      }
    } finally {
      scope.clearTimeout(timer);
      if (onLoad) scope.removeEventListener("load", onLoad);
      // Expiry or rejection between PROBE and READY must also reveal the page.
      scope.RavueLoadingScreen?.remove();
    }
  }

  if (!scope.__RAVUE_LENS_READY_INSTALLED__) {
    scope.__RAVUE_LENS_READY_INSTALLED__ = true;
    launch().catch(() => scope.RavueLoadingScreen?.remove());
  }
})(typeof globalThis === "undefined" ? this : globalThis);
