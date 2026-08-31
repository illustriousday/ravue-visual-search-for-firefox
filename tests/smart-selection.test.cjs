const test = require("node:test");
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");

delete require.cache[require.resolve("../content/target.js")];
require("../content/target.js");
delete require.cache[require.resolve("../content/smart-selection.js")];
const smart = require("../content/smart-selection.js");

function imageData(width, height, painter) {
  const data = new Uint8ClampedArray(width * height * 4);
  const set = (x, y, red, green, blue, alpha = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
    data[offset + 3] = alpha;
  };
  const fill = (x, y, boxWidth, boxHeight, color) => {
    for (let row = y; row < y + boxHeight; row += 1) {
      for (let column = x; column < x + boxWidth; column += 1) set(column, row, ...color);
    }
  };
  painter({ set, fill, width, height });
  return { width, height, data };
}

function noisyBackground({ set, width, height }) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const noise = (x * 37 + y * 61 + x * y * 3) % 43;
      set(x, y, 34 + noise, 54 + (noise * 3) % 55, 86 + (noise * 5) % 61);
    }
  }
}

function mediaTarget(width, height) {
  return { rect: { x: 0, y: 0, width, height }, kind: "media" };
}

function assertNear(actual, expected, tolerance = 12) {
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) <= tolerance,
      `${key}: esperado ${expected[key]} ± ${tolerance}, recebido ${actual[key]}`,
    );
  }
}

const GLYPHS = Object.freeze({
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
});

function drawBlockText(canvas, text, x, y, scale, color) {
  const advance = 6 * scale;
  for (let index = 0; index < text.length; index += 1) {
    const glyph = GLYPHS[text[index]];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] === "1") {
          canvas.fill(x + index * advance + column * scale, y + row * scale, scale, scale, color);
        }
      }
    }
  }
  return { x, y, width: text.length * advance - scale, height: 7 * scale };
}

test("um clique reconhece um balão claro mesmo quando ocorre sobre as letras", () => {
  const shot = imageData(240, 150, (canvas) => {
    noisyBackground(canvas);
    const { set, fill } = canvas;
    for (let y = 35; y < 115; y += 1) {
      for (let x = 44; x < 196; x += 1) {
        const oval = ((x - 120) / 76) ** 2 + ((y - 74) / 39) ** 2;
        if (oval <= 1.08) set(x, y, 18, 20, 25);
        if (oval <= 1) set(x, y, 244, 246, 248);
      }
    }
    fill(78, 61, 84, 5, [26, 28, 32]);
    fill(70, 73, 100, 5, [26, 28, 32]);
    fill(86, 85, 68, 5, [26, 28, 32]);
  });
  const viewport = { width: 240, height: 150 };

  const onBackground = smart.select({
    imageData: shot,
    point: { x: 58, y: 72 },
    viewport,
    target: mediaTarget(240, 150),
  });
  const onLetters = smart.select({
    imageData: shot,
    point: { x: 112, y: 75 },
    viewport,
    target: mediaTarget(240, 150),
  });

  assert.equal(onBackground.kind, "region");
  assert.equal(onLetters.kind, "region");
  assertNear(onBackground.rect, { x: 39, y: 30, width: 162, height: 90 }, 14);
  assertNear(onLetters.rect, onBackground.rect, 10);
});

test("um clique reconhece uma legenda dentro de uma caixa opaca", () => {
  const shot = imageData(240, 160, (canvas) => {
    noisyBackground(canvas);
    canvas.fill(24, 100, 192, 47, [19, 23, 31]);
    canvas.fill(45, 115, 58, 5, [246, 247, 250]);
    canvas.fill(111, 115, 81, 5, [246, 247, 250]);
    canvas.fill(61, 128, 126, 5, [246, 247, 250]);
  });
  const selected = smart.select({
    imageData: shot,
    point: { x: 32, y: 109 },
    viewport: { width: 240, height: 160 },
    target: mediaTarget(240, 160),
  });

  assert.ok(["region", "tone"].includes(selected.kind));
  assertNear(selected.rect, { x: 10, y: 86, width: 220, height: 74 }, 12);
});

