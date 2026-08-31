const test = require("node:test");
const assert = require("node:assert/strict");

delete require.cache[require.resolve("../content/google-upload.js")];
const upload = require("../content/google-upload.js");

function fixture({ withInput = true } = {}) {
  const events = [];
  const input = {
    type: "file",
    name: "encoded_image",
    form: null,
    files: null,
    dispatchEvent(event) { events.push(event.type); return true; },
  };
  const trigger = {
    clicked: false,
    click() {
      this.clicked = true;
      documentObject.currentInput = input;
    },
  };
  const documentObject = {
    currentInput: withInput ? input : null,
    documentElement: {},
    querySelector(selector) {
      return selector.includes("data-is-images-mode") ? trigger : null;
    },
    querySelectorAll(selector) {
      return selector.includes('type="file"') && this.currentInput ? [this.currentInput] : [];
    },
  };
  return { input, trigger, events, document: documentObject };
}

function environment() {
  class FakeFile {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
    }
  }
  class FakeDataTransfer {
    constructor() {
      this.files = [];
      this.items = { add: (file) => this.files.push(file) };
    }
  }
  class FakeEvent {
    constructor(type, options) { this.type = type; this.options = options; }
  }
  return {
    async fetch() {
      return { ok: true, async arrayBuffer() { return new Uint8Array([1, 2, 3]).buffer; } };
    },
    File: FakeFile,
    DataTransfer: FakeDataTransfer,
    Event: FakeEvent,
  };
}

const payload = {
  dataUrl: "data:image/jpeg;base64,aW1hZ2U=",
  width: 640,
  height: 480,
  mimeType: "image/jpeg",
};

test("localiza o acionador e o controle de arquivo do Google sem depender do idioma", () => {
  const current = fixture();
  assert.equal(upload.imageSearchTrigger(current.document), current.trigger);
  assert.equal(upload.uploadInput(current.document), current.input);
  assert.equal(upload.uploadInput(fixture({ withInput: false }).document), null);
});

test("aceita as variações semânticas atuais do acionador e do controle de arquivo", () => {
  const trigger = {};
  const input = { type: "file", name: "", accept: "image/png,image/jpeg", form: {} };
  const documentObject = {
    querySelector(selector) {
      return selector.includes('jscontroller="lpsUAf"') ? trigger : null;
    },
    querySelectorAll(selector) {
      return selector === 'input[type="file"]' ? [input] : [];
    },
  };
  assert.equal(upload.imageSearchTrigger(documentObject), trigger);
  assert.equal(upload.uploadInput(documentObject), input);
});

test("anexa somente o recorte e dispara os eventos esperados pelo Google", async () => {
  const current = fixture();
  await upload.attach(current.input, payload, environment());

  assert.equal(current.input.files.length, 1);
  assert.equal(current.input.files[0].name, "ravue-selection.jpg");
  assert.equal(current.input.files[0].type, "image/jpeg");
  assert.deepEqual(current.events, ["input", "change"]);
});

test("só consome uma captura quando existe uma guia Ravue pendente", async () => {
  const current = fixture();
  const messages = [];
  const env = {
    ...environment(),
    document: current.document,
    browser: {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          if (message.type === "RV_GOOGLE_UPLOAD_PROBE") return { pending: true };
          if (message.type === "RV_GOOGLE_UPLOAD_READY") return { ok: true, payload };
          if (message.type === "RV_GOOGLE_UPLOAD_SUBMITTING") return { ok: true };
          return { ok: true };
        },
      },
    },
  };

  await upload.launch(env);
  assert.deepEqual(messages.map(({ type }) => type), [
    "RV_GOOGLE_UPLOAD_PROBE",
    "RV_GOOGLE_UPLOAD_READY",
    "RV_GOOGLE_UPLOAD_SUBMITTING",
  ]);
  assert.deepEqual(current.events, ["input", "change"]);

  messages.length = 0;
  current.events.length = 0;
  env.browser.runtime.sendMessage = async (message) => {
    messages.push(message);
    return { pending: false };
  };
  await upload.launch(env);
  assert.deepEqual(messages.map(({ type }) => type), ["RV_GOOGLE_UPLOAD_PROBE"]);
  assert.deepEqual(current.events, []);
});

test("abre o seletor visual do Google quando o controle ainda não existe", async () => {
  const current = fixture({ withInput: false });
  const env = {
    ...environment(),
    document: current.document,
    browser: {
      runtime: {
        async sendMessage(message) {
          if (message.type === "RV_GOOGLE_UPLOAD_PROBE") return { pending: true };
          if (message.type === "RV_GOOGLE_UPLOAD_READY") return { ok: true, payload };
          if (message.type === "RV_GOOGLE_UPLOAD_SUBMITTING") return { ok: true };
          return { ok: true };
        },
      },
    },
  };

  await upload.launch(env);
  assert.equal(current.trigger.clicked, true);
  assert.deepEqual(current.events, ["input", "change"]);
});

test("cobre a guia imediatamente e aguarda o carregamento antes de anexar o recorte", async () => {
  const current = fixture();
  current.document.readyState = "interactive";
  const messages = [];
  let load = null;
  let loadingScreens = 0;
  const env = {
    ...environment(),
    document: current.document,
    addEventListener(type, listener, options) {
      assert.equal(type, "load");
      assert.deepEqual(options, { once: true });
      load = listener;
    },
    RavueLoadingScreen: {
      mount() { loadingScreens += 1; },
    },
    browser: {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          if (message.type === "RV_GOOGLE_UPLOAD_PROBE") return { pending: true };
          if (message.type === "RV_GOOGLE_UPLOAD_READY") return { ok: true, payload };
          if (message.type === "RV_GOOGLE_UPLOAD_SUBMITTING") return { ok: true };
          return { ok: true };
        },
      },
    },
  };

  const launching = upload.launch(env);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(messages, [{ type: "RV_GOOGLE_UPLOAD_PROBE" }]);
  assert.equal(loadingScreens, 1);
  assert.equal(typeof load, "function");
  current.document.readyState = "complete";
  load();
  await launching;
  assert.deepEqual(messages.map(({ type }) => type), [
    "RV_GOOGLE_UPLOAD_PROBE",
    "RV_GOOGLE_UPLOAD_READY",
    "RV_GOOGLE_UPLOAD_SUBMITTING",
  ]);
});

test("encerra com erro visível se o Google receber o arquivo mas não navegar", async () => {
  const current = fixture();
  const messages = [];
  let timeout = null;
  let delay = null;
  const env = {
    ...environment(),
    document: current.document,
    setTimeout(callback, milliseconds) {
      timeout = callback;
      delay = milliseconds;
      return 1;
    },
    browser: {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          if (message.type === "RV_GOOGLE_UPLOAD_PROBE") return { pending: true };
          if (message.type === "RV_GOOGLE_UPLOAD_READY") return { ok: true, payload };
          if (message.type === "RV_GOOGLE_UPLOAD_SUBMITTING") return { ok: true };
          return { ok: true };
        },
      },
    },
  };

  await upload.launch(env);
  assert.equal(delay, 20000);
  assert.equal(typeof timeout, "function");
  await timeout();
  assert.deepEqual(messages.at(-1), {
    type: "RV_GOOGLE_UPLOAD_FAILED",
    code: "google-result-timeout",
  });
});
