(function (scope) {
  "use strict";

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const between = (value, low, high) => {
    const lower = number(low);
    const upper = Math.max(lower, number(high, lower));
    return Math.max(lower, Math.min(upper, number(value, lower)));
  };

  const area = (bounds) => ({
    width: Math.max(0, number(bounds?.width)),
    height: Math.max(0, number(bounds?.height)),
  });

  function fromPoints(first, second, bounds) {
    const limit = area(bounds);
    const ax = between(first?.x, 0, limit.width);
    const ay = between(first?.y, 0, limit.height);
    const bx = between(second?.x, 0, limit.width);
    const by = between(second?.y, 0, limit.height);
    return {
      x: Math.min(ax, bx),
      y: Math.min(ay, by),
      width: Math.abs(ax - bx),
      height: Math.abs(ay - by),
    };
  }

  function fit(box, bounds, minimum = 20) {
    const limit = area(bounds);
    if (!limit.width || !limit.height) return { x: 0, y: 0, width: 0, height: 0 };

    const minWidth = Math.min(limit.width, Math.max(1, number(minimum, 20)));
    const minHeight = Math.min(limit.height, Math.max(1, number(minimum, 20)));
    const width = between(Math.abs(number(box?.width)), minWidth, limit.width);
    const height = between(Math.abs(number(box?.height)), minHeight, limit.height);
    return {
      x: between(box?.x, 0, limit.width - width),
      y: between(box?.y, 0, limit.height - height),
      width,
      height,
    };
  }

  function translate(box, movement, bounds) {
    const current = fit(box, bounds, 1);
    const limit = area(bounds);
    return {
      x: between(current.x + number(movement?.x), 0, limit.width - current.width),
      y: between(current.y + number(movement?.y), 0, limit.height - current.height),
      width: current.width,
      height: current.height,
    };
  }

  function stretch(box, edge, movement, bounds, minimum = 20) {
    const limit = area(bounds);
    const current = fit(box, limit, minimum);
    const min = Math.max(1, number(minimum, 20));
    const deltaX = number(movement?.x);
    const deltaY = number(movement?.y);
    let left = current.x;
    let right = current.x + current.width;
    let top = current.y;
    let bottom = current.y + current.height;

    if (edge.includes("w")) left = between(left + deltaX, 0, right - Math.min(min, right));
    if (edge.includes("e")) right = between(right + deltaX, left + Math.min(min, limit.width - left), limit.width);
    if (edge.includes("n")) top = between(top + deltaY, 0, bottom - Math.min(min, bottom));
    if (edge.includes("s")) bottom = between(bottom + deltaY, top + Math.min(min, limit.height - top), limit.height);

    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function valid(box, minimum = 20) {
    return Boolean(
      box &&
      [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
      box.width >= minimum &&
      box.height >= minimum
    );
  }

  function pixels(box, viewport, bitmap) {
    const view = area(viewport);
    const image = area(bitmap);
    if (!view.width || !view.height || !image.width || !image.height) {
      throw new Error("Invalid image geometry");
    }

    const selected = fit(box, view, 1);
    const ratioX = image.width / view.width;
    const ratioY = image.height / view.height;
    const x1 = between(Math.floor(selected.x * ratioX), 0, image.width - 1);
    const y1 = between(Math.floor(selected.y * ratioY), 0, image.height - 1);
    const x2 = between(Math.ceil((selected.x + selected.width) * ratioX), x1 + 1, image.width);
    const y2 = between(Math.ceil((selected.y + selected.height) * ratioY), y1 + 1, image.height);
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      ratioX,
      ratioY,
    };
  }

  const api = Object.freeze({ between, fromPoints, fit, translate, stretch, valid, pixels });
  scope.RavueGeometry = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "undefined" ? this : globalThis);