test("um clique agrupa uma legenda clara sem caixa sobre uma foto", () => {
  const shot = imageData(240, 160, ({ set, fill, width, height }) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        set(x, y, (x * 7 + y * 3) % 190, 35 + (x * 2 + y * 9) % 170, 45 + (x * 11 + y) % 160);
      }
    }
    for (let x = 44; x < 196; x += 12) {
      fill(x, 112 + (x % 3), 7, 14, [250, 250, 247]);
    }
    fill(62, 130, 116, 4, [250, 250, 247]);
  });
  const selected = smart.select({
    imageData: shot,
    point: { x: 101, y: 118 },
    viewport: { width: 240, height: 160 },
    target: mediaTarget(240, 160),
  });

  assert.equal(selected.kind, "tone");
  assert.ok(selected.rect.x <= 51);
  assert.ok(selected.rect.x + selected.rect.width >= 189);
  assert.ok(selected.rect.y <= 112);
  assert.ok(selected.rect.y + selected.rect.height >= 132);
  assert.ok(selected.rect.height < 55);
});

test("texto grande em duas linhas é agrupado em vez de reduzir a seleção a uma letra", () => {
  const width = 420;
  const height = 240;
  let secondLine;
  const shot = imageData(width, height, (canvas) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const texture = (x * 13 + y * 17 + Math.floor(x / 19) * 7) % 26;
        canvas.set(x, y, 184 + texture, 188 + texture, 194 + texture);
      }
    }
    drawBlockText(canvas, "MERCENARY", 62, 64, 5, [18, 20, 25]);
    secondLine = drawBlockText(canvas, "ENROLLMENT", 47, 108, 5, [18, 20, 25]);
  });

  const selected = smart.select({
    imageData: shot,
    point: { x: secondLine.x + 2 * 30 + 12, y: secondLine.y + 2 },
    viewport: { width, height },
    target: mediaTarget(width, height),
  });

  assert.equal(selected.kind, "tone");
  assert.ok(selected.rect.x <= 62, `limite esquerdo inesperado: ${selected.rect.x}`);
  assert.ok(selected.rect.x + selected.rect.width >= 348, `limite direito inesperado: ${selected.rect.x + selected.rect.width}`);
  assert.ok(selected.rect.y <= 64, `limite superior inesperado: ${selected.rect.y}`);
  assert.ok(selected.rect.y + selected.rect.height >= 143, `limite inferior inesperado: ${selected.rect.y + selected.rect.height}`);
});

test("fotos sem uma região confiável usam os limites exatos do elemento", () => {
  const gradient = imageData(240, 160, ({ set, width, height }) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        set(x, y, 45 + Math.floor(x * 130 / width), 62 + Math.floor(y * 120 / height), 118);
      }
    }
  });
  const target = { rect: { x: 20, y: 15, width: 200, height: 130 }, kind: "media" };
  const selected = smart.select({
    imageData: gradient,
    point: { x: 120, y: 80 },
    viewport: { width: 240, height: 160 },
    target,
  });

  assert.deepEqual(selected, { rect: target.rect, kind: "media", score: 0.35 });
});

test("textura fotográfica sem alvo claro não cria um pequeno recorte aleatório", () => {
  const photo = imageData(320, 210, ({ set, width, height }) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = (x * 17 + y * 29 + x * y) % 256;
        set(x, y, value, (value * 3) % 256, (value * 7) % 256);
      }
    }
  });
  const target = { rect: { x: 13, y: 9, width: 290, height: 185 }, kind: "media" };
  for (const point of [{ x: 80, y: 55 }, { x: 160, y: 105 }, { x: 260, y: 160 }]) {
    assert.deepEqual(smart.select({
      imageData: photo,
      point,
      viewport: { width: 320, height: 210 },
      target,
    }), { rect: target.rect, kind: "media", score: 0.35 });
  }
});

