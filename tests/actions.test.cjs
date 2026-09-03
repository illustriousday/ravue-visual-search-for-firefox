const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

test("mantém busca direta, seleção e falha segura como fluxos MV3 independentes", async (t) => {
  const sent = [];
  const createdTabs = [];
  const updatedTabs = [];
  const removedTabs = [];
  const executedScripts = [];
  const captureRequests = [];
  const menuItems = [];
  const badges = [];
  const logs = [];
  const storageData = {};
  const runtimeListeners = [];
  let installedListener = null;
  let startupListener = null;
  let menuListener = null;
  let actionListener = null;
  let commandListener = null;
  let removedListener = null;
  let updatedListener = null;
  let nextTabId = 900;
  let screenshotCount = 0;
  let directCaptureNumber = 0;
  let lastCaptureOptions = null;
  const sourceTab = { id: 41, windowId: 7 };

  const previous = {
    browser: global.browser,
    Image: global.Image,
    FileReader: global.FileReader,
    document: global.document,
    fetch: global.fetch,
    setTimeout: global.setTimeout,
    innerWidth: global.innerWidth,
    innerHeight: global.innerHeight,
    getComputedStyle: global.getComputedStyle,
    consoleError: console.error,
    consoleWarn: console.warn,
  };
  t.after(() => {
    for (const [name, value] of Object.entries(previous).filter(([name]) => !name.startsWith("console"))) {
      if (value === undefined) delete global[name];
      else global[name] = value;
    }
    console.error = previous.consoleError;
    console.warn = previous.consoleWarn;
    delete global.RavueGeometry;
    delete global.RavueSessionStore;
    delete global.RavuePendingStore;
  });

  const browser = {
    i18n: {
      getMessage() { return ""; },
      getUILanguage() { return "pt-BR"; },
    },
    runtime: {
      getURL(file) { return `moz-extension://ravue/${file}`; },
      onMessage: {
        addListener(listener) { runtimeListeners.push(listener); },
      },
      onInstalled: {
        addListener(listener) { installedListener = listener; },
      },
      onStartup: {
        addListener(listener) { startupListener = listener; },
      },
    },
    storage: {
      session: {
        async get(query) {
          if (query === null) return { ...storageData };
          if (Array.isArray(query)) {
            return Object.fromEntries(query.filter((key) => key in storageData).map((key) => [key, storageData[key]]));
          }
          return query in storageData ? { [query]: storageData[query] } : {};
        },
        async set(values) { Object.assign(storageData, values); },
        async remove(query) {
          for (const key of Array.isArray(query) ? query : [query]) delete storageData[key];
        },
      },
    },
    scripting: {
      async executeScript(details) {
        executedScripts.push(details);
        if (!details.func) return [];
        return [{
          frameId: details.target.frameIds[0],
          result: await details.func(...details.args),
        }];
      },
    },
    tabs: {
      async sendMessage(tabId, payload, options) {
        sent.push({ tabId, payload, options });
        if (payload.type === "RV_PING") return { ok: true };
        if (payload.type === "RV_WAIT_LAYOUT") {
          return { ok: true, viewport: { width: 1000, height: 500 } };
        }
        if (payload.type === "RV_DIRECT_IMAGE_BEGIN") {
          directCaptureNumber += 1;
          if (directCaptureNumber === 1) {
            return {
              ok: true,
              payload: {
                dataUrl: "data:image/jpeg;base64,aW1hZ2U=",
                width: 1000,
                height: 500,
                mimeType: "image/jpeg",
              },
            };
          }
          return {
            ok: true,
            plan: {
              rect: { x: 20, y: 30, width: 100, height: 2000 },
              documentRect: { x: 20, y: 30, width: 100, height: 2000 },
              viewport: { width: 1000, height: 500 },
              deviceScale: 2,
            },
          };
        }
        return { ok: true };
      },
      async query() { return [sourceTab]; },
      async captureVisibleTab(windowId, options) {
        screenshotCount += 1;
        lastCaptureOptions = options;
        captureRequests.push({ windowId, options });
        if (directCaptureNumber === 3 && options?.rect) {
          throw new Error("Document rectangle capture failed");
        }
        return "data:image/png;base64,c2NyZWVuc2hvdA==";
      },
      async create(details) {
        const created = { ...details, id: nextTabId++ };
        createdTabs.push(created);
        return { id: created.id };
      },
      async update(tabId, details) {
        updatedTabs.push({ tabId, details });
        return { id: tabId, ...details };
      },
      async remove(tabId) { removedTabs.push(tabId); },
      onRemoved: {
        addListener(listener) { removedListener = listener; },
      },
      onUpdated: {
        addListener(listener) { updatedListener = listener; },
      },
    },
    menus: {
      getTargetElement(targetId) { return targetId === 123 ? clickedImage : null; },
      async removeAll() { menuItems.length = 0; },
      create(details) { menuItems.push(details); },
      onClicked: {
        addListener(listener) { menuListener = listener; },
      },
    },
    action: {
      async setBadgeBackgroundColor(details) { badges.push(["color", details]); },
      async setBadgeText(details) { badges.push(["text", details]); },
      async setTitle(details) { badges.push(["title", details]); },
      onClicked: {
        addListener(listener) { actionListener = listener; },
      },
    },
    commands: {
      onCommand: { addListener(listener) { commandListener = listener; } },
    },
  };

  class FakeImage {
    constructor() {
      if (lastCaptureOptions?.rect) {
        this.naturalWidth = Math.round(lastCaptureOptions.rect.width * lastCaptureOptions.scale);
        this.naturalHeight = Math.round(lastCaptureOptions.rect.height * lastCaptureOptions.scale);
      } else {
        this.naturalWidth = 2000;
        this.naturalHeight = 1000;
      }
      this.listeners = new Map();
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    set src(value) {
      this.source = value;
      queueMicrotask(() => this.listeners.get("load")?.());
    }
    remove() {}
  }

  class FakeFileReader {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    readAsDataURL() {
      this.result = "data:image/jpeg;base64,aW1hZ2U=";
      queueMicrotask(() => this.listeners.get("load")?.());
    }
  }

  const drawCalls = [];
  const clickedImage = {
    tagName: "IMG",
    complete: true,
    naturalWidth: 1000,
    naturalHeight: 500,
    currentSrc: "https://example.com/image.png",
    src: "https://example.com/image.png",
    getAttribute(name) { return name === "src" ? this.src : null; },
    getBoundingClientRect() {
      return { left: 20, top: 30, right: 120, bottom: 80, width: 100, height: 50 };
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        fillRect() {},
        drawImage(...values) { drawCalls.push(values); },
      };
    },
    toBlob(callback, type) { callback(new Blob(["image"], { type })); },
    remove() {},
  };

  global.browser = browser;
  global.Image = FakeImage;
  global.FileReader = FakeFileReader;
  global.document = {
    baseURI: "https://example.com/page",
    images: [clickedImage],
    createElement(name) {
      assert.equal(name, "canvas");
      return canvas;
    },
  };
  global.fetch = async (url) => {
    assert.equal(url, "moz-extension://ravue/ui/overlay.css");
    return { ok: true, async text() { return ".rv-shell{display:block}"; } };
  };
  global.setTimeout = () => 0;
  global.innerWidth = 1000;
  global.innerHeight = 500;
  global.getComputedStyle = () => ({
    borderLeftWidth: "0px",
    borderRightWidth: "0px",
    borderTopWidth: "0px",
    borderBottomWidth: "0px",
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    objectFit: "fill",
    objectPosition: "50% 50%",
  });
  console.error = (...values) => logs.push(["error", ...values]);
  console.warn = (...values) => logs.push(["warn", ...values]);

  const background = pathToFileURL(path.resolve(__dirname, "..", "background.mjs"));
  await import(`${background.href}?actions-test=${Date.now()}`);

  assert.equal(typeof installedListener, "function");
  assert.equal(typeof startupListener, "function");
  assert.equal(typeof menuListener, "function");
  assert.equal(typeof actionListener, "function");
  assert.equal(typeof commandListener, "function");
  assert.equal(typeof removedListener, "function");
  assert.equal(typeof updatedListener, "function");
  assert.equal(runtimeListeners.length, 1);

  await installedListener();
  assert.deepEqual(menuItems.map(({ id }) => id), ["ravue-image", "ravue-area"]);

  await menuListener({
    menuItemId: "ravue-image",
    frameId: 0,
    targetElementId: 123,
    srcUrl: "https://example.com/image.png?size=full#ignored",
  }, sourceTab);

  assert.equal(sent.some(({ payload }) => payload.type === "RV_OPEN_OVERLAY"), false);
  assert.equal(createdTabs.length, 1);
  assert.equal(screenshotCount, 0);
  assert.equal(executedScripts.length, 0);
  assert.equal(createdTabs[0].url, "moz-extension://ravue/results.html");
  assert.equal(createdTabs[0].openerTabId, sourceTab.id);
  assert.equal(createdTabs[0].active, true);
  const directStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: 900, windowId: 7 } },
  );
  assert.deepEqual(directStage, { ok: true });
  const directUrl = new URL(updatedTabs[0].details.url);
  assert.equal(updatedTabs[0].tabId, 900);
  assert.equal(directUrl.origin, "https://lens.google.com");
  assert.equal(directUrl.pathname, "/uploadbyurl");
  assert.equal(directUrl.searchParams.get("url"), "https://example.com/image.png?size=full");
  assert.equal(directUrl.searchParams.get("ep"), "ccm");
  const lensProbe = await runtimeListeners[0](
    { type: "RV_LENS_RESULT_PROBE" },
    { url: directUrl.href, tab: { id: 900, windowId: 7 } },
  );
  assert.deepEqual(lensProbe, { pending: true });
  sent.length = 0;
  await updatedListener(900, { status: "complete" });
  assert.equal(sent.some(({ tabId, payload }) => tabId === 900 && payload.type === "RV_REVEAL_LENS"), true);
  assert.deepEqual(removedTabs, []);

  await menuListener({
    menuItemId: "ravue-image",
    frameId: 0,
    targetElementId: 123,
    srcUrl: "data:image/png;base64,aW1hZ2U=",
  }, sourceTab);
  assert.equal(createdTabs.length, 2);
  const directScript = executedScripts.find(({ files }) => files?.includes("content/direct-image.js"));
  assert.deepEqual(directScript.target, { tabId: 41, frameIds: [0] });
  assert.deepEqual(directScript.files, [
    "content/geometry.js",
    "content/target.js",
    "content/direct-image.js",
  ]);
  const localStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: 901, windowId: 7 } },
  );
  assert.deepEqual(localStage, { ok: true });
  assert.deepEqual(updatedTabs.at(-1), {
    tabId: 901,
    details: { url: "https://images.google.com/" },
  });
  const localProbe = await runtimeListeners[0](
    { type: "RV_GOOGLE_UPLOAD_PROBE" },
    { url: "https://images.google.com/", tab: { id: 901, windowId: 7 } },
  );
  assert.deepEqual(localProbe, { pending: true });
  const localReady = await runtimeListeners[0](
    { type: "RV_GOOGLE_UPLOAD_READY" },
    { url: "https://images.google.com/", tab: { id: 901, windowId: 7 } },
  );
  assert.equal(localReady.ok, true);
  assert.equal(localReady.payload.width, 1000);
  assert.equal(localReady.payload.height, 500);
  assert.match(localReady.payload.dataUrl, /^data:image\/jpeg;base64,/);
  assert.equal(screenshotCount, 0);
  assert.equal(drawCalls.length, 0);
  assert.equal(captureRequests.length, 0);
  const localSubmitting = await runtimeListeners[0](
    { type: "RV_GOOGLE_UPLOAD_SUBMITTING" },
    { url: "https://images.google.com/", tab: { id: 901, windowId: 7 } },
  );
  assert.deepEqual(localSubmitting, { ok: true });
  await updatedListener(901, { status: "loading" });
  const localLensProbe = await runtimeListeners[0](
    { type: "RV_LENS_RESULT_PROBE" },
    { url: "https://lens.google.com/search?p=ravue", tab: { id: 901, windowId: 7 } },
  );
  assert.deepEqual(localLensProbe, { pending: true });
  await updatedListener(901, { status: "complete" });
  assert.equal(sent.some(({ payload }) => (
    payload.type === "RV_DIRECT_IMAGE_SCROLL" || payload.type === "RV_DIRECT_IMAGE_RESTORE"
  )), false);

  sent.length = 0;
  createdTabs.length = 0;
  await menuListener({
    menuItemId: "ravue-image",
    frameId: 0,
    targetElementId: 123,
    srcUrl: "blob:https://example.com/ravue-image",
  }, sourceTab);
  assert.equal(createdTabs.length, 1);
  assert.equal(screenshotCount, 1);
  assert.equal(drawCalls.length, 1);
  assert.deepEqual(captureRequests.at(-1), {
    windowId: 7,
    options: {
      format: "png",
      rect: { x: 20, y: 30, width: 100, height: 2000 },
      scale: 0.6,
    },
  });
  const renderedStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: 902, windowId: 7 } },
  );
  assert.deepEqual(renderedStage, { ok: true });
  const renderedReady = await runtimeListeners[0](
    { type: "RV_GOOGLE_UPLOAD_READY" },
    { url: "https://images.google.com/", tab: { id: 902, windowId: 7 } },
  );
  assert.equal(renderedReady.ok, true);
  assert.equal(renderedReady.payload.width, 60);
  assert.equal(renderedReady.payload.height, 1200);
  await removedListener(902);

  sent.length = 0;
  createdTabs.length = 0;
  const screenshotsBeforeIncomplete = screenshotCount;
  await menuListener({
    menuItemId: "ravue-image",
    frameId: 0,
    targetElementId: 123,
    srcUrl: "data:image/png;base64,aW1hZ2U=",
  }, sourceTab);
  assert.equal(createdTabs.length, 0);
  assert.equal(screenshotCount, screenshotsBeforeIncomplete + 1);
  assert.equal(sent.some(({ payload }) => (
    payload.type === "RV_DIRECT_IMAGE_SCROLL" || payload.type === "RV_DIRECT_IMAGE_RESTORE"
  )), false);
  assert.equal(badges.some(([kind, details]) => kind === "text" && details.text === "!"), true);
  assert.equal(logs.some(([, message]) => message === "[Ravue] Unable to start"), true);

  sent.length = 0;
  createdTabs.length = 0;
  await menuListener({
    menuItemId: "ravue-area",
    frameId: 0,
    targetElementId: 123,
  }, sourceTab);
  const opened = sent.find(({ payload }) => payload.type === "RV_OPEN_OVERLAY");
  assert.ok(opened);
  assert.match(opened.payload.screenshot, /^data:image\/png;base64,/);
  assert.equal(opened.payload.styles, ".rv-shell{display:block}");
  assert.equal("initialSelection" in opened.payload, false);
  assert.equal(sent.some(({ payload }) => payload.type === "RV_TARGET_RECT"), false);
  assert.equal(createdTabs.length, 0);

  const selectionResult = await runtimeListeners[0]({
    type: "RV_SEARCH_CAPTURE",
    screenshot: opened.payload.screenshot,
    selection: { x: 10, y: 10, width: 80, height: 40 },
    viewport: { width: 1000, height: 500 },
  }, { tab: sourceTab, url: "https://example.com/page" });
  assert.deepEqual(selectionResult, { ok: true });
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "moz-extension://ravue/results.html");
  assert.equal(createdTabs[0].active, true);
  const selectionStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: 903, windowId: 7 } },
  );
  assert.deepEqual(selectionStage, { ok: true });
  const selectionReady = await runtimeListeners[0](
    { type: "RV_GOOGLE_UPLOAD_READY" },
    { url: "https://images.google.com/", tab: { id: 903, windowId: 7 } },
  );
  assert.equal(selectionReady.ok, true);
  const selectionPayload = selectionReady.payload;
  assert.equal(selectionPayload.width, 160);
  assert.equal(selectionPayload.height, 80);
  await removedListener(903);
  assert.equal(Object.keys(storageData).some((key) => key === "ravue.pending.903"), false);
  assert.deepEqual(removedTabs, []);

  sent.length = 0;
  createdTabs.length = 0;
  const scriptsBeforeIframe = executedScripts.length;
  const screenshotsBeforeIframe = screenshotCount;
  await menuListener({
    menuItemId: "ravue-image",
    frameId: 8,
    targetElementId: 456,
    srcUrl: "https://cdn.example.com/private/image.png",
  }, sourceTab);

  assert.equal(createdTabs.length, 1);
  assert.equal(executedScripts.length, scriptsBeforeIframe);
  assert.equal(screenshotCount, screenshotsBeforeIframe);
  const iframeStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: 904, windowId: 7 } },
  );
  assert.deepEqual(iframeStage, { ok: true });
  const iframeUrl = new URL(updatedTabs.at(-1).details.url);
  assert.equal(iframeUrl.pathname, "/uploadbyurl");
  assert.equal(iframeUrl.searchParams.get("url"), "https://cdn.example.com/private/image.png");

  const closeResult = await runtimeListeners[0](
    { type: "RV_CLOSE_RESULT_TAB" },
    { url: "moz-extension://ravue/results.html", tab: { id: 990, windowId: 7 } },
  );
  assert.deepEqual(closeResult, { ok: true });
  assert.deepEqual(removedTabs, [990]);

  sent.length = 0;
  const screenshotsBeforePopup = screenshotCount;
  const popupResult = await runtimeListeners[0](
    { type: "RV_POPUP_OPEN_SELECTOR" },
    { url: "moz-extension://ravue/popup/popup.html" },
  );
  assert.deepEqual(popupResult, { ok: true });
  assert.equal(screenshotCount, screenshotsBeforePopup + 1);
  assert.equal(sent.some(({ payload }) => payload.type === "RV_OPEN_OVERLAY"), true);

  const rejectedPopup = await runtimeListeners[0](
    { type: "RV_POPUP_OPEN_SELECTOR" },
    { url: "https://example.com/fake-popup" },
  );
  assert.deepEqual(rejectedPopup, { ok: false });

  const screenshotsBeforeImagePage = screenshotCount;
  const scriptsBeforeImagePage = executedScripts.length;
  const openedImagePage = await runtimeListeners[0](
    { type: "RV_POPUP_OPEN_IMAGE_PAGE" },
    { url: "moz-extension://ravue/popup/popup.html" },
  );
  assert.deepEqual(openedImagePage, { ok: true });
  const urlInputTab = createdTabs.at(-1);
  assert.equal(urlInputTab.url, "moz-extension://ravue/upload.html");
  assert.equal(urlInputTab.openerTabId, sourceTab.id);
  assert.equal(urlInputTab.active, true);
  assert.equal(screenshotCount, screenshotsBeforeImagePage);
  assert.equal(executedScripts.length, scriptsBeforeImagePage);

  const createdBeforeUrlStage = createdTabs.length;
  const imagePageUrlResult = await runtimeListeners[0](
    {
      type: "RV_IMAGE_PAGE_SEARCH_ITEM",
      item: { kind: "url", sourceUrl: "https://cdn.example.com/original.webp?full=1#ignored" },
    },
    { url: "moz-extension://ravue/upload.html", tab: { id: urlInputTab.id, windowId: 7 } },
  );
  assert.deepEqual(imagePageUrlResult, {
    ok: true,
    resultUrl: "moz-extension://ravue/results.html",
  });
  assert.equal(createdTabs.length, createdBeforeUrlStage);
  const imagePageUrlStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: urlInputTab.id, windowId: 7 } },
  );
  assert.deepEqual(imagePageUrlStage, { ok: true });
  const popupLensUrl = new URL(updatedTabs.at(-1).details.url);
  assert.equal(popupLensUrl.pathname, "/uploadbyurl");
  assert.equal(popupLensUrl.searchParams.get("url"), "https://cdn.example.com/original.webp?full=1");

  await runtimeListeners[0](
    { type: "RV_POPUP_OPEN_IMAGE_PAGE" },
    { url: "moz-extension://ravue/popup/popup.html" },
  );
  const fileInputTab = createdTabs.at(-1);
  const imagePageFileResult = await runtimeListeners[0](
    {
      type: "RV_IMAGE_PAGE_SEARCH_ITEM",
      item: {
        kind: "image",
        payload: {
          dataUrl: "data:image/png;base64,aW1hZ2U=",
          width: 288,
          height: 412,
          mimeType: "image/png",
        },
      },
    },
    { url: "moz-extension://ravue/upload.html", tab: { id: fileInputTab.id, windowId: 7 } },
  );
  assert.deepEqual(imagePageFileResult, {
    ok: true,
    resultUrl: "moz-extension://ravue/results.html",
  });
  const imagePageFileStage = await runtimeListeners[0](
    { type: "RV_START_GOOGLE_STAGE" },
    { url: "moz-extension://ravue/results.html", tab: { id: fileInputTab.id, windowId: 7 } },
  );
  assert.deepEqual(imagePageFileStage, { ok: true });
  const popupFileReady = await runtimeListeners[0](
    { type: "RV_GOOGLE_UPLOAD_READY" },
    { url: "https://images.google.com/", tab: { id: fileInputTab.id, windowId: 7 } },
  );
  assert.deepEqual(popupFileReady, {
    ok: true,
    pending: true,
    payload: {
      dataUrl: "data:image/png;base64,aW1hZ2U=",
      width: 288,
      height: 412,
      mimeType: "image/png",
    },
  });

  const rejectedImagePageOpen = await runtimeListeners[0](
    { type: "RV_POPUP_OPEN_IMAGE_PAGE" },
    { url: "https://example.com/fake-popup" },
  );
  assert.deepEqual(rejectedImagePageOpen, { ok: false });
  const rejectedImagePageItem = await runtimeListeners[0](
    { type: "RV_IMAGE_PAGE_SEARCH_ITEM", item: { kind: "url", sourceUrl: "https://example.com/a.png" } },
    { url: "https://example.com/fake-page", tab: { id: 999, windowId: 7 } },
  );
  assert.deepEqual(rejectedImagePageItem, { ok: false });
  const invalidImagePageItem = await runtimeListeners[0](
    { type: "RV_IMAGE_PAGE_SEARCH_ITEM", item: { kind: "image", payload: { dataUrl: "bad" } } },
    { url: "moz-extension://ravue/upload.html", tab: { id: fileInputTab.id, windowId: 7 } },
  );
  assert.equal(invalidImagePageItem.ok, false);

  sent.length = 0;
  const screenshotsBeforeShortcut = screenshotCount;
  const tabsBeforeShortcut = createdTabs.length;
  await commandListener("open-ravue", sourceTab);
  assert.equal(screenshotCount, screenshotsBeforeShortcut + 1);
  const shortcutOverlay = sent.find(({ payload }) => payload.type === "RV_OPEN_OVERLAY");
  assert.ok(shortcutOverlay);
  assert.equal("initialSelection" in shortcutOverlay.payload, false);
  assert.equal(createdTabs.length, tabsBeforeShortcut);
  assert.equal(await commandListener("unrelated-command", sourceTab), undefined);
});
