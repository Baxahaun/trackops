#!/usr/bin/env node

const readline = require("readline/promises");

const SUPPORTED_LOCALES = ["es", "en"];

function normalizeLocale(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("en")) return "en";
  return null;
}

function detectSystemLocale() {
  const envLocale =
    normalizeLocale(process.env.TRACKOPS_LOCALE) ||
    normalizeLocale(process.env.LC_ALL) ||
    normalizeLocale(process.env.LC_MESSAGES) ||
    normalizeLocale(process.env.LANG);
  if (envLocale) return envLocale;

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return normalizeLocale(locale) || "es";
  } catch (_error) {
    return "es";
  }
}

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function promptForLocale(defaultLocale) {
  const initial = normalizeLocale(defaultLocale) || detectSystemLocale();
  if (!isInteractive()) return initial;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`Choose language / Elige idioma [es/en] (${initial}): `);
    return normalizeLocale(answer) || initial;
  } finally {
    rl.close();
  }
}

async function maybePromptForLocale(defaultLocale, options = {}) {
  const initial = normalizeLocale(defaultLocale) || detectSystemLocale();
  if (!isInteractive()) return initial;

  const promptMode = String(options.promptMode || "always").trim().toLowerCase();
  if (promptMode === "never") return initial;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(
      `Choose project language / Elige idioma del proyecto [es/en] (${initial}, Enter = keep): `,
    );
    const normalized = normalizeLocale(answer);
    return normalized || initial;
  } finally {
    rl.close();
  }
}

function resolveLocale(preferred, fallback) {
  return normalizeLocale(preferred) || normalizeLocale(fallback) || detectSystemLocale();
}

module.exports = {
  SUPPORTED_LOCALES,
  normalizeLocale,
  detectSystemLocale,
  isInteractive,
  promptForLocale,
  maybePromptForLocale,
  resolveLocale,
};