test("detalhes de rostos não viram pequenos recortes de olhos, nariz ou boca", () => {
  const width = 360;
  const height = 240;
  const photo = imageData(width, height, ({ set }) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const texture = (x * 31 + y * 47 + x * y * 3) % 37;
        set(x, y, 68 + texture, 92 + (texture * 3) % 49, 102 + (texture * 5) % 53);
      }
    }

    for (let y = 54; y < 213; y += 1) {
      for (let x = 24; x < 178; x += 1) {
        const head = ((x - 101) / 64) ** 2 + ((y - 102) / 55) ** 2;
        const body = ((x - 98) / 70) ** 2 + ((y - 174) / 78) ** 2;
        if (head <= 1 || body <= 1) {
          const fur = (x * 7 + y * 11) % 29;
          set(x, y, 154 + fur, 128 + fur, 91 + Math.floor(fur / 2));
        }
      }
    }
    for (let y = 70; y < 222; y += 1) {
      for (let x = 184; x < 345; x += 1) {
        const head = ((x - 269) / 49) ** 2 + ((y - 105) / 58) ** 2;
        const body = ((x - 271) / 75) ** 2 + ((y - 187) / 88) ** 2;
        if (head <= 1 || body <= 1) {
          const shade = (x * 5 + y * 13) % 23;
          set(x, y, 173 + shade, 119 + shade, 104 + Math.floor(shade / 2));
        }
      }
    }

    for (let y = 91; y < 101; y += 1) {
      for (let x = 67; x < 79; x += 1) set(x, y, 25, 27, 29);
      for (let x = 120; x < 132; x += 1) set(x, y, 25, 27, 29);
    }
    for (let y = 116; y < 129; y += 1) {
      for (let x = 94; x < 110; x += 1) set(x, y, 34, 28, 25);
    }
    for (let y = 96; y < 104; y += 1) {
      for (let x = 245; x < 256; x += 1) set(x, y, 26, 25, 28);
      for (let x = 282; x < 293; x += 1) set(x, y, 26, 25, 28);
    }
    for (let x = 256; x < 285; x += 1) set(x, 130, 86, 39, 44);
  });
  const target = mediaTarget(width, height);
  const expected = { rect: target.rect, kind: "media", score: 0.35 };

  for (const point of [
    { x: 101, y: 121 },
    { x: 73, y: 96 },
  ]) {
    assert.deepEqual(smart.select({
      imageData: photo,
      point,
      viewport: { width, height },
      target,
    }), expected);
  }

  for (const point of [
    { x: 250, y: 100 },
    { x: 270, y: 130 },
  ]) {
    const selected = smart.select({
      imageData: photo,
      point,
      viewport: { width, height },
      target,
    });
    const coverage = selected.rect.width * selected.rect.height / (width * height);
    assert.ok(coverage >= 0.2, `detalhe fotográfico pequeno aceito: ${(coverage * 100).toFixed(1)}%`);
    assert.ok(selected.rect.x <= point.x && selected.rect.x + selected.rect.width >= point.x);
    assert.ok(selected.rect.y <= point.y && selected.rect.y + selected.rect.height >= point.y);
  }
});

test("padrões repetidos e contrastes ambíguos selecionam a imagem inteira", () => {
  const width = 320;
  const height = 210;
  const scenes = [
    imageData(width, height, ({ set }) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const value = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) * 140 + 40;
          set(x, y, value, 255 - value, 100);
        }
      }
    }),
    imageData(width, height, ({ set }) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const value = (Math.floor(x / 12) % 2) * 80 + 60;
          set(x, y, value, 90 + Math.floor(y / 4) % 40, 140);
        }
      }
    }),
    imageData(width, height, ({ set }) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const value = 120 + Math.round(70 * Math.sin(x / 11) + 35 * Math.cos(y / 7));
          set(x, y, value % 256, (value * 2) % 256, (value * 3) % 256);
        }
      }
    }),
    imageData(width, height, ({ set }) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const value = (Math.floor(x / 40) * 53 + Math.floor(y / 35) * 79) % 220;
          set(x, y, value, 40 + (value * 3) % 190, 30 + (value * 7) % 200);
        }
      }
    }),
  ];
  const target = mediaTarget(width, height);
  const wholeImage = { rect: target.rect, kind: "media", score: 0.35 };
  for (const shot of scenes) {
    for (const point of [{ x: 40, y: 40 }, { x: 160, y: 100 }, { x: 275, y: 170 }]) {
      assert.deepEqual(smart.select({
        imageData: shot,
        point,
        viewport: { width, height },
        target,
      }), wholeImage);
    }
  }
});

test("um objeto realmente isolado continua recebendo seu próprio recorte", () => {
  const shot = imageData(320, 210, ({ set, width, height }) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const noise = (x * 11 + y * 7) % 30;
        set(x, y, 55 + noise, 85 + noise, 110 + noise);
      }
    }
    for (let y = 65; y < 145; y += 1) {
      for (let x = 115; x < 205; x += 1) {
        const oval = ((x - 160) / 45) ** 2 + ((y - 105) / 40) ** 2;
        if (oval <= 1.08) set(x, y, 15, 20, 28);
        if (oval <= 1) set(x, y, 235, 70, 75);
      }
    }
  });
  const selected = smart.select({
    imageData: shot,
    point: { x: 160, y: 105 },
    viewport: { width: 320, height: 210 },
    target: mediaTarget(320, 210),
  });

  assert.equal(selected.kind, "region");
  assertNear(selected.rect, { x: 110, y: 60, width: 100, height: 90 }, 8);
});

