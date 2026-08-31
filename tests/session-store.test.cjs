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

test("guarda o recorte somente na sessão e permite consumo único", async (t) => {
  const previousBrowser = global.browser;
  const memory = memoryStorage();
  global.browser = { storage: { session: memory.area } };
  t.after(() => {
    if (previousBrowser === undefined) delete global.browser;
    else global.browser = previousBrowser;
    delete global.RavueSessionStore;
  });

  const store = require("../shared/session-store.js");
  const uploadId = "a".repeat(32);
  const payload = {
    dataUrl: "data:image/jpeg;base64,aW1hZ2U=",
    width: 640,
    height: 480,
    mimeType: "image/jpeg",
  };

  await store.put(uploadId, payload, 1_000);
  const recordKey = `${store.PREFIX}${uploadId}`;
  assert.equal(memory.values[recordKey].createdAt, 1_000);
  assert.equal(memory.values[recordKey].expiresAt, 1_000 + store.TTL_MS);
  assert.deepEqual(await store.take(uploadId, 1_001), payload);
  assert.equal(recordKey in memory.values, false);
  assert.equal(await store.take(uploadId, 1_002), null);
});

test("expira, limpa e rejeita registros inadequados", async (t) => {
  const previousBrowser = global.browser;
  const memory = memoryStorage({ unrelated: { keep: true } });
  global.browser = { storage: { session: memory.area } };
  t.after(() => {
    if (previousBrowser === undefined) delete global.browser;
    else global.browser = previousBrowser;
    delete global.RavueSessionStore;
  });

  delete require.cache[require.resolve("../shared/session-store.js")];
  const store = require("../shared/session-store.js");
  const expiredId = "b".repeat(32);
  const currentId = "c".repeat(32);
  const payload = {
    dataUrl: "data:image/webp;base64,aW1hZ2U=",
    width: 1200,
    height: 1,
    mimeType: "image/webp",
  };

  await store.put(expiredId, payload, 1_000);
  assert.equal(await store.take(expiredId, 1_000 + store.TTL_MS), null);

  await store.put(expiredId, payload, 2_000);
  await store.put(currentId, payload, 10_000);
  assert.equal(await store.cleanup(2_000 + store.TTL_MS), 1);
  assert.equal(`${store.PREFIX}${expiredId}` in memory.values, false);
  assert.equal(`${store.PREFIX}${currentId}` in memory.values, true);
  assert.deepEqual(memory.values.unrelated, { keep: true });

  await assert.rejects(() => store.put("not-an-id", payload), /identifier/i);
  await assert.rejects(() => store.put("d".repeat(32), {
    ...payload,
    width: 1201,
  }), /payload/i);
  assert.equal(store.validPayload({
    ...payload,
    dataUrl: "data:text/plain;base64,dGVzdA==",
  }), false);
});
