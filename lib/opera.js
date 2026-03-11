#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const config = require("./config");
const { t, setLocale } = require("./i18n");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates", "opera");
const SKILLS_TEMPLATES_DIR = path.join(__dirname, "..", "templates", "skills");
const OPERA_VERSION = require("../package.json").version;

function nowIso() {
  return new Date().toISOString();
}

function copyTemplate(templatePath, targetPath, replacements) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  let content = fs.readFileSync(templatePath, "utf8");
  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }
  fs.writeFileSync(targetPath, content, "utf8");
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function install(root, options) {
  const controlFile = config.controlFilePath(root);
  if (!fs.existsSync(controlFile)) {
    throw new Error("project_control.json not found. Run 'trackops init' first.");
  }

  const control = config.loadControl(root);
  setLocale(config.getLocale(control));

  if (config.isOperaInstalled(control)) {
    console.log(t("opera.alreadyInstalled", { version: config.getOperaVersion(control) }));
    return;
  }

  const projectName = control.meta.projectName || "Project";

  // Create .agent/hub/ with agent.md and router.md
  const agentHubDir = path.join(root, ".agent", "hub");
  fs.mkdirSync(agentHubDir, { recursive: true });

  const agentTemplatePath = path.join(TEMPLATES_DIR, "agent.md");
  const routerTemplatePath = path.join(TEMPLATES_DIR, "router.md");

  if (fs.existsSync(agentTemplatePath) && !fs.existsSync(path.join(agentHubDir, "agent.md"))) {
    copyTemplate(agentTemplatePath, path.join(agentHubDir, "agent.md"), { PROJECT_NAME: projectName });
  }
  if (fs.existsSync(routerTemplatePath) && !fs.existsSync(path.join(agentHubDir, "router.md"))) {
    copyTemplate(routerTemplatePath, path.join(agentHubDir, "router.md"), { PROJECT_NAME: projectName });
  }

  // Create .agent/skills/_registry.md
  const skillsRegistryDir = path.join(root, ".agent", "skills");
  fs.mkdirSync(skillsRegistryDir, { recursive: true });
  const registryPath = path.join(skillsRegistryDir, "_registry.md");
  const registryTemplatePath = path.join(TEMPLATES_DIR, "registry.md");
  if (fs.existsSync(registryTemplatePath) && !fs.existsSync(registryPath)) {
    copyTemplate(registryTemplatePath, registryPath, { PROJECT_NAME: projectName });
  }

  // Create genesis.md if not exists
  const genesisTemplatePath = path.join(TEMPLATES_DIR, "genesis.md");
  const genesisPath = path.join(root, "genesis.md");
  if (fs.existsSync(genesisTemplatePath) && !fs.existsSync(genesisPath)) {
    copyTemplate(genesisTemplatePath, genesisPath, { PROJECT_NAME: projectName });
  }

  // Copy OPERA references
  const refsTemplateDir = path.join(TEMPLATES_DIR, "references");
  if (fs.existsSync(refsTemplateDir)) {
    const starterSkillDir = path.join(root, ".agents", "skills", "project-starter-skill", "references");
    copyDirRecursive(refsTemplateDir, starterSkillDir);
  }

  // Install project-starter-skill SKILL.md
  const starterSkillTemplate = path.join(SKILLS_TEMPLATES_DIR, "project-starter-skill", "SKILL.md");
  const starterSkillTarget = path.join(root, ".agents", "skills", "project-starter-skill", "SKILL.md");
  if (fs.existsSync(starterSkillTemplate) && !fs.existsSync(starterSkillTarget)) {
    fs.mkdirSync(path.dirname(starterSkillTarget), { recursive: true });
    fs.copyFileSync(starterSkillTemplate, starterSkillTarget);
  }

  // Mark as installed in control
  control.meta.opera = {
    installed: true,
    version: OPERA_VERSION,
    installedAt: nowIso(),
    skills: [],
  };
  config.saveControl(root, control);

  console.log(t("opera.installed", { version: OPERA_VERSION }));

  // Auto-install base skills (commiter, changelog-updater)
  const skills = require("./skills");
  for (const skillName of ["commiter", "changelog-updater"]) {
    try { skills.installSkill(root, skillName); }
    catch (_e) { /* already installed or not in catalog — skip silently */ }
  }
}

function status(root) {
  const control = config.loadControl(root);
  setLocale(config.getLocale(control));

  if (!config.isOperaInstalled(control)) {
    console.log(t("opera.notInstalled"));
    return;
  }

  const opera = control.meta.opera;
  console.log(`OPERA v${opera.version}`);
  console.log(`  Installed: ${opera.installedAt}`);
  console.log(`  Skills: ${(opera.skills || []).join(", ") || "none"}`);

  // Check structural integrity
  const checks = [
    [".agent/hub/agent.md", fs.existsSync(path.join(root, ".agent", "hub", "agent.md"))],
    [".agent/hub/router.md", fs.existsSync(path.join(root, ".agent", "hub", "router.md"))],
    [".agent/skills/_registry.md", fs.existsSync(path.join(root, ".agent", "skills", "_registry.md"))],
    ["genesis.md", fs.existsSync(path.join(root, "genesis.md"))],
  ];

  console.log("  Structure:");
  for (const [file, exists] of checks) {
    console.log(`    ${exists ? "\u2705" : "\u274C"} ${file}`);
  }
}

function configure(root, args) {
  const control = config.loadControl(root);
  setLocale(config.getLocale(control));

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) {
      control.meta.locale = args[i + 1];
      i += 1;
    }
    if (args[i] === "--phases" && args[i + 1]) {
      try {
        control.meta.phases = JSON.parse(args[i + 1]);
      } catch (_e) {
        console.error("Invalid phases JSON.");
        return;
      }
      i += 1;
    }
  }

  config.saveControl(root, control);
  console.log("Configuration updated.");
}

function upgrade(root) {
  const control = config.loadControl(root);
  setLocale(config.getLocale(control));

  if (!config.isOperaInstalled(control)) {
    console.log(t("opera.notInstalled"));
    console.log("Run 'trackops opera install' first.");
    return;
  }

  // Re-copy reference files
  const refsTemplateDir = path.join(TEMPLATES_DIR, "references");
  if (fs.existsSync(refsTemplateDir)) {
    const starterSkillDir = path.join(root, ".agents", "skills", "project-starter-skill", "references");
    copyDirRecursive(refsTemplateDir, starterSkillDir);
  }

  control.meta.opera.version = OPERA_VERSION;
  config.saveControl(root, control);
  console.log(t("opera.upgraded", { version: OPERA_VERSION }));
}

/* ── CLI commands ── */

function cmdInstall(root, args) { install(root, {}); }
function cmdStatus(root) { status(root); }
function cmdConfigure(root, args) { configure(root, args); }
function cmdUpgrade(root) { upgrade(root); }

module.exports = { install, status, configure, upgrade, cmdInstall, cmdStatus, cmdConfigure, cmdUpgrade };
