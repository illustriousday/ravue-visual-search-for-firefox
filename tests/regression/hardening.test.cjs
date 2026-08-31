"use strict";

// Behavioral tests run the release scripts themselves with explicit WebExtension
// doubles. They are not a substitute for installation in a real Firefox profile.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { source, realm, storage, background, plain, read } = require("./harness.cjs");
const upload = require(path.join(source, "content/google-upload.js"));
const geometry = require(path.join(source, "content/geometry.js"));
const { RavueOverlaySession } = require(path.join(source, "content/overlay.js"));
const payload = { dataUrl: "data:image/jpeg;base64,YXVkaXQ=", width: 288, height: 412, mimeType: "image/jpeg" };
const uploadId = "a".repeat(32);
const flush = () => new Promise((resolve) => setImmediate(resolve));

function clock() {
  const timers = new Map();
  let id = 0;
  return {
    timers,
    setTimeout(callback, delay) { timers.set(++id, { callback, delay }); return id; },
    clearTimeout(key) { timers.delete(key); },
    async expire(delay) {
      for (const [key, timer] of [...timers]) {
        if (timer.delay !== delay) continue;
        timers.delete(key);
        await timer.callback();
      }
      await flush();
    },
  };
}

function lens({ state = "loading", ready = { ok: true }, pending = true, probeReject = false } = {}) {
  const time = clock(), events = new Map(), messages = [], listeners = [];
  const counts = { mounted: 0, removed: 0 };
  const document = { readyState: state };
  realm(["content/lens-ready.js"], {
    ...time, document,
    addEventListener(type, listener) { events.set(type, listener); },
    removeEventListener(type, listener) { if (events.get(type) === listener) events.delete(type); },
    RavueLoadingScreen: { mount() { counts.mounted++; }, remove() { counts.removed++; } },
    browser: { runtime: {
      onMessage: { addListener(listener) { listeners.push(listener); } },
      async sendMessage(message) {
        messages.push(message.type);
        if (message.type === "RV_LENS_RESULT_PROBE") {
          if (probeReject) throw new Error("Extension unavailable");
          return { pending };
        }
        if (ready === "hang") return new Promise(() => {});
        if (ready === "reject") throw new Error("Background unavailable");
        return ready;
      },
    } },
  });
  return { time, events, messages, counts, listeners, document };
}

test("Lens keeps the cover during load and releases all timers/listeners after success", async () => {
  const h = lens();
  await flush();
  assert.equal(h.counts.mounted, 1);
  assert.equal(h.counts.removed, 0);
  assert.equal(h.time.timers.size, 1);
  h.document.readyState = "complete";
  h.events.get("load")();
  await flush();
  assert.equal(h.counts.removed, 1);
  assert.equal(h.time.timers.size, 0);
  assert.equal(h.events.size, 0);
  assert.deepEqual(h.messages, ["RV_LENS_RESULT_PROBE", "RV_LENS_DOCUMENT_READY"]);
});

for (const ready of [{ ok: false }, null, "reject"]) {
  test(`Lens cannot stay covered after a terminal background reply: ${JSON.stringify(ready)}`, async () => {
    const h = lens({ state: "complete", ready });
    await flush();
    assert.ok(h.counts.removed >= 1);
    assert.equal(h.time.timers.size, 0);
    assert.equal(h.events.size, 0);
  });
}

test("Lens releases its cover at the deadline even when load never fires", async () => {
  const h = lens();
  await flush();
  assert.equal(h.counts.removed, 0);
  await h.time.expire(30000);
  assert.equal(h.counts.removed, 1);
  assert.equal(h.time.timers.size, 0);
  assert.equal(h.events.size, 0);
  assert.deepEqual(h.messages, ["RV_LENS_RESULT_PROBE"]);
});

test("Lens deadline also bounds a background READY message that never resolves", async () => {
  const h = lens({ state: "complete", ready: "hang" });
  await flush();
  assert.equal(h.counts.removed, 0);
  assert.equal(h.messages.at(-1), "RV_LENS_DOCUMENT_READY");
  await h.time.expire(30000);
  assert.equal(h.counts.removed, 1);
  assert.equal(h.time.timers.size, 0);
});

