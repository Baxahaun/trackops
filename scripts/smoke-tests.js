#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BIN = path.join(ROOT, "bin", "trackops.js");

function runNode(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout || `fallo ejecutando ${args.join(" ")}`);
  return result.stdout;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: 4173, path: pathname }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    try {
      const response = await get("/api/state");
      if (response.status === 200) return;
    } catch (_error) {
      // sigue esperando
    }
    await wait(250);
  }
  throw new Error("el panel no respondio a tiempo");
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trackops-smoke-"));
  const tempProject = path.join(tempRoot, "demo");
  fs.mkdirSync(tempProject, { recursive: true });
  fs.writeFileSync(path.join(tempProject, "package.json"), `${JSON.stringify({ name: "demo-trackops", version: "1.0.0" }, null, 2)}\n`, "utf8");

  runNode([BIN, "init"], tempProject);

  const generatedPackage = JSON.parse(fs.readFileSync(path.join(tempProject, "package.json"), "utf8"));
  assert.strictEqual(generatedPackage.scripts["ops:status"], "npx --yes trackops status");
  assert.strictEqual(generatedPackage.scripts["ops:dashboard"], "npx --yes trackops dashboard");

  const statusOutput = runNode([BIN, "status"], tempProject);
  assert.match(statusOutput, /Control Operativo/);
  assert.match(statusOutput, /ops-bootstrap/);

  const nextOutput = runNode([BIN, "next"], tempProject);
  assert.match(nextOutput, /ops-bootstrap/);

  runNode([BIN, "sync"], tempProject);
  for (const file of ["task_plan.md", "progress.md", "findings.md"]) {
    assert.ok(fs.existsSync(path.join(tempProject, file)), `${file} no fue generado`);
  }

  const server = spawn(process.execPath, [BIN, "dashboard"], { cwd: tempProject, stdio: "ignore" });

  try {
    await waitForServer();

    const home = await get("/");
    const state = await get("/api/state");
    const localSkills = await get("/api/skills/local");
    const discoverSkills = await get("/api/skills/discover");

    assert.strictEqual(home.status, 200);
    assert.strictEqual(state.status, 200);
    assert.strictEqual(localSkills.status, 200);
    assert.strictEqual(discoverSkills.status, 200);

    const statePayload = JSON.parse(state.body);
    assert.ok(statePayload.control);
    assert.ok(Array.isArray(statePayload.control.tasks));
  } finally {
    server.kill("SIGTERM");
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log("Smoke tests OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
