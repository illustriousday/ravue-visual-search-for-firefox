const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

test("executa busca direta, seleção e contingência como ações independentes", async () => {
  const sent = [];
  const createdTabs = [];
  const updatedTabs = [];
  const executedScripts = [];
  const runtimeListeners = [];
  let menuListener = null;
  let nextTabId = 900;
  const sourceTab = { id: 41, windowId: 7 };

  const event = () => ({ addListener() {} });
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
    },
    tabs: {
      async sendMessage(tabId, payload, options) {
        sent.push({ tabId, payload, options });
        if (payload.type === "RV_PING") return { ok: true };
        if (payload.type === "RV_WAIT_LAYOUT") {
          return { ok: true, viewport: { width: 1000, height: 500 } };
        }
        if (payload.type === "RV_TARGET_RECT") {
          return { ok: true, rect: { x: 20, y: 30, width: 100, height: 50 } };
        }
        return { ok: true };
      },
      async executeScript(tabId, details) { executedScripts.push({ tabId, details }); },
      async query() { return [sourceTab]; },
      async captureVisibleTab() { return "data:image/png;base64,c2NyZWVuc2hvdA=="; },
      async create(details) {
        createdTabs.push(details);
        return { id: nextTabId++ };
      },
      async update(tabId, details) { updatedTabs.push({ tabId, details }); },
      async remove() {},
      onRemoved: event(),
      onUpdated: event(),
    },
    contextMenus: {
      async removeAll() {},
      create() {},
      onClicked: {
        addListener(listener) { menuListener = listener; },
      },
    },
    browserAction: {
      async setBadgeBackgroundColor() {},
      async setBadgeText() {},
      async setTitle() {},
      onClicked: event(),
    },
    commands: { onCommand: event() },
  };

  class FakeImage {
    constructor() {
      this.naturalWidth = 1000;
      this.naturalHeight = 500;
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

  const canvas = {
    width: 0,
    height: 0,
    getContext() { return { drawImage() {} }; },
    toBlob(callback, type) { callback(new Blob(["image"], { type })); },
    remove() {},
  };

  const previousInterval = global.setInterval;
  global.setInterval = () => 0;
  global.browser = browser;
  global.Image = FakeImage;
  global.FileReader = FakeFileReader;
  global.document = { createElement(name) { assert.equal(name, "canvas"); return canvas; } };
  global.RavueGeometry = {
    valid(rect, minimum) {
      return rect && rect.width >= minimum && rect.height >= minimum;
    },
    pixels() { return { x: 20, y: 30, width: 100, height: 50 }; },
  };

  const background = pathToFileURL(path.resolve(__dirname, "..", "background.mjs"));
  await import(`${background.href}?actions-test=${Date.now()}`);
  global.setInterval = previousInterval;

  assert.equal(typeof menuListener, "function");
  assert.equal(runtimeListeners.length, 1);

  await menuListener({
    menuItemId: "ravue-image",
    frameId: 0,
    targetElementId: 123,
    srcUrl: "https://example.com/image.png",
  }, sourceTab);

  assert.equal(sent.some(({ payload }) => payload.type === "RV_OPEN_OVERLAY"), false);
  assert.equal(createdTabs.length, 1);
  const uploadPage = new URL(createdTabs[0].url);
  assert.equal(uploadPage.origin, "null");
  assert.equal(uploadPage.pathname, "/results.html");
  assert.ok(uploadPage.searchParams.get("upload"));
  assert.equal(createdTabs[0].openerTabId, sourceTab.id);

  const upload = await runtimeListeners[0]({
    type: "RV_TAKE_UPLOAD",
    uploadId: uploadPage.searchParams.get("upload"),
  }, {
    url: createdTabs[0].url,
    tab: { id: 900, windowId: sourceTab.windowId },
  });
  assert.equal(upload.ok, true);
  assert.equal(upload.width, 100);
  assert.equal(upload.height, 50);
  assert.match(upload.dataUrl, /^data:image\/jpeg;base64,/);

  sent.length = 0;
  createdTabs.length = 0;
  await menuListener({ menuItemId: "ravue-area", frameId: 0 }, sourceTab);
  assert.equal(sent.some(({ payload }) => payload.type === "RV_OPEN_OVERLAY"), true);
  assert.equal(createdTabs.length, 0);

  sent.length = 0;
  createdTabs.length = 0;
  updatedTabs.length = 0;
  executedScripts.length = 0;
  await menuListener({
    menuItemId: "ravue-image",
    frameId: 8,
    srcUrl: "https://cdn.example.com/private/image.png?size=large#preview",
  }, sourceTab);

  assert.equal(sent.some(({ payload }) => payload.type === "RV_OPEN_OVERLAY"), false);
  assert.equal(executedScripts.length, 0);
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "about:blank");
  assert.equal(updatedTabs.length, 1);
  assert.equal(updatedTabs[0].tabId, 901);
  const lens = new URL(updatedTabs[0].details.url);
  assert.equal(lens.origin, "https://lens.google.com");
  assert.equal(lens.pathname, "/uploadbyurl");
  assert.equal(lens.searchParams.get("url"), "https://cdn.example.com/private/image.png?size=large");
  assert.equal(createdTabs[0].openerTabId, sourceTab.id);
});
