(function (scope) {
  "use strict";

  const MAX_OUTPUT_EDGE = 1200;

  function menuApi() {
    return scope.browser?.menus ||
      scope.browser?.contextMenus ||
      scope.chrome?.contextMenus ||
      null;
  }

  function absolute(value, documentObject = scope.document) {
    if (typeof value !== "string" || !value) return "";
    try {
      return new URL(value, documentObject?.baseURI).href;
    } catch (_) {
      return value;
    }
  }

  function locateTarget(targetElementId, expectedSource, documentObject = scope.document) {
    let target = Number.isInteger(targetElementId) && menuApi()?.getTargetElement
      ? menuApi().getTargetElement(targetElementId)
      : null;
    if (target?.getBoundingClientRect) return target;

    const expected = absolute(expectedSource, documentObject);
    if (!expected) return null;
    const candidates = [...(documentObject?.images || [])]
      .filter((image) => [image.currentSrc, image.src, image.getAttribute?.("src")]
        .some((value) => absolute(value, documentObject) === expected))
      .map((image) => {
        const rect = image.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(rect.right, scope.innerWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, scope.innerHeight) - Math.max(rect.top, 0));
        return {
          image,
          visibleArea: visibleWidth * visibleHeight,
          naturalArea: Math.max(0, Number(image.naturalWidth)) * Math.max(0, Number(image.naturalHeight)),
        };
      })
      .sort((first, second) => (
        second.visibleArea - first.visibleArea || second.naturalArea - first.naturalArea
      ));
    return candidates[0]?.image || null;
  }

  async function waitForImage(target) {
    if (target?.tagName !== "IMG" || (target.complete && target.naturalWidth > 0)) return;
    const ready = typeof target?.decode === "function"
      ? target.decode().catch(() => {})
      : new Promise((resolve) => {
        target?.addEventListener?.("load", resolve, { once: true });
        target?.addEventListener?.("error", resolve, { once: true });
      });
    await Promise.race([
      ready,
      new Promise((resolve) => scope.setTimeout(resolve, 1500)),
    ]);
  }

  function computedStyle(target) {
    const style = scope.getComputedStyle(target);
    return {
      borderLeftWidth: style.borderLeftWidth,
      borderRightWidth: style.borderRightWidth,
      borderTopWidth: style.borderTopWidth,
      borderBottomWidth: style.borderBottomWidth,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
    };
  }

  function renderedRect(target) {
    const raw = target.getBoundingClientRect();
    const rect = { x: raw.left, y: raw.top, width: raw.width, height: raw.height };
    if (target.tagName !== "IMG" || !scope.RavueTarget) return rect;
    return scope.RavueTarget.imageContent(rect, {
      width: Number(target.naturalWidth) || raw.width,
      height: Number(target.naturalHeight) || raw.height,
    }, computedStyle(target));
  }

  function descriptor(target) {
    const rect = renderedRect(target);
    const scrollX = Number(scope.scrollX ?? scope.pageXOffset) || 0;
    const scrollY = Number(scope.scrollY ?? scope.pageYOffset) || 0;
    return {
      rect,
      documentRect: {
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height,
      },
      viewport: {
        width: Math.max(1, Number(scope.innerWidth) || 1),
        height: Math.max(1, Number(scope.innerHeight) || 1),
      },
      deviceScale: Math.max(0.1, Math.min(8, Number(scope.devicePixelRatio) || 1)),
    };
  }

  function outputSize(width, height) {
    const sourceWidth = Number(width);
    const sourceHeight = Number(height);
    if (!(sourceWidth > 0 && sourceHeight > 0)) return null;
    const scale = Math.min(1, MAX_OUTPUT_EDGE / sourceWidth, MAX_OUTPUT_EDGE / sourceHeight);
    return {
      width: Math.max(1, Math.round(sourceWidth * scale)),
      height: Math.max(1, Math.round(sourceHeight * scale)),
    };
  }

  async function extractFullImage(target, documentObject = scope.document) {
    if (target?.tagName !== "IMG") return null;
    await waitForImage(target);
    const size = outputSize(target.naturalWidth, target.naturalHeight);
    if (!size) return null;

    const canvas = documentObject.createElement("canvas");
    try {
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return null;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
      context.drawImage(target, 0, 0, size.width, size.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,")) return null;
      return { dataUrl, ...size, mimeType: "image/jpeg" };
    } catch (_) {
      return null;
    } finally {
      canvas.remove?.();
    }
  }

  async function begin(request) {
    const target = locateTarget(request?.targetElementId, request?.srcUrl);
    if (!target?.getBoundingClientRect) return { ok: false };
    await waitForImage(target);

    const payload = await extractFullImage(target);
    if (payload) return { ok: true, payload };

    const plan = descriptor(target);
    if (!(plan.rect.width > 0 && plan.rect.height > 0)) return { ok: false };
    return { ok: true, plan };
  }

  const api = Object.freeze({
    MAX_OUTPUT_EDGE,
    absolute,
    locateTarget,
    renderedRect,
    descriptor,
    outputSize,
    extractFullImage,
    begin,
  });
  scope.RavueDirectImage = api;
  if (typeof module === "object" && module.exports) module.exports = api;

  if (!scope.__RAVUE_DIRECT_IMAGE_INSTALLED__ && scope.document && (scope.browser || scope.chrome)) {
    scope.__RAVUE_DIRECT_IMAGE_INSTALLED__ = true;
    const browserApi = scope.browser || scope.chrome;
    browserApi.runtime.onMessage.addListener((request) => {
      if (request.type === "RV_DIRECT_IMAGE_BEGIN") return begin(request);
      return undefined;
    });
  }
})(typeof globalThis === "undefined" ? this : globalThis);
