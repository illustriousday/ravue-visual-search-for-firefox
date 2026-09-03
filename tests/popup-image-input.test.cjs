"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const imageInput = require("../popup/image-input.js");

function file({ name = "image.png", type = "image/png", size = 128 } = {}) {
  return {
    name,
    type,
    size,
    slice(start, end, mimeType) {
      assert.equal(start, 0);
      assert.equal(end, size);
      return { name, type: mimeType, size };
    },
  };
}

function imageEnvironment(options = {}) {
  const calls = { created: [], revoked: [], read: [], fill: [], draw: [], blobs: [], removed: 0 };
  class FakeImage {
    constructor() {
      this.naturalWidth = options.width || 640;
      this.naturalHeight = options.height || 480;
      this.listeners = new Map();
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    set src(value) {
      this.source = value;
      queueMicrotask(() => this.listeners.get(options.decodeError ? "error" : "load")?.());
    }
    remove() { calls.removed += 1; }
  }
  class FakeReader {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    readAsDataURL(blob) {
      calls.read.push(blob);
      if (options.readError) {
        queueMicrotask(() => this.listeners.get("error")?.());
        return;
      }
      this.result = `data:${blob.type};base64,aW1hZ2U=`;
      queueMicrotask(() => this.listeners.get("load")?.());
    }
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return options.noContext ? null : {
        set fillStyle(value) { calls.fillStyle = value; },
        fillRect(...args) { calls.fill.push(args); },
        drawImage(...args) { calls.draw.push(args); },
      };
    },
    toBlob(callback, mimeType, quality) {
      calls.blobs.push({ mimeType, quality });
      callback(options.noBlob ? null : { type: mimeType, size: 32 });
    },
    remove() { calls.canvasRemoved = true; },
  };
  const environment = {
    Image: FakeImage,
    FileReader: FakeReader,
    URL: {
      createObjectURL(value) { calls.created.push(value); return "blob:ravue-file"; },
      revokeObjectURL(value) { calls.revoked.push(value); },
    },
    document: { createElement(name) { assert.equal(name, "canvas"); return canvas; } },
  };
  return { environment, calls, canvas };
}

test("recognizes only locally decodable raster image formats", () => {
  assert.equal(imageInput.normalizedMimeType(file({ type: "image/jpg", name: "a.bin" })), "image/jpeg");
  assert.equal(imageInput.normalizedMimeType(file({ type: "", name: "photo.JPEG" })), "image/jpeg");
  assert.equal(imageInput.normalizedMimeType(file({ type: "application/octet-stream", name: "art.avif" })), "image/avif");
  assert.equal(imageInput.normalizedMimeType(file({ type: "image/svg+xml", name: "vector.svg" })), null);
  assert.equal(imageInput.normalizedMimeType(file({ type: "image/svg+xml", name: "disguised.png" })), null);
  assert.equal(imageInput.normalizedMimeType(file({ type: "text/plain", name: "notes.txt" })), null);
});

test("uses a supported dropped file before any URL representation", () => {
  const selected = file({ name: "local.webp", type: "image/webp" });
  const item = imageInput.droppedItem({
    files: [selected],
    getData() { return "https://example.com/other.png"; },
  });
  assert.deepEqual(item, { kind: "file", file: selected });
});

test("extracts Firefox and standard image drag representations without fetching them", () => {
  const firefox = imageInput.droppedItem({
    files: [],
    getData(type) {
      return type === "application/x-moz-file-promise-url"
        ? "https://cdn.example/image.webp\nImage"
        : "";
    },
  });
  assert.deepEqual(firefox, { kind: "url", sourceUrl: "https://cdn.example/image.webp" });

  const standard = imageInput.droppedItem({
    files: [],
    getData(type) {
      return type === "text/uri-list" ? "# source\nhttps://example.com/image.png\n" : "";
    },
  });
  assert.deepEqual(standard, { kind: "url", sourceUrl: "https://example.com/image.png" });
});

