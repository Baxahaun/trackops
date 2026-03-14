#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const { detectSystemLocale, isInteractive, normalizeLocale, promptForLocale } = require("./locale");

function getRuntimeHome() {
  return process.env.TRACKOPS_BOOTSTRAP_HOME || os.homedir();
}

function getRuntimeDir() {
  return path.join(getRuntimeHome(), ".trackops");
}

function getRuntimeFile() {
  return path.join(getRuntimeDir(), "runtime.json");
}

function defaultRuntimeState() {
  return {
    locale: null,
    localeSource: null,
    skill: null,
    skillVersion: null,
    runtimePackage: "trackops",
    runtimeVersion: null,
    bootstrapPolicy: null,
    supportedAgentsV1: [],
    verifiedAt: null,
    verifiedWith: null,
    executable: null,
  };
}

function normalizeRuntimeState(state) {
  const base = defaultRuntimeState();
  const next = { ...base, ...(state || {}) };
  next.locale = normalizeLocale(next.locale);
  next.localeSource = next.localeSource || null;
  next.supportedAgentsV1 = Array.isArray(next.supportedAgentsV1) ? next.supportedAgentsV1 : [];
  return next;
}

function readRuntimeState() {
  const file = getRuntimeFile();
  if (!fs.existsSync(file)) return defaultRuntimeState();
  try {
    return normalizeRuntimeState(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (_error) {
    return defaultRuntimeState();
  }
}

function writeRuntimeState(patch) {
  const file = getRuntimeFile();
  const state = normalizeRuntimeState({ ...readRuntimeState(), ...(patch || {}) });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

function getGlobalLocale() {
  return readRuntimeState().locale || null;
}

function resolveLocaleState(options = {}) {
  const runtime = readRuntimeState();
  const explicit = normalizeLocale(options.explicitLocale);
  if (explicit) return { locale: explicit, source: "explicit", runtime };

  const project = normalizeLocale(options.projectLocale);
  if (project) return { locale: project, source: "project", runtime };

  const global = normalizeLocale(runtime.locale);
  if (global) return { locale: global, source: "global", runtime };

  const envLocale = normalizeLocale(process.env.TRACKOPS_LOCALE);
  if (envLocale) return { locale: envLocale, source: "env", runtime };

  const system = detectSystemLocale();
  return { locale: system || "es", source: "system", runtime };
}

async function ensureGlobalLocale(options = {}) {
  const current = readRuntimeState();
  const explicit = normalizeLocale(options.preferredLocale);
  if (explicit) {
    return {
      locale: explicit,
      source: "explicit",
      runtime: writeRuntimeState({ locale: explicit, localeSource: "explicit" }),
    };
  }

  if (normalizeLocale(current.locale)) {
    return { locale: current.locale, source: "global", runtime: current };
  }

  let locale = null;
  let source = null;
  if (options.interactive !== false && isInteractive()) {
    locale = await promptForLocale(detectSystemLocale());
    source = "prompt";
  } else {
    locale = detectSystemLocale() || "es";
    source = "system";
  }

  return {
    locale,
    source,
    runtime: writeRuntimeState({ locale, localeSource: source }),
  };
}

function doctorLocale(projectLocale = null, explicitLocale = null) {
  const resolved = resolveLocaleState({ explicitLocale, projectLocale });
  const runtime = readRuntimeState();
  return {
    effectiveLocale: resolved.locale || "es",
    source: resolved.source,
    projectLocale: normalizeLocale(projectLocale),
    globalLocale: normalizeLocale(runtime.locale),
    envLocale: normalizeLocale(process.env.TRACKOPS_LOCALE),
    systemLocale: detectSystemLocale() || "es",
    runtimeFile: getRuntimeFile(),
  };
}

module.exports = {
  getRuntimeHome,
  getRuntimeDir,
  getRuntimeFile,
  defaultRuntimeState,
  normalizeRuntimeState,
  readRuntimeState,
  writeRuntimeState,
  getGlobalLocale,
  resolveLocaleState,
  ensureGlobalLocale,
  doctorLocale,
};
