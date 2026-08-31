"use strict";

// Optional native-codec suite. No browser automation and no external images:
// actual release functions + Skia canvas, independently decoded with libvips.
// This validates pixels/codecs, NOT Gecko/CORS/CSP or live Google behavior.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { background, source, plain } = require("../regression/harness.cjs");
const dependency = (name) => require(process.env.RAVUE_TEST_NODE_MODULES
  ? path.join(process.env.RAVUE_TEST_NODE_MODULES, name) : name);
const canvas = dependency("@napi-rs/canvas");
const sharp = dependency("sharp");
const direct = require(path.join(source, "content/direct-image.js"));

function imageConstructor() {
  const image = new canvas.Image();
  image.addEventListener = (type, callback) => { image[`on${type}`] = callback; };
  image.remove = () => {};
  return image;
}

class Reader {
  constructor() { this.listeners = {}; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.listeners.load?.();
    }).catch((error) => { this.error = error; this.listeners.error?.(); });
  }
}

const document = { createElement(type) {
  assert.equal(type, "canvas");
  const surface = canvas.createCanvas(1, 1);
  surface.remove = () => {};
  return surface;
} };

function quadrants(width, height) {
  const surface = canvas.createCanvas(width, height);
  const context = surface.getContext("2d");
  for (const [x, y, fill] of [[0, 0, "#ff0000"], [width / 2, 0, "#00ff00"], [0, height / 2, "#0000ff"], [width / 2, height / 2, "#ffffff"]]) {
    context.fillStyle = fill;
    context.fillRect(x, y, width / 2, height / 2);
  }
  return surface;
}

async function decoded(payload) {
  const buffer = Buffer.from(payload.dataUrl.split(",")[1], "base64");
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, payload.width);
  assert.equal(metadata.height, payload.height);
  const raw = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { ...raw, metadata };
}

function colorNear(image, x, y, expected) {
  const offset = (Math.floor(y) * image.info.width + Math.floor(x)) * image.info.channels;
  const actual = [...image.data.subarray(offset, offset + 3)];
  for (let channel = 0; channel < 3; channel++) {
    assert.ok(Math.abs(actual[channel] - expected[channel]) <= 12,
      `Pixel (${x},${y}): ${actual} is not near ${expected}`);
  }
}

async function queuedPayload(harness) {
  const route = await harness.context.RavuePendingStore.route(900);
  assert.equal(route.kind, "upload");
  const payload = await harness.context.RavueSessionStore.take(route.uploadId);
  assert.ok(payload);
  return payload;
}

for (const scale of [0.8, 1, 1.25, 1.5, 2, 3]) {
  test(`actual PNG → release crop → JPEG preserves orientation/bounds at bitmap scale ${scale}`, async () => {
    const screenshot = quadrants(1000 * scale, 500 * scale).toDataURL("image/png");
    const h = await background({ Image: imageConstructor, FileReader: Reader, document });
    const result = await h.message("RV_SEARCH_CAPTURE", h.sender("https://example.org/", 41), {
      screenshot, selection: { x: 250, y: 100, width: 500, height: 300 }, viewport: { width: 1000, height: 500 },
    });
    assert.equal(result.ok, true);
    const payload = await queuedPayload(h);
    // Include both boundary pixels when a CSS edge falls between bitmap pixels.
    const sourceWidth = Math.ceil(750 * scale) - Math.floor(250 * scale);
    const sourceHeight = Math.ceil(400 * scale) - Math.floor(100 * scale);
    const factor = Math.min(1, 1200 / sourceWidth, 1200 / sourceHeight);
    assert.equal(payload.width, Math.round(sourceWidth * factor));
    assert.equal(payload.height, Math.round(sourceHeight * factor));
    const image = await decoded(payload);
    colorNear(image, image.info.width / 4, image.info.height / 4, [255, 0, 0]);
    colorNear(image, image.info.width * 3 / 4, image.info.height / 4, [0, 255, 0]);
    colorNear(image, image.info.width / 4, image.info.height * 3 / 4, [0, 0, 255]);
    colorNear(image, image.info.width * 3 / 4, image.info.height * 3 / 4, [255, 255, 255]);
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.capture.length, 0);
  });
}

