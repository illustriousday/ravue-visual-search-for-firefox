const test = require("node:test");
const assert = require("node:assert/strict");

test("mantém a cobertura no Lens e a remove somente após o documento pronto", async (t) => {
  const previous = {
    browser: global.browser,
    document: global.document,
    loading: global.RavueLoadingScreen,
  };
  const messages = [];
  const listeners = [];
  let mounts = 0;
  let removals = 0;

  global.document = { readyState: "complete" };
  global.RavueLoadingScreen = {
    mount() { mounts += 1; },
    remove() { removals += 1; },
  };
  global.browser = {
    runtime: {
      onMessage: { addListener(listener) { listeners.push(listener); } },
      async sendMessage(message) {
        messages.push(message);
        if (message.type === "RV_LENS_RESULT_PROBE") return { pending: true };
        if (message.type === "RV_LENS_DOCUMENT_READY") return { ok: true };
        return { ok: false };
      },
    },
  };

  delete global.__RAVUE_LENS_READY_INSTALLED__;
  delete require.cache[require.resolve("../content/lens-ready.js")];
  require("../content/lens-ready.js");
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(messages.map(({ type }) => type), [
    "RV_LENS_RESULT_PROBE",
    "RV_LENS_DOCUMENT_READY",
  ]);
  assert.equal(mounts, 1);
  assert.equal(removals, 1);
  assert.equal(listeners.length, 1);
  assert.deepEqual(await listeners[0]({ type: "RV_REVEAL_LENS" }), { ok: true });
  assert.equal(removals, 2);

  t.after(() => {
    if (previous.browser === undefined) delete global.browser;
    else global.browser = previous.browser;
    if (previous.document === undefined) delete global.document;
    else global.document = previous.document;
    if (previous.loading === undefined) delete global.RavueLoadingScreen;
    else global.RavueLoadingScreen = previous.loading;
    delete global.__RAVUE_LENS_READY_INSTALLED__;
  });
});
