if (!globalThis.browser) globalThis.browser = chrome;

const t = (id, fallback = "") => browser.i18n.getMessage(id) || fallback;
document.documentElement.lang = browser.i18n.getUILanguage() || "pt-BR";

for (const element of document.querySelectorAll("[data-i18n]")) {
  element.textContent = t(element.dataset.i18n, element.textContent);
}

function fail(message) {
  document.body.dataset.failed = "true";
  document.querySelector('[data-i18n="resultTabTitle"]').textContent = t("resultFailureTitle");
  document.querySelector('[data-i18n="resultTabBody"]').textContent = t("resultFailureBody");
  document.querySelector('[data-i18n="resultTabHint"]').textContent = t("resultFailureHint");
  document.getElementById("result-error-detail").textContent = message;
  document.getElementById("result-error").hidden = false;
}

document.getElementById("close-tab").addEventListener("click", async () => {
  const result = await browser.runtime.sendMessage({ type: "RV_CLOSE_RESULT_TAB" }).catch(() => null);
  if (!result?.ok) window.close();
});

const issue = new URLSearchParams(location.search).get("error");
if (issue) {
  const detail = issue === "google-upload"
    ? t("googleUploadUnavailable", "Google Images could not prepare this visual search. Please try again.")
    : t("resultTabExpired", "This search expired. Close the tab and try again.");
  fail(detail);
} else {
  launch().catch((error) => fail(error?.message || t("resultTabExpired")));
}

async function launch() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await browser.runtime.sendMessage({ type: "RV_START_GOOGLE_STAGE" }).catch(() => null);
    if (response?.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(t("resultTabExpired", "This search expired. Close the tab and try again."));
}
