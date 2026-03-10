#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const { t } = require("./i18n");

const REGISTRY_DIR = path.join(os.homedir(), ".codex", "trackops");
const REGISTRY_FILE = path.join(REGISTRY_DIR, "registry.json");

function nowIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function shortHash(value) {
  let hash = 0;
  const input = String(value || "");
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).slice(0, 6);
}

function ensureRegistryDir() {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
}

function loadRegistry() {
  ensureRegistryDir();
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { version: 1, updatedAt: nowIso(), projects: [] };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
}

function saveRegistry(registry) {
  ensureRegistryDir();
  registry.updatedAt = nowIso();
  fs.writeFileSync(REGISTRY_FILE, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function isProjectInstalled(rootDir) {
  return fs.existsSync(path.join(rootDir, "project_control.json"));
}

function inspectProject(rootDir) {
  const root = path.resolve(rootDir);
  const controlStateFile = path.join(root, "project_control.json");

  if (!fs.existsSync(controlStateFile)) {
    throw new Error(`Project '${root}' does not have trackops installed.`);
  }

  let packageJson = {};
  const packageFile = path.join(root, "package.json");
  if (fs.existsSync(packageFile)) {
    packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  }

  const controlState = JSON.parse(fs.readFileSync(controlStateFile, "utf8"));
  const projectName =
    controlState.meta?.projectName || packageJson.displayName || packageJson.name || path.basename(root);

  return {
    id: `${slugify(projectName) || "project"}-${shortHash(root)}`,
    name: projectName,
    root,
    packageName: packageJson.name || null,
    controlStateFile,
    registeredAt: nowIso(),
    lastSeenAt: nowIso(),
  };
}

function registerProject(rootDir) {
  const registry = loadRegistry();
  const entry = inspectProject(rootDir);
  const existingIndex = registry.projects.findIndex((p) => p.root === entry.root);

  if (existingIndex >= 0) {
    registry.projects[existingIndex] = {
      ...registry.projects[existingIndex],
      ...entry,
      registeredAt: registry.projects[existingIndex].registeredAt || entry.registeredAt,
      lastSeenAt: nowIso(),
    };
  } else {
    registry.projects.push(entry);
  }

  registry.projects.sort((a, b) => a.name.localeCompare(b.name));
  saveRegistry(registry);
  return registry.projects.find((p) => p.root === entry.root);
}

function unregisterProject(rootDir) {
  const root = path.resolve(rootDir);
  const registry = loadRegistry();
  registry.projects = registry.projects.filter((p) => p.root !== root);
  saveRegistry(registry);
  return registry;
}

function listProjects() {
  const registry = loadRegistry();
  return registry.projects.map((project) => {
    const available = isProjectInstalled(project.root);
    return { ...project, available };
  });
}

function resolveProject(projectRef, fallbackRoot) {
  const projects = listProjects();

  if (!projectRef) {
    if (fallbackRoot) {
      return projects.find((p) => p.root === path.resolve(fallbackRoot)) || null;
    }
    return projects[0] || null;
  }

  const normalizedRef = path.resolve(projectRef);
  return (
    projects.find((p) => p.id === projectRef) ||
    projects.find((p) => p.root === normalizedRef) ||
    null
  );
}

/* ── CLI commands ── */

function cmdRegister(root) {
  const project = registerProject(root);
  console.log(`${t("init.registered")} ${project.name}`);
  console.log(project.root);
}

function cmdList() {
  const projects = listProjects();
  if (!projects.length) {
    console.log("No registered projects.");
    return;
  }
  projects.forEach((project, index) => {
    console.log(`${index + 1}. ${project.name}`);
    console.log(`   id: ${project.id}`);
    console.log(`   root: ${project.root}`);
    console.log(`   available: ${project.available ? "yes" : "no"}`);
  });
}

function cmdWhere() {
  console.log(REGISTRY_FILE);
}

module.exports = {
  REGISTRY_DIR,
  REGISTRY_FILE,
  inspectProject,
  isProjectInstalled,
  listProjects,
  loadRegistry,
  registerProject,
  resolveProject,
  saveRegistry,
  slugify,
  unregisterProject,
  cmdRegister,
  cmdList,
  cmdWhere,
};
