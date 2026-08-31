(function (scope) {
  "use strict";

  const INPUT_TIMEOUT_MS = 12000;
  const RESULT_TIMEOUT_MS = 20000;
  const TRIGGER_SELECTORS = [
    '[role="button"][data-is-images-mode="true"]',
    '[role="button"][data-is-images-mode]',
    '[role="button"][jscontroller="lpsUAf"]',
    '[role="button"][jsname="R5mgy"]',
  ];
  const INPUT_SELECTOR = 'input[type="file"]';

  function validPayload(payload) {
    return typeof payload?.dataUrl === "string" &&
      /^data:image\/(?:jpeg|png|webp);base64,/.test(payload.dataUrl) &&
      Number.isInteger(payload.width) && payload.width > 0 && payload.width <= 1200 &&
      Number.isInteger(payload.height) && payload.height > 0 && payload.height <= 1200;
  }

  function imageSearchTrigger(documentObject) {
    for (const selector of TRIGGER_SELECTORS) {
      const trigger = documentObject.querySelector(selector);
      if (trigger) return trigger;
    }
    return null;
  }

  function uploadInput(documentObject) {
    const inputs = [...documentObject.querySelectorAll(INPUT_SELECTOR)];
    return inputs.find((input) => input.name === "encoded_image") ||
      inputs.find((input) => /image/i.test(input.accept || "")) || null;
  }

  function waitForUploadInput(documentObject, timeoutMs = INPUT_TIMEOUT_MS) {
    const present = uploadInput(documentObject);
    if (present) return Promise.resolve(present);
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const input = uploadInput(documentObject);
        if (!input) return;
        clearTimeout(timer);
        observer.disconnect();
        resolve(input);
      });
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("google-input-unavailable"));
      }, timeoutMs);
      observer.observe(documentObject.documentElement, { childList: true, subtree: true });
    });
  }

  function waitForDocumentComplete(environment = scope) {
    const state = environment.document?.readyState;
    if (!state || state === "complete" || typeof environment.addEventListener !== "function") {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      environment.addEventListener("load", resolve, { once: true });
    });
  }

  function fileExtension(mimeType) {
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    return "jpg";
  }

  async function payloadFile(payload, environment = scope) {
    if (!validPayload(payload)) throw new Error("invalid-payload");
    const response = await environment.fetch(payload.dataUrl);
    if (!response.ok) throw new Error("image-decoding-failed");
    const bytes = await response.arrayBuffer();
    const mimeType = payload.mimeType || "image/jpeg";
    return new environment.File(
      [bytes],
      `ravue-selection.${fileExtension(mimeType)}`,
      { type: mimeType },
    );
  }

  async function attach(input, payload, environment = scope) {
    if (!input || input.type !== "file") {
      throw new Error("invalid-google-input");
    }
    const file = await payloadFile(payload, environment);
    const transfer = new environment.DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new environment.Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new environment.Event("change", { bubbles: true, composed: true }));
  }

  function armResultTimeout(browserApi, environment = scope) {
    if (typeof environment.setTimeout !== "function") return null;
    return environment.setTimeout(async () => {
      const failure = await browserApi.runtime.sendMessage({
        type: "RV_GOOGLE_UPLOAD_FAILED",
        code: "google-result-timeout",
      }).catch(() => null);
      if (!failure?.ok) environment.RavueLoadingScreen?.remove(environment.document);
    }, RESULT_TIMEOUT_MS);
  }

  async function launch(environment = scope) {
    const browserApi = environment.browser || environment.chrome;
    const probe = await browserApi.runtime.sendMessage({ type: "RV_GOOGLE_UPLOAD_PROBE" });
    if (!probe?.pending) return;
    environment.RavueLoadingScreen?.mount(environment.document, browserApi);

    try {
      await waitForDocumentComplete(environment);
      let input = uploadInput(environment.document);
      if (!input) {
        const trigger = imageSearchTrigger(environment.document);
        if (!trigger) throw new Error("google-trigger-unavailable");
        trigger.click();
        input = await waitForUploadInput(environment.document);
      }
      const response = await browserApi.runtime.sendMessage({ type: "RV_GOOGLE_UPLOAD_READY" });
      if (!response?.ok || !response.payload) throw new Error("capture-expired");
      const submitting = await browserApi.runtime.sendMessage({ type: "RV_GOOGLE_UPLOAD_SUBMITTING" });
      if (!submitting?.ok) throw new Error("capture-expired");
      await attach(input, response.payload, environment);
      armResultTimeout(browserApi, environment);
    } catch (error) {
      const failure = await browserApi.runtime.sendMessage({
        type: "RV_GOOGLE_UPLOAD_FAILED",
        code: error?.message || "google-upload-failed",
      }).catch(() => null);
      if (!failure?.ok) environment.RavueLoadingScreen?.remove(environment.document);
    }
  }

  const api = Object.freeze({
    validPayload,
    imageSearchTrigger,
    uploadInput,
    waitForUploadInput,
    waitForDocumentComplete,
    payloadFile,
    attach,
    armResultTimeout,
    launch,
  });
  scope.RavueGoogleUpload = api;
  if (typeof module === "object" && module.exports) module.exports = api;

  if (!scope.__RAVUE_GOOGLE_UPLOAD_INSTALLED__ && scope.document && (scope.browser || scope.chrome)) {
    scope.__RAVUE_GOOGLE_UPLOAD_INSTALLED__ = true;
    launch().catch(() => scope.RavueLoadingScreen?.remove(scope.document));
  }
})(typeof globalThis === "undefined" ? this : globalThis);
