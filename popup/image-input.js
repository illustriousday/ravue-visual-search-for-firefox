(function (scope) {
  "use strict";

  const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
  const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024;
  const MAX_DIMENSION = 1200;
  const PASSTHROUGH_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  const SUPPORTED_MIME_TYPES = new Set([
    ...PASSTHROUGH_MIME_TYPES,
    "image/gif",
    "image/bmp",
    "image/avif",
  ]);
  const EXTENSION_MIME_TYPES = Object.freeze({
    avif: "image/avif",
    bmp: "image/bmp",
    gif: "image/gif",
    jfif: "image/jpeg",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  });

  class ImageInputError extends Error {
    constructor(code) {
      super(code);
      this.name = "ImageInputError";
      this.code = code;
    }
  }

  function message(browserApi, id, fallback = "") {
    return browserApi?.i18n?.getMessage?.(id) || fallback;
  }

  function localize(documentObject, browserApi) {
    documentObject.documentElement.lang = browserApi.i18n.getUILanguage() || "en";
    for (const element of documentObject.querySelectorAll?.("[data-i18n]") || []) {
      element.textContent = message(browserApi, element.dataset.i18n, element.textContent);
    }
  }

  function showVersion(documentObject, browserApi) {
    const target = documentObject.getElementById("version");
    const version = browserApi.runtime.getManifest?.()?.version;
    if (target && version) target.textContent = `v${version}`;
  }

  function normalizedMimeType(file) {
    const declared = typeof file?.type === "string" ? file.type.toLowerCase().split(";", 1)[0] : "";
    if (declared === "image/jpg" || declared === "image/pjpeg") return "image/jpeg";
    if (SUPPORTED_MIME_TYPES.has(declared)) return declared;
    if (declared && declared !== "application/octet-stream") return null;
    const extension = typeof file?.name === "string"
      ? file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
      : null;
    return EXTENSION_MIME_TYPES[extension] || null;
  }

  function validDimension(value) {
    return Number.isInteger(value) && value >= 1 && value <= MAX_DIMENSION;
  }

  function validPreparedPayload(payload) {
    return PASSTHROUGH_MIME_TYPES.has(payload?.mimeType) &&
      typeof payload.dataUrl === "string" &&
      payload.dataUrl.startsWith(`data:${payload.mimeType};base64,`) &&
      payload.dataUrl.length <= MAX_DATA_URL_LENGTH &&
      validDimension(payload.width) && validDimension(payload.height);
  }

  function typedBlob(file, mimeType) {
    if (file.type === mimeType) return file;
    return file.slice(0, file.size, mimeType);
  }

  function readAsDataUrl(blob, environment = scope) {
    return new Promise((resolve, reject) => {
      const reader = new environment.FileReader();
      reader.addEventListener("load", () => resolve(reader.result), { once: true });
      reader.addEventListener("error", () => reject(new ImageInputError("read")), { once: true });
      reader.addEventListener("abort", () => reject(new ImageInputError("read")), { once: true });
      reader.readAsDataURL(blob);
    });
  }

  function decodeFile(file, environment = scope) {
    return new Promise((resolve, reject) => {
      const sourceUrl = environment.URL.createObjectURL(file);
      const image = new environment.Image();
      let settled = false;
      const release = () => {
        environment.URL.revokeObjectURL(sourceUrl);
        image.remove?.();
      };
      const finish = (callback) => {
        if (settled) return;
        settled = true;
        callback();
      };
      image.addEventListener("load", () => finish(() => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
          release();
          reject(new ImageInputError("decode"));
          return;
        }
        resolve({ image, width, height, release });
      }), { once: true });
      image.addEventListener("error", () => finish(() => {
        release();
        reject(new ImageInputError("decode"));
      }), { once: true });
      image.decoding = "async";
      image.src = sourceUrl;
    });
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new ImageInputError("encode")),
        "image/jpeg",
        0.94,
      );
    });
  }

  async function encodeDecodedImage(decoded, environment = scope) {
    const scale = Math.min(1, MAX_DIMENSION / decoded.width, MAX_DIMENSION / decoded.height);
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = environment.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    try {
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new ImageInputError("encode");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.image, 0, 0, width, height);
      const blob = await canvasBlob(canvas);
      const payload = {
        dataUrl: await readAsDataUrl(blob, environment),
        width,
        height,
        mimeType: "image/jpeg",
      };
      if (!validPreparedPayload(payload)) throw new ImageInputError("encode");
      return payload;
    } finally {
      canvas.remove?.();
    }
  }

  async function prepareFile(file, environment = scope) {
    if (!file || !Number.isFinite(file.size) || file.size < 1) {
      throw new ImageInputError("type");
    }
    if (file.size > MAX_SOURCE_BYTES) throw new ImageInputError("size");
    const mimeType = normalizedMimeType(file);
    if (!mimeType) throw new ImageInputError("type");

    const decoded = await decodeFile(file, environment);
    try {
      if (PASSTHROUGH_MIME_TYPES.has(mimeType) &&
          decoded.width <= MAX_DIMENSION && decoded.height <= MAX_DIMENSION &&
          file.size <= Math.floor((MAX_DATA_URL_LENGTH - 64) * 3 / 4)) {
        const payload = {
          dataUrl: await readAsDataUrl(typedBlob(file, mimeType), environment),
          width: decoded.width,
          height: decoded.height,
          mimeType,
        };
        if (validPreparedPayload(payload)) return payload;
      }
      return await encodeDecodedImage(decoded, environment);
    } finally {
      decoded.release();
    }
  }

  function firstLine(value) {
    return typeof value === "string"
      ? value.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith("#")) || null
      : null;
  }

  function htmlImageSource(html, environment = scope) {
    if (typeof html !== "string" || !html || typeof environment.DOMParser !== "function") return null;
    const parsed = new environment.DOMParser().parseFromString(html, "text/html");
    const image = parsed.querySelector("img[src]");
    return image?.getAttribute("src") || null;
  }

  function transferData(transfer, type) {
    try {
      return transfer?.getData?.(type) || "";
    } catch (_) {
      return "";
    }
  }

  function droppedItem(transfer, environment = scope) {
    const files = Array.from(transfer?.files || []);
    const file = files.find((candidate) => (
      Number.isFinite(candidate?.size) && candidate.size > 0 && normalizedMimeType(candidate)
    ));
    if (file) return { kind: "file", file };

    const candidates = [
      firstLine(transferData(transfer, "application/x-moz-file-promise-url")),
      htmlImageSource(transferData(transfer, "text/html"), environment),
      firstLine(transferData(transfer, "text/uri-list")),
      firstLine(transferData(transfer, "text/x-moz-url")),
      firstLine(transferData(transfer, "text/plain")),
    ];
    const sourceUrl = candidates.find(Boolean);
    if (!sourceUrl) throw new ImageInputError(files.length ? "type" : "drop");
    return { kind: "url", sourceUrl };
  }

  function errorMessage(browserApi, error) {
    switch (error?.code) {
      case "size":
        return message(browserApi, "popupFileSizeError", "Choose an image up to 32 MB.");
      case "type":
        return message(browserApi, "popupFileTypeError", "Choose a supported image file.");
      case "drop":
        return message(browserApi, "popupDropError", "Drop an image file or an image from a web page.");
      case "read":
      case "decode":
      case "encode":
        return message(browserApi, "popupFileReadError", "Ravue could not prepare this image.");
      default:
        return message(browserApi, "popupFileSendError", "Ravue could not send this image to Google Lens.");
    }
  }

  function launchPopup(environment = scope) {
    const browserApi = environment.browser || environment.chrome;
    const documentObject = environment.document;
    if (!browserApi || !documentObject) return false;
    const button = documentObject.getElementById("open-image-input");
    const selectorButton = documentObject.getElementById("open-selector");
    const status = documentObject.getElementById("status");
    if (!button || !status) return false;

    let busy = false;
    button.addEventListener("click", async () => {
      if (busy) return false;
      busy = true;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (selectorButton) selectorButton.disabled = true;
      status.hidden = false;
      status.classList?.add?.("is-progress");
      status.textContent = message(browserApi, "popupImagePageOpening", "Opening image input…");
      try {
        const response = await browserApi.runtime.sendMessage({ type: "RV_POPUP_OPEN_IMAGE_PAGE" });
        if (!response?.ok) throw new Error(response?.error || "image-page-unavailable");
        environment.close();
        return true;
      } catch (error) {
        busy = false;
        button.disabled = false;
        button.removeAttribute("aria-busy");
        if (selectorButton) selectorButton.disabled = false;
        status.classList?.remove?.("is-progress");
        status.textContent = error?.message && error.message !== "image-page-unavailable"
          ? error.message
          : message(browserApi, "popupImagePageError", "Ravue could not open image input.");
        return false;
      }
    });
    return true;
  }

  function launchUploadPage(environment = scope) {
    const browserApi = environment.browser || environment.chrome;
    const documentObject = environment.document;
    if (!browserApi || !documentObject) return false;
    const chooseButton = documentObject.getElementById("choose-image");
    const fileInput = documentObject.getElementById("image-file");
    const status = documentObject.getElementById("status");
    const dropOverlay = documentObject.getElementById("drop-overlay");
    if (!chooseButton || !fileInput || !status || !dropOverlay) return false;

    localize(documentObject, browserApi);
    showVersion(documentObject, browserApi);
    documentObject.title = message(browserApi, "uploadPageTitle", "Add an image — Ravue");

    let busy = false;
    let dragDepth = 0;

    const showDropOverlay = (visible) => {
      dropOverlay.hidden = !visible;
      documentObject.body.classList.toggle("is-dragging-image", visible);
    };
    const showStatus = (value, progress = false) => {
      status.hidden = false;
      status.textContent = value;
      status.classList.toggle("is-progress", progress);
    };
    const setBusy = (value) => {
      busy = value;
      chooseButton.disabled = value;
      chooseButton.toggleAttribute("aria-busy", value);
    };
    const responseError = (error) => error?.message && error.code === "remote"
      ? error.message
      : errorMessage(browserApi, error);

    const submit = async (item) => {
      if (busy) return false;
      setBusy(true);
      showStatus(message(browserApi, "popupFilePreparing", "Preparing image…"), true);
      try {
        const request = item.kind === "file"
          ? { type: "RV_IMAGE_PAGE_SEARCH_ITEM", item: { kind: "image", payload: await prepareFile(item.file, environment) } }
          : { type: "RV_IMAGE_PAGE_SEARCH_ITEM", item: { kind: "url", sourceUrl: item.sourceUrl } };
        showStatus(message(browserApi, "popupFileOpening", "Opening Google Lens…"), true);
        const response = await browserApi.runtime.sendMessage(request);
        if (!response?.ok) {
          const error = new ImageInputError("remote");
          error.message = response?.error || "remote";
          throw error;
        }
        const expectedResultUrl = browserApi.runtime.getURL("results.html");
        if (response.resultUrl !== expectedResultUrl) throw new ImageInputError("remote");
        environment.location.replace(expectedResultUrl);
        return true;
      } catch (error) {
        setBusy(false);
        showStatus(responseError(error));
        return false;
      } finally {
        fileInput.value = "";
      }
    };

    chooseButton.addEventListener("click", () => {
      if (!busy) fileInput.click();
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) void submit({ kind: "file", file });
    });

    documentObject.addEventListener("dragenter", (event) => {
      event.preventDefault();
      dragDepth += 1;
      showDropOverlay(true);
    });
    documentObject.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      showDropOverlay(true);
    });
    documentObject.addEventListener("dragleave", (event) => {
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) showDropOverlay(false);
    });
    documentObject.addEventListener("dragend", () => {
      dragDepth = 0;
      showDropOverlay(false);
    });
    documentObject.addEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth = 0;
      showDropOverlay(false);
      if (busy) return;
      try {
        void submit(droppedItem(event.dataTransfer, environment));
      } catch (error) {
        showStatus(errorMessage(browserApi, error));
      }
    });

    return true;
  }

  function launch(environment = scope) {
    if (environment.document?.getElementById("open-image-input")) {
      return launchPopup(environment);
    }
    return launchUploadPage(environment);
  }

  const api = Object.freeze({
    MAX_SOURCE_BYTES,
    MAX_DATA_URL_LENGTH,
    MAX_DIMENSION,
    ImageInputError,
    normalizedMimeType,
    validPreparedPayload,
    prepareFile,
    firstLine,
    htmlImageSource,
    droppedItem,
    errorMessage,
    localize,
    showVersion,
    launchPopup,
    launchUploadPage,
    launch,
  });
  scope.RavuePopupImage = api;
  if (typeof module === "object" && module.exports) module.exports = api;

  if (!scope.__RAVUE_POPUP_IMAGE_INSTALLED__ && scope.document && (scope.browser || scope.chrome)) {
    scope.__RAVUE_POPUP_IMAGE_INSTALLED__ = true;
    launch(scope);
  }
})(typeof globalThis === "undefined" ? this : globalThis);

