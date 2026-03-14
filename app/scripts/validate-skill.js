#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const SKILL_DIR = path.join(ROOT, "skills", "trackops");
const SKILL_FILE = path.join(SKILL_DIR, "skill.json");
const REQUIRED_FILES = [
  path.join(SKILL_DIR, "SKILL.md"),
  path.join(SKILL_DIR, "skill.json"),
  path.join(SKILL_DIR, "scripts", "bootstrap-trackops.js"),
  path.join(SKILL_DIR, "references", "activation.md"),
  path.join(SKILL_DIR, "references", "workflow.md"),
  path.join(SKILL_DIR, "references", "troubleshooting.md"),
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
  const skill = JSON.parse(fs.readFileSync(SKILL_FILE, "utf8"));
  const skillMd = fs.readFileSync(path.join(SKILL_DIR, "SKILL.md"), "utf8");

  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(file)) {
      fail(`Missing required skill file: ${path.relative(ROOT, file)}`);
    }
  }

  if (!Array.isArray(pkg.files) || !pkg.files.includes("skills/")) {
    fail("package.json must publish the skills/ directory.");
  }

  if (skill.name !== "trackops") {
    fail("skills/trackops/skill.json must declare name 'trackops'.");
  }

  if (skill.skillVersion !== pkg.version || skill.trackopsVersion !== pkg.version) {
    fail(`skills/trackops/skill.json must be synced to package version ${pkg.version}.`);
  }

  if (skill.npmPackage !== pkg.name) {
    fail(`skills/trackops/skill.json must target npm package '${pkg.name}'.`);
  }

  if (skill.bootstrapPolicy !== "first_use") {
    fail("skills/trackops/skill.json must use bootstrapPolicy 'first_use'.");
  }

  const supportedAgents = Array.isArray(skill.supportedAgentsV1) ? skill.supportedAgentsV1 : [];
  for (const agent of ["antigravity", "claude-code", "codex", "cursor", "gemini-cli", "github-copilot", "kiro-cli"]) {
    if (!supportedAgents.includes(agent)) {
      fail(`skills/trackops/skill.json must include supported agent '${agent}'.`);
    }
  }

  if (!skill.distribution || skill.distribution.source !== "Baxahaun/trackops") {
    fail("skills/trackops/skill.json must declare distribution.source 'Baxahaun/trackops'.");
  }

  if (skill.distribution.skill !== "trackops") {
    fail("skills/trackops/skill.json must declare distribution.skill 'trackops'.");
  }

  if (skill.distribution.fullDepth !== true) {
    fail("skills/trackops/skill.json must declare distribution.fullDepth true.");
  }

  for (const requiredPhrase of [
    "npx skills add Baxahaun/trackops",
    "node scripts/bootstrap-trackops.js",
    "trackops init",
    "trackops opera install",
    "trackops opera bootstrap --resume",
  ]) {
    if (!skillMd.includes(requiredPhrase)) {
      fail(`skills/trackops/SKILL.md must mention '${requiredPhrase}'.`);
    }
  }

  console.log("skills/trackops validated successfully.");
}

main();
