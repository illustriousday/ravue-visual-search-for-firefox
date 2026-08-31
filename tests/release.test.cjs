const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name));
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

// Original frozen hashes also match the delivered, unmodified 2.1.6 base.
// Keep these reference values; explicitly enumerate the authorized corrections.
const frozen = {
  "PRIVACY.md": "7ca2315104ed12823390def9e33322617073b2fb9f84a860283756571e3fbca2",
  "_locales/en/messages.json": "0881cc371708b4fc7ce763f5b24e4347c57ff3b998bf6751da644f1a1ef06001",
  "_locales/pt_BR/messages.json": "d491278c6675f2b921975477e12237a0adf3c665d914bf9970a298d85598967c",
  "background.mjs": "bbb6a0c8f84087edcc3ee366e5d08025c2c5da0dc547ff46addceeeb181f0946",
  "content/bridge.js": "3b1139d8e858cc696d51eac047427e08cac9e385ee2375c0b0232e3061f503cc",
  "content/direct-image.js": "84621106303b28535bb52c4840e40c63f2295ad8b783982440e7cf9072d7e178",
  "content/geometry.js": "b8fd076391090ed8a7031f49481fc6b78d30dc75c877b80308b714e5c425a88a",
  "content/google-upload.js": "9071d7c060ea8eadc052fe3f46207f1165ae01f86924cc05ece249bf37490fbd",
  "content/lens-ready.js": "6316f9193c9313f10d21991c6ec39d0a06da984a19738b2ee27bb5412d6bd2da",
  "content/loading-screen.js": "cfb7af55110ec679dae6d8c40e64581fbe2a5d7e4b6187a194ce8475c962f370",
  "content/overlay.js": "b30f4c675e9e9c5c02eea49ca39cae67f57a28b9d5a2985745f7b5517510c2a3",
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
  "shared/pending-store.js": "aeff80b80a7e80e304b431613426b1d0424f2dacacdbb09fa8db187c400e17b6",
  "shared/session-store.js": "6d8a97ff7eed0403043a2a3358747321797bb4137b0d2f6e40c52fe13471b7aa",
  "ui/overlay.css": "7e45d738ea777905355b2191293c6833d25c39410cb6edf35e0b40b8f1e6d2de",
  "ui/results.css": "27168c9e07790967d7c401e5888b5afa69eec8c39040d81c5c9e12b2bb056d61"
};

const revised = new Set([
  "PRIVACY.md",              // Accurate viewport/URL/retention disclosure.
  "background.mjs",          // Shared URL eligibility check; search routes unchanged.
  "content/google-upload.js",// Bounded document wait and failed-cover cleanup.
  "content/lens-ready.js",   // Expiry/error/deadline must release the cover.
  "content/loading-screen.js",// Two light-theme contrast colors only.
  "content/overlay.js",      // Native button activation and IME confirmation.
  "shared/pending-store.js", // Recognizable local-address exclusion.
  "shared/session-store.js", // Single-consumer guard before the first await.
  "ui/results.css",          // Two light-theme contrast colors only.
]);

test("preserva byte a byte os módulos, traduções e ícones fora das correções autorizadas", () => {
  for (const [name, expected] of Object.entries(frozen)) {
    if (revised.has(name)) continue;
    assert.equal(sha256(read(name)), expected, name);
  }
});

test("mantém a versão 2.1.6 e todas as demais declarações do manifesto original", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.version, "2.1.6");
  delete manifest.version;
  assert.equal(sha256(JSON.stringify(manifest)), "2f293ebbd191bc734d5900e6f9cc7786f7144150f51d64baf3e785c44f3ec36a");
});

test("mantém o painel 2.1.6 e só ajusta suas duas cores claras de contraste", () => {
  assert.equal(sha256(read("popup/popup.html")), "24723233fdbe513e4069407ebed9921959b9959ab9206c07f567591d892540af");
  const previousColors = read("popup/popup.css").toString("utf8")
    .replace("--muted: #5d6c82;", "--muted: #64748b;")
    .replace("--accent-two: #08758e;", "--accent-two: #0891b2;");
  assert.equal(sha256(previousColors), "e1b7cb8fda2a23a3632e8f3bb4892a5f3a5ba8eda758085d46350727d1451673");
  const html = read("popup/popup.html").toString("utf8");
  assert.doesNotMatch(html, /popupShortcut|shortcut-row|<kbd\b/);
  assert.match(html, /id="open-selector"/);
  assert.equal((html.match(/class="control-card"/g) || []).length, 4);
});

test("a preparação preserva o desenho original, exceto duas cores claras de texto", () => {
  const previousCss = read("ui/results.css").toString("utf8")
    .replace("--muted: #5d6c82;", "--muted: #64748b;")
    .replace("--accent-two: #08758e;", "--accent-two: #0891b2;");
  const previousScreen = read("content/loading-screen.js").toString("utf8")
    .replace("--muted: #5d6c82;", "--muted: #64748b;")
    .replace("--accent: #08758e;", "--accent: #0891b2;");
  assert.equal(sha256(previousCss), frozen["ui/results.css"]);
  assert.equal(sha256(previousScreen), frozen["content/loading-screen.js"]);
});

test("todos os textos visíveis do painel existem em português e inglês", () => {
  const ids = [...read("popup/popup.html").toString("utf8").matchAll(/data-i18n="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(ids.length > 0);
  for (const locale of ["pt_BR", "en"]) {
    const messages = JSON.parse(read(`_locales/${locale}/messages.json`));
    for (const id of ids) {
      assert.equal(typeof messages[id]?.message, "string", `${locale}: ${id}`);
      assert.ok(messages[id].message.trim().length > 0, `${locale}: ${id}`);
    }
  }
});
