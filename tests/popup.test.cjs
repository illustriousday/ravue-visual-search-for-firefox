const test = require("node:test");
const assert = require("node:assert/strict");
const { version: packageVersion } = require("../manifest.json");

delete require.cache[require.resolve("../popup/popup.js")];
const popup = require("../popup/popup.js");

function control() {
  return {
    disabled: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
  };
}

test("localiza o painel em português e mostra a versão instalada", () => {
  const title = { dataset: { i18n: "popupTitle" }, textContent: "fallback" };
  const version = { textContent: "" };
  const documentObject = {
    documentElement: { lang: "" },
    querySelectorAll(selector) {
      assert.equal(selector, "[data-i18n]");
      return [title];
    },
    getElementById(id) {
      assert.equal(id, "version");
      return version;
    },
  };
  const browserApi = {
    i18n: {
      getUILanguage() { return "pt-BR"; },
      getMessage(id) { return id === "popupTitle" ? "Título traduzido" : ""; },
    },
    runtime: { getManifest() { return { version: packageVersion }; } },
  };

  popup.localize(documentObject, browserApi);
  popup.showVersion(documentObject, browserApi);
  assert.equal(documentObject.documentElement.lang, "pt-BR");
  assert.equal(title.textContent, "Título traduzido");
  assert.equal(version.textContent, `v${packageVersion}`);
});

test("o botão abre o seletor e fecha somente o painel", async () => {
  const button = control();
  const status = { hidden: true, textContent: "" };
  const messages = [];
  let closed = 0;
  const environment = {
    document: {
      getElementById(id) { return id === "open-selector" ? button : status; },
    },
    browser: {
      i18n: { getMessage(id) { return id === "popupOpening" ? "Abrindo…" : ""; } },
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          return { ok: true };
        },
      },
    },
    close() { closed += 1; },
  };

  assert.equal(await popup.requestSelector(environment), true);
  assert.deepEqual(messages, [{ type: "RV_POPUP_OPEN_SELECTOR" }]);
  assert.equal(button.disabled, true);
  assert.equal(button.attributes["aria-busy"], "true");
  assert.equal(status.textContent, "Abrindo…");
  assert.equal(closed, 1);
});

test("uma página protegida mantém o painel aberto e informa a falha", async () => {
  const button = control();
  const status = { hidden: true, textContent: "" };
  let closed = 0;
  const environment = {
    document: {
      getElementById(id) { return id === "open-selector" ? button : status; },
    },
    browser: {
      i18n: {
        getMessage(id) {
          if (id === "popupOpening") return "Abrindo…";
          if (id === "popupError") return "A Ravue não pode abrir nesta página.";
          return "";
        },
      },
      runtime: { async sendMessage() { return { ok: false }; } },
    },
    close() { closed += 1; },
  };

  assert.equal(await popup.requestSelector(environment), false);
  assert.equal(button.disabled, false);
  assert.equal("aria-busy" in button.attributes, false);
  assert.equal(status.textContent, "A Ravue não pode abrir nesta página.");
  assert.equal(closed, 0);
});

test("abrir o painel não inicia busca; somente o botão aciona o seletor", async () => {
  const button = control();
  const status = { hidden: true, textContent: "" };
  const version = { textContent: "" };
  const title = { dataset: { i18n: "popupTitle" }, textContent: "Título" };
  let clickListener;
  let messages = 0;
  let closed = 0;
  button.addEventListener = (event, listener) => {
    assert.equal(event, "click");
    clickListener = listener;
  };
  const environment = {
    document: {
      documentElement: { lang: "" },
      querySelectorAll() { return [title]; },
      getElementById(id) {
        return { "open-selector": button, status, version }[id];
      },
    },
    browser: {
      i18n: {
        getUILanguage() { return "en-US"; },
        getMessage(id) { return id === "popupTitle" ? "Search visually" : ""; },
      },
      runtime: {
        getManifest() { return { version: packageVersion }; },
        async sendMessage(message) {
          messages += 1;
          assert.deepEqual(message, { type: "RV_POPUP_OPEN_SELECTOR" });
          return { ok: true };
        },
      },
    },
    close() { closed += 1; },
  };

  assert.equal(popup.launch(environment), true);
  assert.equal(environment.document.documentElement.lang, "en-US");
  assert.equal(title.textContent, "Search visually");
  assert.equal(version.textContent, `v${packageVersion}`);
  assert.equal(messages, 0);
  assert.equal(closed, 0);
  assert.equal(typeof clickListener, "function");
  await clickListener();
  assert.equal(messages, 1);
  assert.equal(closed, 1);
});

test("falha de comunicação reabilita o botão sem fechar a página", async () => {
  const button = control();
  const status = { hidden: true, textContent: "" };
  let closed = 0;
  const environment = {
    document: {
      getElementById(id) { return id === "open-selector" ? button : status; },
    },
    browser: {
      i18n: { getMessage() { return ""; } },
      runtime: { async sendMessage() { throw new Error("message-port-closed"); } },
    },
    close() { closed += 1; },
  };

  assert.equal(await popup.requestSelector(environment), false);
  assert.equal(button.disabled, false);
  assert.equal("aria-busy" in button.attributes, false);
  assert.equal(status.hidden, false);
  assert.equal(status.textContent, "Ravue could not open on this page.");
  assert.equal(closed, 0);
});
