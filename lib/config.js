#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { normalizeLocale } = require("./locale");

const DEFAULT_PHASE_IDS = ["O", "P", "E", "R", "A"];
const DEFAULT_PHASE_LABELS = {
  es: {
    O: "Orquestar",
    P: "Probar",
    E: "Estructurar",
    R: "Refinar",
    A: "Automatizar",
  },
  en: {
    O: "Orchestrate",
    P: "Prove",
    E: "Establish",
    R: "Refine",
    A: "Automate",
  },
};

const DEFAULT_LOCALE = "es";
const WORKSPACE_MANIFEST = ".trackops-workspace.json";
const DEFAULT_APP_DIR = "app";
const DEFAULT_OPS_DIR = "ops";
const DEFAULT_DEV_BRANCH = "develop";
const DEFAULT_PUBLISH_BRANCH = "master";

function buildDefaultPhases(locale) {
  const normalized = normalizeLocale(locale) || DEFAULT_LOCALE;
  const labels = DEFAULT_PHASE_LABELS[normalized] || DEFAULT_PHASE_LABELS[DEFAULT_LOCALE];
  return DEFAULT_PHASE_IDS.map((id, index) => ({
    id,
    label: labels[id],
    index: index + 1,
  }));
}

const DEFAULT_PHASES = buildDefaultPhases(DEFAULT_LOCALE);

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function readJson(filePath, fallback = null) {
  if (!fileExists(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function createSplitContext(workspaceRoot, manifest = {}) {
  const appDir = manifest.appDir || DEFAULT_APP_DIR;
  const opsDir = manifest.opsDir || DEFAULT_OPS_DIR;
  const workspace = path.resolve(workspaceRoot);
  const appRoot = path.join(workspace, appDir);
  const opsRoot = path.join(workspace, opsDir);
  const env = manifest.env || {};

  return {
    layout: "split",
    workspaceRoot: workspace,
    root: workspace,
    projectRoot: workspace,
    appRoot,
    opsRoot,
    manifestFile: path.join(workspace, WORKSPACE_MANIFEST),
    packageFile: path.join(appRoot, "package.json"),
    controlFile: path.join(opsRoot, "project_control.json"),
    runtimeFile: path.join(opsRoot, ".tmp", "project-control-runtime.json"),
    docs: {
      taskPlan: path.join(opsRoot, "task_plan.md"),
      progress: path.join(opsRoot, "progress.md"),
      findings: path.join(opsRoot, "findings.md"),
    },
    paths: {
      taskPlan: path.join(opsRoot, "task_plan.md"),
      progress: path.join(opsRoot, "progress.md"),
      findings: path.join(opsRoot, "findings.md"),
      architectureDir: path.join(opsRoot, "architecture"),
      hooksDir: path.join(opsRoot, ".githooks"),
      tmpDir: path.join(opsRoot, ".tmp"),
      bootstrapDir: path.join(opsRoot, "bootstrap"),
      contractDir: path.join(opsRoot, "contract"),
      contractFile: path.join(opsRoot, "contract", "operating-contract.json"),
      policyDir: path.join(opsRoot, "policy"),
      autonomyPolicyFile: path.join(opsRoot, "policy", "autonomy.json"),
      reviewsDir: path.join(opsRoot, "reviews"),
      skillsDir: path.join(opsRoot, ".agents", "skills"),
      registryPath: path.join(opsRoot, ".agents", "skills", "_registry.md"),
      agentHubDir: path.join(opsRoot, ".agent", "hub"),
      genesisFile: path.join(opsRoot, "genesis.md"),
    },
    env: {
      rootFile: path.join(workspace, env.rootFile || ".env"),
      exampleFile: path.join(workspace, env.exampleFile || ".env.example"),
      appBridgeFile: path.join(workspace, env.appBridgeFile || path.join(appDir, ".env")),
      appExampleBridgeFile: path.join(appRoot, ".env.example"),
      bridgeMode: env.bridgeMode || "symlink-or-copy",
    },
    branches: {
      development: manifest.branches?.development || DEFAULT_DEV_BRANCH,
      publish: manifest.branches?.publish || DEFAULT_PUBLISH_BRANCH,
    },
    publish: {
      mode: manifest.publish?.mode || "subtree-flatten",
      sourceDir: manifest.publish?.sourceDir || appDir,
      includeRootFiles: Array.isArray(manifest.publish?.includeRootFiles)
        ? manifest.publish.includeRootFiles
        : [".env.example"],
      requireCleanWorktree: manifest.publish?.requireCleanWorktree !== false,
    },
  };
}

function createLegacyContext(rootDir) {
  const root = path.resolve(rootDir);
  return {
    layout: "legacy",
    workspaceRoot: root,
    root,
    projectRoot: root,
    appRoot: root,
    opsRoot: root,
    manifestFile: null,
    packageFile: path.join(root, "package.json"),
    controlFile: path.join(root, "project_control.json"),
    runtimeFile: path.join(root, ".tmp", "project-control-runtime.json"),
    docs: {
      taskPlan: path.join(root, "task_plan.md"),
      progress: path.join(root, "progress.md"),
      findings: path.join(root, "findings.md"),
    },
    paths: {
      taskPlan: path.join(root, "task_plan.md"),
      progress: path.join(root, "progress.md"),
      findings: path.join(root, "findings.md"),
      architectureDir: path.join(root, "architecture"),
      hooksDir: path.join(root, ".githooks"),
      tmpDir: path.join(root, ".tmp"),
      bootstrapDir: path.join(root, "bootstrap"),
      contractDir: path.join(root, "contract"),
      contractFile: path.join(root, "contract", "operating-contract.json"),
      policyDir: path.join(root, "policy"),
      autonomyPolicyFile: path.join(root, "policy", "autonomy.json"),
      reviewsDir: path.join(root, "reviews"),
      skillsDir: path.join(root, ".agents", "skills"),
      registryPath: path.join(root, ".agents", "skills", "_registry.md"),
      agentHubDir: path.join(root, ".agent", "hub"),
      genesisFile: path.join(root, "genesis.md"),
    },
    env: {
      rootFile: path.join(root, ".env"),
      exampleFile: path.join(root, ".env.example"),
      appBridgeFile: path.join(root, ".env"),
      appExampleBridgeFile: path.join(root, ".env.example"),
      bridgeMode: "none",
    },
    branches: {
      development: DEFAULT_DEV_BRANCH,
      publish: DEFAULT_PUBLISH_BRANCH,
    },
    publish: {
      mode: "legacy",
      sourceDir: ".",
      includeRootFiles: [".env.example"],
      requireCleanWorktree: true,
    },
  };
}

function resolveWorkspaceContext(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;
  let legacyCandidate = null;

  while (true) {
    const manifestFile = path.join(dir, WORKSPACE_MANIFEST);
    if (fileExists(manifestFile)) {
      return createSplitContext(dir, readJson(manifestFile, {}) || {});
    }

    if (!legacyCandidate && fileExists(path.join(dir, "project_control.json"))) {
      legacyCandidate = dir;
    }

    if (dir === root) break;
    dir = path.dirname(dir);
  }

  if (legacyCandidate) {
    return createLegacyContext(legacyCandidate);
  }

  return null;
}

function ensureContext(contextOrRoot) {
  if (!contextOrRoot) return resolveWorkspaceContext(process.cwd());
  if (typeof contextOrRoot === "object" && contextOrRoot.workspaceRoot) return contextOrRoot;
  const resolved = resolveWorkspaceContext(contextOrRoot);
  if (resolved) return resolved;
  return createLegacyContext(contextOrRoot);
}

function resolveProjectRoot(startDir) {
  const context = resolveWorkspaceContext(startDir);
  return context ? context.workspaceRoot : null;
}

function controlFilePath(contextOrRoot) {
  return ensureContext(contextOrRoot).controlFile;
}

function runtimeFilePath(contextOrRoot) {
  return ensureContext(contextOrRoot).runtimeFile;
}

function docFilePaths(contextOrRoot) {
  return ensureContext(contextOrRoot).docs;
}

function envFilePaths(contextOrRoot) {
  return ensureContext(contextOrRoot).env;
}

function packageFilePath(contextOrRoot) {
  return ensureContext(contextOrRoot).packageFile;
}

function workspaceManifestPath(contextOrRoot) {
  return ensureContext(contextOrRoot).manifestFile;
}

function isDefaultPhaseShape(phases) {
  if (!Array.isArray(phases) || phases.length !== DEFAULT_PHASE_IDS.length) return false;
  return phases.every((phase, index) => phase?.id === DEFAULT_PHASE_IDS[index]);
}

function getPhases(control, localeOverride) {
  const locale = normalizeLocale(localeOverride || control.meta?.locale) || DEFAULT_LOCALE;
  if (Array.isArray(control.meta?.phases) && control.meta.phases.length > 0) {
    if (isDefaultPhaseShape(control.meta.phases)) {
      return buildDefaultPhases(locale);
    }
    return control.meta.phases;
  }
  return buildDefaultPhases(locale);
}

function getLocale(control) {
  return normalizeLocale(control.meta?.locale) || DEFAULT_LOCALE;
}

function isOperaInstalled(control) {
  return control.meta?.opera?.installed === true;
}

function getOperaVersion(control) {
  return control.meta?.opera?.version || null;
}

function loadControl(contextOrRoot) {
  const filePath = controlFilePath(contextOrRoot);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveControl(contextOrRoot, control) {
  control.meta = control.meta || {};
  control.meta.updatedAt = new Date().toISOString();
  const filePath = controlFilePath(contextOrRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(control, null, 2) + "\n", "utf8");
}

function loadWorkspaceManifest(contextOrRoot) {
  const context = ensureContext(contextOrRoot);
  if (!context.manifestFile || !fileExists(context.manifestFile)) return null;
  return readJson(context.manifestFile, null);
}

function saveWorkspaceManifest(contextOrRoot, manifest) {
  const context = ensureContext(contextOrRoot);
  const manifestFile = context.manifestFile || path.join(context.workspaceRoot, WORKSPACE_MANIFEST);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

module.exports = {
  DEFAULT_PHASES,
  DEFAULT_PHASE_IDS,
  DEFAULT_LOCALE,
  DEFAULT_APP_DIR,
  DEFAULT_OPS_DIR,
  DEFAULT_DEV_BRANCH,
  DEFAULT_PUBLISH_BRANCH,
  WORKSPACE_MANIFEST,
  buildDefaultPhases,
  createSplitContext,
  createLegacyContext,
  resolveWorkspaceContext,
  resolveProjectRoot,
  ensureContext,
  controlFilePath,
  runtimeFilePath,
  docFilePaths,
  envFilePaths,
  packageFilePath,
  workspaceManifestPath,
  loadWorkspaceManifest,
  saveWorkspaceManifest,
  getPhases,
  getLocale,
  isOperaInstalled,
  getOperaVersion,
  loadControl,
  saveControl,
};
