"use strict";

// A/B regression tests for the actual archive script. Browser/Google DOM and
// time are controlled doubles, not a live Firefox or a successful Lens search.
// Native Node File/fetch are used only for the local data: URL byte transfer.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { unzip } = require("../../tools/package.cjs");
const uploadCode = process.env.RAVUE_UPLOAD_XPI
  ? unzip(fs.readFileSync(process.env.RAVUE_UPLOAD_XPI)).get("content/google-upload.js").toString("utf8")
  : fs.readFileSync(process.env.RAVUE_UPLOAD_FILE || path.join(__dirname, "../../content/google-upload.js"), "utf8");
const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
const payload = { dataUrl: `data:image/png;base64,${bytes.toString("base64")}`, width: 1, height: 1, mimeType: "image/png" };
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ state = "loading", inputPresent = false, triggerPresent = false, triggerWired = false, pending = true, ready = true, delayedInput = false } = {}) {
  let now = 0, nextTimer = 0;
  const timers = new Map(), observers = new Set(), messages = [], uploadEvents = [];
  const windowEvents = new EventTarget();
  const counts = { mounted: 0, removed: 0, clicks: 0, domReads: 0, fetches: 0 };
  const time = {
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async advance(target) {
      assert.ok(target >= now);
      for (;;) {
        const next = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        await next[1].callback();
        await flush();
      }
      now = target;
      await flush();
    },
  };
  class Observer {
    constructor(callback) { this.callback = callback; }
    observe() { observers.add(this); }
    disconnect() { observers.delete(this); }
  }
  class Transfer {
    constructor() { this.files = []; this.items = { add: (file) => this.files.push(file) }; }
  }
  const input = {
    type: "file", name: "encoded_image", accept: "image/png,image/jpeg", files: null,
    dispatchEvent(event) { uploadEvents.push(event.type); return true; },
  };
  const exposeInput = () => { inputPresent = true; for (const observer of observers) observer.callback(); };
  const trigger = { click() { counts.clicks++; if (triggerWired && !delayedInput) exposeInput(); } };
  const document = {
    readyState: state, documentElement: {},
    querySelector() { counts.domReads++; return triggerPresent ? trigger : null; },
    querySelectorAll() { counts.domReads++; return inputPresent ? [input] : []; },
  };
  const environment = {
    ...time, document, File, DataTransfer: Transfer, Event,
    addEventListener: (...args) => windowEvents.addEventListener(...args),
    removeEventListener: (...args) => windowEvents.removeEventListener(...args),
    async fetch(url) { counts.fetches++; assert.equal(url, payload.dataUrl); return fetch(url); },
    RavueLoadingScreen: { mount() { counts.mounted++; }, remove() { counts.removed++; } },
    browser: { runtime: { async sendMessage(message) {
      messages.push({ ...message });
      if (message.type === "RV_GOOGLE_UPLOAD_PROBE") return { pending };
      if (message.type === "RV_GOOGLE_UPLOAD_READY") return ready ? { ok: true, payload } : { ok: false };
      return { ok: true };
    } } },
  };
  const context = vm.createContext({ module: { exports: {} }, MutationObserver: Observer, ...time });
  vm.runInContext(uploadCode, context, { filename: "content/google-upload.js" });
  const api = context.module.exports;
  const launching = api.launch(environment);
  const fire = (event) => {
    document.readyState = event === "load" ? "complete" : "interactive";
    windowEvents.dispatchEvent(new Event(event));
  };
  return {
    api, launching, counts, document, messages, uploadEvents, input, time, observers,
    fire, exposeInput,
    readyTrigger() { triggerPresent = true; triggerWired = true; },
    failures() { return messages.filter((m) => m.type === "RV_GOOGLE_UPLOAD_FAILED").map((m) => m.code); },
    consumed() { return messages.filter((m) => m.type === "RV_GOOGLE_UPLOAD_READY").length; },
  };
}

async function successful(h) {
  await h.launching;
  assert.deepEqual(h.failures(), []);
  assert.equal(h.consumed(), 1);
  assert.deepEqual(h.uploadEvents, ["input", "change"]);
  assert.equal(h.input.files.length, 1);
  assert.equal(h.input.files[0].name, "ravue-selection.png");
  assert.equal(h.input.files[0].type, "image/png");
  assert.deepEqual(Buffer.from(await h.input.files[0].arrayBuffer()), bytes);
  assert.equal(h.counts.removed, 0);
}

