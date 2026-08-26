if (!globalThis.browser) globalThis.browser = chrome;

const t = (id, fallback = "") => browser.i18n.getMessage(id) || fallback;
document.documentElement.lang = browser.i18n.getUILanguage() || "pt-BR";

for (const element of document.querySelectorAll("[data-i18n]")) {
  element.textContent = t(element.dataset.i18n, element.textContent);
}

function fail(message) {
  document.body.dataset.failed = "true";
  document.getElementById("result-error-detail").textContent = message;
  document.getElementById("result-error").hidden = false;
}

function extensionFor(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function imageFile(payload) {
  const response = await fetch(payload.dataUrl);
  if (!response.ok) throw new Error(t("resultTabExpired"));
  const bytes = await response.arrayBuffer();
  const mimeType = payload.mimeType || "image/jpeg";
  return new File([bytes], `ravue-selection.${extensionFor(mimeType)}`, { type: mimeType });
}

async function submitToLens(payload) {
  const file = await imageFile(payload);
  const transfer = new DataTransfer();
  transfer.items.add(file);

  const form = document.createElement("form");
  form.method = "POST";
  form.enctype = "multipart/form-data";
  form.action = `https://lens.google.com/v3/upload?ep=ccm&s=&st=${Date.now()}`;
  form.target = "_self";
  form.hidden = true;

  const image = document.createElement("input");
  image.type = "file";
  image.name = "encoded_image";
  image.files = transfer.files;
  form.appendChild(image);

  const dimensions = document.createElement("input");
  dimensions.type = "hidden";
  dimensions.name = "processed_image_dimensions";
  dimensions.value = `${payload.width},${payload.height}`;
  form.appendChild(dimensions);

  document.body.appendChild(form);
  form.submit();
}

async function launch() {
  const query = new URLSearchParams(location.search);
  const issue = query.get("error");
  if (issue === "google403") throw new Error(t("resultTabGoogle403"));
  if (issue) throw new Error(t("resultTabExpired"));
  const uploadId = query.get("upload");
  if (!uploadId) throw new Error(t("resultTabExpired"));
  const payload = await browser.runtime.sendMessage({ type: "RV_TAKE_UPLOAD", uploadId });
  if (!payload?.ok) throw new Error(payload?.error || t("resultTabExpired"));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await submitToLens(payload);
}

document.getElementById("close-tab").addEventListener("click", async () => {
  const result = await browser.runtime.sendMessage({ type: "RV_CLOSE_RESULT_TAB" }).catch(() => null);
  if (!result?.ok) window.close();
});
launch().catch((error) => fail(error?.message || t("resultTabError")));
