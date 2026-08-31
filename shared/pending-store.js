(function (scope) {
  "use strict";

  const PREFIX = "ravue.pending.";
  const TTL_MS = 5 * 60 * 1000;
  const PHASE_PENDING = "pending";
  const PHASE_SUBMITTING = "submitting";
  const PHASE_NAVIGATING = "navigating";
  const KIND_UPLOAD = "upload";
  const KIND_URL = "url";

  function area() {
    const storage = scope.browser?.storage?.session;
    if (!storage) throw new Error("Session storage is unavailable");
    return storage;
  }

  function validTabId(tabId) {
    return Number.isInteger(tabId) && tabId >= 0;
  }

  function validUploadId(uploadId) {
    return typeof uploadId === "string" && /^[a-f0-9]{32}$/.test(uploadId);
  }

  function publicHostname(hostname) {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    // This is a conservative syntactic filter, not a DNS/public-access probe.
    // Local/intranet addresses must use the pixel fallback, never URL delivery.
    if (host.startsWith("[")) {
      const address = host.slice(1, -1);
      const first = Number.parseInt(address.split(":")[0], 16);
      return first >= 0x2000 && first <= 0x3fff &&
        !/^2001:(?:0|db8|10|20):/.test(address) && !address.startsWith("2002:");
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b, c] = host.split(".").map(Number);
      return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113));
    }
    return host.includes(".") &&
      !/(?:^|\.)(?:localhost|local|lan|home|internal|intranet|invalid|test|onion|arpa)$/.test(host);
  }

  function validSourceUrl(sourceUrl) {
    if (typeof sourceUrl !== "string" || !sourceUrl || sourceUrl.length > 8192) return false;
    try {
      const url = new URL(sourceUrl);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password &&
        publicHostname(url.hostname);
    } catch (_) {
      return false;
    }
  }

  function key(tabId) {
    if (!validTabId(tabId)) throw new Error("Invalid result tab identifier");
    return `${PREFIX}${tabId}`;
  }

  function validRecord(record, now) {
    const kind = record?.kind || KIND_UPLOAD;
    const validTarget = kind === KIND_UPLOAD
      ? validUploadId(record?.uploadId)
      : kind === KIND_URL && validSourceUrl(record?.sourceUrl);
    return validTarget &&
      Number.isFinite(record?.expiresAt) && record.expiresAt > now &&
      [undefined, PHASE_PENDING, PHASE_SUBMITTING, PHASE_NAVIGATING].includes(record?.phase);
  }

  function recordPhase(record) {
    if (record?.phase === PHASE_SUBMITTING) return PHASE_SUBMITTING;
    if (record?.phase === PHASE_NAVIGATING) return PHASE_NAVIGATING;
    return PHASE_PENDING;
  }

  async function put(tabId, uploadId, now = Date.now()) {
    if (!validUploadId(uploadId)) throw new Error("Invalid upload identifier");
    await area().set({
      [key(tabId)]: {
        kind: KIND_UPLOAD,
        uploadId,
        phase: PHASE_PENDING,
        expiresAt: now + TTL_MS,
      },
    });
  }

  async function putUrl(tabId, sourceUrl, now = Date.now()) {
    if (!validSourceUrl(sourceUrl)) throw new Error("Invalid image source URL");
    await area().set({
      [key(tabId)]: {
        kind: KIND_URL,
        sourceUrl,
        phase: PHASE_PENDING,
        expiresAt: now + TTL_MS,
      },
    });
  }

  async function route(tabId, now = Date.now()) {
    const recordKey = key(tabId);
    const values = await area().get(recordKey);
    const record = values?.[recordKey];
    if (!validRecord(record, now)) {
      if (record) await area().remove(recordKey);
      return null;
    }
    if ((record.kind || KIND_UPLOAD) === KIND_URL) {
      return { kind: KIND_URL, sourceUrl: record.sourceUrl };
    }
    return { kind: KIND_UPLOAD, uploadId: record.uploadId };
  }

  async function peek(tabId, now = Date.now()) {
    const recordKey = key(tabId);
    const values = await area().get(recordKey);
    const record = values?.[recordKey];
    if (validRecord(record, now)) return record.uploadId;
    if (record) await area().remove(recordKey);
    return null;
  }

  async function phase(tabId, now = Date.now()) {
    const recordKey = key(tabId);
    const values = await area().get(recordKey);
    const record = values?.[recordKey];
    if (validRecord(record, now)) return recordPhase(record);
    if (record) await area().remove(recordKey);
    return null;
  }

  async function markSubmitting(tabId, now = Date.now()) {
    const recordKey = key(tabId);
    const values = await area().get(recordKey);
    const record = values?.[recordKey];
    if (!validRecord(record, now)) {
      if (record) await area().remove(recordKey);
      return false;
    }
    await area().set({
      [recordKey]: { ...record, phase: PHASE_SUBMITTING },
    });
    return true;
  }

  async function markNavigating(tabId, now = Date.now()) {
    const recordKey = key(tabId);
    const values = await area().get(recordKey);
    const record = values?.[recordKey];
    if (!validRecord(record, now) || recordPhase(record) !== PHASE_SUBMITTING) {
      if (record && !validRecord(record, now)) await area().remove(recordKey);
      return false;
    }
    await area().set({
      [recordKey]: { ...record, phase: PHASE_NAVIGATING },
    });
    return true;
  }

  async function markUrlNavigating(tabId, now = Date.now()) {
    const recordKey = key(tabId);
    const values = await area().get(recordKey);
    const record = values?.[recordKey];
    if (!validRecord(record, now) || (record.kind || KIND_UPLOAD) !== KIND_URL ||
        recordPhase(record) !== PHASE_PENDING) {
      if (record && !validRecord(record, now)) await area().remove(recordKey);
      return false;
    }
    await area().set({
      [recordKey]: { ...record, phase: PHASE_NAVIGATING },
    });
    return true;
  }

  async function take(tabId, now = Date.now()) {
    const uploadId = await peek(tabId, now);
    await area().remove(key(tabId));
    return uploadId;
  }

  async function remove(tabId) {
    await area().remove(key(tabId));
  }

  async function cleanup(now = Date.now()) {
    const values = await area().get(null);
    const expired = Object.entries(values || {})
      .filter(([recordKey, record]) => recordKey.startsWith(PREFIX) && !validRecord(record, now));
    if (expired.length) await area().remove(expired.map(([recordKey]) => recordKey));
    return expired.map(([, record]) => record?.uploadId).filter(validUploadId);
  }

  const api = Object.freeze({
    PREFIX,
    TTL_MS,
    PHASE_PENDING,
    PHASE_SUBMITTING,
    PHASE_NAVIGATING,
    KIND_UPLOAD,
    KIND_URL,
    validTabId,
    validUploadId,
    validSourceUrl,
    put,
    putUrl,
    route,
    peek,
    phase,
    markSubmitting,
    markNavigating,
    markUrlNavigating,
    take,
    remove,
    cleanup,
  });
  scope.RavuePendingStore = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "undefined" ? this : globalThis);
