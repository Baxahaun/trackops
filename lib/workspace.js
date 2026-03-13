#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const config = require("./config");
const registry = require("./registry");
const env = require("./env");

const OPS_ARTIFACTS = [
  "project_control.json",
  "task_plan.md",
  "progress.md",
  "findings.md",
  "genesis.md",
  ".agent",
  ".agents",
  ".githooks",
  ".tmp",
];

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function git(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function isIgnorableDirtyLine(line) {
  const normalized = String(line || "").replace(/\\/g, "/");
  return normalized.endsWith(".tmp/project-control-runtime.json");
}

function isRetryableMoveError(error) {
  return ["EPERM", "EXDEV", "EBUSY", "ENOTEMPTY"].includes(error?.code);
}

function assertCleanGit(root, allowDirty = false) {
  const status = git(["status", "--porcelain"], root);
  const dirtyLines = String(status.stdout || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !isIgnorableDirtyLine(line));
  if (!allowDirty && dirtyLines.length > 0) {
    throw new Error("Workspace migration requires a clean git worktree.");
  }
}

function createBackupBranch(root) {
  const name = `backup/trackops-workspace-${nowStamp()}`;
  const result = git(["branch", name], root);
  if (result.status !== 0) {
    throw new Error(result.stderr || `Could not create backup branch ${name}`);
  }
  return name;
}

function buildManifest() {
  return {
    version: 1,
    layout: "split",
    appDir: config.DEFAULT_APP_DIR,
    opsDir: config.DEFAULT_OPS_DIR,
    env: {
      rootFile: ".env",
      exampleFile: ".env.example",
      appBridgeFile: "app/.env",
      bridgeMode: "symlink-or-copy",
    },
    branches: {
      development: config.DEFAULT_DEV_BRANCH,
      publish: config.DEFAULT_PUBLISH_BRANCH,
    },
    publish: {
      mode: "subtree-flatten",
      sourceDir: config.DEFAULT_APP_DIR,
      includeRootFiles: [".env.example"],
      requireCleanWorktree: true,
    },
  };
}

function ensureRootGitignore(workspaceRoot) {
  const gitignorePath = path.join(workspaceRoot, ".gitignore");
  const required = ["/.env", "/app/.env", "/ops/.tmp/"];
  let lines = [];
  if (fs.existsSync(gitignorePath)) {
    lines = fs.readFileSync(gitignorePath, "utf8").split(/\r?\n/);
  }
  for (const entry of required) {
    if (!lines.includes(entry)) lines.push(entry);
  }
  fs.writeFileSync(gitignorePath, `${lines.filter(Boolean).join("\n")}\n`, "utf8");
}

function stripOpsScripts(packageFile) {
  if (!fs.existsSync(packageFile)) return;
  const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  if (!pkg.scripts) return;
  ["ops", "ops:help", "ops:dashboard", "ops:status", "ops:next", "ops:sync", "ops:repo"].forEach((key) => {
    delete pkg.scripts[key];
  });
  fs.writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function moveEntry(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) return;
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  try {
    fs.renameSync(fromPath, toPath);
  } catch (error) {
    if (!isRetryableMoveError(error)) throw error;
    const stat = fs.statSync(fromPath);
    if (stat.isDirectory()) {
      fs.cpSync(fromPath, toPath, { recursive: true, force: true });
      fs.rmSync(fromPath, { recursive: true, force: true });
      return;
    }
    fs.copyFileSync(fromPath, toPath);
    fs.rmSync(fromPath, { force: true });
  }
}

function shouldResumePartialMigration(root, manifest) {
  if (!fs.existsSync(path.join(root, config.WORKSPACE_MANIFEST))) return false;
  const excluded = new Set([
    ".git",
    config.WORKSPACE_MANIFEST,
    manifest.appDir,
    manifest.opsDir,
    ".env",
    ".env.example",
  ]);
  const hasPendingOps = OPS_ARTIFACTS.some((entry) => fs.existsSync(path.join(root, entry)));
  const hasPendingAppEntries = fs.readdirSync(root, { withFileTypes: true })
    .some((entry) => !excluded.has(entry.name));
  return hasPendingOps || hasPendingAppEntries;
}

function migrateWorkspace(rootDir, options = {}) {
  const resolved = config.resolveWorkspaceContext(rootDir);
  if (!resolved) {
    throw new Error("workspace migrate only applies to legacy TrackOps projects.");
  }

  const root = resolved.workspaceRoot;
  let manifest;
  if (resolved.layout === "legacy") {
    manifest = buildManifest();
  } else {
    manifest = config.loadWorkspaceManifest(resolved) || buildManifest();
    if (!shouldResumePartialMigration(root, manifest)) {
      throw new Error("workspace migrate only applies to legacy TrackOps projects.");
    }
  }

  assertCleanGit(root, options.allowDirty === true);
  const backupBranch = createBackupBranch(root);

  const appDir = path.join(root, manifest.appDir);
  const opsDir = path.join(root, manifest.opsDir);
  fs.mkdirSync(appDir, { recursive: true });
  fs.mkdirSync(opsDir, { recursive: true });
  config.saveWorkspaceManifest(config.createSplitContext(root, manifest), manifest);

  for (const entry of OPS_ARTIFACTS) {
    moveEntry(path.join(root, entry), path.join(opsDir, entry));
  }

  const excluded = new Set([
    ".git",
    config.WORKSPACE_MANIFEST,
    manifest.appDir,
    manifest.opsDir,
    ".env",
    ".env.example",
  ]);

  const topLevel = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of topLevel) {
    if (excluded.has(entry.name)) continue;
    moveEntry(path.join(root, entry.name), path.join(appDir, entry.name));
  }

  ensureRootGitignore(root);
  stripOpsScripts(path.join(appDir, "package.json"));

  const context = config.createSplitContext(root, manifest);
  const control = config.loadControl(context);
  control.meta = control.meta || {};
  control.meta.workspace = {
    layout: "split",
    workspaceRoot: ".",
    appDir: manifest.appDir,
    opsDir: manifest.opsDir,
    developmentBranch: manifest.branches.development,
    publishBranch: manifest.branches.publish,
    publishMode: manifest.publish.mode,
  };
  control.meta.environment = {
    ...(control.meta.environment || {}),
    rootEnvFile: ".env",
    exampleFile: ".env.example",
    appBridgeFile: "app/.env",
    bridgeMode: "symlink-or-copy",
    requiredKeys: control.meta.environment?.requiredKeys || [],
    optionalKeys: control.meta.environment?.optionalKeys || [],
    lastAuditAt: control.meta.environment?.lastAuditAt || null,
  };
  config.saveControl(context, control);
  env.syncEnvironment(context, control);
  const controlApi = require("./control");
  controlApi.syncDocs(context, config.loadControl(context));
  controlApi.refreshRepoRuntime(context, { quiet: true });

  const hookConfig = git(["config", "core.hooksPath", "ops/.githooks"], root);
  if (hookConfig.status !== 0) {
    throw new Error(hookConfig.stderr || "Could not update git hooks path.");
  }

  registry.registerProject(root);
  return { root, backupBranch, context };
}

function status(contextOrRoot) {
  const context = config.ensureContext(contextOrRoot);
  console.log("Workspace:");
  console.log(`  Layout: ${context.layout}`);
  console.log(`  Root: ${context.workspaceRoot}`);
  console.log(`  App: ${context.appRoot}`);
  console.log(`  Ops: ${context.opsRoot}`);
  if (context.manifestFile) {
    console.log(`  Manifest: ${context.manifestFile}`);
  }
  console.log(`  Control: ${context.controlFile}`);
}

function cmdStatus(root) {
  status(root);
}

function cmdMigrate(root, args = []) {
  const allowDirty = args.includes("--allow-dirty");
  const result = migrateWorkspace(root, { allowDirty });
  console.log(`Workspace migrated: ${result.root}`);
  console.log(`Backup branch: ${result.backupBranch}`);
}

module.exports = {
  OPS_ARTIFACTS,
  buildManifest,
  ensureRootGitignore,
  stripOpsScripts,
  migrateWorkspace,
  status,
  cmdStatus,
  cmdMigrate,
};
