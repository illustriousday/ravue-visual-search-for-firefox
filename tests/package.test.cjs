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

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("manifesto 3 usa permissões mínimas e uma versão de Firefox compatível", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "2.1.7");
  assert.equal(manifest.default_locale, "pt_BR");
  assert.deepEqual(manifest.permissions, ["activeTab", "menus", "scripting", "storage"]);
  assert.deepEqual(manifest.host_permissions, [
    "https://images.google.com/*",
    "https://lens.google.com/*",
  ]);
  assert.equal("optional_host_permissions" in manifest, false);
  assert.deepEqual(manifest.content_scripts, [
    {
      matches: ["https://images.google.com/*"],
      js: ["content/loading-screen.js", "content/google-upload.js"],
      run_at: "document_start",
    },
    {
      matches: ["https://lens.google.com/*"],
      js: ["content/loading-screen.js", "content/lens-ready.js"],
      run_at: "document_start",
    },
  ]);
  assert.equal("web_accessible_resources" in manifest, false);
  assert.equal("browser_action" in manifest, false);
  assert.equal("action" in manifest, true);
  assert.equal(manifest.action.default_popup, "popup/popup.html");
  assert.deepEqual(manifest.commands, {
    "open-ravue": {
      suggested_key: { default: "Alt+Shift+V" },
      description: "__MSG_commandDescription__",
    },
  });
  assert.deepEqual(manifest.background, {
    scripts: ["background.mjs"],
    type: "module",
  });
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "142.0");
  assert.deepEqual(
    manifest.browser_specific_settings.gecko.data_collection_permissions.required,
    ["websiteContent"],
  );
  assert.equal("gecko_android" in manifest.browser_specific_settings, false);
  assert.equal(manifest.icons["128"], "icons/ravue-128.png");
  assert.equal(Object.values(manifest.icons).every((file) => file.endsWith(".png")), true);
  assert.doesNotMatch(manifest.content_security_policy.extension_pages, /form-action/);
  assert.match(manifest.content_security_policy.extension_pages, /object-src 'none'/);
  assert.notEqual(
    manifest.browser_specific_settings.gecko.id,
    "{ef7aaca3-7766-4ceb-9804-ae3df281a721}",
  );
});

test("mantém o ID da Ravue para atualização automática", () => {
  assert.equal(
    manifest.browser_specific_settings.gecko.id,
    "{351e58ce-b7a8-4e88-b53f-d23acc464659}",
  );
});

test("usa o nome público definitivo e descrições localizadas precisas", () => {
  for (const locale of ["pt_BR", "en"]) {
    const messages = JSON.parse(read(`_locales/${locale}/messages.json`));
    assert.equal(messages.appName.message, "Ravue — Visual Search for Firefox");
    assert.match(messages.appDescription.message, /image|imagem/i);
    assert.match(messages.appDescription.message, /Google Lens/);
    assert.ok(messages.appDescription.message.length <= 132);
    assert.equal("resultTabGoogle403" in messages, false);
    for (const id of [
      "popupSubtitle",
      "popupTitle",
      "popupDescription",
      "popupOpenSelector",
      "popupOpenImageInput",
      "popupOpenImageInputHint",
      "popupImageInputReason",
      "popupImagePageOpening",
      "popupImagePageError",
      "popupChooseFile",
      "popupChooseHint",
      "popupDropActive",
      "uploadPageTitle",
      "uploadEyebrow",
      "uploadTitle",
      "uploadBody",
      "uploadDropPrompt",
      "uploadDropAlternative",
      "uploadSupported",
      "uploadPrivacy",
      "popupImageBody",
      "popupSmartBody",
      "popupCorrectBody",
      "popupVisibleBody",
      "popupPrivacy",
      "popupOpening",
      "popupError",
      "popupFilePreparing",
      "popupFileOpening",
      "popupFileSizeError",
      "popupFileTypeError",
      "popupDropError",
      "popupFileReadError",
      "popupFileSendError",
    ]) {
      assert.equal(typeof messages[id]?.message, "string", `${locale}: ${id}`);
      assert.ok(messages[id].message.length > 0, `${locale}: ${id} vazio`);
    }
  }
});

