#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const EXIT_CODES = {
  READY: 0,
  PREREQ: 1,
  INSTALL: 2,
  UNVERIFIABLE: 3,
};

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function readSkillConfig() {
  const skillFile = path.join(__dirname, "..", "skill.json");
  return JSON.parse(fs.readFileSync(skillFile, "utf8"));
}

function getHomeDir() {
  return process.env.TRACKOPS_BOOTSTRAP_HOME || os.homedir();
}

function getPrefixOverride() {
  return process.env.TRACKOPS_BOOTSTRAP_PREFIX || null;
}

function getInstallSource(config) {
  return process.env.TRACKOPS_BOOTSTRAP_INSTALL_SOURCE || `${config.npmPackage}@${config.trackopsVersion}`;
}

function parseMajor(version) {
  const major = Number(String(version || "").split(".")[0]);
  return Number.isFinite(major) ? major : null;
}

function hasSupportedNode() {
  const major = parseMajor(process.versions.node);
  return major != null && major >= 18;
}

function spawnChecked(command, args, extra = {}) {
  const shell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell,
    ...extra,
  });
}

function spawnNpm(args, extra = {}) {
  return spawnSync(getNpmCommand(), args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    ...extra,
  });
}

function resolvePrefixExecutables(prefix) {
  if (!prefix) return [];
  if (process.platform === "win32") {
    return [
      path.join(prefix, "trackops.cmd"),
      path.join(prefix, "trackops.exe"),
      path.join(prefix, "trackops"),
    ];
  }
  return [path.join(prefix, "bin", "trackops")];
}

function buildVerificationTargets(prefix) {
  const targets = [{ command: "trackops", via: "path" }];
  for (const candidate of resolvePrefixExecutables(prefix)) {
    targets.push({ command: candidate, via: "prefix" });
  }
  return targets;
}

function readInstalledVersion(prefix) {
  for (const target of buildVerificationTargets(prefix)) {
    const result = spawnChecked(target.command, ["--version"]);
    if (result.error || result.status !== 0) continue;
    const version = String(result.stdout || "").trim();
    if (version) {
      return { version, command: target.command, via: target.via };
    }
  }
  return null;
}

function verifyRuntime(expectedVersion, prefix) {
  const installed = readInstalledVersion(prefix);
  if (!installed) {
    return { ok: false, reason: "missing-command" };
  }
  if (installed.version !== expectedVersion) {
    return { ok: false, reason: "version-drift", installed };
  }

  const help = spawnChecked(installed.command, ["help"]);
  if (help.error || help.status !== 0) {
    return { ok: false, reason: "help-failed", installed };
  }

  return { ok: true, installed };
}

function ensureNpmAvailable() {
  const result = spawnNpm(["--version"]);
  return !result.error && result.status === 0;
}

function runInstall(config, prefix) {
  const installSource = getInstallSource(config);
  const args = ["install", "-g"];
  if (prefix) {
    args.push("--prefix", prefix);
  }
  args.push(installSource);

  const result = spawnNpm(args);
  return { ...result, installSource };
}

function writeRuntimeStamp(config, verification) {
  const runtimeDir = path.join(getHomeDir(), ".trackops");
  const runtimeFile = path.join(runtimeDir, "runtime.json");
  fs.mkdirSync(runtimeDir, { recursive: true });
  const payload = {
    skill: config.name,
    skillVersion: config.skillVersion,
    runtimePackage: config.npmPackage,
    runtimeVersion: config.trackopsVersion,
    bootstrapPolicy: config.bootstrapPolicy,
    supportedAgentsV1: config.supportedAgentsV1,
    verifiedAt: new Date().toISOString(),
    verifiedWith: verification.installed.via,
    executable: verification.installed.command,
  };
  fs.writeFileSync(runtimeFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function printInstallGuidance(prefix) {
  if (prefix) {
    console.error(`TrackOps was installed under the custom prefix '${prefix}'.`);
    console.error("Use that prefix's executable or add it to PATH before trying again.");
    return;
  }

  console.error("TrackOps was installed but could not be executed from PATH.");
  console.error("Add your npm global bin directory to PATH, reopen the terminal, and retry.");
}

function main() {
  const config = readSkillConfig();
  const prefix = getPrefixOverride();

  if (!hasSupportedNode()) {
    console.error("TrackOps requires Node.js 18 or newer.");
    process.exit(EXIT_CODES.PREREQ);
  }

  if (!ensureNpmAvailable()) {
    console.error("npm is required to bootstrap the TrackOps runtime.");
    process.exit(EXIT_CODES.PREREQ);
  }

  const current = verifyRuntime(config.trackopsVersion, prefix);
  if (current.ok) {
    writeRuntimeStamp(config, current);
    console.log(`TrackOps runtime ${config.trackopsVersion} is already ready.`);
    process.exit(EXIT_CODES.READY);
  }

  const install = runInstall(config, prefix);
  if (install.error || install.status !== 0) {
    console.error(`Failed to install ${install.installSource}.`);
    if (install.stderr) {
      console.error(install.stderr.trim());
    }
    process.exit(EXIT_CODES.INSTALL);
  }

  const verification = verifyRuntime(config.trackopsVersion, prefix);
  if (!verification.ok) {
    printInstallGuidance(prefix);
    process.exit(EXIT_CODES.UNVERIFIABLE);
  }

  writeRuntimeStamp(config, verification);
  console.log(`TrackOps runtime ${config.trackopsVersion} is ready.`);
  process.exit(EXIT_CODES.READY);
}

main();
