const test = require("node:test");
const assert = require("node:assert/strict");
const { startServers } = require("./fixture-server.cjs");

test("o laboratório local serve formatos, iframes e CSP forte", async (t) => {
  const servers = await startServers({ primaryPort: 0, crossPort: 0 });
  t.after(() => servers.close());

  const main = await fetch(`${servers.primaryOrigin}/`);
  const mainText = await main.text();
  assert.equal(main.status, 200);
  assert.match(mainText, /loading="lazy"/);
  assert.match(mainText, /object-fit: contain/);
  assert.match(mainText, /sample\.webp/);
  assert.match(mainText, /sample\.svg/);
  assert.match(mainText, /smart-selection\.svg/);
  assert.match(mainText, /tall-sample\.svg/);
  assert.equal(mainText.includes(servers.crossOrigin), true);
  assert.doesNotMatch(mainText, /__CROSS_ORIGIN__/);

  const frame = await fetch(`${servers.crossOrigin}/frame.html`);
  assert.equal(frame.status, 200);
  assert.match(await frame.text(), /Imagem dentro de iframe/);

  const strict = await fetch(`${servers.primaryOrigin}/strict-csp.html`);
  assert.equal(strict.status, 200);
  const csp = strict.headers.get("content-security-policy");
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /style-src 'none'/);

  const webp = await fetch(`${servers.primaryOrigin}/sample.webp`);
  assert.equal(webp.status, 200);
  assert.equal(webp.headers.get("content-type"), "image/webp");
  assert.ok((await webp.arrayBuffer()).byteLength > 0);

  const tall = await fetch(`${servers.crossOrigin}/tall-sample.svg`);
  assert.equal(tall.status, 200);
  assert.match(await tall.text(), /FIM/);

  const smart = await fetch(`${servers.primaryOrigin}/smart-selection.svg`);
  assert.equal(smart.status, 200);
  assert.match(await smart.text(), /LEGENDA SEM CAIXA/);
});