test("o painel preserva o seletor e abre uma página estável para arquivos", () => {
  const html = read("popup/popup.html");
  const css = read("popup/popup.css");
  const script = read("popup/popup.js");
  const imageInput = read("popup/image-input.js");
  const uploadHtml = read("upload.html");
  const uploadCss = read("ui/upload.css");
  const background = read("background.mjs");

  assert.match(html, /id="open-selector"/);
  assert.match(html, /id="open-image-input"/);
  assert.doesNotMatch(html, /id="image-file"|id="drop-overlay"/);
  assert.match(html, /data-i18n="popupDescription"/);
  assert.match(html, /data-i18n="popupImageBody"/);
  assert.match(html, /data-i18n="popupSmartBody"/);
  assert.match(html, /data-i18n="popupCorrectBody"/);
  assert.match(html, /data-i18n="popupVisibleBody"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /popupShortcut|shortcut-row|<kbd\b/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(css, /width:\s*372px/);
  assert.match(css, /\.controls\s*\{\s*margin-top:\s*18px;\s*\}/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(script, /RV_POPUP_OPEN_SELECTOR/);
  assert.match(script, /runtime\.getManifest/);
  assert.doesNotMatch(script, /tabs\.(?:create|update|remove)|https?:\/\//);
  assert.match(imageInput, /RV_POPUP_OPEN_IMAGE_PAGE/);
  assert.match(imageInput, /RV_IMAGE_PAGE_SEARCH_ITEM/);
  assert.match(imageInput, /addEventListener\("drop"/);
  assert.match(imageInput, /MAX_SOURCE_BYTES\s*=\s*32 \* 1024 \* 1024/);
  assert.doesNotMatch(imageInput, /\bfetch\s*\(|XMLHttpRequest|tabs\.(?:create|update|remove)/);
  assert.match(uploadHtml, /id="choose-image"/);
  assert.match(uploadHtml, /id="image-file"[^>]+type="file"/);
  assert.match(uploadHtml, /id="drop-overlay"/);
  assert.match(uploadHtml, /role="status"/);
  assert.match(uploadHtml, /aria-live="polite"/);
  assert.doesNotMatch(uploadHtml, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(uploadHtml, /https?:\/\//i);
  assert.match(uploadCss, /prefers-color-scheme:\s*dark/);
  assert.match(uploadCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(background, /sender\?\.url !== browser\.runtime\.getURL\("popup\/popup\.html"\)/);
  assert.match(background, /sender\?\.url !== browser\.runtime\.getURL\("upload\.html"\)/);
  assert.match(background, /browser\.tabs\.query\(\{ active: true, currentWindow: true \}\)/);
  assert.match(background, /url: browser\.runtime\.getURL\("upload\.html"\)/);
});

test("todos os recursos locais declarados ou importados existem", () => {
  for (const file of manifest.background.scripts) assertFile(file);
  for (const file of Object.values(manifest.icons)) assertFile(file);
  for (const file of Object.values(manifest.action.default_icon)) assertFile(file);
  for (const file of [
    "content/geometry.js",
    "content/target.js",
    "content/direct-image.js",
    "content/smart-selection.js",
    "content/overlay.js",
    "content/bridge.js",
    "content/google-upload.js",
    "content/loading-screen.js",
    "content/lens-ready.js",
    "shared/session-store.js",
    "shared/pending-store.js",
    "ui/overlay.css",
    "results.html",
    "popup/popup.html",
    "popup/popup.css",
    "popup/popup.js",
    "popup/image-input.js",
    "upload.html",
    "ui/upload.css",
  ]) assertFile(file);

  for (const moduleName of ["background.mjs", "results.mjs"]) {
    for (const match of read(moduleName).matchAll(/import\s+["']\.\/([^"']+)["']/g)) {
      assertFile(match[1]);
    }
  }

  const html = read("results.html");
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (!match[1].startsWith("data:")) assertFile(match[1]);
  }

  const popupHtml = read("popup/popup.html");
  for (const match of popupHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (match[1].startsWith("data:")) continue;
    const resolved = path.posix.normalize(path.posix.join("popup", match[1]));
    assertFile(resolved);
  }
  const uploadHtml = read("upload.html");
  for (const match of uploadHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (!match[1].startsWith("data:")) assertFile(match[1]);
  }
  assert.equal(fs.existsSync(path.join(root, "background.html")), false);
  assert.equal(fs.existsSync(path.join(root, "content/lens-result.js")), false);
});

test("prioriza a URL pública e preserva o upload de arquivo como contingência", () => {
  const background = read("background.mjs");
  const googleUpload = read("content/google-upload.js");
  const loadingScreen = read("content/loading-screen.js");
  const lensReady = read("content/lens-ready.js");
  const results = read("results.mjs");
  const session = read("shared/session-store.js");
  const pending = read("shared/pending-store.js");

  assert.match(background, /browser\.tabs\.create\s*\(\s*\{/);
  assert.match(background, /openerTabId:\s*tab\.id/);
  assert.match(background, /url:\s*browser\.runtime\.getURL\(["']results\.html["']\)/);
  assert.match(background, /active:\s*true/);
  assert.match(background, /RavueSessionStore\.put\(uploadId, image\)/);
  assert.doesNotMatch(background, /RavueSessionStore\.put\([^\n]*screenshot/);
  assert.match(background, /RavuePendingStore\.put\(result\.id, uploadId\)/);
  assert.match(background, /RavuePendingStore\.putUrl\(result\.id, sourceUrl\)/);
  assert.match(background, /RV_START_GOOGLE_STAGE/);
  assert.match(background, /browser\.tabs\.update\(sender\.tab\.id, \{ url: GOOGLE_IMAGES_URL \}\)/);
  assert.match(background, /changeInfo\.status === ["']loading["']/);
  assert.match(background, /changeInfo\.status !== ["']complete["']/);
  assert.match(background, /RavuePendingStore\.markSubmitting/);
  assert.match(background, /RavuePendingStore\.markNavigating/);
  assert.match(background, /RavuePendingStore\.markUrlNavigating/);
  assert.match(background, /RV_REVEAL_LENS/);
  assert.doesNotMatch(background, /loadingTabId|takeByLoadingTab/);
  assert.match(results, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.match(results, /RV_START_GOOGLE_STAGE/);
  assert.match(loadingScreen, /data-ravue-loading-screen/);
  assert.match(loadingScreen, /resultTabTitle/);
  assert.match(lensReady, /RV_LENS_RESULT_PROBE/);
  assert.match(lensReady, /RV_LENS_DOCUMENT_READY/);
  assert.match(lensReady, /RV_REVEAL_LENS/);
  assert.match(googleUpload, /data-is-images-mode/);
  assert.match(googleUpload, /trigger\.click\(\)/);
  assert.match(googleUpload, /waitForDocumentComplete\(environment\)/);
  assert.match(googleUpload, /input\[type=["']file["']\]/);
  assert.match(googleUpload, /jscontroller=[\\"']lpsUAf/);
  assert.match(googleUpload, /new environment\.DataTransfer\s*\(\)/);
  assert.match(googleUpload, /new environment\.Event\(["']change["']/);
  assert.doesNotMatch(googleUpload, /function urlInput|function submitUrl|response\.sourceUrl/);
  assert.match(googleUpload, /RESULT_TIMEOUT_MS\s*=\s*20000/);
  assert.match(googleUpload, /google-result-timeout/);
  assert.match(googleUpload, /RavueLoadingScreen\?\.mount/);
  assert.doesNotMatch(googleUpload, /form\.action\s*=|ep=ccm|uploadbyurl|lens\.google\.com/);
  assert.match(background, /https:\/\/lens\.google\.com\/uploadbyurl/);
  assert.match(background, /lens\.searchParams\.set\(["']url["'], route\.sourceUrl\)/);
  assert.match(session, /storage\?\.session/);
  assert.match(pending, /storage\?\.session/);
  assert.doesNotMatch(session, /storage\?\.(?:local|sync)|storage\.(?:local|sync)/);
  assert.doesNotMatch(pending, /storage\?\.(?:local|sync)|storage\.(?:local|sync)/);
});

test("os comandos de imagem e área seguem fluxos distintos com URL pública prioritária", () => {
  const background = read("background.mjs");
  const directImage = read("content/direct-image.js");
  const handler = background.slice(background.indexOf("menus.onClicked"));
  const direct = background.slice(
    background.indexOf("async function searchImage("),
    background.indexOf("async function searchCapture("),
  );

  assert.match(handler, /menuItemId === ["']ravue-image["']\) return searchImageSafely/);
  assert.match(handler, /menuItemId === ["']ravue-area["']\) return startSafely/);
  assert.match(direct, /captureClickedImage\(tab, menuInfo\)/);
  assert.match(direct, /queueImageUpload\(tab, image\)/);
  assert.match(direct, /publicImageSource\(menuInfo\?\.srcUrl\)/);
  assert.match(direct, /openUrlResultTab\(tab, source\)/);
  assert.match(direct, /directImageError/);
  assert.doesNotMatch(direct, /startSelection|RV_OPEN_OVERLAY/);
  assert.match(background, /function publicImageSource/);
  assert.match(background, /https:\/\/lens\.google\.com\/uploadbyurl/);
  assert.match(background, /RV_DIRECT_IMAGE_BEGIN/);
  const capture = background.slice(
    background.indexOf("async function captureClickedImage("),
    background.indexOf("function publicImageSource("),
  );
  assert.match(capture, /captureRenderedImage\(tab, started\.plan\)/);
  assert.ok(
    direct.indexOf("publicImageSource(menuInfo?.srcUrl)") <
      direct.indexOf("captureClickedImage(tab, menuInfo)"),
    "a URL pública deve ser escolhida antes dos caminhos de captura",
  );
  assert.doesNotMatch(background, /RV_DIRECT_IMAGE_SCROLL|RV_DIRECT_IMAGE_RESTORE|fullAxisCoverage|scrollTo\s*\(/);
  assert.match(directImage, /getTargetElement/);
  assert.match(directImage, /documentObject\?\.images/);
  assert.match(directImage, /drawImage\(target, 0, 0, size\.width, size\.height\)/);
  assert.doesNotMatch(directImage, /fetch\s*\(|tabs?\.create|tabs?\.update|uploadbyurl|scrollTo\s*\(/);
});

test("o background respeita o ciclo de vida não persistente do MV3", () => {
  const background = read("background.mjs");
  const firstListener = background.indexOf("browser.runtime.onMessage.addListener");
  const cleanup = background.indexOf("RavueSessionStore.cleanup()");

  assert.ok(firstListener > 0 && cleanup > firstListener);
  assert.match(background, /browser\.runtime\.onInstalled\.addListener/);
  assert.match(background, /browser\.runtime\.onStartup\.addListener/);
  assert.match(background, /browser\.scripting\.executeScript/);
  assert.match(background, /browser\.action\.onClicked/);
  assert.doesNotMatch(background, /browser\.browserAction|tabs\.executeScript|setInterval/);
  assert.doesNotMatch(background, /const\s+(?:captures|uploads|resultTabs)\b/);
  assert.doesNotMatch(background, /^await\s+browser\.contextMenus/m);
});

test("a injeção resiste a CSP forte e trata lazy loading e object-fit", () => {
  const background = read("background.mjs");
  const directImage = read("content/direct-image.js");
  const overlay = read("content/overlay.js");
  const bridge = read("content/bridge.js");
  const target = read("content/target.js");
  const smart = read("content/smart-selection.js");

  assert.match(background, /fetch\(browser\.runtime\.getURL\(["']ui\/overlay\.css["']\)\)/);
  assert.match(background, /styles,/);
  assert.match(overlay, /adoptedStyleSheets/);
  assert.match(overlay, /replaceSync\(this\.config\.styles\)/);
  assert.match(overlay, /createImageBitmap\(this\.screenshotBlob\(\)\)/);
  assert.match(overlay, /<canvas class="rv-shot"/);
  assert.doesNotMatch(overlay, /<link|createElement\(["']link["']\)|runtime\.getURL/);
  assert.match(directImage, /target\.decode\(\)/);
  assert.match(directImage, /naturalWidth/);
  assert.doesNotMatch(background, /initialSelection|RV_TARGET_RECT/);
  assert.doesNotMatch(bridge, /initialSelection|RV_TARGET_RECT/);
  assert.doesNotMatch(overlay, /initialSelection|imageReady/);
  assert.match(overlay, /document\.createElement\(["']img["']\)/);
  assert.match(target, /objectFit/);
  assert.match(target, /scale-down/);
  assert.match(background, /"content\/target\.js",\s*"content\/smart-selection\.js",\s*"content\/overlay\.js"/s);
  assert.match(overlay, /ANALYSIS_MAX_SIDE\s*=\s*960/);
  assert.match(overlay, /gesture\.type === "draw" && !gesture\.travelled/);
  assert.match(overlay, /this\.smartSelection\(gesture\.origin, event\)/);
  assert.match(overlay, /contextmenu/);
  assert.match(overlay, /clearFromContextMenu/);
  assert.match(overlay, /event\.stopPropagation\(\)/);
  assert.match(smart, /targetAtPoint/);
  assert.match(smart, /regionCandidate/);
  assert.match(smart, /toneCandidate/);
  assert.match(smart, /reliableVisual/);
  assert.match(smart, /MAX_ACCEPTED_COVERAGE/);
  assert.doesNotMatch(smart, /fetch\s*\(|XMLHttpRequest|browser\.|chrome\./);
});

test("não preserva nomenclatura ou lógica das implementações antigas", () => {
  const productionFiles = filesBelow(root).filter((file) => /\.(?:json|js|mjs|html)$/.test(file));
  const source = productionFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(
    source,
    /RV_IS_RESULT_PANEL|RV_LENS_PANEL_ERROR|openResultsPanel|knownResultPanel|resultWindow|resultPanel/i,
  );
  assert.doesNotMatch(source, /RV_TAKE_UPLOAD|RV_IS_RESULT_TAB|RV_LENS_TAB_ERROR|RV_CANCEL_CAPTURE/);
  assert.equal(fs.existsSync(path.join(root, "sidebar.html")), false);
  assert.equal(fs.existsSync(path.join(root, "sidebar.mjs")), false);
  assert.equal(fs.existsSync(path.join(root, "ui/sidebar.css")), false);
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

test("não contém código remoto nem interceptação de rede", () => {
  const sourceFiles = filesBelow(root).filter((file) => /\.(?:json|js|mjs|html)$/.test(file));
  const source = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /<all_urls>|webRequest|webRequestBlocking|eval\s*\(|new Function\s*\(/);
  assert.doesNotMatch(source, /import\s*\(\s*["']https?:|<script[^>]+https?:/i);
  const urls = [...source.matchAll(/https?:\/\/[^"'\s]+/g)].map((match) => match[0]);
  assert.equal(urls.length > 0, true);
  assert.equal(urls.every((url) => (
    url.startsWith("https://lens.google.com") ||
    url.startsWith("https://images.google.com")
  )), true);
});

test("documents privacy, MV3, file input, and AMO review accurately in English", () => {
  const publication = read("AMO_PUBLICATION.md");
  const privacy = read("PRIVACY.md");
  const readme = read("README.md");

  assert.match(publication, /Ravue — Visual Search for Firefox/);
  assert.match(publication, /2\.1\.6/);
  assert.match(publication, /2\.1\.7/);
  assert.match(publication, /Manifest V3/);
  assert.match(publication, /Notes for Reviewers/);
  assert.match(publication, /direct image search/i);
  assert.match(publication, /area selection/i);
  assert.match(publication, /choose an image|image file/i);
  assert.match(publication, /drag/i);
  assert.match(publication, /websiteContent/);
  assert.match(privacy, /complete image|full image/i);
  assert.match(privacy, /does not scroll/i);
  assert.match(privacy, /storage\.session/);
  assert.match(privacy, /specific (?:public )?URL|image(?:'s| URL) specific URL/i);
  assert.match(privacy, /does not send the page URL/i);
  assert.match(privacy, /uploadbyurl/);
  assert.match(privacy, /chosen|dropped/i);
  assert.match(privacy, /32 MB/);
  assert.match(readme, /Manifest V3/);
  assert.match(readme, /source-only|source code.*review|transparency/i);
  assert.match(readme, /click.*select/i);
  assert.match(readme, /ambiguous.*full image|full image.*ambiguous/i);
  assert.match(privacy, /visual analysis is performed locally/i);
});
