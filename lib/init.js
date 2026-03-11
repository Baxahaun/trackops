#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { DEFAULT_PHASES, DEFAULT_LOCALE } = require("./config");
const registry = require("./registry");
const { t, setLocale } = require("./i18n");

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(args) {
  const options = { locale: null, name: null, withOpera: false, phases: null };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) { options.locale = args[i + 1]; i += 1; }
    else if (args[i] === "--name" && args[i + 1]) { options.name = args[i + 1]; i += 1; }
    else if (args[i] === "--with-opera" || args[i] === "--with-etapa") { options.withOpera = true; }
    else if (args[i] === "--phases" && args[i + 1]) {
      try { options.phases = JSON.parse(args[i + 1]); } catch (_e) { /* ignore */ }
      i += 1;
    }
  }
  return options;
}

function detectProjectName(root) {
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return pkg.displayName || pkg.name || path.basename(root);
    } catch (_e) { /* ignore */ }
  }
  return path.basename(root);
}

function hasExistingOpera(root) {
  return (
    fs.existsSync(path.join(root, ".agent", "hub")) ||
    fs.existsSync(path.join(root, ".agents", "skills"))
  );
}

function buildDefaultControl(options) {
  const locale = options.locale || DEFAULT_LOCALE;
  setLocale(locale);

  return {
    meta: {
      projectName: options.name || "My Project",
      controlVersion: 2,
      locale,
      phases: options.phases || DEFAULT_PHASES,
      updatedAt: nowIso(),
      executionSource: "project_control.json",
      currentFocus: t("init.defaultFocus"),
      focusPhase: (options.phases || DEFAULT_PHASES)[0]?.id || "E",
      deliveryTarget: t("init.defaultTarget"),
    },
    checks: {
      lastBuild: { status: "pending", date: null, note: "" },
      lastTest: { status: "pending", date: null, note: "" },
      lastReview: { status: "pending", date: null, note: "" },
    },
    rituals: {
      startOfSession: ["trackops status", "trackops next"],
      beforeImplementation: ["trackops task start <task-id>"],
      endOfSession: ["trackops task review|complete|block <task-id> <note>", "trackops sync"],
      beforeCommit: ["trackops status", "trackops sync"],
    },
    milestones: [],
    decisionsPending: [],
    tasks: [
      {
        id: "ops-bootstrap",
        title: t("init.defaultTaskTitle"),
        phase: (options.phases || DEFAULT_PHASES)[0]?.id || "E",
        stream: "Operations",
        priority: "P0",
        status: "pending",
        required: true,
        dependsOn: [],
        summary: t("init.defaultTaskSummary"),
        acceptance: [],
        history: [{ at: nowIso(), action: "create", note: "trackops init" }],
      },
    ],
    findings: [],
  };
}

function upsertScripts(root) {
  const pkgPath = path.join(root, "package.json");
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")); } catch (_e) { /* ignore */ }
  }
  pkg.scripts = pkg.scripts || {};
  Object.assign(pkg.scripts, {
    ops: "trackops",
    "ops:help": "trackops help",
    "ops:dashboard": "trackops dashboard",
    "ops:status": "trackops status",
    "ops:next": "trackops next",
    "ops:sync": "trackops sync",
    "ops:repo": "trackops refresh-repo",
  });
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function installHooks(root) {
  const hooksDir = path.join(root, ".githooks");
  fs.mkdirSync(hooksDir, { recursive: true });

  const hookContent = "#!/bin/sh\nnpx trackops refresh-repo --quiet >/dev/null 2>&1 || true\n";
  for (const hookName of ["post-commit", "post-checkout", "post-merge"]) {
    const hookPath = path.join(hooksDir, hookName);
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  }

  if (fs.existsSync(path.join(root, ".git"))) {
    spawnSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, encoding: "utf8" });
  }
}

function ensureTmpDir(root) {
  const tmpDir = path.join(root, ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const gitkeep = path.join(tmpDir, ".gitkeep");
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, "", "utf8");
  }
}

function initProject(root, options) {
  const targetRoot = path.resolve(root);
  const controlFile = path.join(targetRoot, "project_control.json");
  const isUpgrade = fs.existsSync(controlFile);

  if (!options.name) {
    options.name = detectProjectName(targetRoot);
  }

  if (isUpgrade) {
    // Upgrade: add new meta fields if missing
    const existing = JSON.parse(fs.readFileSync(controlFile, "utf8"));
    if (!existing.meta.phases) existing.meta.phases = options.phases || DEFAULT_PHASES;
    if (!existing.meta.locale) existing.meta.locale = options.locale || DEFAULT_LOCALE;
    if (!existing.meta.controlVersion || existing.meta.controlVersion < 2) existing.meta.controlVersion = 2;
    existing.meta.updatedAt = nowIso();
    fs.writeFileSync(controlFile, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
    console.log(t("init.updated", { file: "project_control.json" }));
  } else {
    const control = buildDefaultControl(options);
    fs.writeFileSync(controlFile, `${JSON.stringify(control, null, 2)}\n`, "utf8");
    console.log(t("init.created", { file: "project_control.json" }));
  }

  upsertScripts(targetRoot);
  console.log(t("init.updated", { file: "package.json" }));

  installHooks(targetRoot);
  console.log(t("init.created", { file: ".githooks/" }));

  ensureTmpDir(targetRoot);

  try {
    registry.registerProject(targetRoot);
    console.log(t("init.registered"));
  } catch (_e) { /* ignore */ }

  const operaDetected = hasExistingOpera(targetRoot);

  console.log("");
  console.log(t("init.welcome"));

  return { root: targetRoot, isUpgrade, operaDetected };
}

function cmdInit(args) {
  const options = parseArgs(args || []);
  const root = process.cwd();
  setLocale(options.locale || DEFAULT_LOCALE);

  const result = initProject(root, options);

  if (options.withOpera) {
    const opera = require("./opera");
    opera.install(root, {});
  } else if (result.operaDetected) {
    console.log("");
    console.log(t("opera.primitiveDetected"));
    console.log("  Run 'trackops opera install' to upgrade to managed OPERA.");
  }
}

module.exports = { initProject, cmdInit, buildDefaultControl };