test("extracts the image source from an HTML drag representation", () => {
  class Parser {
    parseFromString(value, type) {
      assert.equal(value, '<img src="https://example.com/from-html.jpg">');
      assert.equal(type, "text/html");
      return { querySelector() { return { getAttribute() { return "https://example.com/from-html.jpg"; } }; } };
    }
  }
  const item = imageInput.droppedItem({
    files: [],
    getData(type) { return type === "text/html" ? '<img src="https://example.com/from-html.jpg">' : ""; },
  }, { DOMParser: Parser });
  assert.deepEqual(item, { kind: "url", sourceUrl: "https://example.com/from-html.jpg" });
});

test("rejects unsupported files and empty drag data", () => {
  assert.throws(
    () => imageInput.droppedItem({ files: [file({ name: "notes.txt", type: "text/plain" })], getData() { return ""; } }),
    (error) => error.code === "type",
  );
  assert.throws(
    () => imageInput.droppedItem({ files: [], getData() { return ""; } }),
    (error) => error.code === "drop",
  );
});

test("extracts a pasted image from clipboard files or Firefox clipboard items", () => {
  const direct = file({ name: "clipboard.png", type: "image/png" });
  assert.equal(imageInput.pastedImageFile({ files: [direct] }), direct);

  const itemFile = file({ name: "", type: "image/png" });
  assert.equal(imageInput.pastedImageFile({
    files: [],
    items: [
      { kind: "string", type: "text/plain", getAsFile() { throw new Error("must not run"); } },
      { kind: "file", type: "image/png", getAsFile() { return itemFile; } },
    ],
  }), itemFile);
});

test("leaves ordinary text paste untouched", () => {
  assert.equal(imageInput.pastedImageFile({
    files: [],
    items: [{ kind: "string", type: "text/plain" }],
  }), null);
});

test("preserves eligible JPEG, PNG, and WebP bytes instead of re-encoding", async () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const { environment, calls } = imageEnvironment({ width: 288, height: 412 });
    const payload = await imageInput.prepareFile(file({ name: `photo.${type.split("/")[1]}`, type }), environment);
    assert.deepEqual(payload, {
      dataUrl: `data:${type};base64,aW1hZ2U=`,
      width: 288,
      height: 412,
      mimeType: type,
    });
    assert.equal(calls.draw.length, 0);
    assert.equal(calls.read.length, 1);
    assert.deepEqual(calls.revoked, ["blob:ravue-file"]);
  }
});

test("reduces an oversized image locally to 1200 pixels and produces a white-backed JPEG", async () => {
  const { environment, calls, canvas } = imageEnvironment({ width: 2400, height: 1600 });
  const payload = await imageInput.prepareFile(file({ name: "large.png", type: "image/png" }), environment);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 800);
  assert.deepEqual(calls.fill, [[0, 0, 1200, 800]]);
  assert.equal(calls.fillStyle, "#ffffff");
  assert.equal(calls.draw.length, 1);
  assert.deepEqual(calls.draw[0].slice(1), [0, 0, 1200, 800]);
  assert.deepEqual(calls.blobs, [{ mimeType: "image/jpeg", quality: 0.94 }]);
  assert.deepEqual(payload, {
    dataUrl: "data:image/jpeg;base64,aW1hZ2U=",
    width: 1200,
    height: 800,
    mimeType: "image/jpeg",
  });
});

test("converts GIF, BMP, and AVIF input to a still JPEG", async () => {
  for (const type of ["image/gif", "image/bmp", "image/avif"]) {
    const { environment, calls } = imageEnvironment({ width: 320, height: 200 });
    const payload = await imageInput.prepareFile(file({ name: `image.${type.split("/")[1]}`, type }), environment);
    assert.equal(payload.mimeType, "image/jpeg");
    assert.equal(calls.draw.length, 1);
  }
});

test("rejects source files above 32 MB before decoding", async () => {
  const { environment, calls } = imageEnvironment();
  await assert.rejects(
    imageInput.prepareFile(file({ size: imageInput.MAX_SOURCE_BYTES + 1 }), environment),
    (error) => error.code === "size",
  );
  assert.equal(calls.created.length, 0);
});

