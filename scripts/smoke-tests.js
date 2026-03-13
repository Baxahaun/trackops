#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
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

function get(port, pathname, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const req = http.get({ host, port, path: pathname }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
  });
}

function extractLocalPort(output) {
  const match = String(output || "").match(/- Local:\s+http:\/\/[^\s:]+:(\d+)/);
  return match ? Number(match[1]) : null;
}

function hasExternalIpv4() {
  return Object.values(os.networkInterfaces()).some((entries) => (
    (entries || []).some((entry) => entry && entry.family === "IPv4" && !entry.internal)
  ));
}

function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function findFreePort(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((closeError) => {
        if (closeError) reject(closeError);
        else resolve(port);
      });
    });
  });
}

function occupyPort(port, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("busy");
    });
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}

function startDashboard(cwd, args = [], envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  const child = spawn(process.execPath, [BIN, "dashboard", ...args], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { output += chunk.toString("utf8"); });

  return {
    child,
    output: () => output,
  };
}

async function waitForDashboard(session) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    if (session.child.exitCode != null) {
      throw new Error(`el dashboard termino antes de iniciar:\n${session.output()}`);
    }

    const port = extractLocalPort(session.output());
    if (port) {
      try {
        const response = await get(port, "/api/state");
        if (response.status === 200) {
          return { port, output: session.output() };
        }
      } catch (_error) {
        // sigue esperando
      }
    }

    await wait(250);
  }

  throw new Error(`el dashboard no respondio a tiempo:\n${session.output()}`);
}

async function stopDashboard(session) {
  if (!session || !session.child || session.child.exitCode != null) return;
  session.child.kill("SIGTERM");
  await wait(500);
  if (session.child.exitCode == null) {
    session.child.kill("SIGKILL");
    await wait(250);
  }
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

  const operaProject = path.join(tempRoot, "opera-en");
  fs.mkdirSync(operaProject, { recursive: true });
  fs.writeFileSync(
    path.join(operaProject, "package.json"),
    `${JSON.stringify({ name: "opera-en", version: "1.0.0", description: "English OPERA test" }, null, 2)}\n`,
    "utf8",
  );

  runNode([BIN, "init", "--with-opera", "--locale", "en", "--no-bootstrap"], operaProject);
  const englishGenesis = fs.readFileSync(path.join(operaProject, "genesis.md"), "utf8");
  assert.match(englishGenesis, /The Constitution of the project/);

  runNode([BIN, "opera", "install", "--locale", "en", "--non-interactive"], operaProject);
  const operaControl = JSON.parse(fs.readFileSync(path.join(operaProject, "project_control.json"), "utf8"));
  assert.strictEqual(operaControl.meta.locale, "en");
  assert.strictEqual(operaControl.meta.opera.bootstrap.status, "pending");
  assert.ok(Array.isArray(operaControl.meta.opera.bootstrap.missingFields));

  const defaultPortFree = await isPortFree(4173);
  const defaultDashboard = startDashboard(tempProject);

  try {
    const ready = await waitForDashboard(defaultDashboard);
    const home = await get(ready.port, "/");
    const state = await get(ready.port, "/api/state");
    const localSkills = await get(ready.port, "/api/skills/local");
    const discoverSkills = await get(ready.port, "/api/skills/discover");

    assert.strictEqual(home.status, 200);
    assert.strictEqual(state.status, 200);
    assert.strictEqual(localSkills.status, 200);
    assert.strictEqual(discoverSkills.status, 200);

    const statePayload = JSON.parse(state.body);
    assert.ok(statePayload.control);
    assert.ok(Array.isArray(statePayload.control.tasks));

    if (defaultPortFree) {
      assert.strictEqual(ready.port, 4173, `se esperaba usar 4173 cuando estaba libre:\n${ready.output}`);
    }
  } finally {
    await stopDashboard(defaultDashboard);
  }

  const blocked4173 = await isPortFree(4173) ? await occupyPort(4173) : null;
  const fallbackDashboard = startDashboard(tempProject);

  try {
    const ready = await waitForDashboard(fallbackDashboard);
    assert.notStrictEqual(ready.port, 4173, `deberia haber evitado 4173 ocupado:\n${ready.output}`);
    assert.match(ready.output, /Local:/);
  } finally {
    await stopDashboard(fallbackDashboard);
    if (blocked4173) blocked4173.close();
  }

  const preferredPort = await findFreePort();
  const occupiedPreferredPort = await occupyPort(preferredPort);
  const preferredDashboard = startDashboard(tempProject, [], { OPS_UI_PORT: String(preferredPort) });

  try {
    const ready = await waitForDashboard(preferredDashboard);
    assert.notStrictEqual(ready.port, preferredPort, `deberia haber evitado el puerto preferido ocupado:\n${ready.output}`);
    assert.match(ready.output, new RegExp(`using ${ready.port}|usando ${ready.port}`));
  } finally {
    await stopDashboard(preferredDashboard);
    occupiedPreferredPort.close();
  }

  const strictPort = await findFreePort();
  const occupiedStrictPort = await occupyPort(strictPort);
  try {
    const strictResult = spawnSync(process.execPath, [BIN, "dashboard", "--strict-port", "--port", String(strictPort)], {
      cwd: tempProject,
      encoding: "utf8",
      timeout: 15000,
    });
    assert.notStrictEqual(strictResult.status, 0, "el dashboard deberia fallar con --strict-port si el puerto esta ocupado");
    assert.match(`${strictResult.stdout}\n${strictResult.stderr}`, /already in use|esta en uso/i);
  } finally {
    occupiedStrictPort.close();
  }

  const publicPort = await findFreePort("0.0.0.0");
  const publicDashboard = startDashboard(tempProject, ["--public", "--port", String(publicPort)]);

  try {
    const ready = await waitForDashboard(publicDashboard);
    if (hasExternalIpv4()) {
      assert.match(ready.output, /- Network:/, `deberia anunciar al menos una ruta de red:\n${ready.output}`);
    }
  } finally {
    await stopDashboard(publicDashboard);
  }

  const noClipboardPort = await findFreePort();
  const noClipboardDashboard = startDashboard(tempProject, ["--port", String(noClipboardPort)], {
    PATH: "",
    Path: "",
  });

  try {
    const ready = await waitForDashboard(noClipboardDashboard);
    const state = await get(ready.port, "/api/state");
    assert.strictEqual(state.status, 200);
  } finally {
    await stopDashboard(noClipboardDashboard);
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log("Smoke tests OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
