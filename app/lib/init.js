#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const config = require("./config");
const registry = require("./registry");
const env = require("./env");
const workspace = require("./workspace");
const { t, setLocale } = require("./i18n");
const { detectSystemLocale, promptForLocale, resolveLocale } = require("./locale");

const GENERATED_SCRIPT_COMMANDS = {
  ops: "npx --yes trackops",
  "ops:help": "npx --yes trackops help",
  "ops:dashboard": "npx --yes trackops dashboard",
  "ops:status": "npx --yes trackops status",
  "ops:next": "npx --yes trackops next",
  "ops:sync": "npx --yes trackops sync",
  "ops:repo": "npx --yes trackops refresh-repo",
};

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(args) {
  const options = {
    locale: null,
    name: null,
    withOpera: false,
    phases: null,
    noBootstrap: false,
    legacyLayout: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) { options.locale = args[i + 1]; i += 1; }
    else if (args[i] === "--name" && args[i + 1]) { options.name = args[i + 1]; i += 1; }
    else if (args[i] === "--with-opera" || args[i] === "--with-etapa") { options.withOpera = true; }
    else if (args[i] === "--no-bootstrap") { options.noBootstrap = true; }
    else if (args[i] === "--legacy-layout") { options.legacyLayout = true; }
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
    } catch (_e) {
      // noop
    }
  }
  return path.basename(root);
}

