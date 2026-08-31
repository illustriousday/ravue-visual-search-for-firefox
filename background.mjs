import "./content/geometry.js";
import "./content/target.js";
import "./shared/session-store.js";
import "./shared/pending-store.js";

if (!globalThis.browser) globalThis.browser = chrome;

const activeStarts = new Map();
const resultUpdateTasks = new Map();
const BRIDGE_FILES = [
  "content/geometry.js",
  "content/target.js",
  "content/smart-selection.js",
  "content/overlay.js",
  "content/bridge.js",
];
const DIRECT_IMAGE_FILES = [
  "content/geometry.js",
  "content/target.js",
  "content/direct-image.js",
];
const MAX_SCREENSHOT_LENGTH = 64 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;
const GOOGLE_IMAGES_URL = "https://images.google.com/";
const GOOGLE_LENS_URL_UPLOAD = "https://lens.google.com/uploadbyurl";
let overlayStylesRequest = null;

const menus = browser.menus || browser.contextMenus;
if (!menus) throw new Error("Menus API is unavailable");

const text = (id, fallback) => browser.i18n.getMessage(id) || fallback;

function id() {
  const values = crypto.getRandomValues(new Uint32Array(4));
  return [...values].map((value) => value.toString(16).padStart(8, "0")).join("");
}

function extensionPage(sender, page) {
  return Boolean(sender?.url?.startsWith(browser.runtime.getURL(page)));
}

async function overlayStyles() {
  if (!overlayStylesRequest) {
    overlayStylesRequest = fetch(browser.runtime.getURL("ui/overlay.css"))
      .then(async (response) => {
        if (!response.ok) throw new Error("Overlay stylesheet could not be loaded");
        return response.text();
      })
      .catch((error) => {
        overlayStylesRequest = null;
        throw error;
      });
  }
  return overlayStylesRequest;
}

async function sendToTab(tabId, payload, frameId = 0) {
  if (!Number.isInteger(tabId)) return null;
  try {
    return await browser.tabs.sendMessage(tabId, payload, { frameId });
  } catch (_) {
    return null;
  }
}

async function installPageBridge(tabId, frameId = 0) {
  await browser.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    files: BRIDGE_FILES,
  });
  const pong = await sendToTab(tabId, { type: "RV_PING" }, frameId);
  if (!pong?.ok) throw new Error("Page bridge did not answer");
}

async function installDirectImageBridge(tabId, frameId = 0) {
  await browser.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    files: DIRECT_IMAGE_FILES,
  });
}

async function assertActive(tab) {
  const [active] = await browser.tabs.query({ active: true, windowId: tab.windowId });
  if (!active || active.id !== tab.id) throw new Error("Active tab changed");
}

async function visibleScreenshot(tab, options = { format: "png" }) {
  await assertActive(tab);
  const screenshot = await browser.tabs.captureVisibleTab(tab.windowId, options);
  await assertActive(tab);
  return screenshot;
}

async function startSelection(tab) {
  if (!tab || !Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) return;
  await sendToTab(tab.id, { type: "RV_CLOSE_OVERLAY" });
  await installPageBridge(tab.id);

  const layout = await sendToTab(tab.id, { type: "RV_WAIT_LAYOUT" });
  if (!layout?.ok) throw new Error("Page layout could not be read");

  const [screenshot, styles] = await Promise.all([
    visibleScreenshot(tab),
    overlayStyles(),
  ]);
  const opened = await sendToTab(tab.id, {
    type: "RV_OPEN_OVERLAY",
    screenshot,
    styles,
  });
  if (!opened?.ok) throw new Error(opened?.error || "Overlay did not open");
}

async function clearActionError(tab) {
  if (!Number.isInteger(tab?.id)) return;
  await Promise.allSettled([
    browser.action.setBadgeText({ tabId: tab.id, text: "" }),
    browser.action.setTitle({
      tabId: tab.id,
      title: text("actionTitle", "Open Ravue"),
    }),
  ]);
}

