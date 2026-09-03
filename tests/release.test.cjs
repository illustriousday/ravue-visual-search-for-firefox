"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name));
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

// Every entry below is the hash of the accepted 2.1.6 source. These files are
// outside the 2.1.7 addition and must remain byte-for-byte identical.
const unchangedFrom216 = Object.freeze({
  "content/bridge.js": "3b1139d8e858cc696d51eac047427e08cac9e385ee2375c0b0232e3061f503cc",
  "content/direct-image.js": "84621106303b28535bb52c4840e40c63f2295ad8b783982440e7cf9072d7e178",
  "content/geometry.js": "b8fd076391090ed8a7031f49481fc6b78d30dc75c877b80308b714e5c425a88a",
  "content/google-upload.js": "5c8407ed311694c3c4d12e2bbefc57d7e16872105859c845c3b8897c8f931fde",
  "content/lens-ready.js": "302bb263b7e2dfa716b47d475c5985888242db0c6bdea4ff66fa7c86513d5aa6",
  "content/loading-screen.js": "900c9818e2528f661f2ed730b00ae806018e16a33889380bde6132259380c7c1",
  "content/overlay.js": "4d2e1595638e7c28616def6ca4e440f5eb1ee9c268ebf90d85f8cf409120cbcf",
  "content/smart-selection.js": "d8cc168d81390970e1a97d139a5c4f995db0f170dee2e4b92a9f6a5a9724904d",
  "content/target.js": "d7421edbb3503e27e5b28c400f52950a802bfa64884e5558b80122aea6feecba",
  "icons/ravue-128.png": "3fbc338365f7cb69e707345dd4ee5090f80c62e93665d30c3532c659ebb03c93",
  "icons/ravue-16.png": "03d1d360143d866f1b4fb14836953f714b96e0fd74b88f7cb39f9f44a3d2aff2",
  "icons/ravue-32.png": "44d2e85e15b7521d30e68a49a00e34ff3e6139cd1c2212813e38f13a60f06412",
  "icons/ravue-48.png": "415e97d62873f61d49d9a26ab5683be3c6080ab6011aac3a336e732b85e7f91b",
  "icons/ravue-64.png": "47c848dd54e1fbe2669613c431a1e526dd352f06a63313441c1a9806a1760ca9",
  "icons/ravue-96.png": "8023cac017892ba3f1cc039f6e1578d6fbda8bfd184192f8bb5264d5cafd43f5",
  "icons/ravue.svg": "505cf1720f24f641ba22bf5b40be918fc18959220643f8eb10f3c6bd2be21b93",
  "popup/popup.js": "7472de2fa2749d1812e96b1caa7f3bef52e6e9572d238bb8dbda8f1315ed2b0d",
  "results.html": "6cbac67417ad2ca9fc52c2416a949b6f69d11b7db6ab4d8d35f33e5c1b1023be",
  "results.mjs": "7d19eea86b1aa2fb914e292d6699b06ef768ccecc40450e12acbdb0b62b4370d",
  "shared/pending-store.js": "96762b335b7b27a4a761a9a553bee5b23945eb09de90433bf87b1fbd4d890080",
  "shared/session-store.js": "2c101b9bce05078f0be74392c4a1533ee5c708accf6f12969997d4dc6f492e1e",
  "tests/direct-image.test.cjs": "e48f5168dec559b6d952b9fc84c7afe73c47ee8a5f7743304277a8a0f8db691c",
  "tests/fixture-server.cjs": "e39838de90bc68efdf239fe183fc5e59fcacd66934346f762f9e5fe8dfe8536a",
  "tests/fixtures.test.cjs": "0280c584bcb6c8a103479eef80a19641a8e19f532a25d1dad84c7cbda26a553e",
  "tests/fixtures/frame.html": "d0c2d58472f9010c99df41080344932a7b0bb76acd8e591f25e8f805b10df029",
  "tests/fixtures/hard-sites.html": "82999e50f02c152418b24084e088fc0ac4ad96300c7cd7f509e0c4bf80703097",
  "tests/fixtures/sample.svg": "1d00fb50ebd51204f99b2cfaa9487ab95867b5e30a9864d39df35ca63947bd98",
  "tests/fixtures/sample.webp": "e0ea3f46f37697cbbc719a382755d318a9b688c8e881a21a8c6afb372b370d8e",
  "tests/fixtures/smart-selection.svg": "6d8619958cf8f71aefaf74c9f7710c7839b44e31fc32e758f82fab806c9acca8",
  "tests/fixtures/strict-csp.html": "d94c11a4e8b1681075c7250c34faea2f88ce8511927f1cd1c6331abeb1e344e7",
  "tests/fixtures/tall-sample.svg": "4b2822ad2a0ae38afd87ab8deda161fed9bb24a89b1573e0b3c90c0c0ea7af32",
  "tests/geometry.test.cjs": "05e9679fe24c7f1981ad08cd12b9cd58390a28ea8ec37bb15fee1a207bdf4354",
  "tests/google-upload.test.cjs": "8d8121dfed44e0acfd74ff876766e2b1b740904d57338325f7d545be8ff75962",
  "tests/lens-ready.test.cjs": "2ad7a5ad9e634b20bb62d968665c6b6dd9dec56da754bf322c1c41a5bb15bbac",
  "tests/loading-screen.test.cjs": "9169be69c3b28aab3162c9a18c951254022f9536eff95beabaed12ed29bf018d",
  "tests/native/pixels.test.cjs": "49adce5e86d7372ff2ca9846fb22b18f928766893244cec6e4d600b796037679",
  "tests/overlay.test.cjs": "c43b36955af5ad07eb6620b941f621abcb8564dd03072133fa365d1b05733341",
  "tests/pending-store.test.cjs": "e1fc08cc73764297240c34fadf814a65175e36a5fabb51dee6d6ebdeca3324d0",
  "tests/popup.test.cjs": "95b6831b398bef234aea3e3f51af5357066c60f3ad06a29798c9078572e79ac3",
  "tests/regression/caracterizar.cjs": "04f8d4f337c685da81f940edf901ba76b73f1a551eb5981de3299d8910fa9682",
  "tests/regression/hardening.test.cjs": "3d52fad324b348294941674913547f86b0ee18a2b0cf17c544251b6020671357",
  "tests/regression/harness.cjs": "f4abf90ac07606dbd79e0350ef8d9e07afbf81e2b2ee5d562b0f82c305d72c85",
  "tests/regression/invariantes.test.cjs": "7808cfbdcd838225aa58d803661870ab398770c6a6cdd72f60b5bfb2c5243ba0",
  "tests/regression/navegacao.test.cjs": "96c1f9849e68147800db28cee4b13615cc1be8dfc8150ea3ec86e0aa4647d152",
  "tests/regression/teclado.test.cjs": "7b70493edbbcc0dd64b09bdc57561ac786f66ceb1eb670ff10892300240c4e8d",
  "tests/regression/upload-loading.test.cjs": "1fe4b09722f62cda75d6a892251b22fe10af34d9972d6403001cbe9d0835a1e0",
  "tests/session-store.test.cjs": "4ffcca94107c90f9a094e3cc196526d049ae3dd85cea2e65babc3ea3d6ce2b86",
  "tests/smart-selection.test.cjs": "8254b7a59e324207b4dec7601936e151b0bb6ae20b55d4b75bfc6d75b78a708c",
  "tests/target.test.cjs": "2f959b794744bb7bb75de84d80edd507f5739d7875f9d65c71f438e355ca69b9",
  "tools/verify.cjs": "08c079e3f581dff7271083a9bf53da38e2346a1e6a671afec701a9e548b72391",
  "ui/overlay.css": "7e45d738ea777905355b2191293c6833d25c39410cb6edf35e0b40b8f1e6d2de",
  "ui/results.css": "4b3ca141a05ccd3e3fa603e1211afcee6d628ba25d2f85b43fa01a29bd890c88",
});

