if (!globalThis.browser) globalThis.browser = chrome;

const CAPTURE_LIFETIME = 10 * 60 * 1000;
const UPLOAD_LIFETIME = 5 * 60 * 1000;
const captures = new Map();
const uploads = new Map();
const activeStarts = new Map();
const resultTabs = new Set();

const text = (id, fallback) => browser.i18n.getMessage(id) || fallback;

function id() {
  const values = crypto.getRandomValues(new Uint32Array(4));
  return [...values].map((value) => value.toString(16).padStart(8, "0")).join("");
}

function extensionPage(sender, page) {
  return Boolean(sender?.url?.startsWith(browser.runtime.getURL(page)));
}

function discardExpired() {
  const now = Date.now();
  for (const [captureId, capture] of captures) {
    if (now - capture.createdAt > CAPTURE_LIFETIME) captures.delete(captureId);
  }
  for (const [uploadId, upload] of uploads) {
    if (now - upload.createdAt > UPLOAD_LIFETIME) uploads.delete(uploadId);
  }
}

setInterval(discardExpired, 60_000);

async function sendToTab(tabId, payload, frameId = 0) {
  if (!Number.isInteger(tabId)) return null;
  try {
    return await browser.tabs.sendMessage(tabId, payload, { frameId });
  } catch (_) {
    return null;
  }
}

async function installPageBridge(tabId, frameId = 0) {
  for (const file of ["content/geometry.js", "content/overlay.js", "content/bridge.js"]) {
    await browser.tabs.executeScript(tabId, { file, frameId, runAt: "document_idle" });
  }
  const pong = await sendToTab(tabId, { type: "RV_PING" }, frameId);
  if (!pong?.ok) throw new Error("Page bridge did not answer");
}

async function assertActive(tab) {
  const [active] = await browser.tabs.query({ active: true, windowId: tab.windowId });
  if (!active || active.id !== tab.id) throw new Error("Active tab changed");
}

async function visibleScreenshot(tab) {
  await assertActive(tab);
  const screenshot = await browser.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  await assertActive(tab);
  return screenshot;
}

function removeCapturesForTab(tabId) {
  for (const [captureId, capture] of captures) {
    if (capture.tabId === tabId) {
      captures.delete(captureId);
    }
  }
}

async function startSelection(tab, menuInfo = null) {
  if (!tab || !Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) return;
  removeCapturesForTab(tab.id);
  await sendToTab(tab.id, { type: "RV_CLOSE_OVERLAY" });

  let initialSelection = null;
  await installPageBridge(tab.id);
  await sendToTab(tab.id, { type: "RV_WAIT_LAYOUT" });
  if (Number.isInteger(menuInfo?.targetElementId) && (!Number.isInteger(menuInfo.frameId) || menuInfo.frameId === 0)) {
    const target = await sendToTab(tab.id, {
      type: "RV_TARGET_RECT",
      targetId: menuInfo.targetElementId,
    });
    initialSelection = target?.rect || null;
  }

  const screenshot = await visibleScreenshot(tab);
  const captureId = id();
  captures.set(captureId, {
    id: captureId,
    screenshot,
    tabId: tab.id,
    windowId: tab.windowId,
    createdAt: Date.now(),
    processing: false,
  });

  const opened = await sendToTab(tab.id, {
    type: "RV_OPEN_OVERLAY",
    captureId,
    screenshot,
    initialSelection,
  });
  if (!opened?.ok) {
    captures.delete(captureId);
    throw new Error(opened?.error || "Overlay did not open");
  }
}

async function showActionError(tab, error) {
  if (!Number.isInteger(tab?.id)) return;
  const title = error?.message || text("overlayError", "Ravue could not capture this page.");
  await Promise.allSettled([
    browser.browserAction.setBadgeBackgroundColor({ tabId: tab.id, color: "#d93025" }),
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "!" }),
    browser.browserAction.setTitle({ tabId: tab.id, title }),
  ]);
  setTimeout(() => {
    browser.browserAction.setBadgeText({ tabId: tab.id, text: "" }).catch(() => {});
    browser.browserAction.setTitle({ tabId: tab.id, title: text("browserAction", "Open Ravue") }).catch(() => {});
  }, 5000);
}

