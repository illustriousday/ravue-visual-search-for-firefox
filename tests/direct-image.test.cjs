const test = require("node:test");
const assert = require("node:assert/strict");

require("../content/target.js");
const direct = require("../content/direct-image.js");

test("extrai todos os pixels naturais da imagem e limita o JPEG a 1200 px", async () => {
  const draws = [];
  const target = {
    tagName: "IMG",
    complete: true,
    naturalWidth: 2400,
    naturalHeight: 4800,
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        fillRect() {},
        drawImage(...values) { draws.push(values); },
      };
    },
    toDataURL() { return "data:image/jpeg;base64,ZnVsbA=="; },
    remove() {},
  };
  const payload = await direct.extractFullImage(target, {
    createElement(name) {
      assert.equal(name, "canvas");
      return canvas;
    },
  });

  assert.deepEqual(direct.outputSize(2400, 4800), { width: 600, height: 1200 });
  assert.deepEqual(payload, {
    dataUrl: "data:image/jpeg;base64,ZnVsbA==",
    width: 600,
    height: 1200,
    mimeType: "image/jpeg",
  });
  assert.equal(canvas.width, 600);
  assert.equal(canvas.height, 1200);
  assert.deepEqual(draws, [[target, 0, 0, 600, 1200]]);
});

test("prepara a captura renderizada sem mover a página quando o canvas é impedido por CORS", async (t) => {
  const previous = {
    browser: global.browser,
    document: global.document,
    innerWidth: global.innerWidth,
    innerHeight: global.innerHeight,
    scrollX: global.scrollX,
    scrollY: global.scrollY,
    devicePixelRatio: global.devicePixelRatio,
    getComputedStyle: global.getComputedStyle,
    setTimeout: global.setTimeout,
    scrollTo: global.scrollTo,
  };
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete global[name];
      else global[name] = value;
    }
  });

  global.innerWidth = 1000;
  global.innerHeight = 500;
  global.scrollX = 0;
  global.scrollY = 400;
  global.devicePixelRatio = 2;
  global.setTimeout = () => 7;
  global.scrollTo = () => { throw new Error("A página não pode ser rolada"); };
  global.getComputedStyle = () => ({
    borderLeftWidth: "0px",
    borderRightWidth: "0px",
    borderTopWidth: "0px",
    borderBottomWidth: "0px",
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    objectFit: "fill",
    objectPosition: "50% 50%",
  });

  const target = {
    tagName: "IMG",
    complete: true,
    naturalWidth: 1000,
    naturalHeight: 2000,
    getBoundingClientRect() {
      return { left: 20, top: 30, right: 120, bottom: 2030, width: 100, height: 2000 };
    },
  };
  global.browser = {
    menus: {
      getTargetElement(targetElementId) { return targetElementId === 123 ? target : null; },
    },
  };
  global.document = {
    baseURI: "https://example.com/page",
    images: [target],
    createElement() {
      return {
        getContext() {
          return { fillRect() {}, drawImage() {} };
        },
        toDataURL() { throw new Error("Tainted canvas"); },
        remove() {},
      };
    },
  };

  const started = await direct.begin({ targetElementId: 123 });
  assert.equal(started.ok, true);
  assert.equal("payload" in started, false);
  assert.deepEqual(started.plan.documentRect, { x: 20, y: 430, width: 100, height: 2000 });
  assert.deepEqual(started.plan.viewport, { width: 1000, height: 500 });
  assert.equal(started.plan.deviceScale, 2);
  assert.equal(global.scrollY, 400);
});