test("a decisão conservadora rejeita fragmentos pequenos e contornos sem isolamento", () => {
  const bounds = { x: 0, y: 0, width: 320, height: 210 };
  assert.equal(smart.reliableVisual({
    rect: { x: 20, y: 20, width: 24, height: 24 },
    score: 1,
    kind: "region",
  }, bounds), false);
  assert.equal(smart.reliableVisual({
    rect: { x: 80, y: 150, width: 170, height: 28 },
    score: 0.84,
    kind: "tone",
    fragmentation: 2.4,
  }, bounds), true);
  assert.equal(smart.reliableVisual({
    rect: { x: 90, y: 50, width: 100, height: 90 },
    score: 0.9,
    kind: "edge",
    isolation: 1.05,
  }, bounds), false);
});

test("o alvo DOM respeita object-fit e sempre restaura os eventos do overlay", () => {
  const documentElement = {};
  const image = {
    tagName: "IMG",
    naturalWidth: 400,
    naturalHeight: 200,
    parentElement: documentElement,
    getBoundingClientRect() { return { x: 10, y: 20, width: 200, height: 200 }; },
  };
  const overlayHost = { style: { pointerEvents: "auto" } };
  const documentObject = {
    documentElement,
    elementsFromPoint() {
      assert.equal(overlayHost.style.pointerEvents, "none");
      return [image];
    },
  };
  const selected = smart.targetAtPoint(
    documentObject,
    { x: 100, y: 100 },
    overlayHost,
    { width: 500, height: 400 },
    () => ({ objectFit: "contain", objectPosition: "50% 50%", borderWidth: "0", padding: "0" }),
  );

  assert.equal(overlayHost.style.pointerEvents, "auto");
  assert.equal(selected.kind, "media");
  assert.deepEqual(selected.rect, { x: 10, y: 70, width: 200, height: 100 });
});

test("a análise permanece limitada e responsiva no teto de 960 × 960", () => {
  const shot = imageData(960, 960, ({ set, width, height }) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = (x * 17 + y * 29 + x * y) % 256;
        set(x, y, value, (value * 3) % 256, (value * 7) % 256);
      }
    }
  });
  const started = performance.now();
  const selected = smart.select({
    imageData: shot,
    point: { x: 480, y: 480 },
    viewport: { width: 960, height: 960 },
    target: mediaTarget(960, 960),
  });
  const elapsed = performance.now() - started;

  assert.deepEqual(selected, {
    rect: { x: 0, y: 0, width: 960, height: 960 },
    kind: "media",
    score: 0.35,
  });
  assert.ok(elapsed < 2000, `análise demorou ${elapsed.toFixed(1)} ms`);
});

test("entradas variadas nunca produzem caixas inválidas ou fora do viewport", () => {
  let state = 0x6d2b79f5;
  const random = () => {
    state = Math.imul(state ^ state >>> 15, state | 1);
    state ^= state + Math.imul(state ^ state >>> 7, state | 61);
    return ((state ^ state >>> 14) >>> 0) / 4294967296;
  };

  for (let scenario = 0; scenario < 80; scenario += 1) {
    const width = 48 + Math.floor(random() * 145);
    const height = 48 + Math.floor(random() * 115);
    const shot = imageData(width, height, ({ set }) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          set(x, y, Math.floor(random() * 256), Math.floor(random() * 256), Math.floor(random() * 256));
        }
      }
    });
    const target = {
      rect: {
        x: Math.floor(random() * width * 0.35),
        y: Math.floor(random() * height * 0.35),
        width: Math.max(12, Math.floor(width * (0.45 + random() * 0.55))),
        height: Math.max(12, Math.floor(height * (0.45 + random() * 0.55))),
      },
      kind: "media",
    };
    const result = smart.select({
      imageData: shot,
      point: { x: random() * width, y: random() * height },
      viewport: { width, height },
      target,
    });
    assert.ok(result?.rect);
    for (const value of Object.values(result.rect)) assert.equal(Number.isFinite(value), true);
    assert.ok(result.rect.x >= 0 && result.rect.y >= 0);
    assert.ok(result.rect.x + result.rect.width <= width + Number.EPSILON);
    assert.ok(result.rect.y + result.rect.height <= height + Number.EPSILON);
    assert.ok(result.rect.width > 0 && result.rect.height > 0);
  }
});