test("preserves all 2.1.6 files outside the isolated 2.1.7 addition byte for byte", () => {
  for (const [name, expected] of Object.entries(unchangedFrom216)) {
    assert.equal(sha256(read(name)), expected, name);
  }
});

test("bumps only the version among the accepted manifest declarations", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "2.1.7");
  assert.equal(manifest.default_locale, "pt_BR");
  assert.equal(manifest.browser_specific_settings.gecko.id, "{351e58ce-b7a8-4e88-b53f-d23acc464659}");
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "142.0");
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions, {
    required: ["websiteContent"],
    optional: [],
  });
  assert.deepEqual(manifest.permissions, ["activeTab", "menus", "scripting", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://images.google.com/*", "https://lens.google.com/*"]);
  assert.equal("gecko_android" in manifest.browser_specific_settings, false);
  delete manifest.version;
  assert.equal(sha256(JSON.stringify(manifest)), "2f293ebbd191bc734d5900e6f9cc7786f7144150f51d64baf3e785c44f3ec36a");
});

test("keeps every established popup control and moves file input to a stable extension page", () => {
  const html = read("popup/popup.html").toString("utf8");
  const upload = read("upload.html").toString("utf8");
  assert.match(html, /id="open-selector"/);
  assert.equal((html.match(/class="control-card"/g) || []).length, 4);
  assert.match(html, /id="open-image-input"/);
  assert.doesNotMatch(html, /id="image-file"|id="drop-overlay"/);
  assert.match(html, /<script src="popup\.js"><\/script>\s*<script src="image-input\.js"><\/script>/);
  assert.doesNotMatch(html, /popupShortcut|shortcut-row|<kbd\b/);
  assert.match(upload, /id="choose-image"/);
  assert.match(upload, /id="image-file"[^>]+type="file"/);
  assert.match(upload, /id="drop-overlay"/);
  assert.match(upload, /<script src="popup\/image-input\.js"><\/script>/);
});

test("keeps English and Brazilian Portuguese complete and structurally identical", () => {
  const markup = ["popup/popup.html", "upload.html"].map((name) => read(name).toString("utf8")).join("\n");
  const ids = [...markup.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
  const locales = ["en", "pt_BR"].map((locale) => JSON.parse(read(`_locales/${locale}/messages.json`)));
  assert.deepEqual(Object.keys(locales[0]).sort(), Object.keys(locales[1]).sort());
  for (const messages of locales) {
    for (const id of ids) {
      assert.equal(typeof messages[id]?.message, "string", id);
      assert.ok(messages[id].message.trim().length > 0, id);
    }
  }
});

test("documents use English as the source default and describe 2.1.7", () => {
  for (const name of ["README.md", "PRIVACY.md", "CHANGELOG.md", "TEST_MATRIX.md", "AMO_PUBLICATION.md"]) {
    const contents = read(name).toString("utf8");
    assert.match(contents, /2\.1\.7/, name);
    assert.doesNotMatch(contents, /Aplica-se|Privacidade e controle|Como usar|Notas ao revisor/, name);
  }
});
