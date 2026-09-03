"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { zip, unzip, sha256, ROOT, RUNTIME } = require("../tools/package.cjs");

test("packaging preserves every binary and UTF-8 byte without transforming source", () => {
  const entries = [
    { name: "manifest.json", bytes: Buffer.from('{"version":"2.1.8"}\n') },
    { name: "test/ícone.bin", bytes: Buffer.from(Array.from({ length: 256 }, (_, index) => index)) },
    { name: "empty.txt", bytes: Buffer.alloc(0) },
  ];
  const first = zip(entries), second = zip(entries), result = unzip(first);
  assert.equal(sha256(first), sha256(second), "Deterministic archive");
  assert.equal(result.size, entries.length);
  for (const { name, bytes } of entries) assert.ok(result.get(name).equals(bytes), name);
});

test("packaging rejects duplicate members and unsafe relative paths", () => {
  const entry = { name: "manifest.json", bytes: Buffer.from("x") };
  assert.throws(() => zip([entry, entry]), /Duplicate/);
  for (const name of ["../x", "/x", "a/../../x", "a//x", "C:/x", "a\\x"]) {
    assert.throws(() => zip([{ name, bytes: Buffer.from("x") }]), undefined, name);
  }
});

test("verification rejects a changed CRC instead of accepting a corrupt artifact", () => {
  const bytes = zip([{ name: "manifest.json", bytes: Buffer.from("example") }]);
  const end = bytes.length - 22, central = bytes.readUInt32LE(end + 16);
  bytes.writeUInt32LE((bytes.readUInt32LE(central + 16) ^ 0x01000000) >>> 0, central + 16);
  assert.throws(() => unzip(bytes));
});

test("the XPI allowlist includes one manifest and no tests, dependencies or older packages", () => {
  assert.equal(new Set(RUNTIME).size, RUNTIME.length);
  assert.equal(RUNTIME.filter((name) => name === "manifest.json").length, 1);
  for (const name of RUNTIME) {
    assert.equal(fs.statSync(path.join(ROOT, name)).isFile(), true);
    assert.doesNotMatch(name, /^(?:tests|tools|node_modules|dist)\//);
    assert.doesNotMatch(name, /\.(?:xpi|zip|cjs|map)$/);
  }
});
