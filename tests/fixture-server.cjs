const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const routes = new Map([
  ["/", "tests/fixtures/hard-sites.html"],
  ["/hard-sites.html", "tests/fixtures/hard-sites.html"],
  ["/frame.html", "tests/fixtures/frame.html"],
  ["/strict-csp.html", "tests/fixtures/strict-csp.html"],
  ["/sample.svg", "tests/fixtures/sample.svg"],
  ["/smart-selection.svg", "tests/fixtures/smart-selection.svg"],
  ["/tall-sample.svg", "tests/fixtures/tall-sample.svg"],
  ["/sample.webp", "tests/fixtures/sample.webp"],
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function handler(crossOrigin) {
  return (request, response) => {
    const pathname = new URL(request.url, "http://fixture.invalid").pathname;
    const relative = routes.get(pathname);
    if (!relative) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const file = path.join(root, relative);
    let body;
    try {
      body = fs.readFileSync(file);
    } catch (_) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Fixture missing");
      return;
    }

    const headers = {
      "cache-control": "no-store",
      "content-type": types[path.extname(file)] || "application/octet-stream",
      "x-content-type-options": "nosniff",
    };
    if (pathname === "/strict-csp.html") {
      headers["content-security-policy"] = [
        "default-src 'none'",
        "img-src 'self'",
        "style-src 'none'",
        "script-src 'none'",
        "frame-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join("; ");
    }

    if (path.extname(file) === ".html") {
      body = Buffer.from(body.toString("utf8").replaceAll("__CROSS_ORIGIN__", crossOrigin));
    }
    response.writeHead(200, headers);
    response.end(body);
  };
}

function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolve(server.address());
    });
  });
}

async function startServers(options = {}) {
  const host = options.host || "127.0.0.1";
  const crossServer = http.createServer();
  const crossAddress = await listen(crossServer, host, options.crossPort ?? 4174);
  const crossOrigin = `http://${host}:${crossAddress.port}`;
  crossServer.on("request", handler(crossOrigin));

  const primaryServer = http.createServer(handler(crossOrigin));
  const primaryAddress = await listen(primaryServer, host, options.primaryPort ?? 4173);
  return {
    primaryServer,
    crossServer,
    primaryOrigin: `http://${host}:${primaryAddress.port}`,
    crossOrigin,
    async close() {
      await Promise.all([
        new Promise((resolve) => primaryServer.close(resolve)),
        new Promise((resolve) => crossServer.close(resolve)),
      ]);
    },
  };
}

if (require.main === module) {
  startServers().then((servers) => {
    console.log(`Casos gerais: ${servers.primaryOrigin}/`);
    console.log(`CSP forte: ${servers.primaryOrigin}/strict-csp.html`);
    const stop = async () => {
      await servers.close();
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { startServers };
