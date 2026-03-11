#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_PHASES = [
  { id: "O", label: "Orquestar", index: 1 },
  { id: "P", label: "Probar", index: 2 },
  { id: "E", label: "Estructurar", index: 3 },
  { id: "R", label: "Refinar", index: 4 },
  { id: "A", label: "Automatizar", index: 5 },
];

const DEFAULT_LOCALE = "es";

function resolveProjectRoot(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "project_control.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function controlFilePath(root) {
  return path.join(root, "project_control.json");
}

function runtimeFilePath(root) {
  return path.join(root, ".tmp", "project-control-runtime.json");
}

function docFilePaths(root) {
  return {
    taskPlan: path.join(root, "task_plan.md"),
    progress: path.join(root, "progress.md"),
    findings: path.join(root, "findings.md"),
  };
}

function getPhases(control) {
  if (
    Array.isArray(control.meta?.phases) &&
    control.meta.phases.length > 0
  ) {
    return control.meta.phases;
  }
  return DEFAULT_PHASES;
}

function getLocale(control) {
  return control.meta?.locale || DEFAULT_LOCALE;
}

function isOperaInstalled(control) {
  return control.meta?.opera?.installed === true;
}

function getOperaVersion(control) {
  return control.meta?.opera?.version || null;
}

// Backwards-compat aliases
function isEtapaInstalled(control) { return isOperaInstalled(control); }
function getEtapaVersion(control) { return getOperaVersion(control); }

function loadControl(root) {
  const filePath = controlFilePath(root);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveControl(root, control) {
  control.meta = control.meta || {};
  control.meta.updatedAt = new Date().toISOString();
  const filePath = controlFilePath(root);
  fs.writeFileSync(filePath, JSON.stringify(control, null, 2) + "\n", "utf8");
}

module.exports = {
  DEFAULT_PHASES,
  DEFAULT_LOCALE,
  resolveProjectRoot,
  controlFilePath,
  runtimeFilePath,
  docFilePaths,
  getPhases,
  getLocale,
  isOperaInstalled,
  getOperaVersion,
  isEtapaInstalled,
  getEtapaVersion,
  loadControl,
  saveControl,
};
