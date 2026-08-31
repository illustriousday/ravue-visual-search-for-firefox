(function (scope) {
  "use strict";

  const MINIMUM_SIDE = 24;
  const MAX_VISUAL_COVERAGE = 0.86;
  const MAX_ACCEPTED_COVERAGE = 0.78;
  const REGION_TOLERANCE = 54;
  const EDGE_THRESHOLD = 48;

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const between = (value, low, high) => (
    Math.max(low, Math.min(high, number(value, low)))
  );

  function normalizeRect(rect) {
    return {
      x: number(rect?.x ?? rect?.left),
      y: number(rect?.y ?? rect?.top),
      width: Math.max(0, number(rect?.width)),
      height: Math.max(0, number(rect?.height)),
    };
  }

  function intersect(first, second) {
    const a = normalizeRect(first);
    const b = normalizeRect(second);
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    if (right <= left || bottom <= top) return null;
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function viewportRect(viewport) {
    return {
      x: 0,
      y: 0,
      width: Math.max(0, number(viewport?.width)),
      height: Math.max(0, number(viewport?.height)),
    };
  }

  function validImageData(imageData) {
    return Boolean(
      imageData &&
      Number.isInteger(imageData.width) && imageData.width > 0 &&
      Number.isInteger(imageData.height) && imageData.height > 0 &&
      imageData.data && imageData.data.length === imageData.width * imageData.height * 4
    );
  }

  function pixel(data, index) {
    const offset = index * 4;
    return [data[offset], data[offset + 1], data[offset + 2]];
  }

  function colorDistance(first, second) {
    const red = Math.abs(first[0] - second[0]);
    const green = Math.abs(first[1] - second[1]);
    const blue = Math.abs(first[2] - second[2]);
    return Math.max(red, green, blue) + (red + green + blue) / 6;
  }

  function pixelDifference(data, firstIndex, secondIndex) {
    return colorDistance(pixel(data, firstIndex), pixel(data, secondIndex));
  }

  function gradientAt(imageData, x, y) {
    const { width, height, data } = imageData;
    const left = Math.max(0, x - 1);
    const right = Math.min(width - 1, x + 1);
    const top = Math.max(0, y - 1);
    const bottom = Math.min(height - 1, y + 1);
    const horizontal = pixelDifference(data, y * width + left, y * width + right);
    const vertical = pixelDifference(data, top * width + x, bottom * width + x);
    return Math.max(horizontal, vertical);
  }

  function analysisRect(rect, viewport, imageData) {
    const clipped = intersect(rect || viewportRect(viewport), viewportRect(viewport));
    if (!clipped || !validImageData(imageData)) return null;
    const ratioX = imageData.width / viewport.width;
    const ratioY = imageData.height / viewport.height;
    const left = between(Math.floor(clipped.x * ratioX), 0, imageData.width - 1);
    const top = between(Math.floor(clipped.y * ratioY), 0, imageData.height - 1);
    const right = between(Math.ceil((clipped.x + clipped.width) * ratioX), left + 1, imageData.width);
    const bottom = between(Math.ceil((clipped.y + clipped.height) * ratioY), top + 1, imageData.height);
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      ratioX,
      ratioY,
    };
  }

  function analysisPoint(point, limit, imageData, viewport) {
    return {
      x: between(Math.round(number(point?.x) * imageData.width / viewport.width), limit.left, limit.right - 1),
      y: between(Math.round(number(point?.y) * imageData.height / viewport.height), limit.top, limit.bottom - 1),
    };
  }

  function cssRect(candidate, limit, viewport, imageData, padding = 5) {
    const ratioX = viewport.width / imageData.width;
    const ratioY = viewport.height / imageData.height;
    const padded = {
      x: candidate.left * ratioX - padding,
      y: candidate.top * ratioY - padding,
      width: (candidate.right - candidate.left) * ratioX + padding * 2,
      height: (candidate.bottom - candidate.top) * ratioY + padding * 2,
    };
    const allowed = {
      x: limit.left * ratioX,
      y: limit.top * ratioY,
      width: limit.width * ratioX,
      height: limit.height * ratioY,
    };
    return intersect(padded, allowed);
  }

  function seedNearPoint(imageData, point, limit) {
    const radius = Math.max(3, Math.min(9, Math.round(Math.min(limit.width, limit.height) / 30)));
    const buckets = new Map();
    let fallback = { x: point.x, y: point.y, gradient: Infinity };

    for (let y = Math.max(limit.top, point.y - radius); y <= Math.min(limit.bottom - 1, point.y + radius); y += 1) {
      for (let x = Math.max(limit.left, point.x - radius); x <= Math.min(limit.right - 1, point.x + radius); x += 1) {
        const gradient = gradientAt(imageData, x, y);
        if (gradient < fallback.gradient) fallback = { x, y, gradient };
        if (gradient > EDGE_THRESHOLD * 1.6) continue;
        const value = pixel(imageData.data, y * imageData.width + x);
        const key = `${value[0] >> 4}:${value[1] >> 4}:${value[2] >> 4}`;
        const distance = Math.hypot(x - point.x, y - point.y);
        const current = buckets.get(key) || { count: 0, best: null };
        current.count += 1;
        if (!current.best || gradient + distance < current.best.rank) {
          current.best = { x, y, rank: gradient + distance };
        }
        buckets.set(key, current);
      }
    }

    const dominant = [...buckets.values()].sort((first, second) => (
      second.count - first.count || first.best.rank - second.best.rank
    ))[0];
    return dominant?.best || fallback;
  }

  function regionCandidate(imageData, point, limit) {
    const { width, data } = imageData;
    const seed = seedNearPoint(imageData, point, limit);
    const seedColor = pixel(data, seed.y * width + seed.x);
    const maximum = limit.width * limit.height;
    const visited = new Uint8Array(imageData.width * imageData.height);
    const queue = new Int32Array(maximum);
    let head = 0;
    let tail = 0;
    let count = 0;
    let boundaryCount = 0;
    let boundaryContrast = 0;
    let boundaryGradient = 0;
    let left = seed.x;
    let right = seed.x;
    let top = seed.y;
    let bottom = seed.y;

    const enqueue = (x, y) => {
      const index = y * width + x;
      if (visited[index]) return;
      visited[index] = 1;
      const difference = colorDistance(seedColor, pixel(data, index));
      const gradient = gradientAt(imageData, x, y);
      if (difference > REGION_TOLERANCE || gradient > EDGE_THRESHOLD * 2.2) {
        boundaryCount += 1;
        boundaryContrast += Math.max(difference, gradient);
        boundaryGradient += gradient;
        return;
      }
      queue[tail] = index;
      tail += 1;
    };

    enqueue(seed.x, seed.y);
    while (head < tail && count <= maximum * MAX_VISUAL_COVERAGE) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      if (x > limit.left) enqueue(x - 1, y);
      if (x + 1 < limit.right) enqueue(x + 1, y);
      if (y > limit.top) enqueue(x, y - 1);
      if (y + 1 < limit.bottom) enqueue(x, y + 1);
    }

    const boxWidth = right - left + 1;
    const boxHeight = bottom - top + 1;
    const boxArea = boxWidth * boxHeight;
    const coverage = boxArea / maximum;
    const fill = count / Math.max(1, boxArea);
    const touches = Number(left <= limit.left + 1) + Number(right >= limit.right - 2) +
      Number(top <= limit.top + 1) + Number(bottom >= limit.bottom - 2);
    const contrast = boundaryContrast / Math.max(1, boundaryCount);
    const enclosure = boundaryGradient / Math.max(1, boundaryCount);

    if (count < 48 || boxWidth < 6 || boxHeight < 6 || coverage >= MAX_VISUAL_COVERAGE) return null;
    if (fill < 0.34 || contrast < REGION_TOLERANCE * 0.55 || enclosure < EDGE_THRESHOLD * 0.34) return null;
    if (touches >= 2 || (touches === 1 && coverage > 0.56)) return null;

    return {
      left,
      top,
      right: right + 1,
      bottom: bottom + 1,
      score: Math.min(1, fill * 0.5 + Math.min(1, contrast / 120) * 0.3 + Math.min(1, enclosure / 100) * 0.2),
      kind: "region",
      coverage,
      fill,
      enclosure,
    };
  }

  function toneCandidate(imageData, point, limit, scale = 1) {
    const { width, data } = imageData;
    const total = imageData.width * imageData.height;
    const seedRadius = 10;
    const buckets = new Map();

    for (let y = Math.max(limit.top, point.y - seedRadius); y <= Math.min(limit.bottom - 1, point.y + seedRadius); y += 1) {
      for (let x = Math.max(limit.left, point.x - seedRadius); x <= Math.min(limit.right - 1, point.x + seedRadius); x += 1) {
        const gradient = gradientAt(imageData, x, y);
        if (gradient < EDGE_THRESHOLD * 0.65) continue;
        const value = pixel(data, y * width + x);
        const key = `${value[0] >> 5}:${value[1] >> 5}:${value[2] >> 5}`;
        const distance = Math.hypot(x - point.x, y - point.y);
        const current = buckets.get(key) || { count: 0, seed: null };
        current.count += 1;
        if (!current.seed || distance < current.seed.distance) current.seed = { x, y, value, distance };
        buckets.set(key, current);
      }
    }

    const bucket = [...buckets.values()]
      .filter((candidate) => candidate.count >= 4)
      .sort((first, second) => second.count - first.count || first.seed.distance - second.seed.distance)[0];
    if (!bucket) return null;

    const seedColor = bucket.seed.value;
    const bandRadius = Math.max(36, Math.min(120, Math.round(limit.height * 0.36)));
    const search = {
      left: limit.left,
      right: limit.right,
      top: Math.max(limit.top, point.y - bandRadius),
      bottom: Math.min(limit.bottom, point.y + bandRadius + 1),
    };
    search.width = search.right - search.left;
    search.height = search.bottom - search.top;

    const tones = new Uint8Array(total);
    const horizontal = new Uint8Array(total);
    const expanded = new Uint8Array(total);
    const baseRadiusX = Math.max(4, Math.min(16, Math.round(Math.min(limit.width * 0.018, limit.height * 0.06))));
    const baseRadiusY = Math.max(3, Math.min(12, Math.round(Math.min(limit.height * 0.025, limit.width * 0.025))));
    const radiusX = Math.max(3, Math.min(24, Math.round(baseRadiusX * scale)));
    const radiusY = Math.max(2, Math.min(18, Math.round(baseRadiusY * scale)));
    for (let y = search.top; y < search.bottom; y += 1) {
      for (let x = search.left; x < search.right; x += 1) {
        const index = y * width + x;
        if (colorDistance(seedColor, pixel(data, index)) <= 34) tones[index] = 1;
      }
    }

    for (let y = search.top; y < search.bottom; y += 1) {
      let active = 0;
      for (let initial = search.left; initial <= Math.min(search.right - 1, search.left + radiusX); initial += 1) {
        active += tones[y * width + initial];
      }
      for (let x = search.left; x < search.right; x += 1) {
        if (active > 0) horizontal[y * width + x] = 1;
        const add = x + radiusX + 1;
        const remove = x - radiusX;
        if (add < search.right) active += tones[y * width + add];
        if (remove >= search.left) active -= tones[y * width + remove];
      }
    }

    for (let x = search.left; x < search.right; x += 1) {
      let active = 0;
      for (let initial = search.top; initial <= Math.min(search.bottom - 1, search.top + radiusY); initial += 1) {
        active += horizontal[initial * width + x];
      }
      for (let y = search.top; y < search.bottom; y += 1) {
        if (active > 0) expanded[y * width + x] = 1;
        const add = y + radiusY + 1;
        const remove = y - radiusY;
        if (add < search.bottom) active += horizontal[add * width + x];
        if (remove >= search.top) active -= horizontal[remove * width + x];
      }
    }

    let seedIndex = -1;
    let seedDistance = Infinity;
    for (let y = Math.max(search.top, point.y - 12); y <= Math.min(search.bottom - 1, point.y + 12); y += 1) {
      for (let x = Math.max(search.left, point.x - 12); x <= Math.min(search.right - 1, point.x + 12); x += 1) {
        const index = y * width + x;
        if (!expanded[index]) continue;
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < seedDistance) {
          seedDistance = distance;
          seedIndex = index;
        }
      }
    }
    if (seedIndex < 0) return null;

    const maximum = search.width * search.height;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(maximum);
    let head = 0;
    let tail = 1;
    let count = 0;
    let toneCount = 0;
    let left = seedIndex % width;
    let right = left;
    let top = Math.floor(seedIndex / width);
    let bottom = top;
    queue[0] = seedIndex;
    visited[seedIndex] = 1;

    while (head < tail && count <= maximum * 0.58) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      toneCount += tones[index];
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      const neighbors = [];
      if (x > search.left) neighbors.push(index - 1);
      if (x + 1 < search.right) neighbors.push(index + 1);
      if (y > search.top) neighbors.push(index - width);
      if (y + 1 < search.bottom) neighbors.push(index + width);
      for (const next of neighbors) {
        if (visited[next] || !expanded[next]) continue;
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }

    const boxWidth = right - left + 1;
    const boxHeight = bottom - top + 1;
    const boxArea = boxWidth * boxHeight;
    const coverage = boxArea / maximum;
    const density = toneCount / Math.max(1, boxArea);
    const touches = Number(left <= search.left + 1) + Number(right >= search.right - 2) +
      Number(top <= search.top + 1) + Number(bottom >= search.bottom - 2);
    if (boxWidth < 10 || boxHeight < 4 || toneCount < 12) return null;
    if (coverage > 0.52 || density < 0.014 || density > 0.72 || touches >= 2) return null;

    let activeRows = 0;
    let rowRuns = 0;
    for (let y = top; y <= bottom; y += 1) {
      let active = false;
      let inside = false;
      for (let x = left; x <= right; x += 1) {
        const tone = Boolean(tones[y * width + x]);
        if (tone && !inside) rowRuns += 1;
        active ||= tone;
        inside = tone;
      }
      activeRows += Number(active);
    }
    let activeColumns = 0;
    let columnRuns = 0;
    for (let x = left; x <= right; x += 1) {
      let active = false;
      let inside = false;
      for (let y = top; y <= bottom; y += 1) {
        const tone = Boolean(tones[y * width + x]);
        if (tone && !inside) columnRuns += 1;
        active ||= tone;
        inside = tone;
      }
      activeColumns += Number(active);
    }
    const fragmentation = Math.max(
      rowRuns / Math.max(1, activeRows),
      columnRuns / Math.max(1, activeColumns),
    );

    return {
      left,
      top,
      right: right + 1,
      bottom: bottom + 1,
      score: Math.min(0.86, 0.48 + Math.min(0.38, density * 2.2)),
      kind: "tone",
      coverage,
      density,
      fragmentation,
    };
  }

  function edgeCandidate(imageData, point, limit) {
    const { width, data } = imageData;
    const total = imageData.width * imageData.height;
    const edges = new Uint8Array(total);
    const horizontal = new Uint8Array(total);
    const expanded = new Uint8Array(total);
    const radius = Math.max(3, Math.min(14, Math.round(Math.min(limit.width, limit.height) * 0.022)));
    const radiusX = radius;
    const radiusY = radius;

    for (let y = limit.top; y < limit.bottom; y += 1) {
      for (let x = limit.left; x < limit.right; x += 1) {
        const index = y * width + x;
        const rightIndex = y * width + Math.min(limit.right - 1, x + 1);
        const downIndex = Math.min(limit.bottom - 1, y + 1) * width + x;
        if (Math.max(pixelDifference(data, index, rightIndex), pixelDifference(data, index, downIndex)) >= EDGE_THRESHOLD) {
          edges[index] = 1;
        }
      }
    }

    for (let y = limit.top; y < limit.bottom; y += 1) {
      let active = 0;
      for (let initial = limit.left; initial <= Math.min(limit.right - 1, limit.left + radiusX); initial += 1) {
        active += edges[y * width + initial];
      }
      for (let x = limit.left; x < limit.right; x += 1) {
        if (active > 0) horizontal[y * width + x] = 1;
        const add = x + radiusX + 1;
        const remove = x - radiusX;
        if (add < limit.right) active += edges[y * width + add];
        if (remove >= limit.left) active -= edges[y * width + remove];
      }
    }

    for (let x = limit.left; x < limit.right; x += 1) {
      let active = 0;
      for (let initial = limit.top; initial <= Math.min(limit.bottom - 1, limit.top + radiusY); initial += 1) {
        active += horizontal[initial * width + x];
      }
      for (let y = limit.top; y < limit.bottom; y += 1) {
        if (active > 0) expanded[y * width + x] = 1;
        const add = y + radiusY + 1;
        const remove = y - radiusY;
        if (add < limit.bottom) active += horizontal[add * width + x];
        if (remove >= limit.top) active -= horizontal[remove * width + x];
      }
    }

    let seedIndex = -1;
    let seedDistance = Infinity;
    const searchRadius = 10;
    for (let y = Math.max(limit.top, point.y - searchRadius); y <= Math.min(limit.bottom - 1, point.y + searchRadius); y += 1) {
      for (let x = Math.max(limit.left, point.x - searchRadius); x <= Math.min(limit.right - 1, point.x + searchRadius); x += 1) {
        const index = y * width + x;
        if (!expanded[index]) continue;
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < seedDistance) {
          seedDistance = distance;
          seedIndex = index;
        }
      }
    }
    if (seedIndex < 0) return null;

    const maximum = limit.width * limit.height;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(maximum);
    let head = 0;
    let tail = 1;
    let count = 0;
    let edgeCount = 0;
    let left = seedIndex % width;
    let right = left;
    let top = Math.floor(seedIndex / width);
    let bottom = top;
    queue[0] = seedIndex;
    visited[seedIndex] = 1;

    while (head < tail && count <= maximum * 0.72) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      edgeCount += edges[index];
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      const neighbors = [];
      if (x > limit.left) neighbors.push(index - 1);
      if (x + 1 < limit.right) neighbors.push(index + 1);
      if (y > limit.top) neighbors.push(index - width);
      if (y + 1 < limit.bottom) neighbors.push(index + width);
      for (const next of neighbors) {
        if (visited[next] || !expanded[next]) continue;
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }

    const boxWidth = right - left + 1;
    const boxHeight = bottom - top + 1;
    const boxArea = boxWidth * boxHeight;
    const coverage = boxArea / maximum;
    const density = edgeCount / Math.max(1, boxArea);
    const touches = Number(left <= limit.left + 1) + Number(right >= limit.right - 2) +
      Number(top <= limit.top + 1) + Number(bottom >= limit.bottom - 2);

    if (boxWidth < 8 || boxHeight < 5 || edgeCount < 10) return null;
    if (coverage >= 0.7 || density < 0.018 || density > 0.68 || touches >= 2) return null;

    const ring = {
      left: Math.max(limit.left, left - 5),
      right: Math.min(limit.right - 1, right + 5),
      top: Math.max(limit.top, top - 5),
      bottom: Math.min(limit.bottom - 1, bottom + 5),
    };
    let ringEdges = 0;
    let ringArea = 0;
    for (let y = ring.top; y <= ring.bottom; y += 1) {
      for (let x = ring.left; x <= ring.right; x += 1) {
        if (x >= left && x <= right && y >= top && y <= bottom) continue;
        ringArea += 1;
        ringEdges += edges[y * width + x];
      }
    }
    const outsideDensity = ringEdges / Math.max(1, ringArea);
    const isolation = density / Math.max(0.008, outsideDensity);
    return {
      left,
      top,
      right: right + 1,
      bottom: bottom + 1,
      score: Math.min(0.9, 0.42 + Math.min(0.48, density * 2.4)),
      kind: "edge",
      coverage,
      density,
      isolation,
    };
  }

  function visualCandidates(imageData, point, viewport, targetRect) {
    if (!validImageData(imageData) || !viewport?.width || !viewport?.height) return [];
    const limit = analysisRect(targetRect || viewportRect(viewport), viewport, imageData);
    if (!limit || limit.width < 8 || limit.height < 8) return [];
    const location = analysisPoint(point, limit, imageData, viewport);
    const region = regionCandidate(imageData, location, limit);
    const tones = [0.6, 1, 1.65]
      .map((scale) => toneCandidate(imageData, location, limit, scale))
      .filter(Boolean);
    const candidates = [];
    for (const chosen of [region, ...tones].filter(Boolean)) {
      const rect = cssRect(chosen, limit, viewport, imageData, chosen.kind === "region" ? 5 : 7);
      if (!rect || rect.width < MINIMUM_SIDE || rect.height < MINIMUM_SIDE) continue;
      candidates.push({
        rect,
        score: chosen.score,
        kind: chosen.kind,
        fragmentation: chosen.fragmentation,
        isolation: chosen.isolation,
      });
    }
    return candidates;
  }

  function visualCandidate(imageData, point, viewport, targetRect) {
    return visualCandidates(imageData, point, viewport, targetRect)[0] || null;
  }

  function reliableVisual(visual, fallback) {
    if (!visual?.rect || !fallback) return false;
    const visualArea = visual.rect.width * visual.rect.height;
    const fallbackArea = fallback.width * fallback.height;
    const coverage = visualArea / Math.max(1, fallbackArea);
    if (coverage >= MAX_ACCEPTED_COVERAGE) return false;

    if (visual.kind === "region") {
      return coverage >= 0.055 && visual.score >= 0.76;
    }
    if (visual.kind === "tone") {
      return coverage >= 0.008 && visual.score >= 0.78 && visual.fragmentation >= 1.65;
    }
    if (visual.kind === "edge") {
      return false;
    }
    return false;
  }

  function meaningfulElement(element) {
    const tag = String(element?.tagName || "").toUpperCase();
    return Boolean(element && !["HTML", "BODY", "HEAD", "SCRIPT", "STYLE", "NOSCRIPT"].includes(tag));
  }

  function elementRect(element, viewport, getStyle = scope.getComputedStyle) {
    if (!meaningfulElement(element) || typeof element.getBoundingClientRect !== "function") return null;
    const raw = normalizeRect(element.getBoundingClientRect());
    let rect = raw;
    const tag = String(element.tagName || "").toUpperCase();
    let kind = ["IMG", "VIDEO", "CANVAS", "SVG"].includes(tag) ? "media" : "element";
    if (tag === "IMG" && scope.RavueTarget) {
      let style = {};
      try { style = getStyle?.(element) || {}; } catch (_) {}
      rect = scope.RavueTarget.imageContent(raw, {
        width: element.naturalWidth,
        height: element.naturalHeight,
      }, style);
    }
    rect = intersect(rect, viewportRect(viewport));
    if (!rect || rect.width < 8 || rect.height < 8) return null;
    const coverage = rect.width * rect.height / Math.max(1, viewport.width * viewport.height);
    if (coverage > 0.96) return null;
    return { element, rect, kind };
  }

  function targetAtPoint(documentObject, point, overlayHost, viewport, getStyle = scope.getComputedStyle) {
    if (!documentObject || !viewport?.width || !viewport?.height) return null;
    const previous = overlayHost?.style?.pointerEvents;
    if (overlayHost?.style) overlayHost.style.pointerEvents = "none";
    let elements = [];
    try {
      if (typeof documentObject.elementsFromPoint === "function") {
        elements = documentObject.elementsFromPoint(point.x, point.y);
      } else if (typeof documentObject.elementFromPoint === "function") {
        const element = documentObject.elementFromPoint(point.x, point.y);
        if (element) elements = [element];
      }
    } finally {
      if (overlayHost?.style) overlayHost.style.pointerEvents = previous || "";
    }

    const candidates = [];
    const seen = new Set();
    for (const initial of elements) {
      let element = initial;
      while (element && element !== documentObject.documentElement) {
        if (element === overlayHost || seen.has(element)) break;
        seen.add(element);
        const candidate = elementRect(element, viewport, getStyle);
        if (candidate) candidates.push(candidate);
        element = element.parentElement;
      }
    }
    if (!candidates.length) return null;
    return candidates.sort((first, second) => {
      if (first.kind !== second.kind) return first.kind === "media" ? -1 : 1;
      return first.rect.width * first.rect.height - second.rect.width * second.rect.height;
    })[0];
  }

  function select({ imageData, point, viewport, target }) {
    const fallback = target?.rect ? intersect(target.rect, viewportRect(viewport)) : null;
    const visuals = visualCandidates(imageData, point, viewport, fallback);
    const confidenceBounds = fallback || viewportRect(viewport);
    const reliable = visuals.filter((visual) => reliableVisual(visual, confidenceBounds));
    if (reliable.length) {
      return reliable.sort((first, second) => (
        second.rect.width * second.rect.height - first.rect.width * first.rect.height ||
        second.score - first.score
      ))[0];
    }
    return fallback ? { rect: fallback, kind: target.kind, score: 0.35 } : null;
  }

  const api = Object.freeze({
    MINIMUM_SIDE,
    normalizeRect,
    intersect,
    validImageData,
    colorDistance,
    analysisRect,
    regionCandidate,
    toneCandidate,
    edgeCandidate,
    visualCandidates,
    visualCandidate,
    reliableVisual,
    elementRect,
    targetAtPoint,
    select,
  });
  scope.RavueSmartSelection = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "undefined" ? this : globalThis);
