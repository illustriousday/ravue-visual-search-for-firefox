const test = require("node:test");
const assert = require("node:assert/strict");
const geometry = require("../content/geometry.js");

test("normaliza uma seleção desenhada em qualquer direção", () => {
  assert.deepEqual(
    geometry.fromPoints({ x: 90, y: 70 }, { x: 10, y: 20 }, { width: 100, height: 80 }),
    { x: 10, y: 20, width: 80, height: 50 },
  );
});

test("limita caixas e movimentos ao viewport", () => {
  assert.deepEqual(
    geometry.fit({ x: 95, y: -4, width: 40, height: 10 }, { width: 120, height: 80 }, 18),
    { x: 80, y: 0, width: 40, height: 18 },
  );
  assert.deepEqual(
    geometry.translate({ x: 20, y: 10, width: 50, height: 40 }, { x: 200, y: -30 }, { width: 120, height: 80 }),
    { x: 70, y: 0, width: 50, height: 40 },
  );
});

test("redimensiona por cada lado sem inverter a seleção", () => {
  const bounds = { width: 200, height: 140 };
  const box = { x: 40, y: 30, width: 80, height: 60 };
  assert.deepEqual(geometry.stretch(box, "nw", { x: -20, y: -10 }, bounds, 18), {
    x: 20, y: 20, width: 100, height: 70,
  });
  assert.deepEqual(geometry.stretch(box, "se", { x: 200, y: 200 }, bounds, 18), {
    x: 40, y: 30, width: 160, height: 110,
  });
  assert.equal(geometry.valid(geometry.stretch(box, "w", { x: 500, y: 0 }, bounds, 18), 18), true);
});

test("converte coordenadas CSS em pixels do bitmap com arredondamento seguro", () => {
  assert.deepEqual(
    geometry.pixels(
      { x: 10.25, y: 5.5, width: 20.25, height: 10.25 },
      { width: 100, height: 50 },
      { width: 200, height: 100 },
    ),
    { x: 20, y: 11, width: 41, height: 21, ratioX: 2, ratioY: 2 },
  );
});

test("rejeita geometrias inválidas", () => {
  assert.equal(geometry.valid(null), false);
  assert.equal(geometry.valid({ x: 0, y: 0, width: 19, height: 30 }, 20), false);
  assert.throws(() => geometry.pixels({ x: 0, y: 0, width: 1, height: 1 }, {}, {}));
});
