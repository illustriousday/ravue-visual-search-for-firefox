(function () {
  "use strict";

  if (!globalThis.browser) globalThis.browser = chrome;

  async function inspectResultPage() {
    const tab = await browser.runtime.sendMessage({ type: "RV_IS_RESULT_TAB" }).catch(() => null);
    if (!tab?.ok) return;
    const text = (document.body?.innerText || "").slice(0, 1600);
    if (/\b403\b/.test(text) && /(access|acesso|forbidden|error|erro)/i.test(text)) {
      await browser.runtime.sendMessage({ type: "RV_LENS_TAB_ERROR", reason: "google403" }).catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inspectResultPage, { once: true });
  } else {
    inspectResultPage();
  }
})();
