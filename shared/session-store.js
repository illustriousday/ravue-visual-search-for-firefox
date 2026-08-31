(function (scope) {
  "use strict";

  const PREFIX = "ravue.upload.";
  const TTL_MS = 5 * 60 * 1000;
  const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024;
  const activeTakes = new Set();
  const MIME_PREFIXES = Object.freeze({
    "image/jpeg": "data:image/jpeg;base64,",
    "image/png": "data:image/png;base64,",
    "image/webp": "data:image/webp;base64,",
  });

  function area() {
    const storage = scope.browser?.storage?.session;
    if (!storage) throw new Error("Session storage is unavailable");
    return storage;
  }

  function validId(uploadId) {
    return typeof uploadId === "string" && /^[a-f0-9]{32}$/.test(uploadId);
  }

  function key(uploadId) {
    if (!validId(uploadId)) throw new Error("Invalid upload identifier");
    return `${PREFIX}${uploadId}`;
  }

  function validDimension(value) {
    return Number.isInteger(value) && value >= 1 && value <= 1200;
  }

  function validPayload(payload) {
    const prefix = MIME_PREFIXES[payload?.mimeType];
    return Boolean(
      prefix &&
      typeof payload.dataUrl === "string" &&
      payload.dataUrl.startsWith(prefix) &&
      payload.dataUrl.length <= MAX_DATA_URL_LENGTH &&
      validDimension(payload.width) &&
      validDimension(payload.height)
    );
  }

  async function put(uploadId, payload, now = Date.now()) {
    if (!validPayload(payload)) throw new Error("Invalid image payload");
    await cleanup(now);
    const record = {
      payload: {
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height,
        mimeType: payload.mimeType,
      },
      createdAt: now,
      expiresAt: now + TTL_MS,
    };
    await area().set({ [key(uploadId)]: record });
  }

  async function take(uploadId, now = Date.now()) {
    const recordKey = key(uploadId);
    // storage.get/remove is not an atomic operation. Claim the identifier before
    // the first await so simultaneous messages cannot receive the same image.
    if (activeTakes.has(recordKey)) return null;
    activeTakes.add(recordKey);
    try {
      const values = await area().get(recordKey);
      await area().remove(recordKey);
      const record = values?.[recordKey];
      if (!record || !Number.isFinite(record.expiresAt) || record.expiresAt <= now ||
          !validPayload(record.payload)) return null;
      return record.payload;
    } finally {
      activeTakes.delete(recordKey);
    }
  }

  async function remove(uploadId) {
    await area().remove(key(uploadId));
  }

  async function cleanup(now = Date.now()) {
    const values = await area().get(null);
    const expired = Object.entries(values || {})
      .filter(([recordKey, record]) => (
        recordKey.startsWith(PREFIX) &&
        (!Number.isFinite(record?.expiresAt) || record.expiresAt <= now)
      ))
      .map(([recordKey]) => recordKey);
    if (expired.length) await area().remove(expired);
    return expired.length;
  }

  const api = Object.freeze({
    PREFIX,
    TTL_MS,
    MAX_DATA_URL_LENGTH,
    validId,
    validPayload,
    put,
    take,
    remove,
    cleanup,
  });
  scope.RavueSessionStore = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "undefined" ? this : globalThis);
