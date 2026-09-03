"use strict";

// Optional native-codec tests for the new panel file path. They execute the
// release module with Skia/libvips, not Firefox or a live Google service.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dependency = (name) => require(process.env.RAVUE_TEST_NODE_MODULES
  ? path.join(process.env.RAVUE_TEST_NODE_MODULES, name) : name);
const canvas = dependency("@napi-rs/canvas");
const sharp = dependency("sharp");
const imageInput = require("../../popup/image-input.js");

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
    }).catch((error) => {
      this.error = error;
      this.listeners.error?.();
    });
  }
}

function environment() {
  const revoked = [];
  return {
    revoked,
    value: {
      Image: imageConstructor,
      FileReader: Reader,
      URL: {
        createObjectURL(file) { return file.sourceDataUrl; },
        revokeObjectURL(value) { revoked.push(value); },
      },
      document: {
        createElement(type) {
          assert.equal(type, "canvas");
          const surface = canvas.createCanvas(1, 1);
          surface.remove = () => {};
          return surface;
        },
      },
    },
  };
}

function sourceFile(bytes, type, name, dataUrl) {
  const file = new File([bytes], name, { type });
  file.sourceDataUrl = dataUrl;
  return file;
}

async function pixel(image, x, y) {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + 3)];
}

test("real small PNG bytes pass through the panel path unchanged", async () => {
  const source = canvas.createCanvas(288, 412);
  const context = source.getContext("2d");
  context.fillStyle = "#123456";
  context.fillRect(0, 0, 288, 412);
  const bytes = source.toBuffer("image/png");
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  const file = sourceFile(bytes, "image/png", "sample.png", dataUrl);
  const env = environment();
  const payload = await imageInput.prepareFile(file, env.value);
  assert.equal(payload.mimeType, "image/png");
  assert.equal(payload.width, 288);
  assert.equal(payload.height, 412);
  assert.ok(Buffer.from(payload.dataUrl.split(",")[1], "base64").equals(bytes));
  assert.deepEqual(env.revoked, [dataUrl]);
});

test("real oversized transparent PNG becomes a complete white-backed 1200px JPEG", async () => {
  const source = canvas.createCanvas(2400, 1600);
  const context = source.getContext("2d");
  context.clearRect(0, 0, 2400, 1600);
  context.fillStyle = "#e02040";
  context.fillRect(800, 400, 800, 800);
  const bytes = source.toBuffer("image/png");
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  const file = sourceFile(bytes, "image/png", "large-transparent.png", dataUrl);
  const env = environment();
  const payload = await imageInput.prepareFile(file, env.value);
  const output = Buffer.from(payload.dataUrl.split(",")[1], "base64");
  const metadata = await sharp(output).metadata();
  assert.equal(payload.mimeType, "image/jpeg");
  assert.equal(payload.width, 1200);
  assert.equal(payload.height, 800);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 800);
  const white = await pixel(output, 50, 50);
  const red = await pixel(output, 600, 400);
  for (const channel of white) assert.ok(channel >= 245, white);
  assert.ok(red[0] > 205 && red[1] < 60 && red[2] < 90, red);
  assert.deepEqual(env.revoked, [dataUrl]);
});
