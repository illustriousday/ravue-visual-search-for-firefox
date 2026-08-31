(function (scope) {
  "use strict";

  function message(browserApi, id, fallback = "") {
    return browserApi?.i18n?.getMessage?.(id) || fallback;
  }

  function localize(documentObject, browserApi) {
    documentObject.documentElement.lang = browserApi.i18n.getUILanguage() || "pt-BR";
    for (const element of documentObject.querySelectorAll("[data-i18n]")) {
      element.textContent = message(browserApi, element.dataset.i18n, element.textContent);
    }
  }

  function showVersion(documentObject, browserApi) {
    const target = documentObject.getElementById("version");
    const version = browserApi.runtime.getManifest()?.version;
    if (target && version) target.textContent = `v${version}`;
  }

  async function requestSelector(environment = scope) {
    const browserApi = environment.browser || environment.chrome;
    const documentObject = environment.document;
    const button = documentObject.getElementById("open-selector");
    const status = documentObject.getElementById("status");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.hidden = false;
    status.textContent = message(browserApi, "popupOpening", "Opening selector…");

    try {
      const response = await browserApi.runtime.sendMessage({ type: "RV_POPUP_OPEN_SELECTOR" });
      if (!response?.ok) throw new Error(response?.error || "selector-unavailable");
      environment.close();
      return true;
    } catch (_) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      status.textContent = message(
        browserApi,
        "popupError",
        "Ravue could not open on this page.",
      );
      return false;
    }
  }

  function launch(environment = scope) {
    const browserApi = environment.browser || environment.chrome;
    const documentObject = environment.document;
    if (!browserApi || !documentObject) return false;
    localize(documentObject, browserApi);
    showVersion(documentObject, browserApi);
    documentObject.getElementById("open-selector")
      .addEventListener("click", () => requestSelector(environment));
    return true;
  }

  const api = Object.freeze({ message, localize, showVersion, requestSelector, launch });
  scope.RavuePopup = api;
  if (typeof module === "object" && module.exports) module.exports = api;

  if (!scope.__RAVUE_POPUP_INSTALLED__ && scope.document && (scope.browser || scope.chrome)) {
    scope.__RAVUE_POPUP_INSTALLED__ = true;
    launch(scope);
  }
})(typeof globalThis === "undefined" ? this : globalThis);
