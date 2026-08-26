if (!globalThis.__RAVUE_BRIDGE_INSTALLED__) {
  globalThis.__RAVUE_BRIDGE_INSTALLED__ = true;

  if (!globalThis.browser) globalThis.browser = chrome;

  let currentOverlay = null;

  const message = (id, fallback) => browser.i18n.getMessage(id) || fallback;

  function overlayCopy() {
    return {
      title: message("overlayTitle", "Ravue"),
      hint: message("overlayHint", "Drag over what you want to find"),
      privacy: message("overlayPrivacy", "The crop leaves your browser only after confirmation"),
      search: message("overlaySearch", "Search"),
      cancel: message("overlayCancel", "Cancel"),
      reset: message("overlayReset", "Reset"),
      full: message("overlayFull", "Visible page"),
      processing: message("overlayProcessing", "Preparing result…"),
      close: message("overlayClose", "Close Ravue"),
      selection: message("overlaySelection", "Selected area"),
      error: message("overlayError", "This selection could not be processed"),
    };
  }

  function targetRectangle(targetId) {
    if (!Number.isInteger(targetId) || !browser.menus?.getTargetElement) return null;
    const target = browser.menus.getTargetElement(targetId);
    if (!target?.getBoundingClientRect) return null;
    const raw = target.getBoundingClientRect();
    const left = Math.max(0, Math.min(innerWidth, raw.left));
    const top = Math.max(0, Math.min(innerHeight, raw.top));
    const right = Math.max(left, Math.min(innerWidth, raw.right));
    const bottom = Math.max(top, Math.min(innerHeight, raw.bottom));
    if (right - left < 2 || bottom - top < 2) return null;
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function waitForLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
        resolve({ width: innerWidth, height: innerHeight });
      }, 90)));
    });
  }

  browser.runtime.onMessage.addListener((request) => {
    switch (request.type) {
      case "RV_PING":
        return Promise.resolve({ ok: true });
      case "RV_WAIT_LAYOUT":
        return waitForLayout().then((viewport) => ({ ok: true, viewport }));
      case "RV_TARGET_RECT":
        try {
          return Promise.resolve({ ok: true, rect: targetRectangle(request.targetId) });
        } catch (_) {
          return Promise.resolve({ ok: true, rect: null });
        }
      case "RV_CLOSE_OVERLAY":
        currentOverlay?.dispose(false);
        currentOverlay = null;
        return Promise.resolve({ ok: true });
      case "RV_OPEN_OVERLAY": {
        try {
          currentOverlay?.dispose(false);
          const instance = globalThis.RavueOverlay.open({
            screenshot: request.screenshot,
            initialSelection: request.initialSelection,
            copy: overlayCopy(),
            onSubmit: async (selection, viewport) => {
              const result = await browser.runtime.sendMessage({
                type: "RV_SEARCH_CAPTURE",
                captureId: request.captureId,
                selection,
                viewport,
              });
              if (!result?.ok) throw new Error(result?.error || message("overlayError", "Search failed"));
            },
            onCancel: () => browser.runtime.sendMessage({
              type: "RV_CANCEL_CAPTURE",
              captureId: request.captureId,
            }),
            onClose: () => {
              if (currentOverlay === instance) currentOverlay = null;
            },
          });
          currentOverlay = instance;
          return Promise.resolve({ ok: true });
        } catch (error) {
          return Promise.resolve({ ok: false, error: error?.message || String(error) });
        }
      }
      default:
        return undefined;
    }
  });
}
