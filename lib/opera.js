#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const config = require("./config");
const env = require("./env");
const { t, setLocale } = require("./i18n");
const { promptForLocale, maybePromptForLocale, resolveLocale } = require("./locale");
const { resolveLocalizedFile, resolveLocalizedDir, resolveSkillFile } = require("./resources");
const bootstrap = require("./opera-bootstrap");
const runtimeState = require("./runtime-state");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates", "opera");
const SKILLS_TEMPLATES_DIR = path.join(__dirname, "..", "templates", "skills");
const OPERA_VERSION = require("../package.json").version;
const AUXILIARY_SKILLS = ["project-starter-skill", "opera-contract-auditor", "opera-policy-guard"];

function nowIso() {
  return new Date().toISOString();
}

function formatLocaleSource(source) {
  return t(`locale.source.${String(source || "").trim()}`) || source || t("locale.none");
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

function seedDirRecursive(src, dest, options = {}) {
  if (!src || !fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      seedDirRecursive(srcPath, destPath, options);
    } else if (options.overwrite || !fs.existsSync(destPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function resolveOperaLocale(control, options = {}) {
  return resolveLocale(options.locale, config.getLocale(control) || runtimeState.getGlobalLocale());
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
  fs.mkdirSync(context.paths.architectureDir, { recursive: true });
  fs.mkdirSync(context.paths.contractDir, { recursive: true });
  fs.mkdirSync(context.paths.policyDir, { recursive: true });
  fs.mkdirSync(context.paths.bootstrapDir, { recursive: true });
  fs.mkdirSync(context.paths.reviewsDir, { recursive: true });

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
  seedDirRecursive(refsTemplateDir, refsTargetDir, {
    overwrite: options.rewriteLocalizedTemplates === true,
  });

  const architectureTemplateDir = resolveLocalizedDir(TEMPLATES_DIR, locale, "architecture");
  seedDirRecursive(architectureTemplateDir, context.paths.architectureDir, {
    overwrite: options.rewriteLocalizedTemplates === true,
  });

  const reviewsTemplateDir = resolveLocalizedDir(TEMPLATES_DIR, locale, "reviews");
  seedDirRecursive(reviewsTemplateDir, context.paths.reviewsDir, {
    overwrite: options.rewriteLocalizedTemplates === true,
  });

  for (const skillName of AUXILIARY_SKILLS) {
    const skillTarget = path.join(context.paths.skillsDir, skillName, "SKILL.md");
    const skillTemplate = resolveSkillFile(SKILLS_TEMPLATES_DIR, skillName, locale);
    if (skillTemplate) {
      fs.mkdirSync(path.dirname(skillTarget), { recursive: true });
      if (!fs.existsSync(skillTarget) || options.rewriteLocalizedTemplates === true) {
        fs.copyFileSync(skillTemplate, skillTarget);
      }
    }
  }

  bootstrap.writeAutonomyPolicy(context);
}

async function install(root, options = {}) {
  const context = config.ensureContext(root);
  const controlFile = config.controlFilePath(context);
  if (!fs.existsSync(controlFile)) {
    throw new Error("project_control.json not found. Run 'trackops init' first.");
  }

  const control = config.loadControl(context);
  let locale = resolveOperaLocale(control, options);
  if (!options.locale && !control.meta?.locale && !runtimeState.getGlobalLocale()) {
    locale = await promptForLocale(locale);
    if (!runtimeState.getGlobalLocale()) {
      await runtimeState.ensureGlobalLocale({ preferredLocale: locale, interactive: false });
    }
  } else if (!options.locale) {
    locale = await maybePromptForLocale(locale, { promptMode: "always" });
  }
  control.meta.locale = locale;
  setLocale(locale);

  const alreadyInstalled = config.isOperaInstalled(control);
  installStructure(context, control, locale);

  control.meta.opera = {
    ...(control.meta.opera || {}),
    installed: true,
    model: "v3",
    stableTag: "stable",
    version: OPERA_VERSION,
    installedAt: control.meta?.opera?.installedAt || nowIso(),
    skills: control.meta?.opera?.skills || [],
    legacyStatus: "supported",
  };
  if (!control.meta.opera.bootstrap && options.bootstrap === false) {
    control.meta.opera.bootstrap = bootstrap.createAwaitingBootstrapState(context);
  }
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
  skills.updateRegistry(context);

  if (options.bootstrap !== false) {
    await runBootstrap(context, {
      locale,
      answers: options.answers,
      interactive: options.interactive,
      bootstrapMode: options.bootstrapMode,
      technicalLevel: options.technicalLevel,
      projectState: options.projectState,
      docsState: options.docsState,
      decisionOwnership: options.decisionOwnership,
    });
  }
}

function removePath(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function backupManagedArtifacts(context) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(context.paths.tmpDir, "upgrade-backups", timestamp);
  const items = [
    context.paths.agentHubDir,
    context.paths.skillsDir,
    context.paths.genesisFile,
    context.paths.contractFile,
    context.paths.autonomyPolicyFile,
    context.paths.bootstrapDir,
  ];
  fs.mkdirSync(backupRoot, { recursive: true });
  let copied = 0;
  for (const item of items) {
    if (!fs.existsSync(item)) continue;
    const relative = path.relative(context.workspaceRoot, item);
    const destination = path.join(backupRoot, relative);
    if (fs.statSync(item).isDirectory()) {
      copyDirRecursive(item, destination);
    } else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(item, destination);
    }
    copied += 1;
  }
  return { backupRoot, copied };
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

  if ((options.resume || options.forceResume) && control.meta?.opera?.bootstrap) {
    const resumed = bootstrap.resumeBootstrap(context, control);
    if (resumed.resumed) {
      const updatedControl = bootstrap.applyBootstrap(context, control, resumed.profile);
      env.syncEnvironment(context, updatedControl, { requiredKeys: env.inferRequiredKeys(updatedControl, context) });
      const ops = require("./control");
      ops.syncDocs(context, updatedControl);
      ops.refreshRepoRuntime(context, { quiet: true });
      console.log(t("bootstrap.completed"));
      return resumed.profile;
    }
    console.log(t("bootstrap.awaitingAgent"));
    return control.meta.opera.bootstrap;
  }

  const profile = await bootstrap.collectBootstrapProfile(context, control, options);
  const updatedControl = bootstrap.applyBootstrap(context, control, profile);
  env.syncEnvironment(context, updatedControl, { requiredKeys: env.inferRequiredKeys(updatedControl, context) });
  const ops = require("./control");
  ops.syncDocs(context, updatedControl);
  ops.refreshRepoRuntime(context, { quiet: true });

  if (profile.mode === "agent_handoff") {
    console.log(t("bootstrap.awaitingAgent"));
    console.log(`${t("bootstrap.handoffFile")}: ${profile.handoffFiles?.markdown || bootstrap.bootstrapRelativePaths(context).markdown}`);
    console.log(t("bootstrap.next.handoff"));
  } else {
    console.log(profile.status === "completed" ? t("bootstrap.completed") : t("bootstrap.pending"));
    console.log(
      profile.status === "completed"
        ? t("bootstrap.next.directCompleted")
        : t("bootstrap.next.directPending"),
    );
  }
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
  const localeDoctor = runtimeState.doctorLocale(control.meta?.locale || null);
  console.log(t("opera.status.version", { version: opera.version }));
  console.log(t("opera.status.installed", { value: opera.installedAt }));
  console.log(t("opera.status.skills", { value: (opera.skills || []).join(", ") || t("locale.none") }));
  console.log(t("opera.status.locale", { locale: config.getLocale(control), source: formatLocaleSource(localeDoctor.source) }));
  console.log(t("opera.status.legacy", { value: opera.legacyStatus || bootstrapState?.status || "supported" }));
  console.log(t("opera.status.contractVersion", { value: opera.contractVersion || t("locale.none") }));
  console.log(t("opera.status.contractReadiness", { value: opera.contractReadiness || "hypothesis" }));

  if (bootstrapState) {
    console.log(t("opera.status.bootstrap", { value: bootstrapState.status }));
    if (bootstrapState.mode) {
      console.log(t("opera.status.mode", { value: bootstrapState.mode }));
    }
    if (bootstrapState.routeReason) {
      console.log(t("opera.status.route", { value: bootstrapState.routeReason }));
    }
    if (bootstrapState.decisionOwnership) {
      console.log(t("opera.status.ownership", { value: bootstrapState.decisionOwnership }));
    }
    if ((bootstrapState.missingFields || []).length) {
      console.log(t("opera.status.missing", { value: bootstrapState.missingFields.join(", ") }));
      console.log(t("opera.status.resume"));
    }
    if (bootstrapState.handoffFiles?.markdown) {
      console.log(t("opera.status.handoff", { value: bootstrapState.handoffFiles.markdown }));
    }
    if (bootstrapState.reviewFiles?.qualityReport) {
      console.log(t("opera.status.qualityReport", { value: bootstrapState.reviewFiles.qualityReport }));
    }
  }

  const checks = [
    [context.layout === "split" ? "ops/.agent/hub/agent.md" : ".agent/hub/agent.md", fs.existsSync(path.join(context.paths.agentHubDir, "agent.md"))],
    [context.layout === "split" ? "ops/.agent/hub/router.md" : ".agent/hub/router.md", fs.existsSync(path.join(context.paths.agentHubDir, "router.md"))],
    [context.layout === "split" ? "ops/.agents/skills/_registry.md" : ".agents/skills/_registry.md", fs.existsSync(context.paths.registryPath)],
    [context.layout === "split" ? "ops/genesis.md" : "genesis.md", fs.existsSync(context.paths.genesisFile)],
    [context.layout === "split" ? "ops/contract/operating-contract.json" : "contract/operating-contract.json", fs.existsSync(context.paths.contractFile)],
    [context.layout === "split" ? "ops/policy/autonomy.json" : "policy/autonomy.json", fs.existsSync(context.paths.autonomyPolicyFile)],
  ];

  console.log(t("opera.status.structure"));
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
        console.error(t("opera.configure.invalidPhases"));
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
  console.log(t("opera.configure.updated"));
}

function upgrade(root, args = []) {
  const context = config.ensureContext(root);
  const control = config.loadControl(context);
  const locale = config.getLocale(control);
  setLocale(locale);
  const wantsStable = (args || []).includes("--stable");
  const wantsReset = (args || []).includes("--reset");

  if (!config.isOperaInstalled(control)) {
    console.log(t("opera.notInstalled"));
    console.log(t("opera.upgrade.runInstallFirst"));
    return;
  }

  if (!wantsStable) {
    console.log(t("opera.upgrade.usage"));
    return;
  }

  const legacy = bootstrap.detectLegacyBootstrap(context, control);
  const isLegacyUnsupported = legacy?.status === "legacy_unsupported";
  if (isLegacyUnsupported && !wantsReset) {
    control.meta.opera = control.meta.opera || {};
    control.meta.opera.legacyStatus = "legacy_unsupported";
    config.saveControl(context, control);
    console.log(t("opera.upgrade.legacyUnsupported"));
    return;
  }

  const backup = backupManagedArtifacts(context);
  if (wantsReset) {
    removePath(context.paths.agentHubDir);
    removePath(context.paths.skillsDir);
    removePath(context.paths.genesisFile);
    removePath(context.paths.contractFile);
    removePath(context.paths.autonomyPolicyFile);
    removePath(context.paths.bootstrapDir);
  }

  installStructure(context, control, locale, { rewriteLocalizedTemplates: true });
  control.meta.opera = {
    ...(control.meta.opera || {}),
    installed: true,
    model: "v3",
    stableTag: "stable",
    version: OPERA_VERSION,
    legacyStatus: "supported",
    contractVersion: fs.existsSync(context.paths.contractFile) ? bootstrap.CONTRACT_VERSION : null,
    contractReadiness: fs.existsSync(context.paths.contractFile)
      ? (control.meta?.opera?.contractReadiness || "verified")
      : "hypothesis",
    bootstrap: wantsReset
      ? bootstrap.createAwaitingBootstrapState(context)
      : (control.meta?.opera?.bootstrap || bootstrap.createAwaitingBootstrapState(context)),
  };
  config.saveControl(context, control);
  env.syncEnvironment(context, control);
  require("./skills").updateRegistry(context);
  console.log(t("opera.upgrade.backup", { path: path.relative(context.workspaceRoot, backup.backupRoot) }));
  console.log(t("opera.upgraded", { version: OPERA_VERSION }));
}

function cmdInstall(root, args) {
  const options = {
    bootstrap: true,
    answers: {},
    interactive: true,
    locale: null,
    bootstrapMode: "auto",
    technicalLevel: null,
    projectState: null,
    docsState: null,
    decisionOwnership: null,
  };
  for (let i = 0; i < (args || []).length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) {
      options.locale = args[i + 1];
      i += 1;
    } else if (args[i] === "--no-bootstrap") {
      options.bootstrap = false;
    } else if (args[i] === "--non-interactive") {
      options.interactive = false;
    } else if (args[i] === "--bootstrap-mode" && args[i + 1]) {
      options.bootstrapMode = args[i + 1];
      i += 1;
    } else if (args[i] === "--technical-level" && args[i + 1]) {
      options.technicalLevel = args[i + 1];
      i += 1;
    } else if (args[i] === "--project-state" && args[i + 1]) {
      options.projectState = args[i + 1];
      i += 1;
    } else if (args[i] === "--docs-state" && args[i + 1]) {
      options.docsState = args[i + 1];
      i += 1;
    } else if (args[i] === "--decision-ownership" && args[i + 1]) {
      options.decisionOwnership = args[i + 1];
      i += 1;
    }
  }
  return install(root, options);
}

function cmdStatus(root) { status(root); }
function cmdConfigure(root, args) { configure(root, args); }
function cmdUpgrade(root, args) { upgrade(root, args); }

async function cmdBootstrap(root, args) {
  const options = {
    locale: null,
    interactive: true,
    answers: {},
    resume: false,
    bootstrapMode: "auto",
    technicalLevel: null,
    projectState: null,
    docsState: null,
    decisionOwnership: null,
  };
  for (let i = 0; i < (args || []).length; i += 1) {
    if (args[i] === "--locale" && args[i + 1]) {
      options.locale = args[i + 1];
      i += 1;
    } else if (args[i] === "--non-interactive") {
      options.interactive = false;
    } else if (args[i] === "--resume") {
      options.resume = true;
    } else if (args[i] === "--bootstrap-mode" && args[i + 1]) {
      options.bootstrapMode = args[i + 1];
      i += 1;
    } else if (args[i] === "--technical-level" && args[i + 1]) {
      options.technicalLevel = args[i + 1];
      i += 1;
    } else if (args[i] === "--project-state" && args[i + 1]) {
      options.projectState = args[i + 1];
      i += 1;
    } else if (args[i] === "--docs-state" && args[i + 1]) {
      options.docsState = args[i + 1];
      i += 1;
    } else if (args[i] === "--decision-ownership" && args[i + 1]) {
      options.decisionOwnership = args[i + 1];
      i += 1;
    }
  }
  return runBootstrap(root, options);
}

function cmdHandoff(root, args) {
  const context = config.ensureContext(root);
  const control = config.loadControl(context);
  const state = bootstrap.getBootstrapState(control, context) || bootstrap.detectLegacyBootstrap(context, control);
  if (!state) {
    throw new Error("OPERA bootstrap is not initialized.");
  }
  const files = bootstrap.bootstrapFilePaths(context);
  const printMode = (args || []).includes("--print");
  const jsonMode = (args || []).includes("--json");
  if (jsonMode) {
    const payload = readText(files.json);
    process.stdout.write(payload || "{}\n");
    return;
  }
  if (printMode) {
    process.stdout.write(readText(files.markdown) || "");
    return;
  }
  console.log(`Bootstrap: ${state.status}`);
  console.log(`Mode: ${state.mode}`);
  console.log(`Markdown handoff: ${state.handoffFiles?.markdown || bootstrap.bootstrapRelativePaths(context).markdown}`);
  console.log(`JSON handoff: ${state.handoffFiles?.json || bootstrap.bootstrapRelativePaths(context).json}`);
  if (state.reviewFiles?.openQuestions) {
    console.log(`Open questions: ${state.reviewFiles.openQuestions}`);
  }
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
  cmdHandoff,
};
