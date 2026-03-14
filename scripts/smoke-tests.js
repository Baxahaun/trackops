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

function runNodeResult(args, cwd, envOverrides = {}) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...envOverrides },
  });
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

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout || `git ${args.join(" ")} fallo`);
  return result.stdout.trim();
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

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

function initGitRepo(repo) {
  git(["init"], repo);
  git(["config", "user.email", "smoke@example.com"], repo);
  git(["config", "user.name", "Smoke Runner"], repo);
}

function commitAll(repo, message) {
  git(["add", "."], repo);
  git(["commit", "-m", message], repo);
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
  assert.ok(["es", "en"].includes(runtimeStamp.locale), "el bootstrap global debe fijar un idioma");

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
  assert.match(helpOutput, /workspace status\|migrate/i);
  assert.match(helpOutput, /env status\|sync/i);
  assert.match(helpOutput, /release \[--push\]/i);

  const versionOutput = runNode([BIN, "--version"], ROOT);
  assert.strictEqual(versionOutput.trim(), packageVersion);

  runNode([BIN, "locale", "set", "en"], tempRoot, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  const localeGet = runNode([BIN, "locale", "get"], tempRoot, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  assert.match(localeGet, /Effective language: en|Idioma efectivo: en/);
  const localeDoctor = runNode([BIN, "doctor", "locale"], tempRoot, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  assert.match(localeDoctor, /Source: global|Origen: global/);

  const splitProject = path.join(tempRoot, "split-demo");
  fs.mkdirSync(splitProject, { recursive: true });
  runNode([BIN, "init", "--locale", "es"], splitProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });

  assert.ok(fs.existsSync(path.join(splitProject, ".trackops-workspace.json")));
  assert.ok(fs.existsSync(path.join(splitProject, ".env")));
  assert.ok(fs.existsSync(path.join(splitProject, ".env.example")));
  assert.ok(fs.existsSync(path.join(splitProject, "app")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "project_control.json")));
  assert.ok(fs.existsSync(path.join(splitProject, "app", ".env")));
  assert.ok(fs.existsSync(path.join(splitProject, "app", ".env.example")));
  assert.ok(!fs.existsSync(path.join(splitProject, "project_control.json")));
  assert.ok(!fs.existsSync(path.join(splitProject, "task_plan.md")));

  const splitControl = readJson(path.join(splitProject, "ops", "project_control.json"));
  assert.strictEqual(splitControl.meta.workspace.layout, "split");
  assert.strictEqual(splitControl.meta.environment.rootEnvFile, ".env");
  assert.strictEqual(splitControl.meta.locale, "es");

  const projectLocaleDoctor = runNode([BIN, "doctor", "locale"], splitProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  assert.match(projectLocaleDoctor, /Project language: es|Idioma del proyecto: es/);
  assert.match(projectLocaleDoctor, /Source: project|Origen: proyecto/);

  const statusFromWorkspace = runNode([BIN, "status"], splitProject);
  const statusFromApp = runNode([BIN, "status"], path.join(splitProject, "app"));
  const statusFromOps = runNode([BIN, "status"], path.join(splitProject, "ops"));
  assert.match(statusFromWorkspace, /Layout: split/);
  assert.match(statusFromApp, /Layout: split/);
  assert.match(statusFromOps, /Layout: split/);

  const nextOutput = runNode([BIN, "next"], splitProject);
  assert.match(nextOutput, /ops-bootstrap/);

  runNode([BIN, "sync"], splitProject);
  for (const file of ["task_plan.md", "progress.md", "findings.md"]) {
    assert.ok(fs.existsSync(path.join(splitProject, "ops", file)), `${file} no fue generado en ops/`);
  }

  const envStatus = runNode([BIN, "env", "status"], splitProject);
  assert.match(envStatus, /Root \.env:/);
  assert.match(envStatus, /App bridge:/);

  const nonEmptyProject = path.join(tempRoot, "non-empty");
  fs.mkdirSync(nonEmptyProject, { recursive: true });
  writeJson(path.join(nonEmptyProject, "package.json"), { name: "existing-app", version: "1.0.0" });
  const initNonEmpty = runNodeResult([BIN, "init"], nonEmptyProject);
  assert.notStrictEqual(initNonEmpty.status, 0, "init debe abortar en directorios no vacios");
  assert.match(`${initNonEmpty.stdout}\n${initNonEmpty.stderr}`, /workspace migrate/i);

  writeJson(path.join(splitProject, "app", "package.json"), {
    name: "split-demo",
    version: "1.0.0",
    dependencies: { openai: "^4.0.0" },
    scripts: { test: "echo ok" },
  });
  runNode([BIN, "opera", "install", "--locale", "en", "--non-interactive"], splitProject);

  assert.ok(fs.existsSync(path.join(splitProject, "ops", "genesis.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", ".agent", "hub", "agent.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", ".agents", "skills", "_registry.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "bootstrap", "agent-handoff.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "bootstrap", "agent-handoff.json")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "bootstrap", "open-questions.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "architecture", "runtime-operations.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "architecture", "dependency-graph.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "architecture", "runtime-automation.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "policy", "autonomy.json")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "reviews", "integration-audit.md")));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "reviews", "delivery-audit.md")));
  assert.ok(!fs.existsSync(path.join(splitProject, "genesis.md")));

  const operaControl = readJson(path.join(splitProject, "ops", "project_control.json"));
  assert.strictEqual(operaControl.meta.locale, "en");
  assert.strictEqual(operaControl.meta.opera.installed, true);
  assert.strictEqual(operaControl.meta.opera.bootstrap.mode, "agent_handoff");
  assert.strictEqual(operaControl.meta.opera.bootstrap.status, "awaiting_agent");
  assert.ok(operaControl.meta.opera.skills.includes("project-starter-skill"));
  assert.ok(operaControl.meta.opera.skills.includes("opera-contract-auditor"));
  assert.ok(operaControl.meta.opera.skills.includes("opera-policy-guard"));
  assert.ok(operaControl.meta.environment.requiredKeys.includes("OPENAI_API_KEY"));
  const envRootText = fs.readFileSync(path.join(splitProject, ".env"), "utf8");
  assert.match(envRootText, /OPENAI_API_KEY=/);

  const handoffPrint = runNode([BIN, "opera", "handoff", "--print"], splitProject);
  assert.match(handoffPrint, /project-starter-skill/);
  const handoffJson = JSON.parse(runNode([BIN, "opera", "handoff", "--json"], splitProject));
  assert.strictEqual(handoffJson.skill, "project-starter-skill");

  const directProject = path.join(tempRoot, "direct-demo");
  fs.mkdirSync(directProject, { recursive: true });
  runNode([BIN, "init", "--locale", "en"], directProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  writeJson(path.join(directProject, "app", "package.json"), { name: "direct-demo", version: "1.0.0" });
  runNode([
    BIN,
    "opera",
    "install",
    "--locale",
    "en",
    "--non-interactive",
    "--bootstrap-mode",
    "direct",
    "--technical-level",
    "senior",
    "--project-state",
    "existing_repo",
    "--docs-state",
    "spec_dossier",
    "--decision-ownership",
    "user",
  ], directProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  const directControl = readJson(path.join(directProject, "ops", "project_control.json"));
  assert.strictEqual(directControl.meta.opera.bootstrap.mode, "direct_cli");
  assert.strictEqual(directControl.meta.opera.bootstrap.status, "awaiting_intake");

  writeJson(path.join(splitProject, "ops", "bootstrap", "intake.json"), {
    version: 1,
    technicalLevel: "low",
    projectState: "idea",
    documentationState: "none",
    decisionOwnership: "agent",
    problemStatement: "users need a simple way to book and pay online",
    targetUser: "small studio owners",
    singularDesiredOutcome: "let users create and pay for bookings",
    userLanguage: "en",
    needsPlainLanguage: true,
    recommendedStack: ["nextjs"],
    externalServices: ["OpenAI", "Stripe"],
    sourceOfTruth: "primary bookings database",
    payload: "bookings dashboard",
    behaviorRules: ["keep explanations simple"],
    architecturalInvariants: ["keep app and ops separated"],
    inputSchema: { booking: { email: "string" } },
    outputSchema: { confirmation: { id: "string" } },
    pipeline: ["create booking", "confirm payment"],
    templates: ["booking-confirmation"],
  });
  fs.writeFileSync(
    path.join(splitProject, "ops", "bootstrap", "spec-dossier.md"),
    "# Spec dossier\n\n## Problem statement\nusers need a simple way to book and pay online\n\n## Target user\nsmall studio owners\n\n## Singular desired outcome\nlet users create and pay for bookings\n\n## Delivery target\nbookings dashboard\n\n## Source of truth\nprimary bookings database\n",
    "utf8",
  );
  runNode([BIN, "opera", "bootstrap", "--resume"], splitProject);
  const resumedControl = readJson(path.join(splitProject, "ops", "project_control.json"));
  assert.strictEqual(resumedControl.meta.opera.bootstrap.status, "completed");
  assert.strictEqual(resumedControl.meta.currentFocus, "let users create and pay for bookings");
  assert.ok(resumedControl.meta.environment.requiredKeys.includes("STRIPE_SECRET_KEY"));
  assert.ok(fs.existsSync(path.join(splitProject, "ops", "contract", "operating-contract.json")));
  const operatingContract = readJson(path.join(splitProject, "ops", "contract", "operating-contract.json"));
  assert.strictEqual(operatingContract.version, 3);
  assert.strictEqual(operatingContract.userModel.language, "en");
  assert.strictEqual(operatingContract.userModel.decisionOwnership, "agent");

  const defaultDashboard = startDashboard(splitProject);

  try {
    const ready = await waitForDashboard(defaultDashboard);
    const state = await get(ready.port, "/api/state");
    const envPayload = await get(ready.port, "/api/env");
    const operaBootstrapPayload = await get(ready.port, "/api/opera/bootstrap");
    const operaHandoffPayload = await get(ready.port, "/api/opera/handoff");
    const localSkills = await get(ready.port, "/api/skills/local");
    const discoverSkills = await get(ready.port, "/api/skills/discover");

    assert.strictEqual(state.status, 200);
    assert.strictEqual(envPayload.status, 200);
    assert.strictEqual(operaBootstrapPayload.status, 200);
    assert.strictEqual(operaHandoffPayload.status, 200);
    assert.strictEqual(localSkills.status, 200);
    assert.strictEqual(discoverSkills.status, 200);

    const statePayload = JSON.parse(state.body);
    assert.strictEqual(statePayload.project.layout, "split");
    assert.strictEqual(statePayload.project.workspaceRoot, splitProject);
    assert.strictEqual(statePayload.project.appRoot, path.join(splitProject, "app"));
    assert.strictEqual(statePayload.project.opsRoot, path.join(splitProject, "ops"));
    assert.ok(Array.isArray(statePayload.env.requiredKeys));
    assert.ok(!Object.prototype.hasOwnProperty.call(statePayload.env, "values"));

    const envState = JSON.parse(envPayload.body);
    assert.ok(envState.requiredKeys.includes("OPENAI_API_KEY"));
    assert.ok(envState.missingKeys.includes("OPENAI_API_KEY"));

    const bootstrapState = JSON.parse(operaBootstrapPayload.body);
    assert.strictEqual(bootstrapState.status, "completed");
    assert.strictEqual(bootstrapState.contractVersion, 3);
    assert.strictEqual(bootstrapState.contractReadiness, "verified");
    const handoffState = JSON.parse(operaHandoffPayload.body);
    assert.ok(handoffState.markdown.includes("project-starter-skill"));
    assert.ok(handoffState.openQuestionsFile.endsWith("open-questions.md"));

  } finally {
    await stopDashboard(defaultDashboard);
  }

  const blocked4173 = await isPortFree(4173) ? await occupyPort(4173) : null;
  const fallbackDashboard = startDashboard(splitProject);
  try {
    const ready = await waitForDashboard(fallbackDashboard);
    assert.notStrictEqual(ready.port, 4173, `deberia haber evitado 4173 ocupado:\n${ready.output}`);
    assert.match(ready.output, /Local:/);
  } finally {
    await stopDashboard(fallbackDashboard);
    if (blocked4173) blocked4173.close();
  }

  const strictPort = await findFreePort();
  const occupiedStrictPort = await occupyPort(strictPort);
  try {
    const strictResult = runNodeResult([BIN, "dashboard", "--strict-port", "--port", String(strictPort)], splitProject);
    assert.notStrictEqual(strictResult.status, 0, "el dashboard deberia fallar con --strict-port si el puerto esta ocupado");
    assert.match(`${strictResult.stdout}\n${strictResult.stderr}`, /already in use|esta en uso/i);
  } finally {
    occupiedStrictPort.close();
  }

  const publicPort = await findFreePort("0.0.0.0");
  const publicDashboard = startDashboard(splitProject, ["--public", "--port", String(publicPort)]);
  try {
    const ready = await waitForDashboard(publicDashboard);
    if (hasExternalIpv4()) {
      assert.match(ready.output, /- Network:/);
    }
  } finally {
    await stopDashboard(publicDashboard);
  }

  const noClipboardPort = await findFreePort();
  const noClipboardDashboard = startDashboard(splitProject, ["--port", String(noClipboardPort)], {
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

  const legacyProject = path.join(tempRoot, "legacy-demo");
  fs.mkdirSync(legacyProject, { recursive: true });
  initGitRepo(legacyProject);
  writeJson(path.join(legacyProject, "package.json"), { name: "legacy-demo", version: "1.0.0" });
  runNode([BIN, "init", "--legacy-layout"], legacyProject);
  runNode([BIN, "opera", "install", "--locale", "en", "--no-bootstrap"], legacyProject);
  fs.writeFileSync(path.join(legacyProject, ".env"), "OPENAI_API_KEY=\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, ".env.example"), "OPENAI_API_KEY=\n", "utf8");
  commitAll(legacyProject, "legacy fixture");

  runNode([BIN, "workspace", "migrate"], legacyProject);
  assert.ok(fs.existsSync(path.join(legacyProject, ".trackops-workspace.json")));
  assert.ok(fs.existsSync(path.join(legacyProject, "app", "package.json")));
  assert.ok(fs.existsSync(path.join(legacyProject, "ops", "project_control.json")));
  assert.ok(fs.existsSync(path.join(legacyProject, ".env")));
  assert.ok(fs.existsSync(path.join(legacyProject, "app", ".env")));
  assert.ok(!fs.existsSync(path.join(legacyProject, "project_control.json")));
  const migratedPackage = readJson(path.join(legacyProject, "app", "package.json"));
  assert.ok(!migratedPackage.scripts || !migratedPackage.scripts["ops:status"]);
  assert.match(git(["branch", "--list"], legacyProject), /backup\/trackops-workspace-/);

  const legacyUnsupportedProject = path.join(tempRoot, "legacy-unsupported");
  fs.mkdirSync(legacyUnsupportedProject, { recursive: true });
  initGitRepo(legacyUnsupportedProject);
  runNode([BIN, "init", "--locale", "en"], legacyUnsupportedProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  const legacyUnsupportedControlPath = path.join(legacyUnsupportedProject, "ops", "project_control.json");
  const legacyUnsupportedControl = readJson(legacyUnsupportedControlPath);
  legacyUnsupportedControl.meta.opera = {
    installed: true,
    version: "0.9.0",
  };
  writeJson(legacyUnsupportedControlPath, legacyUnsupportedControl);
  const legacyStatusOutput = runNode([BIN, "opera", "status"], legacyUnsupportedProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  assert.match(legacyStatusOutput, /legacy_unsupported/);
  const upgradeWithoutReset = runNodeResult([BIN, "opera", "upgrade", "--stable"], legacyUnsupportedProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  assert.strictEqual(upgradeWithoutReset.status, 0);
  assert.match(`${upgradeWithoutReset.stdout}\n${upgradeWithoutReset.stderr}`, /legacy/i);
  runNode([BIN, "opera", "upgrade", "--stable", "--reset"], legacyUnsupportedProject, { TRACKOPS_BOOTSTRAP_HOME: bootstrapHome });
  const upgradedLegacyControl = readJson(legacyUnsupportedControlPath);
  assert.strictEqual(upgradedLegacyControl.meta.opera.legacyStatus, "supported");
  assert.strictEqual(upgradedLegacyControl.meta.opera.stableTag, "stable");
  assert.ok(fs.existsSync(path.join(legacyUnsupportedProject, "ops", ".tmp", "upgrade-backups")));

  const releaseProject = path.join(tempRoot, "release-demo");
  fs.mkdirSync(releaseProject, { recursive: true });
  initGitRepo(releaseProject);
  runNode([BIN, "init"], releaseProject);
  writeJson(path.join(releaseProject, "app", "package.json"), { name: "release-demo", version: "1.0.0" });
  fs.writeFileSync(path.join(releaseProject, "app", "index.js"), "console.log('release');\n", "utf8");
  commitAll(releaseProject, "split fixture");
  git(["checkout", "-b", "develop"], releaseProject);
  runNode([BIN, "release"], releaseProject);
  const publishFiles = git(["ls-tree", "--name-only", "master"], releaseProject).split(/\r?\n/).filter(Boolean);
  assert.ok(publishFiles.includes("package.json"));
  assert.ok(publishFiles.includes(".env.example"));
  assert.ok(!publishFiles.includes("ops"));
  assert.ok(!publishFiles.includes(".trackops-workspace.json"));

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log("Smoke tests OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
