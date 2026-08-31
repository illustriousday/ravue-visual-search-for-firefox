const test = require("node:test");
const assert = require("node:assert/strict");

delete require.cache[require.resolve("../content/geometry.js")];
const geometry = require("../content/geometry.js");
delete require.cache[require.resolve("../content/overlay.js")];
const overlay = require("../content/overlay.js");

test("inicia vazio e cria uma seleção pelo gesto completo de ponteiro", () => {
  const session = Object.create(overlay.RavueOverlaySession.prototype);
  const captures = [];
  const releases = [];
  let focused = false;
  let rendered = 0;
  session.busy = false;
  session.selection = null;
  session.gesture = null;
  session.error = "";
  session.geometry = geometry;
  session.stage = {
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 500 }; },
    setPointerCapture(pointerId) { captures.push(pointerId); },
    hasPointerCapture(pointerId) { return captures.includes(pointerId); },
    releasePointerCapture(pointerId) { releases.push(pointerId); },
  };
  session.box = {
    contains() { return false; },
    focus() { focused = true; },
  };
  session.render = () => { rendered += 1; };

  const event = (clientX, clientY) => ({
    button: 0,
    pointerId: 7,
    clientX,
    clientY,
    target: {},
    preventDefault() {},
  });

  assert.equal(session.selection, null);
  session.begin(event(120, 90));
  session.move(event(520, 340));
  session.end(event(520, 340));

  assert.deepEqual(session.selection, { x: 120, y: 90, width: 400, height: 250 });
  assert.deepEqual(captures, [7]);
  assert.deepEqual(releases, [7]);
  assert.equal(focused, true);
  assert.equal(rendered >= 3, true);
});

test("um clique simples usa a seleção inteligente sem mudar o gesto de arraste", () => {
  const session = Object.create(overlay.RavueOverlaySession.prototype);
  let focused = false;
  let smartCalls = 0;
  session.busy = false;
  session.selection = null;
  session.gesture = null;
  session.error = "";
  session.geometry = geometry;
  session.stage = {
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 500 }; },
    setPointerCapture() {},
    hasPointerCapture() { return true; },
    releasePointerCapture() {},
  };
  session.box = {
    contains() { return false; },
    focus() { focused = true; },
  };
  session.smartSelection = (point) => {
    smartCalls += 1;
    assert.deepEqual(point, { x: 310, y: 210 });
    return { x: 280, y: 180, width: 170, height: 90 };
  };
  session.render = () => {};

  const event = {
    button: 0,
    pointerId: 3,
    clientX: 310,
    clientY: 210,
    target: {},
    preventDefault() {},
  };
  session.begin(event);
  session.end(event);

  assert.equal(smartCalls, 1);
  assert.deepEqual(session.selection, { x: 280, y: 180, width: 170, height: 90 });
  assert.equal(focused, true);
});

test("o clique direito limpa a seleção e mantém o seletor pronto para outro clique", () => {
  const session = Object.create(overlay.RavueOverlaySession.prototype);
  let prevented = 0;
  let stopped = 0;
  let focused = 0;
  let rendered = 0;
  session.busy = false;
  session.selection = { x: 30, y: 40, width: 180, height: 120 };
  session.error = "erro anterior";
  session.stage = { focus() { focused += 1; } };
  session.render = () => { rendered += 1; };

  session.clearFromContextMenu({
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; },
  });

  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(session.selection, null);
  assert.equal(session.error, "");
  assert.equal(rendered, 1);
  assert.equal(focused, 1);
  assert.equal(session.closed, undefined);
});

test("o clique direito bloqueia o menu da página sem alterar uma busca em processamento", () => {
  const session = Object.create(overlay.RavueOverlaySession.prototype);
  const selection = { x: 30, y: 40, width: 180, height: 120 };
  let prevented = 0;
  let stopped = 0;
  let focused = 0;
  let rendered = 0;
  session.busy = true;
  session.selection = selection;
  session.stage = { focus() { focused += 1; } };
  session.render = () => { rendered += 1; };

  session.clearFromContextMenu({
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; },
  });

  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(session.selection, selection);
  assert.equal(rendered, 0);
  assert.equal(focused, 0);
});

test("a cópia de análise usa os pixels naturais, limita o tamanho e nunca quebra o seletor", (t) => {
  const previousDocument = global.document;
  t.after(() => { global.document = previousDocument; });
  const draws = [];
  const imageData = { width: 960, height: 540, data: new Uint8ClampedArray(960 * 540 * 4) };
  const context = {
    drawImage(...args) { draws.push(args); },
    getImageData() { return imageData; },
  };
  const canvas = { width: 0, height: 0, getContext() { return context; } };
  global.document = { createElement(type) { assert.equal(type, "canvas"); return canvas; } };
  const session = Object.create(overlay.RavueOverlaySession.prototype);
  session.smart = {};
  session.analysisImageData = null;
  const source = { naturalWidth: 1920, naturalHeight: 1080, width: 480, height: 270 };

  session.prepareAnalysis(source);
  assert.equal(canvas.width, 960);
  assert.equal(canvas.height, 540);
  assert.deepEqual(draws[0], [source, 0, 0, 960, 540]);
  assert.equal(session.analysisImageData, imageData);

  context.getImageData = () => { throw new Error("canvas indisponível"); };
  assert.doesNotThrow(() => session.prepareAnalysis(source));
  assert.equal(session.analysisImageData, null);
});

test("o fallback da captura libera a imagem por evento de carregamento", async () => {
  const listeners = new Map();
  const image = {
    complete: false,
    naturalWidth: 0,
    addEventListener(type, listener) { listeners.set(type, listener); },
    set src(value) {
      this.source = value;
      this.complete = true;
      this.naturalWidth = 1280;
      queueMicrotask(() => listeners.get("load")?.());
    },
  };

  await overlay.loadScreenshotImage(image, "data:image/png;base64,c2NyZWVuc2hvdA==");
  assert.equal(image.source, "data:image/png;base64,c2NyZWVuc2hvdA==");
  assert.equal(image.complete, true);
});

test("o fallback rejeita uma captura que o navegador não consegue decodificar", async () => {
  const listeners = new Map();
  const image = {
    complete: false,
    naturalWidth: 0,
    addEventListener(type, listener) { listeners.set(type, listener); },
    set src(value) {
      this.source = value;
      queueMicrotask(() => listeners.get("error")?.());
    },
  };

  await assert.rejects(
    overlay.loadScreenshotImage(image, "data:image/png;base64,broken"),
    /decoding/i,
  );
});
