const test = require("node:test");
const assert = require("node:assert/strict");

class FakeNode {
  constructor(tagName, documentObject) {
    this.tagName = tagName;
    this.documentObject = documentObject;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
    this.textContent = "";
    this.className = "";
    this.nodes = new Map();
  }

  setAttribute(name, value) { this.attributes.set(name, value); }
  appendChild(child) {
    this.children.push(child);
    if (this === this.documentObject.documentElement && child.attributes?.has("data-ravue-loading-screen")) {
      this.documentObject.loadingHost = child;
    }
    return child;
  }
  attachShadow() {
    this.shadow = new FakeNode("shadow-root", this.documentObject);
    return this.shadow;
  }
  set innerHTML(value) {
    this.markup = value;
    for (const selector of [".eyebrow", "h1", ".body", ".hint"]) {
      this.nodes.set(selector, new FakeNode(selector, this.documentObject));
    }
  }
  querySelector(selector) { return this.nodes.get(selector) || null; }
  remove() {
    this.removed = true;
    if (this.documentObject.loadingHost === this) this.documentObject.loadingHost = null;
  }
}

function fixture() {
  const documentObject = {
    loadingHost: null,
    createElement(name) { return new FakeNode(name, this); },
    querySelector(selector) {
      return selector === "[data-ravue-loading-screen]" ? this.loadingHost : null;
    },
  };
  documentObject.documentElement = new FakeNode("html", documentObject);
  return documentObject;
}

test("monta uma única cobertura localizada e a remove ao revelar o Lens", (t) => {
  delete require.cache[require.resolve("../content/loading-screen.js")];
  const loading = require("../content/loading-screen.js");
  t.after(() => { delete global.RavueLoadingScreen; });

  const documentObject = fixture();
  const copy = {
    resultEyebrow: "BUSCA VISUAL",
    resultTabTitle: "Preparando a busca",
    resultTabBody: "Enviando a imagem ao Google Lens nesta guia.",
    resultTabHint: "A página será atualizada automaticamente em instantes.",
  };
  const browserApi = { i18n: { getMessage(id) { return copy[id] || ""; } } };

  const host = loading.mount(documentObject, browserApi);
  assert.ok(host);
  assert.equal(host.attributes.has("data-ravue-loading-screen"), true);
  assert.equal(loading.mount(documentObject, browserApi), host);

  const screen = host.shadow.children.find(({ className }) => className === "screen");
  assert.ok(screen);
  assert.equal(screen.querySelector("h1").textContent, copy.resultTabTitle);
  assert.equal(screen.querySelector(".body").textContent, copy.resultTabBody);
  assert.equal(loading.remove(documentObject), true);
  assert.equal(documentObject.loadingHost, null);
});
