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
const SKILL_VALIDATE = path.join(ROOT, "scripts", "validate-skill.js");
const SKILL_BOOTSTRAP = path.join(ROOT, "skills", "trackops", "scripts", "bootstrap-trackops.js");

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runNode(args, cwd, envOverrides = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...envOverrides },
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout || `fallo ejecutando ${args.join(" ")}`);
  return result.stdout;
}

function runCommand(command, args, cwd, envOverrides = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...envOverrides },
  });
}

function runNpm(args, cwd, envOverrides = {}) {
  return spawnSync(getNpmCommand(), args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...envOverrides },
    shell: process.platform === "win32",
  });
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

function writePackageJson(dir, name) {
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify({ name, version: "1.0.0" }, null, 2)}\n`,
    "utf8",
  );
}

function packCurrentPackage(tempRoot) {
  const result = runNpm(["pack", ROOT], tempRoot);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout || "npm pack fallo");
  const tarballName = String(result.stdout || "").trim().split(/\r?\n/).pop();
  const tarballPath = path.join(tempRoot, tarballName);
  assert.ok(fs.existsSync(tarballPath), `no se encontro el tarball ${tarballPath}`);
  return tarballPath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  runNode([SKILL_VALIDATE], ROOT);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trackops-smoke-"));
  const tarballPath = packCurrentPackage(tempRoot);
  const packageVersion = readJson(path.join(ROOT, "package.json")).version;

  const bootstrapHome = path.join(tempRoot, "bootstrap-home");
  const bootstrapPrefix = path.join(tempRoot, "bootstrap-prefix");
  fs.mkdirSync(bootstrapHome, { recursive: true });
  fs.mkdirSync(bootstrapPrefix, { recursive: true });

  const bootstrapEnv = {
    TRACKOPS_BOOTSTRAP_HOME: bootstrapHome,
    TRACKOPS_BOOTSTRAP_PREFIX: bootstrapPrefix,
    TRACKOPS_BOOTSTRAP_INSTALL_SOURCE: tarballPath,
  };

  const firstBootstrap = runCommand(process.execPath, [SKILL_BOOTSTRAP], tempRoot, bootstrapEnv);
  assert.strictEqual(firstBootstrap.status, 0, firstBootstrap.stderr || firstBootstrap.stdout || "bootstrap skill fallo");
  assert.match(firstBootstrap.stdout, /TrackOps runtime .* is ready/i);

  const runtimeStamp = readJson(path.join(bootstrapHome, ".trackops", "runtime.json"));
  assert.strictEqual(runtimeStamp.runtimeVersion, packageVersion);
  assert.strictEqual(runtimeStamp.skill, "trackops");
  assert.strictEqual(runtimeStamp.bootstrapPolicy, "first_use");

  const installedCli = path.join(bootstrapPrefix, "node_modules", "trackops", "bin", "trackops.js");
  assert.ok(fs.existsSync(installedCli), "el runtime instalado debe existir dentro del prefijo aislado");
  const installedVersion = runNode([installedCli, "--version"], tempRoot);
  assert.strictEqual(installedVersion.trim(), packageVersion);

  const secondBootstrap = runCommand(process.execPath, [SKILL_BOOTSTRAP], tempRoot, bootstrapEnv);
  assert.strictEqual(secondBootstrap.status, 0, secondBootstrap.stderr || secondBootstrap.stdout || "bootstrap idempotente fallo");
  assert.match(secondBootstrap.stdout, /already ready/i);

  const untouchedRepo = path.join(tempRoot, "untouched-repo");
  fs.mkdirSync(untouchedRepo, { recursive: true });
  const bootstrapNoRepoMutation = runCommand(process.execPath, [SKILL_BOOTSTRAP], untouchedRepo, bootstrapEnv);
  assert.strictEqual(bootstrapNoRepoMutation.status, 0, bootstrapNoRepoMutation.stderr || bootstrapNoRepoMutation.stdout || "bootstrap repetido fallo");
  assert.ok(!fs.existsSync(path.join(untouchedRepo, "project_control.json")), "la skill global no debe crear artefactos de proyecto por si sola");

  const helpOutput = runNode([BIN, "help"], ROOT);
  assert.doesNotMatch(helpOutput, /\btrackops agent\b/i);
  assert.match(helpOutput, /skills\.sh/i);

  const versionOutput = runNode([BIN, "--version"], ROOT);
  assert.strictEqual(versionOutput.trim(), packageVersion);

  const tempProject = path.join(tempRoot, "demo");
  fs.mkdirSync(tempProject, { recursive: true });
  writePackageJson(tempProject, "demo-trackops");

  runNode([BIN, "init"], tempProject);

  const initialControl = readJson(path.join(tempProject, "project_control.json"));
  assert.ok(!Object.prototype.hasOwnProperty.call(initialControl.meta, "agentIntegrations"));
  assert.ok(!fs.existsSync(path.join(tempProject, ".claude")), "init no debe crear integraciones globales por vendor");
  assert.ok(!fs.existsSync(path.join(tempProject, ".agents", "skills", "trackops-operator")), "init no debe instalar trackops-operator localmente");

  const generatedPackage = readJson(path.join(tempProject, "package.json"));
  assert.strictEqual(generatedPackage.scripts["ops:status"], "npx --yes trackops status");
  assert.strictEqual(generatedPackage.scripts["ops:dashboard"], "npx --yes trackops dashboard");

  const statusOutput = runNode([BIN, "status"], tempProject);
  assert.match(statusOutput, /Control Operativo|Operational Control/);
  assert.match(statusOutput, /ops-bootstrap/);

  const nextOutput = runNode([BIN, "next"], tempProject);
  assert.match(nextOutput, /ops-bootstrap/);

  runNode([BIN, "sync"], tempProject);
  for (const file of ["task_plan.md", "progress.md", "findings.md"]) {
    assert.ok(fs.existsSync(path.join(tempProject, file)), `${file} no fue generado`);
  }

  const operaProject = path.join(tempRoot, "opera-en");
  fs.mkdirSync(operaProject, { recursive: true });
  writePackageJson(operaProject, "opera-en");

  runNode([BIN, "init", "--with-opera", "--locale", "en", "--no-bootstrap"], operaProject);
  const englishGenesis = fs.readFileSync(path.join(operaProject, "genesis.md"), "utf8");
  assert.match(englishGenesis, /The Constitution of the project/);

  runNode([BIN, "opera", "install", "--locale", "en", "--non-interactive"], operaProject);
  const operaControl = readJson(path.join(operaProject, "project_control.json"));
  assert.strictEqual(operaControl.meta.locale, "en");
  assert.strictEqual(operaControl.meta.opera.bootstrap.status, "pending");
  assert.ok(Array.isArray(operaControl.meta.opera.bootstrap.missingFields));
  assert.ok(!Object.prototype.hasOwnProperty.call(operaControl.meta, "agentIntegrations"));
  assert.ok(!fs.existsSync(path.join(operaProject, ".claude")), "opera install no debe crear integraciones de vendor");
  assert.ok(!fs.existsSync(path.join(operaProject, ".agents", "skills", "trackops-operator")), "opera install no debe crear skill de vendor local");

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