test("a complete page with an existing input sends exactly the selected file bytes", async () => {
  await successful(fixture({ state: "complete", inputPresent: true }));
});

test("DOMContentLoaded alone does not consume the image, even when an input exists", async () => {
  const h = fixture({ inputPresent: true });
  await flush();
  h.fire("DOMContentLoaded");
  await flush();
  const earlyConsumption = h.consumed();
  h.fire("load");
  await h.launching;
  assert.equal(earlyConsumption, 0, "The file must wait for the same load stage as the stable 2.1.5");
  await successful(h);
});

test("a trigger added after DOMContentLoaded but before load is not rejected prematurely", async () => {
  const h = fixture();
  await flush();
  h.fire("DOMContentLoaded");
  await flush();
  const earlyFailures = h.failures();
  h.readyTrigger();
  h.fire("load");
  await h.launching;
  assert.deepEqual(earlyFailures, [], "The previous revision looked for the trigger before it existed");
  await successful(h);
});

test("a visible camera whose async click handler is ready only later is not clicked early", async () => {
  const h = fixture({ triggerPresent: true });
  await flush();
  h.fire("DOMContentLoaded");
  await flush();
  const earlyClicks = h.counts.clicks;
  await h.time.advance(13000);
  h.readyTrigger();
  h.fire("load");
  await h.launching;
  assert.equal(earlyClicks, 0, "A pre-handler click is lost; the stable script waits for load");
  await successful(h);
});

test("loading after 30 seconds but within session lifetime still follows the stable upload path", async () => {
  const h = fixture();
  await flush();
  await h.time.advance(31000);
  const earlyFailures = h.failures();
  h.readyTrigger();
  h.fire("load");
  await h.launching;
  assert.deepEqual(earlyFailures, [], "The introduced 30-second deadline prematurely aborted this scenario");
  await successful(h);
});

test("entering at interactive readiness still waits for load", async () => {
  const h = fixture({ state: "interactive", triggerPresent: true, triggerWired: true });
  await flush();
  assert.equal(h.counts.clicks, 0);
  h.fire("load");
  await successful(h);
});

test("an input added asynchronously after the camera click is observed and used once", async () => {
  const h = fixture({ state: "complete", triggerPresent: true, triggerWired: true, delayedInput: true });
  await flush();
  assert.equal(h.observers.size, 1);
  await h.time.advance(11999);
  h.exposeInput();
  await successful(h);
  assert.equal(h.observers.size, 0);
});

test("the 12-second input deadline is retained without consuming image bytes", async () => {
  const h = fixture({ state: "complete", triggerPresent: true, triggerWired: true, delayedInput: true });
  await flush();
  await h.time.advance(12000);
  await h.launching;
  assert.deepEqual(h.failures(), ["google-input-unavailable"]);
  assert.equal(h.consumed(), 0);
  assert.equal(h.counts.fetches, 0);
  assert.equal(h.observers.size, 0);
});

test("a genuinely absent trigger after load still reports the existing error", async () => {
  const h = fixture({ state: "complete" });
  await h.launching;
  assert.deepEqual(h.failures(), ["google-trigger-unavailable"]);
  assert.equal(h.consumed(), 0);
});

test("ordinary Google Images navigation is untouched without a pending Ravue operation", async () => {
  const h = fixture({ pending: false });
  await h.launching;
  h.fire("DOMContentLoaded");
  h.fire("load");
  assert.equal(h.counts.mounted, 0);
  assert.equal(h.counts.domReads, 0);
  assert.equal(h.counts.fetches, 0);
  assert.deepEqual(h.messages.map((m) => m.type), ["RV_GOOGLE_UPLOAD_PROBE"]);
});

test("an expired image is never attached to the input", async () => {
  const h = fixture({ state: "complete", inputPresent: true, ready: false });
  await h.launching;
  assert.deepEqual(h.failures(), ["capture-expired"]);
  assert.equal(h.counts.fetches, 0);
  assert.deepEqual(h.uploadEvents, []);
});

test("the original 20-second post-submission error remains bounded", async () => {
  const h = fixture({ state: "complete", inputPresent: true });
  await successful(h);
  await h.time.advance(19999);
  assert.deepEqual(h.failures(), []);
  await h.time.advance(20000);
  assert.deepEqual(h.failures(), ["google-result-timeout"]);
  assert.equal(h.consumed(), 1);
  assert.deepEqual(h.uploadEvents, ["input", "change"]);
});
