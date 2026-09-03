"use strict";

// Deterministic ZIP packaging only. No source transformation or dependency build.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const RUNTIME = Object.freeze([
  "PRIVACY.md", "README.md", "_locales/en/messages.json", "_locales/pt_BR/messages.json",
  "background.mjs", "content/bridge.js", "content/direct-image.js", "content/geometry.js",
  "content/google-upload.js", "content/lens-ready.js", "content/loading-screen.js", "content/overlay.js",
  "content/smart-selection.js", "content/target.js", "icons/ravue-128.png", "icons/ravue-16.png",
  "icons/ravue-32.png", "icons/ravue-48.png", "icons/ravue-64.png", "icons/ravue-96.png",
  "icons/ravue.svg", "manifest.json", "popup/image-input.js", "popup/popup.css", "popup/popup.html", "popup/popup.js",
  "results.html", "results.mjs", "shared/pending-store.js", "shared/session-store.js",
  "ui/overlay.css", "ui/results.css", "ui/upload.css", "upload.html",
].sort());

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
function crc32(bytes) {
  let result = 0xffffffff;
  for (const byte of bytes) {
    result ^= byte;
    for (let bit = 0; bit < 8; bit++) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0);
  }
  return (result ^ 0xffffffff) >>> 0;
}

function safeName(name) {
  assert.ok(typeof name === "string" && name.length && !name.startsWith("/") && !name.includes("\\"));
  assert.ok(!name.split("/").some((piece) => piece === ".." || piece === "." || piece === ""));
  assert.ok(!/^[a-z]:/i.test(name));
  return name;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .filter((entry) => !entry.name.startsWith(".") && !["node_modules", "dist", "validation-output"].includes(entry.name))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      assert.equal(entry.isSymbolicLink(), false, "Symlinks are not packaged");
      return entry.isDirectory() ? walk(absolute) : [absolute];
    });
}

function zip(entries) {
  const chunks = [], central = [];
  let offset = 0;
  const names = new Set();
  for (const { name, bytes } of entries) {
    safeName(name);
    assert.equal(names.has(name), false, `Duplicate ZIP member: ${name}`);
    names.add(name);
    const filename = Buffer.from(name, "utf8"), packed = zlib.deflateRawSync(bytes, { level: 9 });
    const crc = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8);
    // Fixed UTC date for this release; no filesystem timestamps in the build.
    local.writeUInt16LE(((2026 - 1980) << 9) | (9 << 5) | 3, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(filename.length, 26);
    chunks.push(local, filename, packed);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(0x314, 4);
    directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0x800, 8); directory.writeUInt16LE(8, 10);
    directory.writeUInt16LE(((2026 - 1980) << 9) | (9 << 5) | 3, 14);
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(packed.length, 20);
    directory.writeUInt32LE(bytes.length, 24); directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE((0o100644 << 16) >>> 0, 38); directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += local.length + filename.length + packed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  assert.ok(entries.length < 65535 && offset < 0xffffffff && directory.length < 0xffffffff);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}

function unzip(bytes) {
  // Strict reader for the normal ZIP format used by this project. It checks
  // every member's local header, compressed stream, length and CRC before use.
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index--) {
    if (bytes.readUInt32LE(index) === 0x06054b50 && index + 22 + bytes.readUInt16LE(index + 20) === bytes.length) { end = index; break; }
  }
  assert.ok(end >= 0, "Missing ZIP end record");
  assert.equal(bytes.readUInt16LE(end + 4), 0); assert.equal(bytes.readUInt16LE(end + 6), 0);
  const count = bytes.readUInt16LE(end + 10), entries = new Map();
  assert.equal(bytes.readUInt16LE(end + 8), count);
  let cursor = bytes.readUInt32LE(end + 16);
  assert.equal(cursor + bytes.readUInt32LE(end + 12), end);
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50);
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10);
    const crc = bytes.readUInt32LE(cursor + 16), packedLength = bytes.readUInt32LE(cursor + 20), size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28), extraLength = bytes.readUInt16LE(cursor + 30), commentLength = bytes.readUInt16LE(cursor + 32);
    const name = bytes.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    safeName(name.endsWith("/") ? name.slice(0, -1) : name);
    assert.equal(entries.has(name), false, `Duplicate member: ${name}`);
    assert.equal(flags & 1, 0, "Encrypted ZIP is unsupported");
    const local = bytes.readUInt32LE(cursor + 42);
    assert.equal(bytes.readUInt32LE(local), 0x04034b50);
    assert.equal(bytes.readUInt16LE(local + 8), method);
    const localNameLength = bytes.readUInt16LE(local + 26), localExtraLength = bytes.readUInt16LE(local + 28);
    assert.equal(bytes.toString("utf8", local + 30, local + 30 + localNameLength), name);
    const start = local + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(start, start + packedLength);
    assert.equal(compressed.length, packedLength);
    const decoded = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    assert.ok(decoded, `Unsupported ZIP compression: ${method}`);
    assert.equal(decoded.length, size, name); assert.equal(crc32(decoded), crc, name);
    entries.set(name, decoded);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(cursor, end);
  return entries;
}

function writeNewOrIdentical(filename, bytes) {
  if (fs.existsSync(filename)) {
    assert.ok(fs.readFileSync(filename).equals(bytes), `Refusing to overwrite a different artifact: ${filename}`);
    return;
  }
  fs.writeFileSync(filename, bytes, { flag: "wx" });
}

function build(destination) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  assert.equal(manifest.version, "2.1.8"); assert.equal(manifest.manifest_version, 3);
  const output = path.resolve(destination || path.join(ROOT, "..", "dist"));
  assert.ok(output !== ROOT && !output.startsWith(ROOT + path.sep), "Keep artifacts outside the source tree");
  fs.mkdirSync(output, { recursive: true });
  const sourceEntries = walk(ROOT).map((file) => ({ name: safeName(path.relative(ROOT, file).split(path.sep).join("/")), bytes: fs.readFileSync(file) }))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  assert.equal(sourceEntries.some((entry) => /\.(?:zip|xpi|exe|dll|so)$/i.test(entry.name)), false);
  const allSource = new Map(sourceEntries.map(({ name, bytes }) => [name, bytes]));
  const runtimeEntries = RUNTIME.map((name) => { assert.ok(allSource.has(name), name); return { name, bytes: allSource.get(name) }; });
  const products = [
    { name: "ravue-visual-search-v2.1.8.xpi", entries: runtimeEntries },
    { name: "ravue-visual-search-v2.1.8-source.zip", entries: sourceEntries },
  ];
  const report = { manifestVersion: 3, version: manifest.version, id: manifest.browser_specific_settings.gecko.id, products: [], matchedRuntimeFiles: 0 };
  const archives = [];
  for (const product of products) {
    const archive = zip(product.entries), extracted = unzip(archive);
    assert.equal(extracted.size, product.entries.length);
    for (const { name, bytes } of product.entries) assert.ok(bytes.equals(extracted.get(name)), name);
    const target = path.join(output, product.name);
    writeNewOrIdentical(target, archive);
    report.products.push({ filename: product.name, bytes: archive.length, sha256: sha256(archive), files: product.entries.length });
    archives.push(extracted);
  }
  for (const [name, bytes] of archives[0]) { assert.ok(bytes.equals(archives[1].get(name)), name); report.matchedRuntimeFiles++; }
  assert.equal(report.matchedRuntimeFiles, RUNTIME.length);
  return report;
}

module.exports = { ROOT, RUNTIME, walk, sha256, crc32, zip, unzip, build, writeNewOrIdentical };
if (require.main === module) console.log(JSON.stringify(build(process.argv[2]), null, 2));
