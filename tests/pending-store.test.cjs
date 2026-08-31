const test = require("node:test");
const assert = require("node:assert/strict");

function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    values,
    area: {
      async get(query) {
        if (query === null) return { ...values };
        return query in values ? { [query]: values[query] } : {};
      },
      async set(records) { Object.assign(values, records); },
      async remove(query) {
        for (const key of Array.isArray(query) ? query : [query]) delete values[key];
      },
    },
  };
}

function loadStore(memory) {
  delete require.cache[require.resolve("../shared/pending-store.js")];
  global.browser = { storage: { session: memory.area } };
  return require("../shared/pending-store.js");
}

test("associa o recorte à guia e persiste a fase de envio no background MV3", async (t) => {
  const previousBrowser = global.browser;
  const memory = memoryStorage();
  const store = loadStore(memory);
  t.after(() => {
    if (previousBrowser === undefined) delete global.browser;
    else global.browser = previousBrowser;
    delete global.RavuePendingStore;
  });

  const uploadId = "d".repeat(32);
  await store.put(901, uploadId, 1_000);
  assert.deepEqual(await store.route(901, 1_001), {
    kind: store.KIND_UPLOAD,
    uploadId,
  });
  assert.equal(await store.peek(901, 1_001), uploadId);
  assert.equal("loadingTabId" in memory.values["ravue.pending.901"], false);
  assert.equal(await store.phase(901, 1_001), store.PHASE_PENDING);
  assert.equal(await store.markSubmitting(901, 1_002), true);
  assert.equal(await store.phase(901, 1_003), store.PHASE_SUBMITTING);
  assert.equal(await store.markNavigating(901, 1_004), true);
  assert.equal(await store.phase(901, 1_005), store.PHASE_NAVIGATING);
  assert.equal(await store.peek(901, 1_006), uploadId);
  assert.equal(await store.take(901, 1_007), uploadId);
  assert.equal(await store.peek(901, 1_008), null);
});

test("guarda uma URL pública separadamente e a marca como navegação do Lens", async (t) => {
  const previousBrowser = global.browser;
  const memory = memoryStorage();
  const store = loadStore(memory);
  t.after(() => {
    if (previousBrowser === undefined) delete global.browser;
    else global.browser = previousBrowser;
    delete global.RavuePendingStore;
  });

  const sourceUrl = "https://cdn.example.com/image.webp?token=abc";
  await store.putUrl(910, sourceUrl, 1_000);
  assert.deepEqual(await store.route(910, 1_001), {
    kind: store.KIND_URL,
    sourceUrl,
  });
  assert.equal(await store.peek(910, 1_001), undefined);
  assert.equal(await store.phase(910, 1_001), store.PHASE_PENDING);
  assert.equal(await store.markUrlNavigating(910, 1_002), true);
  assert.equal(await store.phase(910, 1_003), store.PHASE_NAVIGATING);
  assert.equal(await store.markUrlNavigating(910, 1_004), false);
  assert.equal(await store.take(910, 1_005), undefined);
  assert.equal(await store.route(910, 1_006), null);

  await assert.rejects(() => store.putUrl(911, "data:image/png;base64,bad"), /source URL/i);
  await assert.rejects(() => store.putUrl(911, "https://user:pass@example.com/image.png"), /source URL/i);
});

test("mantém preparação e resultado associados à mesma guia", async (t) => {
  const previousBrowser = global.browser;
  const memory = memoryStorage();
  const store = loadStore(memory);
  t.after(() => {
    if (previousBrowser === undefined) delete global.browser;
    else global.browser = previousBrowser;
    delete global.RavuePendingStore;
  });

  const uploadId = "a".repeat(32);
  await store.put(920, uploadId, 2_000);
  assert.deepEqual(Object.keys(memory.values).filter((key) => key.startsWith(store.PREFIX)), [
    "ravue.pending.920",
  ]);
  assert.equal(await store.take(920, 2_001), uploadId);
  assert.equal(await store.peek(920, 2_002), null);
});

test("remove associações expiradas sem tocar em outros registros", async (t) => {
  const previousBrowser = global.browser;
  const memory = memoryStorage({ unrelated: { keep: true } });
  const store = loadStore(memory);
  t.after(() => {
    if (previousBrowser === undefined) delete global.browser;
    else global.browser = previousBrowser;
    delete global.RavuePendingStore;
  });

  const expiredId = "e".repeat(32);
  const currentId = "f".repeat(32);
  await store.put(902, expiredId, 1_000);
  await store.put(903, currentId, 10_000);
  assert.deepEqual(await store.cleanup(1_000 + store.TTL_MS), [expiredId]);
  assert.equal(await store.peek(902, 1_000 + store.TTL_MS), null);
  assert.equal(await store.peek(903, 10_001), currentId);
  assert.deepEqual(memory.values.unrelated, { keep: true });

  await assert.rejects(() => store.put(-1, currentId), /tab/i);
  await assert.rejects(() => store.put(1, "bad-id"), /upload/i);
});