test("Lens probes do not mount a cover on ordinary or failed startup navigation", async () => {
  for (const options of [{ pending: false }, { probeReject: true }]) {
    const h = lens(options);
    await flush();
    assert.equal(h.counts.mounted, 0);
    assert.equal(h.time.timers.size, 0);
    assert.equal(h.events.size, 0);
  }
});

function googleEnvironment({ pending = true, failure = { ok: true } } = {}) {
  const time = clock(), events = new Map(), messages = [], counts = { mounted: 0, removed: 0, domReads: 0 };
  return {
    ...time, time, events, messages, counts,
    document: {
      readyState: "loading",
      querySelectorAll() { counts.domReads++; return []; },
      querySelector() { counts.domReads++; return null; },
    },
    addEventListener(type, listener, options) {
      const handler = options?.once ? (...args) => { events.delete(type); listener(...args); } : listener;
      handler.originalListener = listener;
      events.set(type, handler);
    },
    removeEventListener(type, listener) {
      if (events.get(type) === listener || events.get(type)?.originalListener === listener) events.delete(type);
    },
    RavueLoadingScreen: { mount() { counts.mounted++; }, remove() { counts.removed++; } },
    browser: { runtime: { async sendMessage(message) {
      messages.push(message);
      if (message.type === "RV_GOOGLE_UPLOAD_PROBE") return { pending };
      if (failure === "reject") throw new Error("No background");
      return failure;
    } } },
  };
}

// The introduced 30-second load deadline is deliberately reverted. These tests
// assert the stable 2.1.5 load contract, not the removed deadline. Upload-control
// and result deadlines remain covered independently below and in upload-loading.
test("Google Images preserves its pending operation beyond the former 30-second load deadline", async () => {
  const env = googleEnvironment();
  const task = upload.launch(env);
  await flush();
  assert.equal(env.counts.mounted, 1);
  assert.equal(env.counts.domReads, 0);
  await env.time.expire(30000);
  assert.deepEqual(env.messages, [{ type: "RV_GOOGLE_UPLOAD_PROBE" }]);
  assert.equal(env.counts.domReads, 0);
  assert.equal(env.counts.removed, 0);
  env.document.readyState = "complete";
  env.events.get("load")();
  await task;
  assert.deepEqual(env.messages, [
    { type: "RV_GOOGLE_UPLOAD_PROBE" },
    { type: "RV_GOOGLE_UPLOAD_FAILED", code: "google-trigger-unavailable" },
  ]);
  assert.equal(env.events.size, 0);
  assert.equal(env.time.timers.size, 0);
});

test("a genuine post-load Google Images failure removes the cover if the error page cannot open", async () => {
  for (const failure of [{ ok: false }, "reject"]) {
    const env = googleEnvironment({ failure });
    const task = upload.launch(env);
    await flush();
    env.document.readyState = "complete";
    env.events.get("load")();
    await task;
    assert.equal(env.counts.removed, 1);
    assert.equal(env.time.timers.size, 0);
  }
});

test("the stable Google load wait uses a once-only listener and has no early DOM-ready trigger", async () => {
  const env = googleEnvironment();
  const waiting = upload.waitForDocumentComplete(env);
  assert.equal(env.time.timers.size, 0);
  assert.equal(env.events.has("DOMContentLoaded"), false);
  assert.equal(env.events.size, 1);
  env.events.get("load")();
  await waiting;
  assert.equal(env.time.timers.size, 0);
  assert.equal(env.events.size, 0);
});

test("a result timeout also reveals Google if the background rejects the error route", async () => {
  const env = googleEnvironment({ failure: { ok: false } });
  upload.armResultTimeout(env.browser, env);
  await env.time.expire(20000);
  assert.equal(env.counts.removed, 1);
  assert.equal(env.messages.at(-1).code, "google-result-timeout");
});

test("100 simultaneous takes return the same staged image at most once", async () => {
  const state = storage();
  const c = realm(["shared/session-store.js"], { browser: { storage: { session: state } } });
  await c.RavueSessionStore.put(uploadId, payload);
  const values = await Promise.all(Array.from({ length: 100 }, () => c.RavueSessionStore.take(uploadId)));
  assert.equal(values.filter(Boolean).length, 1);
  assert.deepEqual(plain(values.find(Boolean)), payload);
  assert.deepEqual(state.data, {});
});

