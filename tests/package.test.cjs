const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "tests" ? [] : filesBelow(absolute);
    return [absolute];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function assertFile(file) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `arquivo ausente: ${file}`);
}

test("manifesto representa um produto novo e usa permissões mínimas", () => {
  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.version, "1.4.1");
  assert.equal(manifest.default_locale, "pt_BR");
  assert.deepEqual(manifest.permissions.sort(), ["activeTab", "contextMenus", "https://lens.google.com/*"].sort());
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ["websiteContent"]);
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "140.0");
  assert.equal("gecko_android" in manifest.browser_specific_settings, false);
  assert.equal(manifest.icons["128"], "icons/ravue-128.png");
  assert.equal(Object.values(manifest.icons).every((file) => file.endsWith(".png")), true);
  assert.equal(manifest.content_scripts.length, 1);
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "https://lens.google.com/v3/upload*",
    "https://lens.google.com/uploadbyurl*",
  ]);
  assert.deepEqual(manifest.content_scripts[0].js, ["content/lens-result.js"]);
  assert.equal("sidebar_action" in manifest, false);
  assert.equal("options_ui" in manifest, false);
  assert.notEqual(manifest.browser_specific_settings.gecko.id, "{ef7aaca3-7766-4ceb-9804-ae3df281a721}");
});

test("usa o nome público definitivo e descrições localizadas precisas", () => {
  for (const locale of ["pt_BR", "en"]) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, "_locales", locale, "messages.json"), "utf8"));
    assert.equal(messages.appName.message, "Ravue — Visual Search for Firefox");
    assert.match(messages.appDescription.message, /image|imagem/i);
    assert.match(messages.appDescription.message, /Google Lens/);
    assert.ok(messages.appDescription.message.length <= 132);
  }
});

test("todos os recursos declarados existem", () => {
  assertFile(manifest.background.page);
  for (const file of Object.values(manifest.icons)) assertFile(file);
  for (const file of Object.values(manifest.browser_action.default_icon)) assertFile(file);
  for (const file of manifest.web_accessible_resources) assertFile(file);
  for (const script of manifest.content_scripts) {
    for (const file of script.js || []) assertFile(file);
    for (const file of script.css || []) assertFile(file);
  }

  for (const htmlName of [manifest.background.page, "results.html"]) {
    const html = fs.readFileSync(path.join(root, htmlName), "utf8");
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (!match[1].startsWith("data:")) assertFile(match[1]);
    }
  }
});

