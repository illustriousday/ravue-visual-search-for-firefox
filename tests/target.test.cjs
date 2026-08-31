const test = require("node:test");
const assert = require("node:assert/strict");
const target = require("../content/target.js");

test("localiza somente o conteúdo renderizado por object-fit contain", () => {
  assert.deepEqual(
    target.imageContent(
      { x: 10, y: 20, width: 200, height: 200 },
      { width: 400, height: 200 },
      { objectFit: "contain", objectPosition: "50% 50%" },
    ),
    { x: 10, y: 70, width: 200, height: 100 },
  );

  assert.deepEqual(
    target.imageContent(
      { x: 0, y: 0, width: 300, height: 100 },
      { width: 100, height: 100 },
      { objectFit: "contain", objectPosition: "right top" },
    ),
    { x: 200, y: 0, width: 100, height: 100 },
  );
});

test("considera bordas, padding, scale-down, none e cover", () => {
  assert.deepEqual(
    target.contentBox(
      { x: 10, y: 20, width: 120, height: 90 },
      {
        borderLeftWidth: "2px",
        borderRightWidth: "3px",
        borderTopWidth: "4px",
        borderBottomWidth: "5px",
        paddingLeft: "8px",
        paddingRight: "7px",
        paddingTop: "6px",
        paddingBottom: "10px",
      },
    ),
    { x: 20, y: 30, width: 100, height: 65 },
  );

  assert.deepEqual(
    target.imageContent(
      { x: 0, y: 0, width: 100, height: 100 },
      { width: 50, height: 50 },
      { objectFit: "scale-down", objectPosition: "center" },
    ),
    { x: 25, y: 25, width: 50, height: 50 },
  );

  assert.deepEqual(
    target.imageContent(
      { x: 0, y: 0, width: 100, height: 100 },
      { width: 40, height: 20 },
      { objectFit: "none", objectPosition: "right bottom" },
    ),
    { x: 60, y: 80, width: 40, height: 20 },
  );

  assert.deepEqual(
    target.imageContent(
      { x: 5, y: 6, width: 100, height: 60 },
      { width: 20, height: 200 },
      { objectFit: "cover", objectPosition: "left top" },
    ),
    { x: 5, y: 6, width: 100, height: 60 },
  );
});

test("recorta alvos parcialmente fora da área visível", () => {
  assert.deepEqual(
    target.clip(
      { x: -20, y: 80, width: 100, height: 50 },
      { width: 120, height: 100 },
    ),
    { x: 0, y: 80, width: 80, height: 20 },
  );
  assert.equal(
    target.clip(
      { x: 200, y: 200, width: 10, height: 10 },
      { width: 120, height: 100 },
    ),
    null,
  );
});
