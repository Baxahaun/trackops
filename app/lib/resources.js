#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { normalizeLocale } = require("./locale");

function existing(filePath) {
  return filePath && fs.existsSync(filePath) ? filePath : null;
}

function resolveLocalizedFile(baseDir, locale, relativePath) {
  const normalized = normalizeLocale(locale) || "es";
  return (
    existing(path.join(baseDir, "locales", normalized, relativePath)) ||
    existing(path.join(baseDir, normalized, relativePath)) ||
    existing(path.join(baseDir, relativePath)) ||
    existing(path.join(baseDir, "locales", "es", relativePath)) ||
    existing(path.join(baseDir, "es", relativePath))
  );
}

function resolveLocalizedDir(baseDir, locale, relativePath = "") {
  const normalized = normalizeLocale(locale) || "es";
  return (
    existing(path.join(baseDir, "locales", normalized, relativePath)) ||
    existing(path.join(baseDir, normalized, relativePath)) ||
    existing(path.join(baseDir, relativePath)) ||
    existing(path.join(baseDir, "locales", "es", relativePath)) ||
    existing(path.join(baseDir, "es", relativePath))
  );
}

function resolveSkillFile(templatesDir, skillName, locale) {
  return resolveLocalizedFile(path.join(templatesDir, skillName), locale, "SKILL.md");
}

module.exports = {
  resolveLocalizedFile,
  resolveLocalizedDir,
  resolveSkillFile,
};
