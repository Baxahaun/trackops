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
  DEFAULT_PHASE_IDS,
  buildDefaultPhases,
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