test("a 288×412 decoded image keeps all natural pixels despite a smaller displayed rectangle", async () => {
  const target = await canvas.loadImage(quadrants(288, 412).toBuffer("image/png"));
  target.tagName = "IMG";
  target.getBoundingClientRect = () => ({ x: 0, y: 0, width: 72, height: 103 });
  const payload = await direct.extractFullImage(target, document);
  assert.equal(payload.width, 288);
  assert.equal(payload.height, 412);
  const image = await decoded(payload);
  colorNear(image, 20, 20, [255, 0, 0]);
  colorNear(image, 270, 390, [255, 255, 255]);
});

test("a tall decoded image is scaled once to 1200px without losing top or bottom", async () => {
  const target = await canvas.loadImage(quadrants(600, 4000).toBuffer("image/png"));
  target.tagName = "IMG";
  const payload = await direct.extractFullImage(target, document);
  assert.equal(payload.width, 180);
  assert.equal(payload.height, 1200);
  const image = await decoded(payload);
  colorNear(image, 20, 20, [255, 0, 0]);
  colorNear(image, 150, 1170, [255, 255, 255]);
});

for (const format of ["png", "webp", "svg"]) {
  test(`decoded ${format.toUpperCase()} fallback has correct dimensions and a white transparency background`, async () => {
    let bytes;
    if (format === "svg") {
      bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="288" height="412"><rect x="40" y="50" width="100" height="100" fill="#ff0000"/></svg>');
    } else {
      const surface = canvas.createCanvas(288, 412);
      surface.getContext("2d").fillStyle = "#ff0000";
      surface.getContext("2d").fillRect(40, 50, 100, 100);
      bytes = await surface.encode(format);
    }
    const target = await canvas.loadImage(bytes);
    target.tagName = "IMG";
    const payload = await direct.extractFullImage(target, document);
    assert.equal(payload.width, 288);
    assert.equal(payload.height, 412);
    const image = await decoded(payload);
    colorNear(image, 10, 10, [255, 255, 255]);
    colorNear(image, 70, 80, [255, 0, 0]);
  });
}

test("rendered-rectangle backup uses its complete returned bitmap without a scrolling command", async () => {
  const captureDataUrl = quadrants(288, 412).toDataURL("image/png");
  const plan = {
    rect: { x: 10, y: -200, width: 288, height: 412 },
    documentRect: { x: 10, y: 1200, width: 288, height: 412 },
    viewport: { width: 1000, height: 500 }, deviceScale: 1,
  };
  const h = await background({ Image: imageConstructor, FileReader: Reader, document, captureDataUrl, directResponse: { ok: true, plan } });
  await h.image("blob:https://example.org/synthetic", { targetElementId: 4 });
  const payload = await queuedPayload(h);
  const image = await decoded(payload);
  assert.equal(payload.width, 288);
  assert.equal(payload.height, 412);
  assert.deepEqual(plain(h.calls.capture[0].rect), plan.documentRect);
  assert.equal(h.calls.send.some((message) => /SCROLL|RESTORE/.test(message.type)), false);
  colorNear(image, 20, 20, [255, 0, 0]);
  colorNear(image, 270, 390, [255, 255, 255]);
});

test("an invalid PNG is rejected by a real decoder and never creates an upload tab", async () => {
  const h = await background({ Image: imageConstructor, FileReader: Reader, document });
  const result = await h.message("RV_SEARCH_CAPTURE", h.sender("https://example.org/", 41), {
    screenshot: "data:image/png;base64,YmFk", selection: { x: 0, y: 0, width: 50, height: 50 }, viewport: { width: 100, height: 100 },
  });
  assert.equal(result.ok, false);
  assert.equal(h.calls.create.length, 0);
  assert.deepEqual(h.state.data, {});
});