test("abre os resultados em uma nova guia normal", () => {
  const source = filesBelow(root)
    .filter((file) => /\.(?:js|mjs|html)$/.test(file))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  assert.match(source, /tabs\.create\s*\(\s*\{/);
  assert.match(source, /openerTabId:\s*capture\.tabId/);
  assert.match(source, /active:\s*true/);
  assert.doesNotMatch(source, /windows\.create|type:\s*["']popup["']|resultPanels|panelGeometry/i);
  assert.doesNotMatch(source, /window\.open|target\s*=\s*["']_blank/i);
  assert.doesNotMatch(source, /sidebarAction|sidebar\.html|ravue-sidebar|postSidebar|sidebarConnections/i);
  assert.match(source, /form\.target\s*=\s*["']_self["']/);
  assert.match(source, /RV_TAKE_UPLOAD/);
  assert.match(source, /https:\/\/lens\.google\.com\/v3\/upload/);
});

test("envia o arquivo por POST direto antes de sair da página da extensão", () => {
  const detector = fs.readFileSync(path.join(root, "content/lens-result.js"), "utf8");
  const results = fs.readFileSync(path.join(root, "results.mjs"), "utf8");
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.match(results, /new DataTransfer\s*\(\)/);
  assert.match(results, /image\.name\s*=\s*["']encoded_image["']/);
  assert.match(results, /form\.method\s*=\s*["']POST["']/);
  assert.match(results, /form\.submit\s*\(\)/);
  assert.doesNotMatch(results, /location\.replace|ravue-upload/);
  assert.doesNotMatch(detector, /RV_TAKE_UPLOAD|form\.submit|window\.stop/);
  assert.match(detector, /RV_LENS_TAB_ERROR/);
  assert.match(detector, /\\b403\\b/);
});

test("os comandos de imagem e área seguem fluxos distintos", () => {
  const background = fs.readFileSync(path.join(root, "background.mjs"), "utf8");
  const handler = background.slice(background.indexOf("browser.contextMenus.onClicked"));
  const direct = background.slice(
    background.indexOf("async function searchImage("),
    background.indexOf("function takeUpload("),
  );

  assert.match(handler, /menuItemId === ["']ravue-image["']\) return searchImageSafely/);
  assert.match(handler, /menuItemId === ["']ravue-area["']\) return startSafely/);
  assert.doesNotMatch(handler, /ravue-image["']\s*\|\|[^\n]+ravue-area[^\n]+startSafely/);
  assert.match(direct, /captureClickedImage\(tab, menuInfo\)/);
  assert.match(direct, /queueImageUpload/);
  assert.match(direct, /openImageUrlResults/);
  assert.doesNotMatch(direct, /startSelection|RV_OPEN_OVERLAY/);
});

test("a busca direta usa recorte local e fallback restrito à URL da imagem", () => {
  const background = fs.readFileSync(path.join(root, "background.mjs"), "utf8");
  assert.match(background, /globalThis\.RavueGeometry\.valid\(target\.rect, 1\)/);
  assert.match(background, /cropCapture\(capture, target\.rect, layout\.viewport\)/);
  assert.match(background, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
  assert.match(background, /new URL\(["']https:\/\/lens\.google\.com\/uploadbyurl["']\)/);
  assert.match(background, /lens\.searchParams\.set\(["']url["'], source\)/);
});

test("não preserva nomenclatura ou lógica da antiga janela lateral", () => {
  const productionFiles = filesBelow(root).filter((file) => /\.(?:json|js|mjs|html)$/.test(file));
  const source = productionFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /RV_IS_RESULT_PANEL|RV_LENS_PANEL_ERROR|openResultsPanel|knownResultPanel|resultWindow|resultPanel/i);
});

test("remove completamente a barra lateral antiga do pacote", () => {
  assert.equal(fs.existsSync(path.join(root, "sidebar.html")), false);
  assert.equal(fs.existsSync(path.join(root, "sidebar.mjs")), false);
  assert.equal(fs.existsSync(path.join(root, "ui/sidebar.css")), false);
  const names = filesBelow(root).map(relative).join("\n");
  assert.doesNotMatch(names, /(?:^|\/)sidebar(?:\.|\/)/i);
});

test("não contém artefatos nem referências da base anterior", () => {
  const banned = [
    /Search-on-Google-Lens/i,
    /Search on Google Lens/i,
    /typeling1578/i,
    /Mozilla Public License/i,
    /fontawesome/i,
    /image-right-click/i,
    /post_to_lens/i,
    /\{ef7aaca3-7766-4ceb-9804-ae3df281a721\}/i,
  ];
  const productionFiles = filesBelow(root);
  const names = productionFiles.map(relative).join("\n");
  const contents = productionFiles
    .filter((file) => !/\.(?:png|jpg|jpeg|webp|bmp|zip|xpi)$/i.test(file))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  for (const pattern of banned) {
    assert.doesNotMatch(names, pattern);
    assert.doesNotMatch(contents, pattern);
  }
});

test("o pacote não contém recursos remotos nem interceptação de rede", () => {
  const sourceFiles = filesBelow(root).filter((file) => /\.(?:json|js|mjs|html)$/.test(file));
  const source = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /<all_urls>|webRequest|webRequestBlocking/);
  const urls = [...source.matchAll(/https?:\/\/[^"'`\s]+/g)].map((match) => match[0]);
  assert.equal(urls.every((url) => /^https:\/\/lens\.google\.com(?:\/v3\/upload|\/uploadbyurl|\/\*)?/.test(url)), true);
});

test("inclui documentação completa para publicação e revisão do AMO", () => {
  const publication = fs.readFileSync(path.join(root, "AMO_PUBLICATION.md"), "utf8");
  const privacy = fs.readFileSync(path.join(root, "PRIVACY.md"), "utf8");
  assert.match(publication, /Ravue — Visual Search for Firefox/);
  assert.match(publication, /Notes for Reviewers/);
  assert.match(publication, /Test 1 — direct image search/);
  assert.match(publication, /Test 2 — area selection/);
  assert.match(publication, /websiteContent/);
  assert.match(privacy, /endereço de origem da própria imagem/);
  assert.match(privacy, /servidor próprio/);
});
