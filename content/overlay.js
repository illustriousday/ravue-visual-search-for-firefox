(function (scope) {
  "use strict";

  const EDGES = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  const MINIMUM = 24;

  class RavueOverlaySession {
    constructor(config) {
      if (!scope.RavueGeometry) throw new Error("Ravue geometry is not ready");
      if (!config?.screenshot) throw new Error("Ravue requires a screenshot");

      this.geometry = scope.RavueGeometry;
      this.config = config;
      this.copy = config.copy || {};
      this.selection = null;
      this.gesture = null;
      this.busy = false;
      this.closed = false;
      this.error = "";
      this.previousFocus = document.activeElement;
      this.mount();
    }

    label(key, fallback) {
      return this.copy[key] || fallback;
    }

    mount() {
      this.host = document.createElement("div");
      this.host.style.cssText = "all:initial;position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:2147483647;contain:strict";
      this.root = this.host.attachShadow({ mode: "closed" });

      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = browser.runtime.getURL("ui/overlay.css");
      this.root.appendChild(stylesheet);

      this.shell = document.createElement("section");
      this.shell.className = "rv-shell";
      this.shell.style.cssText = "position:fixed;inset:0;width:100%;height:100%;overflow:hidden";
      this.shell.setAttribute("role", "dialog");
      this.shell.setAttribute("aria-modal", "true");
      this.shell.setAttribute("aria-label", this.label("title", "Ravue"));
      this.shell.innerHTML = `
        <img class="rv-shot" alt="">
        <div class="rv-shade"></div>
        <div class="rv-stage" tabindex="-1">
          <div class="rv-selection" tabindex="0" role="img" hidden></div>
        </div>
        <div class="rv-topbar">
          <div class="rv-brand"><span class="rv-mark" aria-hidden="true"></span><span data-copy="title"></span></div>
          <div class="rv-note" data-copy="privacy"></div>
          <button class="rv-close" type="button" data-command="close"><span aria-hidden="true">×</span></button>
        </div>
        <div class="rv-message" data-copy="hint"></div>
        <div class="rv-error" role="alert" aria-live="assertive"></div>
        <div class="rv-dock" role="toolbar">
          <button class="rv-button" type="button" data-command="cancel"></button>
          <button class="rv-button" type="button" data-command="reset"></button>
          <button class="rv-button" type="button" data-command="full"></button>
          <button class="rv-button" type="button" data-command="search" data-primary="true"></button>
        </div>
      `;
      this.root.appendChild(this.shell);
      document.documentElement.appendChild(this.host);

      this.shot = this.root.querySelector(".rv-shot");
      this.shade = this.root.querySelector(".rv-shade");
      this.stage = this.root.querySelector(".rv-stage");
      this.box = this.root.querySelector(".rv-selection");
      this.message = this.root.querySelector(".rv-message");
      this.errorBox = this.root.querySelector(".rv-error");
      this.closeButton = this.root.querySelector('[data-command="close"]');
      this.cancelButton = this.root.querySelector('[data-command="cancel"]');
      this.resetButton = this.root.querySelector('[data-command="reset"]');
      this.fullButton = this.root.querySelector('[data-command="full"]');
      this.searchButton = this.root.querySelector('[data-command="search"]');
      this.stage.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none";

      this.shot.src = this.config.screenshot;
      this.root.querySelector('[data-copy="title"]').textContent = this.label("title", "Ravue");
      this.root.querySelector('[data-copy="privacy"]').textContent = this.label("privacy", "Nothing is sent until you confirm");
      this.root.querySelector('[data-copy="hint"]').textContent = this.label("hint", "Drag over what you want to find");
      this.cancelButton.textContent = this.label("cancel", "Cancel");
      this.resetButton.textContent = this.label("reset", "Reset");
      this.fullButton.textContent = this.label("full", "Visible page");
      this.searchButton.textContent = this.label("search", "Search");
      this.closeButton.setAttribute("aria-label", this.label("close", "Close Ravue"));
      this.box.setAttribute("aria-label", this.label("selection", "Selected area"));

      for (const edge of EDGES) {
        const grip = document.createElement("span");
        grip.className = "rv-grip";
        grip.dataset.edge = edge;
        grip.setAttribute("aria-hidden", "true");
        this.box.appendChild(grip);
      }

      this.handlers = {
        pointerDown: (event) => this.begin(event),
        pointerMove: (event) => this.move(event),
        pointerEnd: (event) => this.end(event),
        keyDown: (event) => this.key(event),
        resize: () => this.resize(),
        stopScroll: (event) => event.preventDefault(),
      };

      this.stage.addEventListener("pointerdown", this.handlers.pointerDown);
      this.stage.addEventListener("pointermove", this.handlers.pointerMove);
      this.stage.addEventListener("pointerup", this.handlers.pointerEnd);
      this.stage.addEventListener("pointercancel", this.handlers.pointerEnd);
      this.stage.addEventListener("contextmenu", this.handlers.stopScroll);
      window.addEventListener("wheel", this.handlers.stopScroll, { capture: true, passive: false });
      window.addEventListener("touchmove", this.handlers.stopScroll, { capture: true, passive: false });
      window.addEventListener("keydown", this.handlers.keyDown, true);
      window.addEventListener("resize", this.handlers.resize);

      this.closeButton.addEventListener("click", () => this.cancel());
      this.cancelButton.addEventListener("click", () => this.cancel());
      this.resetButton.addEventListener("click", () => this.clear());
      this.fullButton.addEventListener("click", () => this.selectAll());
      this.searchButton.addEventListener("click", () => this.submit());

      if (this.config.initialSelection) {
        this.selection = this.geometry.fit(this.config.initialSelection, this.bounds(), MINIMUM);
      }
      this.render();
      this.closeButton.focus({ preventScroll: true });
    }

    bounds() {
      const rect = this.stage.getBoundingClientRect();
      return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    }

    pointer(event) {
      const frame = this.stage.getBoundingClientRect();
      return {
        x: this.geometry.between(event.clientX - frame.left, 0, frame.width),
        y: this.geometry.between(event.clientY - frame.top, 0, frame.height),
      };
    }

    render() {
      if (this.closed) return;
      const visible = Boolean(this.selection && this.selection.width > 0 && this.selection.height > 0);
      const usable = this.geometry.valid(this.selection, MINIMUM);
      this.box.hidden = !visible;
      this.message.hidden = visible;
      this.shade.dataset.clear = String(visible);
      this.shell.dataset.busy = String(this.busy);
      this.resetButton.disabled = !visible || this.busy;
      this.fullButton.disabled = this.busy;
      this.cancelButton.disabled = this.busy;
      this.closeButton.disabled = this.busy;
      this.searchButton.disabled = !usable || this.busy;
      this.searchButton.textContent = this.busy
        ? this.label("processing", "Preparing result…")
        : this.label("search", "Search");

      if (visible) {
        Object.assign(this.box.style, {
          left: `${this.selection.x}px`,
          top: `${this.selection.y}px`,
          width: `${this.selection.width}px`,
          height: `${this.selection.height}px`,
        });
      }
      this.errorBox.textContent = this.error;
      this.errorBox.dataset.show = String(Boolean(this.error));
    }

    begin(event) {
      if (this.busy || event.button !== 0) return;
      const origin = this.pointer(event);
      const grip = event.target.closest?.("[data-edge]");
      let type = "draw";
      let edge = "";
      if (grip && this.selection) {
        type = "stretch";
        edge = grip.dataset.edge;
      } else if (this.selection && this.box.contains(event.target)) {
        type = "translate";
      }

      this.gesture = {
        id: event.pointerId,
        type,
        edge,
        origin,
        startingBox: this.selection ? { ...this.selection } : null,
        travelled: false,
      };
      if (type === "draw") this.selection = { x: origin.x, y: origin.y, width: 0, height: 0 };
      this.error = "";
      this.stage.setPointerCapture(event.pointerId);
      this.render();
      event.preventDefault();
    }

    move(event) {
      if (!this.gesture || this.gesture.id !== event.pointerId || this.busy) return;
      const point = this.pointer(event);
      const movement = { x: point.x - this.gesture.origin.x, y: point.y - this.gesture.origin.y };
      if (Math.hypot(movement.x, movement.y) >= 3) this.gesture.travelled = true;

      if (this.gesture.type === "draw") {
        this.selection = this.geometry.fromPoints(this.gesture.origin, point, this.bounds());
      } else if (this.gesture.type === "translate") {
        this.selection = this.geometry.translate(this.gesture.startingBox, movement, this.bounds());
      } else {
        this.selection = this.geometry.stretch(this.gesture.startingBox, this.gesture.edge, movement, this.bounds(), MINIMUM);
      }
      this.render();
      event.preventDefault();
    }

    end(event) {
      if (!this.gesture || this.gesture.id !== event.pointerId) return;
      const gesture = this.gesture;
      this.gesture = null;
      if (this.stage.hasPointerCapture(event.pointerId)) this.stage.releasePointerCapture(event.pointerId);

      if (gesture.type === "draw" && (!gesture.travelled || !this.geometry.valid(this.selection, MINIMUM))) {
        this.selection = null;
      } else if (this.selection) {
        this.selection = this.geometry.fit(this.selection, this.bounds(), MINIMUM);
        this.box.focus({ preventScroll: true });
      }
      this.render();
      event.preventDefault();
    }

    clear() {
      if (this.busy) return;
      this.selection = null;
      this.error = "";
      this.render();
    }

    selectAll() {
      if (this.busy) return;
      const bounds = this.bounds();
      this.selection = { x: 0, y: 0, width: bounds.width, height: bounds.height };
      this.error = "";
      this.render();
      this.box.focus({ preventScroll: true });
    }

    async submit() {
      if (this.busy || !this.geometry.valid(this.selection, MINIMUM)) return;
      this.busy = true;
      this.error = "";
      this.render();
      try {
        await this.config.onSubmit?.({ ...this.selection }, this.bounds());
        this.dispose(false);
      } catch (error) {
        this.busy = false;
        this.error = error?.message || this.label("error", "This selection could not be processed");
        this.render();
      }
    }

    cancel() {
      if (this.busy) return;
      this.dispose(true);
    }

    key(event) {
      if (this.closed) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.cancel();
        return;
      }
      if (event.key === "Enter" && this.geometry.valid(this.selection, MINIMUM)) {
        event.preventDefault();
        event.stopPropagation();
        this.submit();
        return;
      }
      if (event.key === "Tab") {
        const controls = [this.closeButton, this.cancelButton, this.resetButton, this.fullButton, this.searchButton, this.box]
          .filter((element) => !element.disabled && !element.hidden);
        const current = controls.indexOf(this.root.activeElement);
        const shift = event.shiftKey ? -1 : 1;
        const next = current < 0
          ? (event.shiftKey ? controls.length - 1 : 0)
          : (current + shift + controls.length) % controls.length;
        controls[next]?.focus({ preventScroll: true });
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const directions = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] };
      if (!this.selection || !directions[event.key]) return;
      const multiplier = event.shiftKey ? 10 : 1;
      this.selection = this.geometry.translate(this.selection, {
        x: directions[event.key][0] * multiplier,
        y: directions[event.key][1] * multiplier,
      }, this.bounds());
      this.render();
      event.preventDefault();
      event.stopPropagation();
    }

    resize() {
      if (this.selection && !this.closed) {
        this.selection = this.geometry.fit(this.selection, this.bounds(), MINIMUM);
        this.render();
      }
    }

    dispose(notify) {
      if (this.closed) return;
      this.closed = true;
      window.removeEventListener("wheel", this.handlers.stopScroll, true);
      window.removeEventListener("touchmove", this.handlers.stopScroll, true);
      window.removeEventListener("keydown", this.handlers.keyDown, true);
      window.removeEventListener("resize", this.handlers.resize);
      this.host.remove();
      if (notify) Promise.resolve(this.config.onCancel?.()).catch(() => {});
      if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
      this.config.onClose?.();
    }
  }

  scope.RavueOverlay = Object.freeze({
    open: (config) => new RavueOverlaySession(config),
  });
})(typeof globalThis === "undefined" ? this : globalThis);
