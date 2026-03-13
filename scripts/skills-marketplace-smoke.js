#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SKILL_DIR = path.join(ROOT, "skills", "trackops");
const SKILL_CONFIG = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "skill.json"), "utf8"));

function run(command, args, cwd, envOverrides = {}) {
  const shell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...envOverrides },
    shell,
  });
}

function getNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function ensureOk(result, context) {
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  assert.strictEqual(result.status, 0, output || context);
  return output;
}

function initGitRepo(repo) {
  ensureOk(run("git", ["init"], repo), "git init failed");
  ensureOk(run("git", ["config", "user.email", "skills-smoke@example.com"], repo), "git config email failed");
  ensureOk(run("git", ["config", "user.name", "Skills Smoke"], repo), "git config name failed");
  ensureOk(run("git", ["add", "."], repo), "git add failed");
  ensureOk(run("git", ["commit", "-m", "skills smoke fixture"], repo), "git commit failed");
}

function buildIsolatedEnv(homeRoot) {
  const env = {
    HOME: homeRoot,
    USERPROFILE: homeRoot,
    APPDATA: path.join(homeRoot, "AppData", "Roaming"),
    LOCALAPPDATA: path.join(homeRoot, "AppData", "Local"),
    XDG_CONFIG_HOME: path.join(homeRoot, ".config"),
  };
  for (const value of Object.values(env)) {
    fs.mkdirSync(value, { recursive: true });
  }
  return env;
}

function findInstalledSkill(rootDir, skillName) {
  const matches = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === "SKILL.md" && path.basename(path.dirname(fullPath)) === skillName) {
        matches.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);
  return matches;
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trackops-skills-smoke-"));
  const sourceRepo = path.join(tempRoot, "source");
  const sourceSkillDir = path.join(sourceRepo, "skills", "trackops");
  const homeRoot = path.join(tempRoot, "home");

  fs.mkdirSync(path.dirname(sourceSkillDir), { recursive: true });
  fs.cpSync(SKILL_DIR, sourceSkillDir, { recursive: true });
  initGitRepo(sourceRepo);

  const env = buildIsolatedEnv(homeRoot);
  const distribution = SKILL_CONFIG.distribution || {};
  const skillName = distribution.skill || SKILL_CONFIG.name;

  const listResult = run(
    getNpxCommand(),
    ["--yes", "skills", "add", sourceRepo, "--list", "--skill", skillName, "--full-depth", "-y"],
    ROOT,
    env,
  );
  const listOutput = ensureOk(listResult, "skills list failed");
  assert.match(listOutput, /\btrackops\b/i, listOutput);

  const installResult = run(
    getNpxCommand(),
    ["--yes", "skills", "add", sourceRepo, "--skill", skillName, "--full-depth", "--global", "--agent", "codex", "--copy", "-y"],
    ROOT,
    env,
  );
  ensureOk(installResult, "skills install failed");

  const installed = findInstalledSkill(homeRoot, skillName);
  assert.ok(installed.length >= 1, `trackops skill was not installed under ${homeRoot}`);

  const installedSkillDir = installed[0];
  assert.ok(fs.existsSync(path.join(installedSkillDir, "scripts", "bootstrap-trackops.js")));
  assert.ok(fs.existsSync(path.join(installedSkillDir, "references", "activation.md")));
  assert.ok(fs.existsSync(path.join(installedSkillDir, "skill.json")));

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log("skills marketplace smoke OK");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
