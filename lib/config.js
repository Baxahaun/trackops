#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_PHASES = [
  { id: "E", label: "Estrategia", index: 1 },
  { id: "T", label: "Tests", index: 2 },
  { id: "A", label: "Arquitectura", index: 3 },
  { id: "P", label: "Pulido", index: 4 },
  { id: "AU", label: "Automatizacion", index: 5 },
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

function isEtapaInstalled(control) {
  return control.meta?.etapa?.installed === true;
}

function getEtapaVersion(control) {
  return control.meta?.etapa?.version || null;
}

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
  isEtapaInstalled,
  getEtapaVersion,
  loadControl,
  saveControl,
};
