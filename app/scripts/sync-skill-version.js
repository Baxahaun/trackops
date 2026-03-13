#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const SKILL_FILE = path.join(ROOT, "skills", "trackops", "skill.json");

function main() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
  const skill = JSON.parse(fs.readFileSync(SKILL_FILE, "utf8"));

  skill.skillVersion = pkg.version;
  skill.trackopsVersion = pkg.version;

  fs.writeFileSync(SKILL_FILE, `${JSON.stringify(skill, null, 2)}\n`, "utf8");
  console.log(`Synced skills/trackops/skill.json to version ${pkg.version}.`);
}

main();