function runSafely(tab, operation) {
  if (!tab || !Number.isInteger(tab.windowId)) return Promise.resolve();
  if (activeStarts.has(tab.windowId)) return activeStarts.get(tab.windowId);

  const task = (async () => operation())()
    .catch((error) => {
      console.error("[Ravue] Unable to start", error);
      return showActionError(tab, error);
    })
    .finally(() => {
      if (activeStarts.get(tab.windowId) === task) activeStarts.delete(tab.windowId);
    });
  activeStarts.set(tab.windowId, task);
  return task;
}

function startSafely(tab, info = null) {
  return runSafely(tab, () => startSelection(tab, info));
}

function searchImageSafely(tab, info) {
  return runSafely(tab, () => searchImage(tab, info));
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("Image decoding failed")), { once: true });
    image.src = source;
  });
}

function canvasBlob(canvas, mimeType = "image/jpeg", quality = 0.94) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image encoding failed")), mimeType, quality);
  });
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(reader.error || new Error("Image reading failed")), { once: true });
    reader.readAsDataURL(blob);
  });
}

async function cropCapture(capture, selection, viewport) {
  const image = await loadImage(capture.screenshot);
  const source = globalThis.RavueGeometry.pixels(selection, viewport, {
    width: image.naturalWidth,
    height: image.naturalHeight,
  });
  const scale = Math.min(1, 1200 / source.width, 1200 / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, width, height);
  const blob = await canvasBlob(canvas);
  const dataUrl = await blobDataUrl(blob);
  canvas.remove();
  image.remove();
  return { dataUrl, width, height, mimeType: blob.type || "image/jpeg" };
}

function validViewport(viewport) {
  return Number.isFinite(viewport?.width) && viewport.width > 0 &&
    Number.isFinite(viewport?.height) && viewport.height > 0;
}

async function captureClickedImage(tab, menuInfo) {
  const frameId = Number.isInteger(menuInfo?.frameId) ? menuInfo.frameId : 0;
  if (frameId !== 0 || !Number.isInteger(menuInfo?.targetElementId)) return null;

  await installPageBridge(tab.id, frameId);
  const layout = await sendToTab(tab.id, { type: "RV_WAIT_LAYOUT" }, frameId);
  const target = await sendToTab(tab.id, {
    type: "RV_TARGET_RECT",
    targetId: menuInfo.targetElementId,
  }, frameId);

  if (!layout?.ok || !target?.ok || !validViewport(layout.viewport) ||
      !globalThis.RavueGeometry.valid(target.rect, 1)) return null;

  const capture = {
    screenshot: await visibleScreenshot(tab),
    tabId: tab.id,
    windowId: tab.windowId,
  };
  return cropCapture(capture, target.rect, layout.viewport);
}

