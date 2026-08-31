"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { ROOT, RUNTIME, walk, sha256 } = require("./package.cjs");

const output = path.resolve(process.argv[2] || path.join(ROOT, "..", "validation-output"));
assert.ok(!output.startsWith(ROOT + path.sep), "Keep validation output outside the source tree");
fs.mkdirSync(output, { recursive: true });
const report = { at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch, suites: [], syntax: [], json: [], official: {}, firefox: { status: "not-run", reason: "An installed Firefox and an authorized interaction environment are required for the manual matrix." } };
let failed = false;

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024, env: process.env, ...options });
  fs.writeFileSync(path.join(output, `${label}.stdout.txt`), result.stdout || "");
  fs.writeFileSync(path.join(output, `${label}.stderr.txt`), result.stderr || (result.error ? String(result.error) : ""));
  return result;
}

function suite(label, files) {
  const result = run(label, process.execPath, ["--experimental-vm-modules", "--test", "--test-reporter=tap", ...files]);
  const count = (key) => Number(result.stdout?.match(new RegExp(`^# ${key} (\\d+)$`, "m"))?.[1] || 0);
  const entry = { name: label, exit: result.status, tests: count("tests"), pass: count("pass"), fail: count("fail"), cancelled: count("cancelled"), skipped: count("skipped"), todo: count("todo") };
  assert.ok(entry.tests > 0, `No tests recorded: ${label}`);
  report.suites.push(entry);
  if (result.status !== 0 || entry.fail || entry.cancelled || entry.skipped || entry.todo) failed = true;
}

const files = walk(ROOT);
const regularTests = files.filter((file) => file.endsWith(".test.cjs") && !file.includes(path.sep + "native" + path.sep));
suite("unit-regression", regularTests);

let nativeAvailable = true;
try {
  const base = process.env.RAVUE_TEST_NODE_MODULES;
  for (const name of ["@napi-rs/canvas", "sharp"]) require.resolve(base ? path.join(base, name) : name);
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  nativeAvailable = false;
  report.nativeUnavailable = "Optional native-codec dependencies not installed; no native pass is claimed.";
}
if (nativeAvailable) suite("native-pixels", files.filter((file) => file.endsWith(".test.cjs") && file.includes(path.sep + "native" + path.sep)));

for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  if (/\.(?:js|mjs|cjs)$/.test(file)) {
    const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8", timeout: 10000 });
    report.syntax.push({ file: relative, ok: check.status === 0 });
    if (check.status !== 0) { failed = true; fs.writeFileSync(path.join(output, "syntax-error.txt"), check.stderr || String(check.error)); }
  }
  if (file.endsWith(".json")) {
    try { JSON.parse(fs.readFileSync(file, "utf8")); report.json.push({ file: relative, ok: true }); }
    catch (error) { failed = true; report.json.push({ file: relative, ok: false, error: error.message }); }
  }
}

const staticCheck = run("static-inspection", process.execPath, ["tests/regression/inspecao-estatica.cjs", path.join(output, "static-inspection.json")]);
if (staticCheck.status !== 0) failed = true;
const characterization = run("characterization", process.execPath, ["--experimental-vm-modules", "tests/regression/caracterizar.cjs", path.join(output, "characterization.json")]);
if (characterization.status !== 0) failed = true;

const runtime = path.join(output, "runtime-for-lint");
fs.mkdirSync(runtime, { recursive: true });
for (const name of RUNTIME) {
  const destination = path.join(runtime, name), bytes = fs.readFileSync(path.join(ROOT, name));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  assert.ok(fs.readFileSync(destination).equals(bytes));
}
const version = run("web-ext-version", "web-ext", ["--version"]);
if (version.error?.code === "ENOENT") {
  report.official = { status: "unavailable", reason: "web-ext is not installed in this environment; no official lint result is claimed." };
} else if (version.status !== 0) {
  report.official = { status: "blocked", reason: "web-ext version check failed", exit: version.status };
} else {
  const lint = run("web-ext-lint", "web-ext", ["lint", "--source-dir", runtime]);
  report.official = { status: lint.status === 0 ? "ran-review-output" : "failed", version: version.stdout.trim(), exit: lint.status };
  if (lint.status !== 0) failed = true;
}

report.totals = report.suites.reduce((sum, suite) => {
  for (const key of ["tests", "pass", "fail", "cancelled", "skipped", "todo"]) sum[key] += suite[key];
  return sum;
}, { tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0 });
report.localChecks = failed ? "failed" : "passed";
report.releaseStatus = "not-cleared-without-real-Firefox-and-official-validation";
report.runtimeFingerprints = RUNTIME.map((file) => ({ file, sha256: sha256(fs.readFileSync(path.join(ROOT, file))) }));
fs.writeFileSync(path.join(output, "validation.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ localChecks: report.localChecks, releaseStatus: report.releaseStatus, totals: report.totals, syntax: report.syntax.length, json: report.json.length, official: report.official }, null, 2));
if (failed) process.exitCode = 1;