test("failed storage reads release the in-memory claim for a later retry", async () => {
  const state = storage();
  const c = realm(["shared/session-store.js"], { browser: { storage: { session: state } } });
  await c.RavueSessionStore.put(uploadId, payload);
  const get = state.get;
  state.get = async () => { throw new Error("Storage unavailable"); };
  await assert.rejects(c.RavueSessionStore.take(uploadId), /unavailable/);
  state.get = get;
  assert.deepEqual(plain(await c.RavueSessionStore.take(uploadId)), payload);
});

test("claims do not serialize unrelated images or leave locks after successful consumption", async () => {
  const state = storage();
  const c = realm(["shared/session-store.js"], { browser: { storage: { session: state } } });
  const other = "b".repeat(32);
  await Promise.all([c.RavueSessionStore.put(uploadId, payload), c.RavueSessionStore.put(other, payload)]);
  assert.equal((await Promise.all([c.RavueSessionStore.take(uploadId), c.RavueSessionStore.take(other)])).filter(Boolean).length, 2);
  await c.RavueSessionStore.put(uploadId, payload);
  assert.deepEqual(plain(await c.RavueSessionStore.take(uploadId)), payload);
});

test("concurrent Google READY messages cannot receive duplicate image payloads", async () => {
  const h = await background();
  await h.context.RavueSessionStore.put(uploadId, payload);
  await h.context.RavuePendingStore.put(900, uploadId);
  const responses = await Promise.all(Array.from({ length: 25 }, () => h.message("RV_GOOGLE_UPLOAD_READY", h.sender("https://images.google.com/"))));
  assert.equal(responses.filter((response) => response.ok).length, 1);
  assert.equal(responses.filter((response) => response.payload).length, 1);
});

const localUrls = [
  "http://localhost/image.png", "http://localhost./image.png", "https://sub.localhost/a", "http://intranet/a",
  "http://photo.local/a", "http://photo.lan/a", "http://router.home/a", "http://router.home.arpa/a",
  "http://files.internal/a", "http://private.onion/a", "http://127.0.0.1/a", "http://127.255.255.255/a",
  "http://2130706433/a", "http://0x7f000001/a", "http://0177.0.0.1/a", "http://0.0.0.0/a",
  "http://10.1.2.3/a", "http://172.16.0.1/a", "http://172.31.255.254/a", "http://192.168.1.1/a",
  "http://169.254.1.1/a", "http://100.64.0.1/a", "http://100.127.255.254/a", "http://198.18.0.1/a",
  "http://192.0.2.1/a", "http://198.51.100.1/a", "http://203.0.113.1/a", "http://224.0.0.1/a",
  "http://255.255.255.255/a", "http://[::]/a", "http://[::1]/a", "http://[::ffff:127.0.0.1]/a",
  "http://[fc00::1]/a", "http://[fe80::1]/a", "http://[ff02::1]/a", "http://[2001:db8::1]/a",
  "http://[2002:c0a8:101::1]/a",
];

test("recognizable local, private, loopback and special-use URLs never enter the URL route", async () => {
  const state = storage();
  const c = realm(["shared/pending-store.js"], { browser: { storage: { session: state } } });
  for (const url of localUrls) {
    assert.equal(c.RavuePendingStore.validSourceUrl(url), false, url);
    await assert.rejects(c.RavuePendingStore.putUrl(900, url), /source URL/, url);
  }
  assert.deepEqual(state.data, {});
});

test("public domains and public IP literals remain eligible, preserving the image URL query", () => {
  const c = realm(["shared/pending-store.js"]);
  for (const url of [
    "https://images.example.com/image.webp?size=original&token=example-only",
    "https://example.com./image.svg", "http://example.org/image.jpg", "https://8.8.8.8/image.png",
    "https://[2606:4700:4700::1111]/image.png", "https://[2001:4860:4860::8888]/image.png",
    "https://localhost.example.com/image.png",
  ]) assert.equal(c.RavuePendingStore.validSourceUrl(url), true, url);
});