function buildDefaultControl(context, options) {
  const locale = resolveLocale(options.locale, config.DEFAULT_LOCALE);
  const phases = options.phases || config.buildDefaultPhases(locale);
  const isSplit = context.layout === "split";
  setLocale(locale);

  return {
    meta: {
      projectName: options.name || "My Project",
      controlVersion: 2,
      locale,
      phases,
      updatedAt: nowIso(),
      executionSource: "project_control.json",
      currentFocus: t("init.defaultFocus"),
      focusPhase: phases[0]?.id || "O",
      deliveryTarget: t("init.defaultTarget"),
      workspace: isSplit ? {
        layout: "split",
        workspaceRoot: ".",
        appDir: path.basename(context.appRoot),
        opsDir: path.basename(context.opsRoot),
        developmentBranch: context.branches.development,
        publishBranch: context.branches.publish,
        publishMode: context.publish.mode,
      } : undefined,
      environment: {
        rootEnvFile: path.relative(context.workspaceRoot, context.env.rootFile).replace(/\\/g, "/"),
        exampleFile: path.relative(context.workspaceRoot, context.env.exampleFile).replace(/\\/g, "/"),
        appBridgeFile: path.relative(context.workspaceRoot, context.env.appBridgeFile).replace(/\\/g, "/"),
        bridgeMode: isSplit ? "symlink-or-copy" : "none",
        requiredKeys: [],
        optionalKeys: [],
        lastAuditAt: null,
      },
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
        phase: phases[0]?.id || "O",
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
  Object.assign(pkg.scripts, GENERATED_SCRIPT_COMMANDS);
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function installHooks(context) {
  const hooksDir = context.paths.hooksDir;
  fs.mkdirSync(hooksDir, { recursive: true });

  const relativeCommand = context.layout === "split"
    ? "npx --yes trackops refresh-repo --quiet >/dev/null 2>&1 || true\n"
    : "npx --yes trackops refresh-repo --quiet >/dev/null 2>&1 || true\n";
  const hookContent = `#!/bin/sh\n${relativeCommand}`;
  for (const hookName of ["post-commit", "post-checkout", "post-merge"]) {
    const hookPath = path.join(hooksDir, hookName);
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  }

  if (fs.existsSync(path.join(context.workspaceRoot, ".git"))) {
    const hooksPath = context.layout === "split" ? "ops/.githooks" : ".githooks";
    spawnSync("git", ["config", "core.hooksPath", hooksPath], { cwd: context.workspaceRoot, encoding: "utf8" });
  }
}

function ensureTmpDir(context) {
  fs.mkdirSync(context.paths.tmpDir, { recursive: true });
  const gitkeep = path.join(context.paths.tmpDir, ".gitkeep");
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, "", "utf8");
  }
}

function ensureSplitLayoutAllowed(targetRoot) {
  const entries = fs.readdirSync(targetRoot, { withFileTypes: true });
  const meaningful = entries.filter((entry) => ![".git"].includes(entry.name));
  if (meaningful.length > 0) {
    throw new Error("Directory is not empty. Run 'trackops workspace migrate' to convert an existing project.");
  }
}

function initSplitProject(root, options) {
  const targetRoot = path.resolve(root);
  fs.mkdirSync(targetRoot, { recursive: true });
  ensureSplitLayoutAllowed(targetRoot);

  const manifest = workspace.buildManifest();
  const context = config.createSplitContext(targetRoot, manifest);
  fs.mkdirSync(context.appRoot, { recursive: true });
  fs.mkdirSync(context.opsRoot, { recursive: true });
  config.saveWorkspaceManifest(context, manifest);
  workspace.ensureRootGitignore(targetRoot);

  const control = buildDefaultControl(context, options);
  control.meta.projectName = options.name || detectProjectName(context.appRoot);
  config.saveControl(context, control);

  installHooks(context);
  ensureTmpDir(context);
  const controlApi = require("./control");
  controlApi.syncDocs(context, control);
  env.syncEnvironment(context, control);

  try {
    registry.registerProject(context.workspaceRoot);
  } catch (_e) {
    // ignore
  }

  console.log(t("init.created", { file: ".trackops-workspace.json" }));
  console.log(t("init.created", { file: "ops/project_control.json" }));
  console.log(t("init.created", { file: "ops/.githooks/" }));
  console.log(t("init.created", { file: ".env" }));
  console.log(t("init.created", { file: ".env.example" }));
  console.log("");
  console.log(t("init.welcome"));

  return { root: context.workspaceRoot, context, isUpgrade: false, operaDetected: false };
}

function initLegacyProject(root, options) {
  const targetRoot = path.resolve(root);
  const context = config.createLegacyContext(targetRoot);
  const controlFile = context.controlFile;
  const isUpgrade = fs.existsSync(controlFile);
  options.locale = resolveLocale(options.locale, detectSystemLocale());

  if (!options.name) {
    options.name = detectProjectName(targetRoot);
  }

  if (isUpgrade) {
    const existing = JSON.parse(fs.readFileSync(controlFile, "utf8"));
    if (!existing.meta.phases) existing.meta.phases = options.phases || config.buildDefaultPhases(options.locale);
    if (!existing.meta.locale) existing.meta.locale = options.locale || config.DEFAULT_LOCALE;
    if (!existing.meta.controlVersion || existing.meta.controlVersion < 2) existing.meta.controlVersion = 2;
    existing.meta.updatedAt = nowIso();
    fs.writeFileSync(controlFile, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
    console.log(t("init.updated", { file: "project_control.json" }));
  } else {
    const control = buildDefaultControl(context, options);
    control.meta.projectName = options.name;
    fs.writeFileSync(controlFile, `${JSON.stringify(control, null, 2)}\n`, "utf8");
    console.log(t("init.created", { file: "project_control.json" }));
  }

  upsertScripts(targetRoot);
  console.log(t("init.updated", { file: "package.json" }));

  installHooks(context);
  console.log(t("init.created", { file: ".githooks/" }));
  ensureTmpDir(context);

  try {
    registry.registerProject(targetRoot);
    console.log(t("init.registered"));
  } catch (_e) {
    // ignore
  }

  console.log("");
  console.log(t("init.welcome"));
  return { root: targetRoot, context, isUpgrade, operaDetected: false };
}

function initProject(root, options) {
  const normalized = { ...(options || {}) };
  normalized.locale = resolveLocale(normalized.locale, config.DEFAULT_LOCALE);
  setLocale(normalized.locale);
  if (normalized.legacyLayout) {
    return initLegacyProject(root, normalized);
  }
  return initSplitProject(root, normalized);
}

async function cmdInit(args) {
  const options = parseArgs(args || []);
  options.locale = resolveLocale(options.locale, null);
  if (!options.locale) {
    options.locale = await promptForLocale(detectSystemLocale());
  }
  setLocale(options.locale || config.DEFAULT_LOCALE);

  const result = initProject(process.cwd(), options);

  if (options.withOpera) {
    const opera = require("./opera");
    await opera.install(result.root, {
      locale: options.locale,
      bootstrap: !options.noBootstrap,
    });
  }
}

module.exports = { initProject, cmdInit, buildDefaultControl };
