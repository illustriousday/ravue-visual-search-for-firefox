(function (scope) {
  "use strict";

  const HOST_ATTRIBUTE = "data-ravue-loading-screen";
  const STYLES = `
    :host { all: initial; color-scheme: light dark; }
    *, *::before, *::after { box-sizing: border-box; }
    .screen {
      --bg: #f6f7fb;
      --text: #111827;
      --muted: #5d6c82;
      --accent: #08758e;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      min-width: 320px;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      color: var(--text);
      background: var(--bg);
      font: 500 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
      user-select: none;
    }
    .ambient { position: absolute; width: 320px; height: 320px; border-radius: 50%; filter: blur(90px); opacity: .2; }
    .ambient-one { top: -160px; right: -130px; background: #8b5cf6; }
    .ambient-two { bottom: -170px; left: -140px; background: #22d3ee; }
    .brand { position: absolute; top: 22px; left: 24px; display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 750; letter-spacing: -.35px; }
    .brand svg { width: 38px; height: 38px; filter: drop-shadow(0 9px 20px rgba(34, 211, 238, .18)); }
    main { position: relative; z-index: 1; display: flex; align-items: center; flex-direction: column; padding: 34px; }
    .loader { position: relative; width: 154px; height: 154px; margin-bottom: 30px; }
    .frame, .core, .beam { position: absolute; }
    .frame { border: 1px solid rgba(91, 92, 226, .28); border-radius: 38px; }
    .frame-one { inset: 8px; animation: rv-loading-turn 8s linear infinite; }
    .frame-two { inset: 28px; border-color: rgba(34, 211, 238, .3); border-radius: 50%; animation: rv-loading-turn 5s linear infinite reverse; }
    .core { inset: 52px; border-radius: 16px; background: linear-gradient(145deg, #8b5cf6, #22d3ee); box-shadow: 0 17px 42px rgba(91, 92, 226, .27), inset 0 0 0 7px rgba(255, 255, 255, .14); transform: rotate(45deg); }
    .beam { z-index: 2; top: 28px; left: 27px; width: 100px; height: 2px; border-radius: 10px; background: linear-gradient(90deg, transparent, #67e8f9, #a78bfa, transparent); box-shadow: 0 0 19px #67e8f9; animation: rv-loading-scan 1.45s ease-in-out infinite alternate; }
    .eyebrow { margin: 0 0 9px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: 1.55px; }
    h1 { margin: 0; font-size: clamp(26px, 7vw, 34px); line-height: 1.08; letter-spacing: -1px; }
    .body { max-width: 380px; margin: 15px auto 0; color: var(--muted); font-size: 14px; line-height: 1.65; }
    .hint { margin: 22px 0 0; color: var(--muted); font-size: 11px; }
    @keyframes rv-loading-turn { to { transform: rotate(360deg); } }
    @keyframes rv-loading-scan { to { top: 124px; } }
    @media (prefers-color-scheme: dark) {
      .screen { --bg: #080b16; --text: #f8fafc; --muted: #a8b3c6; --accent: #22d3ee; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
    }
  `;

  let currentHost = null;

  function message(browserApi, id, fallback) {
    return browserApi?.i18n?.getMessage?.(id) || fallback;
  }

  function mount(documentObject = scope.document, browserApi = scope.browser || scope.chrome) {
    const existing = documentObject?.querySelector?.(`[${HOST_ATTRIBUTE}]`);
    if (existing) {
      currentHost = existing;
      return existing;
    }
    if (!documentObject?.documentElement) return null;

    const host = documentObject.createElement("div");
    host.setAttribute(HOST_ATTRIBUTE, "");
    host.style.cssText = "all:initial;position:fixed;inset:0;display:block;width:100vw;height:100vh;z-index:2147483647;background:#f6f7fb";
    const root = host.attachShadow({ mode: "closed" });

    let stylesInstalled = false;
    if (typeof scope.CSSStyleSheet === "function" && "adoptedStyleSheets" in root) {
      try {
        const stylesheet = new scope.CSSStyleSheet();
        stylesheet.replaceSync(STYLES);
        root.adoptedStyleSheets = [stylesheet];
        stylesInstalled = true;
      } catch (_) {}
    }
    if (!stylesInstalled) {
      const style = documentObject.createElement("style");
      style.textContent = STYLES;
      root.appendChild(style);
    }

    const screen = documentObject.createElement("section");
    screen.className = "screen";
    screen.setAttribute("role", "status");
    screen.setAttribute("aria-live", "polite");
    screen.innerHTML = `
      <span class="ambient ambient-one" aria-hidden="true"></span>
      <span class="ambient ambient-two" aria-hidden="true"></span>
      <div class="brand">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <defs>
            <linearGradient id="rv-icon-gradient" x1="18" y1="14" x2="78" y2="82" gradientUnits="userSpaceOnUse">
              <stop stop-color="#8b5cf6"></stop><stop offset=".52" stop-color="#22d3ee"></stop><stop offset="1" stop-color="#a3e635"></stop>
            </linearGradient>
            <radialGradient id="rv-icon-radial" cx="0" cy="0" r="1" gradientTransform="translate(48 44) rotate(90) scale(33)">
              <stop stop-color="#24324a"></stop><stop offset="1" stop-color="#0b1020"></stop>
            </radialGradient>
          </defs>
          <rect x="4" y="4" width="88" height="88" rx="25" fill="url(#rv-icon-radial)"></rect>
          <path d="M31 20h-5a6 6 0 0 0-6 6v5M65 20h5a6 6 0 0 1 6 6v5M20 65v5a6 6 0 0 0 6 6h5M76 65v5a6 6 0 0 1-6 6h-5" fill="none" stroke="url(#rv-icon-gradient)" stroke-width="6" stroke-linecap="round"></path>
          <path d="M28 49c5.6-10 12.3-15 20-15s14.4 5 20 15c-5.6 9.3-12.3 14-20 14s-14.4-4.7-20-14Z" fill="none" stroke="url(#rv-icon-gradient)" stroke-width="5" stroke-linejoin="round"></path>
          <circle cx="48" cy="48.5" r="7.5" fill="#f8fafc"></circle><circle cx="50.5" cy="46" r="2.4" fill="#22d3ee"></circle>
        </svg>
        <strong>Ravue</strong>
      </div>
      <main>
        <div class="loader" aria-hidden="true">
          <span class="frame frame-one"></span><span class="frame frame-two"></span>
          <span class="beam"></span><span class="core"></span>
        </div>
        <p class="eyebrow"></p><h1></h1><p class="body"></p><p class="hint"></p>
      </main>
    `;
    screen.querySelector(".eyebrow").textContent = message(browserApi, "resultEyebrow", "VISUAL SEARCH");
    screen.querySelector("h1").textContent = message(browserApi, "resultTabTitle", "Preparing your search");
    screen.querySelector(".body").textContent = message(browserApi, "resultTabBody", "Sending the image to Google Lens in this tab.");
    screen.querySelector(".hint").textContent = message(browserApi, "resultTabHint", "The page will update automatically in a moment.");
    root.appendChild(screen);
    documentObject.documentElement.appendChild(host);
    currentHost = host;
    return host;
  }

  function remove(documentObject = scope.document) {
    const host = currentHost || documentObject?.querySelector?.(`[${HOST_ATTRIBUTE}]`);
    host?.remove();
    if (host === currentHost) currentHost = null;
    return Boolean(host);
  }

  const api = Object.freeze({ HOST_ATTRIBUTE, mount, remove });
  scope.RavueLoadingScreen = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "undefined" ? this : globalThis);