function publicImageSource(source) {
  if (typeof source !== "string" || !source) return null;
  try {
    const url = new URL(source);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch (_) {
    return null;
  }
}

async function openImageUrlResults(tab, source) {
  const lens = new URL("https://lens.google.com/uploadbyurl");
  lens.searchParams.set("url", source);
  lens.searchParams.set("ep", "ccm");
  lens.searchParams.set("st", String(Date.now()));
  const result = await browser.tabs.create({
    windowId: tab.windowId,
    openerTabId: tab.id,
    url: "about:blank",
    active: true,
  });
  if (!Number.isInteger(result?.id)) throw new Error("Result tab did not open");
  resultTabs.add(result.id);
  try {
    await browser.tabs.update(result.id, { url: lens.href });
  } catch (error) {
    resultTabs.delete(result.id);
    await browser.tabs.remove(result.id).catch(() => {});
    throw error;
  }
}

function validSearchRequest(request) {
  return globalThis.RavueGeometry.valid(request?.selection, 1) &&
    validViewport(request?.viewport);
}

async function openResultsTab(capture, uploadId) {
  const page = `${browser.runtime.getURL("results.html")}?upload=${encodeURIComponent(uploadId)}`;
  const result = await browser.tabs.create({
    windowId: capture.windowId,
    openerTabId: capture.tabId,
    url: page,
    active: true,
  });
  if (!Number.isInteger(result?.id)) throw new Error("Result tab did not open");
  resultTabs.add(result.id);
  return result.id;
}

async function queueImageUpload(capture, image) {
  const uploadId = id();
  uploads.set(uploadId, { ...image, windowId: capture.windowId, createdAt: Date.now() });
  try {
    await openResultsTab(capture, uploadId);
  } catch (error) {
    uploads.delete(uploadId);
    throw error;
  }
}

async function searchImage(tab, menuInfo) {
  if (!tab || !Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) return;
  removeCapturesForTab(tab.id);
  await sendToTab(tab.id, { type: "RV_CLOSE_OVERLAY" });

  try {
    const image = await captureClickedImage(tab, menuInfo);
    if (image) {
      await queueImageUpload({ tabId: tab.id, windowId: tab.windowId }, image);
      return;
    }
  } catch (error) {
    console.warn("[Ravue] Visible image capture unavailable; trying its source URL", error);
  }

  const source = publicImageSource(menuInfo?.srcUrl);
  if (source) {
    await openImageUrlResults(tab, source);
    return;
  }

  throw new Error(text("directImageError", "Ravue could not capture this image directly."));
}

function takeUpload(request, sender) {
  const upload = uploads.get(request.uploadId);
  if (!upload || !extensionPage(sender, "results.html") || !Number.isInteger(sender?.tab?.windowId) || !Number.isInteger(sender?.tab?.id)) {
    return { ok: false, error: text("sessionExpired", "This search expired.") };
  }
  upload.resultTabId = sender.tab.id;
  resultTabs.add(sender.tab.id);
  uploads.delete(request.uploadId);
  return { ok: true, ...upload };
}

function knownResultTab(sender) {
  return Number.isInteger(sender?.tab?.id) && resultTabs.has(sender.tab.id);
}

async function showResultError(request, sender) {
  if (!knownResultTab(sender)) return { ok: false };
  const reason = request.reason === "google403" ? "google403" : "expired";
  await browser.tabs.update(sender.tab.id, {
    url: `${browser.runtime.getURL("results.html")}?error=${reason}`,
  });
  return { ok: true };
}

async function closeResultTab(sender) {
  if (!extensionPage(sender, "results.html") || !knownResultTab(sender)) return { ok: false };
  resultTabs.delete(sender.tab.id);
  await browser.tabs.remove(sender.tab.id);
  return { ok: true };
}

async function searchCapture(request, sender) {
  discardExpired();
  const capture = captures.get(request.captureId);
  if (!capture) return { ok: false, error: text("sessionExpired", "This capture expired.") };

  if (sender?.tab?.id !== capture.tabId || !validSearchRequest(request)) {
    return { ok: false, error: text("overlayError", "Invalid selection.") };
  }
  if (capture.processing) return { ok: false, error: text("overlayProcessing", "Already processing…") };

  capture.processing = true;
  try {
    const image = await cropCapture(capture, request.selection, request.viewport);
    await queueImageUpload(capture, image);
    captures.delete(request.captureId);
    return { ok: true };
  } catch (error) {
    capture.processing = false;
    console.error("[Ravue] Search preparation failed", error);
    return { ok: false, error: error?.message || text("overlayError", "Search failed.") };
  }
}

browser.runtime.onMessage.addListener((request, sender) => {
  switch (request.type) {
    case "RV_SEARCH_CAPTURE":
      return searchCapture(request, sender);
    case "RV_CANCEL_CAPTURE":
      {
        const capture = captures.get(request.captureId);
        if (capture && sender?.tab?.id === capture.tabId) captures.delete(request.captureId);
      }
      return Promise.resolve({ ok: true });
    case "RV_TAKE_UPLOAD":
      return Promise.resolve(takeUpload(request, sender));
    case "RV_IS_RESULT_TAB":
      return Promise.resolve({ ok: knownResultTab(sender) });
    case "RV_LENS_TAB_ERROR":
      return showResultError(request, sender);
    case "RV_CLOSE_RESULT_TAB":
      return closeResultTab(sender);
    default:
      return undefined;
  }
});

await browser.contextMenus.removeAll();
browser.contextMenus.create({
  id: "ravue-image",
  title: text("contextImage", "Search this image with Ravue"),
  contexts: ["image"],
});
browser.contextMenus.create({
  id: "ravue-area",
  title: text("contextArea", "Select an area with Ravue"),
  contexts: ["page", "frame", "selection", "link", "image", "video"],
});

browser.browserAction.onClicked.addListener((tab) => startSafely(tab));
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ravue-image") return searchImageSafely(tab, info);
  if (info.menuItemId === "ravue-area") return startSafely(tab, info);
  return undefined;
});
browser.commands.onCommand.addListener((command, tab) => {
  if (command !== "open-ravue") return;
  if (tab) startSafely(tab);
});

browser.tabs.onRemoved.addListener((tabId) => {
  removeCapturesForTab(tabId);
  resultTabs.delete(tabId);
});
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") removeCapturesForTab(tabId);
});