test("a local image uses the existing decoded-pixel fallback, with no URL sent or scrolling", async () => {
  const h = await background({ directResponse: { ok: true, payload } });
  await h.image("http://192.168.1.10/private-photo.png", { targetElementId: 4 });
  assert.equal(h.calls.create.length, 1);
  assert.equal(h.calls.capture.length, 0);
  const route = await h.context.RavuePendingStore.route(900);
  assert.equal(route.kind, "upload");
  assert.equal("sourceUrl" in route, false);
  assert.equal(JSON.stringify(h.state.data).includes("192.168"), false);
  await h.message("RV_START_GOOGLE_STAGE", h.sender(h.browser.runtime.getURL("results.html")));
  assert.equal(h.calls.update[0].url, "https://images.google.com/");
});

test("an inaccessible local iframe fails safely without disclosing its address", async () => {
  const h = await background({ denyScript: true });
  await h.image("http://10.0.0.2/private-photo.png", { frameId: 8, targetElementId: 4 });
  assert.equal(h.calls.create.length, 0);
  assert.equal(h.calls.capture.length, 0);
  assert.equal(h.calls.script.length, 0);
  assert.deepEqual(h.state.data, {});
  assert.ok(h.calls.badge.some((badge) => badge.text === "!"));
});

function keySession() {
  const session = Object.create(RavueOverlaySession.prototype), sent = [];
  const focus = (tagName, command) => ({ tagName, dataset: { command }, hidden: false, disabled: false, focus() { session.root.activeElement = this; } });
  Object.assign(session, {
    geometry, selection: { x: 10, y: 20, width: 150, height: 80 }, closed: false, busy: false, error: "",
    root: { activeElement: null }, render() {}, bounds: () => ({ width: 1000, height: 500 }),
    dispose(cancelled) { this.closed = true; this.cancelled = cancelled; },
    config: { async onSubmit(rect) { sent.push(rect); } },
  });
  for (const command of ["close", "cancel", "reset", "full", "search"]) session[`${command}Button`] = focus("BUTTON", command);
  session.box = focus("DIV");
  return { session, sent };
}

function keyboard(key, extra = {}) {
  return { key, defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
}

test("Enter on every toolbar button is left to native activation, even through a closed shadow root", () => {
  const { session, sent } = keySession();
  for (const command of ["close", "cancel", "reset", "full", "search"]) {
    session.root.activeElement = session[`${command}Button`];
    const event = keyboard("Enter", { target: { tagName: "DIV" }, composedPath: () => [] });
    session.key(event);
    assert.equal(event.defaultPrevented, false, command);
    assert.equal(event.stopped, false, command);
  }
  assert.equal(sent.length, 0, "The browser's button click, not the global key handler, owns submission.");
});

test("Space on controls remains native and never submits through the shortcut handler", () => {
  const { session, sent } = keySession();
  session.root.activeElement = session.cancelButton;
  const event = keyboard(" ");
  session.key(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(sent.length, 0);
});

test("IME confirmation never accidentally starts a search", () => {
  const { session, sent } = keySession();
  session.root.activeElement = session.box;
  const event = keyboard("Enter", { isComposing: true });
  session.key(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(sent.length, 0);
});

test("Tab and Shift+Tab stay within available selector controls", () => {
  const { session, sent } = keySession();
  session.root.activeElement = session.box;
  session.key(keyboard("Tab"));
  assert.equal(session.root.activeElement, session.closeButton);
  session.key(keyboard("Tab", { shiftKey: true }));
  assert.equal(session.root.activeElement, session.box);
  session.resetButton.disabled = true;
  session.root.activeElement = session.cancelButton;
  session.key(keyboard("Tab"));
  assert.equal(session.root.activeElement, session.fullButton);
  assert.equal(sent.length, 0);
});

function luminance(hex) {
  const rgb = hex.match(/../g).map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test("declared small light-theme text colors meet 4.5:1 on their base backgrounds", () => {
  for (const file of ["popup/popup.css", "ui/results.css", "content/loading-screen.js"]) {
    const text = read(file);
    const bg = text.match(/--bg:\s*#([a-f0-9]{6})/i)[1];
    const muted = text.match(/--muted:\s*#([a-f0-9]{6})/i)[1];
    const accent = text.match(file.endsWith(".css") ? /--accent-two:\s*#([a-f0-9]{6})/i : /--accent:\s*#([a-f0-9]{6})/i)[1];
    for (const color of [muted, accent]) {
      const ratio = (luminance(bg) + 0.05) / (luminance(color) + 0.05);
      assert.ok(ratio >= 4.5, `${file}: #${color} / #${bg} = ${ratio}`);
    }
  }
});
