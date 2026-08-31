(function (scope) {
  "use strict";

  const number = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function contentBox(rect, style = {}) {
    const left = number(style.borderLeftWidth) + number(style.paddingLeft);
    const right = number(style.borderRightWidth) + number(style.paddingRight);
    const top = number(style.borderTopWidth) + number(style.paddingTop);
    const bottom = number(style.borderBottomWidth) + number(style.paddingBottom);
    return {
      x: number(rect?.x ?? rect?.left) + left,
      y: number(rect?.y ?? rect?.top) + top,
      width: Math.max(0, number(rect?.width) - left - right),
      height: Math.max(0, number(rect?.height) - top - bottom),
    };
  }

  function positionToken(token, freeSpace, axis) {
    const value = String(token || "50%").trim().toLowerCase();
    if (value === "left" || value === "top") return 0;
    if (value === "center") return freeSpace / 2;
    if (value === "right" || value === "bottom") return freeSpace;
    if (value.endsWith("%")) return freeSpace * number(value) / 100;
    if (value.endsWith("px")) return number(value);
    if (axis === "x" && value === "x-start") return 0;
    if (axis === "y" && value === "y-start") return 0;
    return freeSpace / 2;
  }

  function objectPosition(value) {
    const tokens = String(value || "50% 50%").trim().split(/\s+/);
    if (tokens.length === 1) {
      const token = tokens[0];
      if (token === "top" || token === "bottom") return ["50%", token];
      return [token, "50%"];
    }
    return [tokens[0], tokens[1]];
  }

  function intersect(first, second) {
    const left = Math.max(first.x, second.x);
    const top = Math.max(first.y, second.y);
    const right = Math.min(first.x + first.width, second.x + second.width);
    const bottom = Math.min(first.y + first.height, second.y + second.height);
    if (right <= left || bottom <= top) return null;
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function imageContent(rect, natural, style = {}) {
    const box = contentBox(rect, style);
    const naturalWidth = number(natural?.width);
    const naturalHeight = number(natural?.height);
    if (!box.width || !box.height || !naturalWidth || !naturalHeight) return box;

    const fit = String(style.objectFit || "fill").toLowerCase();
    if (fit === "fill" || fit === "cover") return box;

    const containScale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
    let scale = containScale;
    if (fit === "none") scale = 1;
    if (fit === "scale-down") scale = Math.min(1, containScale);
    if (!["contain", "none", "scale-down"].includes(fit)) return box;

    const rendered = {
      width: naturalWidth * scale,
      height: naturalHeight * scale,
    };
    const [positionX, positionY] = objectPosition(style.objectPosition);
    const placed = {
      x: box.x + positionToken(positionX, box.width - rendered.width, "x"),
      y: box.y + positionToken(positionY, box.height - rendered.height, "y"),
      width: rendered.width,
      height: rendered.height,
    };
    return intersect(box, placed) || box;
  }

  function clip(rect, viewport) {
    const bounds = {
      x: 0,
      y: 0,
      width: Math.max(0, number(viewport?.width)),
      height: Math.max(0, number(viewport?.height)),
    };
    return intersect({
      x: number(rect?.x ?? rect?.left),
      y: number(rect?.y ?? rect?.top),
      width: Math.max(0, number(rect?.width)),
      height: Math.max(0, number(rect?.height)),
    }, bounds);
  }

  const api = Object.freeze({ contentBox, imageContent, clip });
  scope.RavueTarget = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "undefined" ? this : globalThis);