test("releases object URLs after decode, read, or encoding failures", async () => {
  for (const options of [{ decodeError: true }, { readError: true }, { width: 2400, noBlob: true }]) {
    const { environment, calls } = imageEnvironment(options);
    await assert.rejects(imageInput.prepareFile(file(), environment));
    assert.deepEqual(calls.revoked, ["blob:ravue-file"]);
  }
});

function element() {
  const classValues = new Set();
  return {
    listeners: new Map(),
    disabled: false,
    hidden: false,
    value: "",
    files: [],
    attributes: new Set(),
    classValues,
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    click() { this.clicks = (this.clicks || 0) + 1; },
    setAttribute(name) { this.attributes.add(name); },
    removeAttribute(name) { this.attributes.delete(name); },
    toggleAttribute(name, active) { active ? this.attributes.add(name) : this.attributes.delete(name); },
    classList: {
      add(name) { classValues.add(name); },
      remove(name) { classValues.delete(name); },
      toggle(name, active) { active ? classValues.add(name) : classValues.delete(name); },
    },
  };
}

function launchEnvironment(options = {}) {
  const openImage = element(), choose = element(), input = element(), selector = element();
  const status = element(), overlay = element(), version = element();
  status.hidden = true;
  overlay.hidden = true;
  const handlers = new Map();
  const bodyClasses = new Set();
  const image = imageEnvironment({ width: 288, height: 412 });
  const requests = [];
  const replacements = [];
  let closed = 0;
  const elements = {
    "open-image-input": options.mode === "popup" ? openImage : null,
    "choose-image": choose,
    "image-file": input,
    "open-selector": selector,
    status,
    "drop-overlay": overlay,
    version,
  };
  const environment = {
    ...image.environment,
    DOMParser: options.DOMParser,
    document: {
      ...image.environment.document,
      documentElement: { lang: "" },
      title: "",
      body: { classList: { toggle(name, active) { active ? bodyClasses.add(name) : bodyClasses.delete(name); } } },
      getElementById(id) { return elements[id] || null; },
      addEventListener(type, listener) { handlers.set(type, listener); },
      querySelectorAll() { return []; },
    },
    browser: {
      i18n: {
        getMessage(id) { return options.messages?.[id] || ""; },
        getUILanguage() { return options.language || "en-US"; },
      },
      runtime: {
        getURL(file) { return `moz-extension://ravue/${file}`; },
        getManifest() { return { version: "2.1.8" }; },
        async sendMessage(request) {
          requests.push(request);
          return options.response || {
            ok: true,
            resultUrl: "moz-extension://ravue/results.html",
          };
        },
      },
    },
    location: { replace(url) { replacements.push(url); } },
    close() { closed += 1; },
  };
  return {
    environment,
    openImage,
    choose,
    input,
    selector,
    status,
    overlay,
    version,
    handlers,
    bodyClasses,
    requests,
    replacements,
    get closed() { return closed; },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("the popup button opens a stable image-input page and leaves file handling out of the transient panel", async () => {
  const state = launchEnvironment({ mode: "popup", response: { ok: true } });
  assert.equal(imageInput.launchPopup(state.environment), true);
  await state.openImage.listeners.get("click")();
  assert.deepEqual(state.requests, [{ type: "RV_POPUP_OPEN_IMAGE_PAGE" }]);
  assert.equal(state.closed, 1);
  assert.equal(state.handlers.size, 0);
});

test("a failure to open the stable image page keeps both popup controls usable", async () => {
  const state = launchEnvironment({
    mode: "popup",
    response: { ok: false, error: "Image input could not be opened." },
  });
  imageInput.launchPopup(state.environment);
  await state.openImage.listeners.get("click")();
  assert.equal(state.closed, 0);
  assert.equal(state.openImage.disabled, false);
  assert.equal(state.selector.disabled, false);
  assert.equal(state.status.textContent, "Image input could not be opened.");
});

test("the stable page file picker submits the selected image and becomes the existing result page", async () => {
  const state = launchEnvironment({ mode: "upload" });
  assert.equal(imageInput.launchUploadPage(state.environment), true);
  state.choose.listeners.get("click")();
  assert.equal(state.input.clicks, 1);
  state.input.files = [file({ name: "portrait.png", type: "image/png" })];
  state.input.listeners.get("change")();
  await flush();
  await flush();
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0].type, "RV_IMAGE_PAGE_SEARCH_ITEM");
  assert.equal(state.requests[0].item.kind, "image");
  assert.equal(state.requests[0].item.payload.width, 288);
  assert.deepEqual(state.replacements, ["moz-extension://ravue/results.html"]);
  assert.equal(state.version.textContent, "v2.1.8");
});