async function showActionError(tab, error) {
  if (!Number.isInteger(tab?.id)) return;
  const title = error?.message || text("overlayError", "Ravue could not capture this page.");
  await Promise.allSettled([
    browser.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#d93025" }),
    browser.action.setBadgeText({ tabId: tab.id, text: "!" }),
    browser.action.setTitle({ tabId: tab.id, title }),
  ]);
  setTimeout(() => clearActionError(tab).catch(() => {}), 5000);
}

function runSafely(tab, operation) {
  if (!tab || !Number.isInteger(tab.windowId)) return Promise.resolve();
  if (activeStarts.has(tab.windowId)) return activeStarts.get(tab.windowId);

  const task = (async () => {
    await clearActionError(tab);
    return operation();
  })()
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

function startSafely(tab) {
  return runSafely(tab, () => startSelection(tab));
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
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Image encoding failed")),
      mimeType,
      quality,
    );
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

async function cropCapture(screenshot, selection, viewport) {
  const image = await loadImage(screenshot);
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
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    width,
    height,
  );
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

function validScreenshot(screenshot) {
  return typeof screenshot === "string" &&
    screenshot.startsWith("data:image/png;base64,") &&
    screenshot.length <= MAX_SCREENSHOT_LENGTH;
}

function validImagePayload(payload) {
  return typeof payload?.dataUrl === "string" &&
    payload.dataUrl.startsWith("data:image/jpeg;base64,") &&
    payload.dataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH &&
    Number.isInteger(payload.width) && payload.width > 0 && payload.width <= 1200 &&
    Number.isInteger(payload.height) && payload.height > 0 && payload.height <= 1200 &&
    payload.mimeType === "image/jpeg";
}

function finiteRect(rect) {
  return Boolean(rect) &&
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width > 0 && rect.height > 0;
}

function validDirectPlan(plan) {
  return finiteRect(plan?.rect) &&
    finiteRect(plan?.documentRect) &&
    validViewport(plan?.viewport) &&
    plan.documentRect.x >= 0 && plan.documentRect.y >= 0 &&
    Number.isFinite(plan.deviceScale) && plan.deviceScale > 0 && plan.deviceScale <= 8;
}

function directOutputSize(width, height) {
  const scale = Math.min(1, 1200 / width, 1200 / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encodeScreenshot(screenshot) {
  if (!validScreenshot(screenshot)) throw new Error("Invalid full image capture");
  const image = await loadImage(screenshot);
  const size = directOutputSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  try {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await canvasBlob(canvas);
    const dataUrl = await blobDataUrl(blob);
    const payload = { dataUrl, ...size, mimeType: blob.type || "image/jpeg" };
    if (!validImagePayload(payload)) throw new Error("Invalid full image result");
    return payload;
  } finally {
    canvas.remove();
    image.remove();
  }
}

async function captureRenderedImage(tab, plan) {
  if (!validDirectPlan(plan)) throw new Error("Invalid full image capture plan");
  const scale = Math.min(
    plan.deviceScale,
    1200 / plan.documentRect.width,
    1200 / plan.documentRect.height,
  );
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Invalid full image scale");
  const screenshot = await visibleScreenshot(tab, {
    format: "png",
    rect: {
      x: plan.documentRect.x,
      y: plan.documentRect.y,
      width: plan.documentRect.width,
      height: plan.documentRect.height,
    },
    scale,
  });
  return encodeScreenshot(screenshot);
}

async function captureClickedImage(tab, menuInfo) {
  const frameId = Number.isInteger(menuInfo?.frameId) ? menuInfo.frameId : 0;
  if (frameId !== 0 || (!Number.isInteger(menuInfo?.targetElementId) && !menuInfo?.srcUrl)) return null;
  await installDirectImageBridge(tab.id, frameId);
  const started = await sendToTab(tab.id, {
    type: "RV_DIRECT_IMAGE_BEGIN",
    targetElementId: menuInfo?.targetElementId,
    srcUrl: menuInfo?.srcUrl,
  }, frameId);
  if (validImagePayload(started?.payload)) return started.payload;
  if (!started?.ok || !validDirectPlan(started.plan)) return null;
  return captureRenderedImage(tab, started.plan);
}

function publicImageSource(source) {
  if (typeof source !== "string" || !source || source.length > 8192) return null;
  try {
    const url = new URL(source);
    url.hash = "";
    return globalThis.RavuePendingStore.validSourceUrl(url.href) ? url.href : null;
  } catch (_) {
    return null;
  }
}

function validSearchRequest(request) {
  return validScreenshot(request?.screenshot) &&
    globalThis.RavueGeometry.valid(request?.selection, 1) &&
    validViewport(request?.viewport);
}

async function openResultTab(tab, uploadId) {
  const result = await browser.tabs.create({
    windowId: tab.windowId,
    openerTabId: tab.id,
    url: browser.runtime.getURL("results.html"),
    active: true,
  });
  if (!Number.isInteger(result?.id)) throw new Error("Result tab did not open");
  try {
    await globalThis.RavuePendingStore.put(result.id, uploadId);
    return result.id;
  } catch (error) {
    await browser.tabs.remove(result.id).catch(() => {});
    throw error;
  }
}

async function openUrlResultTab(tab, sourceUrl) {
  const result = await browser.tabs.create({
    windowId: tab.windowId,
    openerTabId: tab.id,
    url: browser.runtime.getURL("results.html"),
    active: true,
  });
  if (!Number.isInteger(result?.id)) throw new Error("Result tab did not open");
  try {
    await globalThis.RavuePendingStore.putUrl(result.id, sourceUrl);
    return result.id;
  } catch (error) {
    await browser.tabs.remove(result.id).catch(() => {});
    throw error;
  }
}

async function queueImageUpload(tab, image) {
  const uploadId = id();
  await globalThis.RavueSessionStore.put(uploadId, image);
  let resultTabId = null;
  try {
    resultTabId = await openResultTab(tab, uploadId);
    return resultTabId;
  } catch (error) {
    if (Number.isInteger(resultTabId)) {
      await globalThis.RavuePendingStore.remove(resultTabId).catch(() => {});
    }
    await globalThis.RavueSessionStore.remove(uploadId).catch(() => {});
    throw error;
  }
}

async function searchImage(tab, menuInfo) {
  if (!tab || !Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) return;
  await sendToTab(tab.id, { type: "RV_CLOSE_OVERLAY" });

  const source = publicImageSource(menuInfo?.srcUrl);
  if (source) {
    await openUrlResultTab(tab, source);
    return;
  }

  try {
    const image = await captureClickedImage(tab, menuInfo);
    if (image) {
      await queueImageUpload(tab, image);
      return;
    }
  } catch (error) {
    console.warn("[Ravue] Direct image fallbacks were unavailable", error);
  }

  throw new Error(text(
    "directImageError",
    "Ravue could not capture this image directly. Use area selection.",
  ));
}

async function searchCapture(request, sender) {
  if (!Number.isInteger(sender?.tab?.id) || !Number.isInteger(sender?.tab?.windowId) ||
      !validSearchRequest(request)) {
    return { ok: false, error: text("overlayError", "Invalid selection.") };
  }

  try {
    const image = await cropCapture(request.screenshot, request.selection, request.viewport);
    await queueImageUpload(sender.tab, image);
    return { ok: true };
  } catch (error) {
    console.error("[Ravue] Search preparation failed", error);
    return { ok: false, error: error?.message || text("overlayError", "Search failed.") };
  }
}

async function closeResultTab(sender) {
  if (!extensionPage(sender, "results.html") || !Number.isInteger(sender?.tab?.id)) {
    return { ok: false };
  }
  await browser.tabs.remove(sender.tab.id);
  return { ok: true };
}

async function openSelectorFromPopup(sender) {
  if (!extensionPage(sender, "popup/popup.html")) return { ok: false };
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !Number.isInteger(tab.id) || !Number.isInteger(tab.windowId)) {
    return { ok: false, error: text("popupError", "Ravue cannot open on this page.") };
  }
  if (activeStarts.has(tab.windowId)) {
    return { ok: false, error: text("popupError", "Ravue cannot open on this page.") };
  }

  const task = (async () => {
    await clearActionError(tab);
    await startSelection(tab);
  })();
  activeStarts.set(tab.windowId, task);
  try {
    await task;
    return { ok: true };
  } catch (error) {
    console.error("[Ravue] Popup could not open the selector", error);
    await showActionError(tab, error);
    return {
      ok: false,
      error: text("popupError", "Ravue cannot open on this page."),
    };
  } finally {
    if (activeStarts.get(tab.windowId) === task) activeStarts.delete(tab.windowId);
  }
}

function googleImagesPage(sender) {
  try {
    return new URL(sender?.url).origin === "https://images.google.com";
  } catch (_) {
    return false;
  }
}

function lensPage(sender) {
  try {
    return new URL(sender?.url).origin === "https://lens.google.com";
  } catch (_) {
    return false;
  }
}

async function startGoogleStage(sender) {
  if (!extensionPage(sender, "results.html") || !Number.isInteger(sender?.tab?.id)) {
    return { ok: false };
  }
  const route = await globalThis.RavuePendingStore.route(sender.tab.id);
  if (!route) return { ok: false, expired: true };
  if (route.kind === globalThis.RavuePendingStore.KIND_URL) {
    const marked = await globalThis.RavuePendingStore.markUrlNavigating(sender.tab.id);
    if (!marked) return { ok: false, expired: true };
    const lens = new URL(GOOGLE_LENS_URL_UPLOAD);
    lens.searchParams.set("url", route.sourceUrl);
    lens.searchParams.set("ep", "ccm");
    lens.searchParams.set("st", String(Date.now()));
    await browser.tabs.update(sender.tab.id, { url: lens.href });
    return { ok: true };
  }
  await browser.tabs.update(sender.tab.id, { url: GOOGLE_IMAGES_URL });
  return { ok: true };
}

async function googleUploadProbe(sender) {
  if (!googleImagesPage(sender) || !Number.isInteger(sender?.tab?.id)) return { pending: false };
  const uploadId = await globalThis.RavuePendingStore.peek(sender.tab.id);
  return { pending: Boolean(uploadId) };
}

async function googleUploadReady(sender) {
  if (!googleImagesPage(sender) || !Number.isInteger(sender?.tab?.id)) {
    return { ok: false, pending: false };
  }
  const uploadId = await globalThis.RavuePendingStore.peek(sender.tab.id);
  if (!uploadId) return { ok: false, pending: false };
  const payload = await globalThis.RavueSessionStore.take(uploadId);
  if (!payload) return { ok: false, pending: true, expired: true };
  return { ok: true, pending: true, payload };
}

async function googleUploadSubmitting(sender) {
  if (!googleImagesPage(sender) || !Number.isInteger(sender?.tab?.id)) return { ok: false };
  const ok = await globalThis.RavuePendingStore.markSubmitting(sender.tab.id);
  return { ok };
}

function resultErrorPage() {
  return `${browser.runtime.getURL("results.html")}?error=google-upload`;
}

async function cleanupPendingTab(tabId) {
  if (!Number.isInteger(tabId)) return;
  const uploadId = await globalThis.RavuePendingStore.take(tabId).catch(() => null);
  if (uploadId) await globalThis.RavueSessionStore.remove(uploadId).catch(() => {});
}

async function googleUploadFailed(sender) {
  if (!googleImagesPage(sender) || !Number.isInteger(sender?.tab?.id)) return { ok: false };
  await cleanupPendingTab(sender.tab.id);
  await browser.tabs.update(sender.tab.id, { url: resultErrorPage(), active: true });
  return { ok: true };
}

async function lensResultProbe(sender) {
  if (!lensPage(sender) || !Number.isInteger(sender?.tab?.id)) return { pending: false };
  let phase = await globalThis.RavuePendingStore.phase(sender.tab.id).catch(() => null);
  if (phase === globalThis.RavuePendingStore.PHASE_SUBMITTING) {
    const changed = await globalThis.RavuePendingStore.markNavigating(sender.tab.id);
    if (changed) phase = globalThis.RavuePendingStore.PHASE_NAVIGATING;
  }
  return { pending: phase === globalThis.RavuePendingStore.PHASE_NAVIGATING };
}

async function lensDocumentReady(sender) {
  const probe = await lensResultProbe(sender);
  if (!probe.pending || !Number.isInteger(sender?.tab?.id)) return { ok: false };
  await globalThis.RavuePendingStore.remove(sender.tab.id);
  return { ok: true };
}

async function revealLens(tabId) {
  await sendToTab(tabId, { type: "RV_REVEAL_LENS" });
  await browser.scripting.executeScript({
    target: { tabId },
    func: () => document.querySelector("[data-ravue-loading-screen]")?.remove(),
  }).catch(() => {});
}

async function followResultNavigation(tabId, changeInfo) {
  const phase = await globalThis.RavuePendingStore.phase(tabId).catch(() => null);
  if (changeInfo.status === "loading" &&
      phase === globalThis.RavuePendingStore.PHASE_SUBMITTING) {
    await globalThis.RavuePendingStore.markNavigating(tabId);
    return;
  }
  if (changeInfo.status !== "complete" ||
      phase !== globalThis.RavuePendingStore.PHASE_NAVIGATING) return;
  await revealLens(tabId);
  await globalThis.RavuePendingStore.remove(tabId);
}

async function handleRemovedTab(tabId) {
  await cleanupPendingTab(tabId);
}

function scheduleResultUpdate(tabId, changeInfo) {
  const previous = resultUpdateTasks.get(tabId) || Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(() => followResultNavigation(tabId, changeInfo))
    .catch((error) => {
      console.warn("[Ravue] Completed result tab could not be revealed", error);
    })
    .finally(() => {
      if (resultUpdateTasks.get(tabId) === task) resultUpdateTasks.delete(tabId);
    });
  resultUpdateTasks.set(tabId, task);
  return task;
}

async function installMenus() {
  await menus.removeAll();
  menus.create({
    id: "ravue-image",
    title: text("contextImage", "Search this image with Ravue"),
    contexts: ["image"],
  });
  menus.create({
    id: "ravue-area",
    title: text("contextArea", "Select an area with Ravue"),
    contexts: ["page", "frame", "selection", "link", "image", "video"],
  });
}

browser.runtime.onMessage.addListener((request, sender) => {
  switch (request.type) {
    case "RV_SEARCH_CAPTURE":
      return searchCapture(request, sender);
    case "RV_CLOSE_RESULT_TAB":
      return closeResultTab(sender);
    case "RV_POPUP_OPEN_SELECTOR":
      return openSelectorFromPopup(sender);
    case "RV_START_GOOGLE_STAGE":
      return startGoogleStage(sender);
    case "RV_GOOGLE_UPLOAD_PROBE":
      return googleUploadProbe(sender);
    case "RV_GOOGLE_UPLOAD_READY":
      return googleUploadReady(sender);
    case "RV_GOOGLE_UPLOAD_SUBMITTING":
      return googleUploadSubmitting(sender);
    case "RV_GOOGLE_UPLOAD_FAILED":
      return googleUploadFailed(sender);
    case "RV_LENS_RESULT_PROBE":
      return lensResultProbe(sender);
    case "RV_LENS_DOCUMENT_READY":
      return lensDocumentReady(sender);
    default:
      return undefined;
  }
});

browser.runtime.onInstalled.addListener(() => installMenus().catch((error) => {
  console.error("[Ravue] Context menus could not be installed", error);
}));
browser.runtime.onStartup.addListener(() => installMenus().catch((error) => {
  console.error("[Ravue] Context menus could not be restored", error);
}));
browser.action.onClicked.addListener((tab) => startSafely(tab));
menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ravue-image") return searchImageSafely(tab, info);
  if (info.menuItemId === "ravue-area") return startSafely(tab);
  return undefined;
});
browser.tabs.onRemoved.addListener((tabId) => (
  handleRemovedTab(tabId).catch((error) => {
    console.warn("[Ravue] Pending upload could not be cleared", error);
  })
));
browser.tabs.onUpdated.addListener(scheduleResultUpdate);
browser.commands.onCommand.addListener((command, tab) => {
  if (command !== "open-ravue" || !tab) return undefined;
  return startSafely(tab);
});

Promise.all([
  globalThis.RavueSessionStore.cleanup(),
  globalThis.RavuePendingStore.cleanup().then((uploadIds) =>
    Promise.all(uploadIds.map((uploadId) => globalThis.RavueSessionStore.remove(uploadId))),
  ),
]).catch((error) => {
  console.warn("[Ravue] Expired session data could not be cleared", error);
});
