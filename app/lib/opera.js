#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const config = require("./config");
const env = require("./env");
const { t, setLocale } = require("./i18n");
const { promptForLocale, resolveLocale } = require("./locale");
const { resolveLocalizedFile, resolveLocalizedDir, resolveSkillFile } = require("./resources");
const bootstrap = require("./opera-bootstrap");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates", "opera");
const SKILLS_TEMPLATES_DIR = path.join(__dirname, "..", "templates", "skills");
const OPERA_VERSION = require("../package.json").version;

function nowIso() {
  return new Date().toISOString();
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function renderTemplate(templatePath, replacements) {
  let content = fs.readFileSync(templatePath, "utf8");
  for (const [key, value] of Object.entries(replacements || {})) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return content;
}

function matchesKnownTemplate(filePath, templatePath, replacements) {
  if (!fs.existsSync(filePath) || !fs.existsSync(templatePath)) return false;
  return readText(filePath).replace(/\r\n/g, "\n") === renderTemplate(templatePath, replacements).replace(/\r\n/g, "\n");
}

function copyTemplate(templatePath, targetPath, replacements, options = {}) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const shouldWrite =
    !fs.existsSync(targetPath) ||
    options.overwrite === true ||
    (options.overwriteIfTemplate && matchesKnownTemplate(targetPath, templatePath, replacements));

  if (!shouldWrite) return false;
  fs.writeFileSync(targetPath, renderTemplate(templatePath, replacements), "utf8");
  return true;
}