test("the stable page submits an image pasted from the clipboard through the existing file path", async () => {
  const state = launchEnvironment({ mode: "upload" });
  imageInput.launchUploadPage(state.environment);
  const prevented = [];
  state.handlers.get("paste")({
    preventDefault() { prevented.push("image"); },
    clipboardData: {
      files: [],
      items: [{
        kind: "file",
        type: "image/png",
        getAsFile() { return file({ name: "clipboard.png", type: "image/png" }); },
      }],
    },
  });
  await flush();
  await flush();
  assert.deepEqual(prevented, ["image"]);
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0].type, "RV_IMAGE_PAGE_SEARCH_ITEM");
  assert.equal(state.requests[0].item.kind, "image");
  assert.equal(state.requests[0].item.payload.mimeType, "image/png");
  assert.deepEqual(state.replacements, ["moz-extension://ravue/results.html"]);
});

test("the stable page does not intercept pasted text", () => {
  const state = launchEnvironment({ mode: "upload" });
  imageInput.launchUploadPage(state.environment);
  let prevented = false;
  state.handlers.get("paste")({
    preventDefault() { prevented = true; },
    clipboardData: {
      files: [],
      items: [{ kind: "string", type: "text/plain" }],
    },
  });
  assert.equal(prevented, false);
  assert.deepEqual(state.requests, []);
});

test("cancelling the stable page file picker creates no search", () => {
  const state = launchEnvironment({ mode: "upload" });
  imageInput.launchUploadPage(state.environment);
  state.choose.listeners.get("click")();
  state.input.files = [];
  state.input.listeners.get("change")();
  assert.equal(state.input.clicks, 1);
  assert.deepEqual(state.requests, []);
  assert.deepEqual(state.replacements, []);
});

test("the entire stable page accepts a dropped web image and presents a drag overlay", async () => {
  const state = launchEnvironment({ mode: "upload" });
  imageInput.launchUploadPage(state.environment);
  const prevented = [];
  state.handlers.get("dragenter")({ preventDefault() { prevented.push("enter"); } });
  assert.equal(state.overlay.hidden, false);
  assert.equal(state.bodyClasses.has("is-dragging-image"), true);
  const transfer = {
    files: [],
    dropEffect: "none",
    getData(type) { return type === "text/uri-list" ? "https://example.com/full.jpg" : ""; },
  };
  state.handlers.get("dragover")({ preventDefault() { prevented.push("over"); }, dataTransfer: transfer });
  assert.equal(transfer.dropEffect, "copy");
  state.handlers.get("drop")({ preventDefault() { prevented.push("drop"); }, dataTransfer: transfer });
  await flush();
  assert.deepEqual(prevented, ["enter", "over", "drop"]);
  assert.equal(state.overlay.hidden, true);
  assert.deepEqual(state.requests, [{
    type: "RV_IMAGE_PAGE_SEARCH_ITEM",
    item: { kind: "url", sourceUrl: "https://example.com/full.jpg" },
  }]);
  assert.deepEqual(state.replacements, ["moz-extension://ravue/results.html"]);
});

test("a rejected upload keeps the stable page open and restores its control", async () => {
  const state = launchEnvironment({
    mode: "upload",
    response: { ok: false, error: "Review the selected image and try again." },
  });
  imageInput.launchUploadPage(state.environment);
  state.input.files = [file()];
  state.input.listeners.get("change")();
  await flush();
  await flush();
  assert.equal(state.choose.disabled, false);
  assert.equal(state.status.hidden, false);
  assert.equal(state.status.textContent, "Review the selected image and try again.");
  assert.equal(state.input.value, "");
  assert.deepEqual(state.replacements, []);
});