function copyDirRecursive(src, dest) {
  if (!src || !fs.existsSync(src)) return;
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

function resolveOperaLocale(control, options = {}) {
  return resolveLocale(options.locale, config.getLocale(control));
}

function installStructure(root, control, locale, options = {}) {
  const context = config.ensureContext(root);
  const projectName = control.meta.projectName || "Project";
  const replacements = {
    PROJECT_NAME: projectName,
    DESIRED_OUTCOME: t("bootstrap.pendingValue"),
    SERVICES_TABLE: "| — | — | — |",
    SOURCE_OF_TRUTH: t("bootstrap.pendingValue"),
    PAYLOAD: t("bootstrap.pendingValue"),
    BEHAVIOR_RULES: `- ${t("bootstrap.noneDefined")}`,
    DATA_SCHEMA: JSON.stringify({
      input: { source: "", schema: {} },
      output: { destination: "", schema: {} },
    }, null, 2),
    ARCHITECTURAL_INVARIANTS: `- ${t("bootstrap.noneDefined")}`,
    PIPELINE_ITEMS: `- ${t("bootstrap.noneDefined")}`,
    TEMPLATE_ITEMS: `- ${t("bootstrap.noneDefined")}`,
  };
  const overwriteOptions = {
    overwriteIfTemplate: options.rewriteLocalizedTemplates === true,
  };

  const agentHubDir = context.paths.agentHubDir;
  fs.mkdirSync(agentHubDir, { recursive: true });

  copyTemplate(
    resolveLocalizedFile(TEMPLATES_DIR, locale, "agent.md"),
    path.join(agentHubDir, "agent.md"),
    replacements,
    overwriteOptions,
  );
  copyTemplate(
    resolveLocalizedFile(TEMPLATES_DIR, locale, "router.md"),
    path.join(agentHubDir, "router.md"),
    replacements,
    overwriteOptions,
  );

  const skillsRegistryDir = context.paths.skillsDir;
  fs.mkdirSync(skillsRegistryDir, { recursive: true });
  copyTemplate(
    resolveLocalizedFile(TEMPLATES_DIR, locale, "registry.md"),
    path.join(skillsRegistryDir, "_registry.md"),
    replacements,
    overwriteOptions,
  );

  const genesisTemplatePath = resolveLocalizedFile(TEMPLATES_DIR, locale, "genesis.md");
  const genesisPath = context.paths.genesisFile;
  if (!fs.existsSync(genesisPath) || bootstrap.isVirginGenesis(readText(genesisPath))) {
    copyTemplate(genesisTemplatePath, genesisPath, replacements, { overwrite: true });
  }

  const refsTemplateDir = resolveLocalizedDir(TEMPLATES_DIR, locale, "references");
  const refsTargetDir = path.join(context.paths.skillsDir, "project-starter-skill", "references");
  copyDirRecursive(refsTemplateDir, refsTargetDir);

  const starterSkillTarget = path.join(context.paths.skillsDir, "project-starter-skill", "SKILL.md");
  const starterSkillTemplate = resolveSkillFile(SKILLS_TEMPLATES_DIR, "project-starter-skill", locale);
  if (starterSkillTemplate) {
    fs.mkdirSync(path.dirname(starterSkillTarget), { recursive: true });
    if (!fs.existsSync(starterSkillTarget) || options.rewriteLocalizedTemplates === true) {
      fs.copyFileSync(starterSkillTemplate, starterSkillTarget);
    }
  }
}

async function install(root, options = {}) {
  const context = config.ensureContext(root);
  const controlFile = config.controlFilePath(context);
  if (!fs.existsSync(controlFile)) {
    throw new Error("project_control.json not found. Run 'trackops init' first.");
  }

  const control = config.loadControl(context);
  let locale = resolveOperaLocale(control, options);
  if (!options.locale && !control.meta?.locale) {
    locale = await promptForLocale(locale);
  }
  control.meta.locale = locale;
  setLocale(locale);

  const alreadyInstalled = config.isOperaInstalled(control);
  installStructure(context, control, locale);

  control.meta.opera = {
    ...(control.meta.opera || {}),
    installed: true,
    version: OPERA_VERSION,
    installedAt: control.meta?.opera?.installedAt || nowIso(),
    skills: control.meta?.opera?.skills || [],
  };
  config.saveControl(context, control);
  env.syncEnvironment(context, control);

  if (!alreadyInstalled) {
    console.log(t("opera.installed", { version: OPERA_VERSION }));
  } else {
    console.log(t("opera.alreadyInstalled", { version: config.getOperaVersion(control) || OPERA_VERSION }));
  }

  const skills = require("./skills");
  for (const skillName of ["commiter", "changelog-updater"]) {
    try {
      skills.installSkill(context, skillName, { locale });
    } catch (_error) {
      // ignore
    }
  }

  if (options.bootstrap !== false) {
    await runBootstrap(context, { locale, answers: options.answers, interactive: options.interactive });
  }
}

async function runBootstrap(root, options = {}) {
  const context = config.ensureContext(root);
  const control = config.loadControl(context);
  const locale = resolveOperaLocale(control, options);
  control.meta.locale = locale;
  setLocale(locale);

  const legacyBootstrap = bootstrap.detectLegacyBootstrap(context, control);
  if (legacyBootstrap && !control.meta.opera?.bootstrap) {
    control.meta.opera = control.meta.opera || {};
    control.meta.opera.bootstrap = legacyBootstrap;
    config.saveControl(context, control);
  }

  const profile = await bootstrap.collectBootstrapProfile(context, control, options);
  const updatedControl = bootstrap.applyBootstrap(context, control, profile);
  env.syncEnvironment(context, updatedControl, { requiredKeys: env.inferRequiredKeys(updatedControl, context) });
  const ops = require("./control");
  ops.syncDocs(context, updatedControl);
  ops.refreshRepoRuntime(context, { quiet: true });

  console.log(profile.status === "completed" ? t("bootstrap.completed") : t("bootstrap.pending"));
  return profile;
}

function status(root) {
  const context = config.ensureContext(root);
  const control = config.loadControl(context);
  setLocale(config.getLocale(control));

  if (!config.isOperaInstalled(control)) {
    console.log(t("opera.notInstalled"));
    return;
  }

  const opera = control.meta.opera;
  const bootstrapState = opera.bootstrap || bootstrap.detectLegacyBootstrap(context, control);
  console.log(`OPERA v${opera.version}`);
  console.log(`  Installed: ${opera.installedAt}`);
  console.log(`  Skills: ${(opera.skills || []).join(", ") || "none"}`);
  console.log(`  Locale: ${config.getLocale(control)}`);

  if (bootstrapState) {
    console.log(`  Bootstrap: ${bootstrapState.status}`);
    if ((bootstrapState.missingFields || []).length) {
      console.log(`  Missing: ${bootstrapState.missingFields.join(", ")}`);
      console.log("  Resume: trackops opera bootstrap --resume");
    }
  }

  const checks = [
    [".agent/hub/agent.md", fs.existsSync(path.join(context.paths.agentHubDir, "agent.md"))],
    [".agent/hub/router.md", fs.existsSync(path.join(context.paths.agentHubDir, "router.md"))],
    [".agents/skills/_registry.md", fs.existsSync(context.paths.registryPath)],
    ["genesis.md", fs.existsSync(context.paths.genesisFile)],
  ];

  console.log("  Structure:");
  for (const [file, exists] of checks) {
    console.log(`    ${exists ? "\u2705" : "\u274C"} ${file}`);
  }
}

function configure(root, args) {
  const context = config.ensureContext(root);
  const control = config.loadControl(context);
  setLocale(config.getLocale(control));
  let nextLocale = config.getLocale(control);

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) {
      nextLocale = resolveLocale(args[i + 1], nextLocale);
      control.meta.locale = nextLocale;
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

  config.saveControl(context, control);
  if (config.isOperaInstalled(control)) {
    installStructure(context, control, nextLocale, { rewriteLocalizedTemplates: true });
    env.syncEnvironment(context, control);
    const ops = require("./control");
    ops.syncDocs(context, control);
  }
  console.log("Configuration updated.");
}

function upgrade(root) {
  const context = config.ensureContext(root);
  const control = config.loadControl(context);
  const locale = config.getLocale(control);
  setLocale(locale);

  if (!config.isOperaInstalled(control)) {
    console.log(t("opera.notInstalled"));
    console.log("Run 'trackops opera install' first.");
    return;
  }

  installStructure(context, control, locale, { rewriteLocalizedTemplates: true });
  control.meta.opera.version = OPERA_VERSION;
  config.saveControl(context, control);
  env.syncEnvironment(context, control);
  console.log(t("opera.upgraded", { version: OPERA_VERSION }));
}

function cmdInstall(root, args) {
  const options = {
    bootstrap: true,
    answers: {},
    interactive: true,
    locale: null,
  };
  for (let i = 0; i < (args || []).length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) {
      options.locale = args[i + 1];
      i += 1;
    } else if (args[i] === "--no-bootstrap") {
      options.bootstrap = false;
    } else if (args[i] === "--non-interactive") {
      options.interactive = false;
    }
  }
  return install(root, options);
}

function cmdStatus(root) { status(root); }
function cmdConfigure(root, args) { configure(root, args); }
function cmdUpgrade(root) { upgrade(root); }

async function cmdBootstrap(root, args) {
  const options = { locale: null, interactive: true, answers: {} };
  for (let i = 0; i < (args || []).length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) {
      options.locale = args[i + 1];
      i += 1;
    } else if (args[i] === "--non-interactive") {
      options.interactive = false;
    } else if (args[i] === "--skip-repo-tasks") {
      options.answers.repoTaskPolicy = "skip";
    } else if (args[i] === "--include-repo-tasks") {
      options.answers.repoTaskPolicy = "optional_pending";
    }
  }
  return runBootstrap(root, options);
}

module.exports = {
  installStructure,
  install,
  runBootstrap,
  status,
  configure,
  upgrade,
  cmdInstall,
  cmdStatus,
  cmdConfigure,
  cmdUpgrade,
  cmdBootstrap,
};
