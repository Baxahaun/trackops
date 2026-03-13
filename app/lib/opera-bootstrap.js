#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const readline = require("readline/promises");

const config = require("./config");
const { t, setLocale } = require("./i18n");
const { isInteractive } = require("./locale");
const { resolveLocalizedFile } = require("./resources");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates", "opera");

const SERVICE_HINTS = [
  ["openai", "OpenAI"],
  ["anthropic", "Anthropic"],
  ["stripe", "Stripe"],
  ["supabase", "Supabase"],
  ["postgres", "PostgreSQL"],
  ["mysql", "MySQL"],
  ["redis", "Redis"],
  ["slack", "Slack"],
  ["s3", "Amazon S3"],
  ["aws", "AWS"],
  ["gcp", "Google Cloud"],
  ["azure", "Azure"],
];

function nowIso() {
  return new Date().toISOString();
}

function git(args, root) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) return "";
  return result.stdout.trim();
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function firstParagraph(text) {
  return String(text || "")
    .split(/\r?\n\r?\n/)
    .map((chunk) => chunk.replace(/^#\s+/gm, "").trim())
    .find(Boolean) || "";
}

function inferServicesFromEnv(text) {
  const upper = String(text || "").toUpperCase();
  return SERVICE_HINTS.filter(([needle]) => upper.includes(needle.toUpperCase())).map(([, label]) => label);
}

function inferServicesFromDependencies(pkg) {
  const deps = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
  };
  const names = Object.keys(deps);
  return SERVICE_HINTS.filter(([needle]) => names.some((name) => name.includes(needle))).map(([, label]) => label);
}

function scanProject(root) {
  const context = config.ensureContext(root);
  const scanRoot = context.appRoot;
  const envPaths = config.envFilePaths(context);
  const pkgPath = path.join(scanRoot, "package.json");
  const readmePath = fs.existsSync(path.join(scanRoot, "README.md"))
    ? path.join(scanRoot, "README.md")
    : fs.existsSync(path.join(scanRoot, "README.mdx"))
      ? path.join(scanRoot, "README.mdx")
      : "";
  const envExamplePath = fs.existsSync(envPaths.exampleFile)
    ? envPaths.exampleFile
    : fs.existsSync(envPaths.rootFile)
      ? envPaths.rootFile
      : "";

  const pkg = safeJson(readText(pkgPath));
  const readme = readText(readmePath);
  const envExample = readText(envExamplePath);
  const workflowsDir = path.join(context.workspaceRoot, ".github", "workflows");
  const workflowFiles = fs.existsSync(workflowsDir)
    ? fs.readdirSync(workflowsDir).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    : [];
  const files = fs.readdirSync(scanRoot);
  const stacks = [];

  if (pkg) stacks.push("node");
  if (files.some((file) => file.startsWith("requirements") || file === "pyproject.toml")) stacks.push("python");
  if (files.includes("go.mod")) stacks.push("go");
  if (files.includes("Cargo.toml")) stacks.push("rust");
  if (files.includes("pom.xml")) stacks.push("java");
  if (files.includes("Dockerfile") || files.some((file) => file.startsWith("docker-compose"))) stacks.push("docker");

  const description = pkg?.description || firstParagraph(readme);
  const title = pkg?.displayName || pkg?.name || path.basename(scanRoot);
  const testCommands = unique([
    pkg?.scripts?.test ? "npm test" : "",
    fs.existsSync(path.join(scanRoot, "pytest.ini")) ? "pytest" : "",
    fs.existsSync(path.join(scanRoot, "Cargo.toml")) ? "cargo test" : "",
    fs.existsSync(path.join(scanRoot, "go.mod")) ? "go test ./..." : "",
  ]);
  const buildCommands = unique([
    pkg?.scripts?.build ? "npm run build" : "",
    fs.existsSync(path.join(scanRoot, "Dockerfile")) ? "docker build ." : "",
  ]);
  const services = unique([
    ...inferServicesFromDependencies(pkg),
    ...inferServicesFromEnv(envExample),
  ]);
  const gitRemote = git(["remote", "get-url", "origin"], context.workspaceRoot) || null;
  const ciProviders = workflowFiles.length ? ["github-actions"] : [];

  return {
    title,
    description,
    stacks: unique(stacks),
    services,
    testCommands,
    buildCommands,
    ciProviders,
    gitRemote,
    readmeSummary: firstParagraph(readme),
    payloadHint: pkg?.homepage || "",
    sourceOfTruthHint: envExample ? t("bootstrap.infer.envSourceHint") : "",
    workflowFiles,
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonValue(value) {
  if (!String(value || "").trim()) return {};
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

async function askQuestion(rl, message, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${message}${suffix}: `);
  return String(answer || "").trim() || String(defaultValue || "").trim();
}

async function collectBootstrapProfile(root, control, options = {}) {
  const context = config.ensureContext(root);
  const locale = config.getLocale(control);
  setLocale(locale);
  const scan = scanProject(context);
  const previous = control.meta?.opera?.bootstrap?.discovery || {};
  const interactive = options.interactive !== false && isInteractive();

  const defaults = {
    desiredOutcome: options.answers?.desiredOutcome || previous.desiredOutcome || scan.description || "",
    externalServices: normalizeList(options.answers?.externalServices || previous.externalServices || scan.services),
    sourceOfTruth: options.answers?.sourceOfTruth || previous.sourceOfTruth || scan.sourceOfTruthHint || "",
    payload: options.answers?.payload || previous.payload || scan.payloadHint || "",
    behaviorRules: normalizeList(options.answers?.behaviorRules || previous.behaviorRules || ""),
    inputSchema: options.answers?.inputSchema || previous.inputSchema || {},
    outputSchema: options.answers?.outputSchema || previous.outputSchema || {},
    architecturalInvariants: normalizeList(options.answers?.architecturalInvariants || previous.architecturalInvariants || ""),
    pipeline: normalizeList(options.answers?.pipeline || previous.pipeline || ""),
    templates: normalizeList(options.answers?.templates || previous.templates || ""),
    repoTaskPolicy: options.answers?.repoTaskPolicy || control.meta?.opera?.bootstrap?.repoTaskPolicy || "optional_pending",
  };

  const answers = { ...defaults };

  if (interactive) {
    console.log("");
    console.log(t("bootstrap.header"));
    console.log(t("bootstrap.subtitle"));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      answers.desiredOutcome = await askQuestion(rl, t("bootstrap.question.desiredOutcome"), defaults.desiredOutcome);
      answers.externalServices = normalizeList(await askQuestion(rl, t("bootstrap.question.externalServices"), defaults.externalServices.join(", ")));
      answers.sourceOfTruth = await askQuestion(rl, t("bootstrap.question.sourceOfTruth"), defaults.sourceOfTruth);
      answers.payload = await askQuestion(rl, t("bootstrap.question.payload"), defaults.payload);
      answers.behaviorRules = normalizeList(await askQuestion(rl, t("bootstrap.question.behaviorRules"), defaults.behaviorRules.join("; ")));
      answers.inputSchema = parseJsonValue(await askQuestion(rl, t("bootstrap.question.inputSchema"), JSON.stringify(defaults.inputSchema)));
      answers.outputSchema = parseJsonValue(await askQuestion(rl, t("bootstrap.question.outputSchema"), JSON.stringify(defaults.outputSchema)));
      answers.architecturalInvariants = normalizeList(await askQuestion(rl, t("bootstrap.question.invariants"), defaults.architecturalInvariants.join("; ")));
      answers.pipeline = normalizeList(await askQuestion(rl, t("bootstrap.question.pipeline"), defaults.pipeline.join("; ")));
      answers.templates = normalizeList(await askQuestion(rl, t("bootstrap.question.templates"), defaults.templates.join(", ")));
      const repoDefault = defaults.repoTaskPolicy === "skip" ? "n" : "y";
      const includeRepoTasks = await askQuestion(rl, t("bootstrap.question.repoTasks"), repoDefault);
      answers.repoTaskPolicy = includeRepoTasks.toLowerCase().startsWith("n") ? "skip" : "optional_pending";
    } finally {
      rl.close();
    }
  }

  const missingFields = [];
  if (!answers.desiredOutcome) missingFields.push("desiredOutcome");
  if (!answers.sourceOfTruth) missingFields.push("sourceOfTruth");
  if (!answers.payload) missingFields.push("payload");
  if (!Object.keys(answers.inputSchema || {}).length) missingFields.push("inputSchema");
  if (!Object.keys(answers.outputSchema || {}).length) missingFields.push("outputSchema");

  return {
    version: 1,
    localeAtBootstrap: locale,
    status: missingFields.length ? "pending" : "completed",
    mode: interactive ? "guided" : "non_interactive",
    source: "hybrid",
    startedAt: control.meta?.opera?.bootstrap?.startedAt || nowIso(),
    completedAt: missingFields.length ? null : nowIso(),
    missingFields,
    repoTaskPolicy: answers.repoTaskPolicy || "optional_pending",
    discovery: answers,
    inference: scan,
  };
}

function isVirginGenesis(content) {
  const text = String(content || "");
  return !text.trim() || /TODO:/i.test(text) || /The Constitution of the project/i.test(text) || /La Constitución del proyecto/i.test(text);
}

function renderGenesis(control, profile) {
  const locale = config.getLocale(control);
  const templatePath = resolveLocalizedFile(TEMPLATES_DIR, locale, "genesis.md");
  let content = fs.readFileSync(templatePath, "utf8");
  const rules = (profile.discovery.behaviorRules || []).map((item) => `- ${item}`).join("\n") || `- ${t("bootstrap.noneDefined")}`;
  const invariants = (profile.discovery.architecturalInvariants || []).map((item) => `- ${item}`).join("\n") || `- ${t("bootstrap.noneDefined")}`;
  const services = (profile.discovery.externalServices || []).length
    ? profile.discovery.externalServices.map((item) => `| ${item} | ${t("bootstrap.servicePending")} | ${t("bootstrap.servicePending")} |`).join("\n")
    : `| — | — | — |`;
  const pipeline = (profile.discovery.pipeline || []).length
    ? profile.discovery.pipeline.map((item) => `- ${item}`).join("\n")
    : `- ${t("bootstrap.noneDefined")}`;
  const templates = (profile.discovery.templates || []).length
    ? profile.discovery.templates.map((item) => `- \`${item}\``).join("\n")
    : `- ${t("bootstrap.noneDefined")}`;
  const schema = JSON.stringify({
    input: {
      source: profile.discovery.sourceOfTruth,
      schema: profile.discovery.inputSchema || {},
    },
    output: {
      destination: profile.discovery.payload,
      schema: profile.discovery.outputSchema || {},
    },
  }, null, 2);

  const replacements = {
    PROJECT_NAME: control.meta.projectName || "Project",
    DESIRED_OUTCOME: profile.discovery.desiredOutcome || t("bootstrap.pendingValue"),
    SERVICES_TABLE: services,
    SOURCE_OF_TRUTH: profile.discovery.sourceOfTruth || t("bootstrap.pendingValue"),
    PAYLOAD: profile.discovery.payload || t("bootstrap.pendingValue"),
    BEHAVIOR_RULES: rules,
    DATA_SCHEMA: schema,
    ARCHITECTURAL_INVARIANTS: invariants,
    PIPELINE_ITEMS: pipeline,
    TEMPLATE_ITEMS: templates,
  };

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return content;
}

function buildSeedTasks(control, profile) {
  const phaseOrder = config.getPhases(control);
  const tasks = [
    {
      id: "opera-bootstrap",
      origin: "bootstrap",
      title: t("bootstrap.task.bootstrap.title"),
      phase: phaseOrder[0]?.id || "O",
      stream: "Operations",
      priority: "P0",
      status: profile.status === "completed" ? "completed" : "blocked",
      required: true,
      dependsOn: [],
      summary: t("bootstrap.task.bootstrap.summary"),
      acceptance: [
        t("bootstrap.acceptance.discovery"),
        t("bootstrap.acceptance.schema"),
        t("bootstrap.acceptance.rules"),
        t("bootstrap.acceptance.plan"),
      ],
      blocker: profile.status === "completed" ? undefined : t("bootstrap.blocker.missingData"),
      history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
    },
    {
      id: "opera-prove-integrations",
      origin: "bootstrap",
      title: t("bootstrap.task.prove.title"),
      phase: phaseOrder[1]?.id || "P",
      stream: "Operations",
      priority: "P0",
      status: "pending",
      required: true,
      dependsOn: ["opera-bootstrap"],
      summary: t("bootstrap.task.prove.summary"),
      acceptance: [
        t("bootstrap.acceptance.env"),
        t("bootstrap.acceptance.tests"),
        t("bootstrap.acceptance.shape"),
        t("bootstrap.acceptance.findings"),
      ],
      history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
    },
    {
      id: "opera-structure-system",
      origin: "bootstrap",
      title: t("bootstrap.task.structure.title"),
      phase: phaseOrder[2]?.id || "E",
      stream: "Operations",
      priority: "P1",
      status: "pending",
      required: true,
      dependsOn: ["opera-prove-integrations"],
      summary: t("bootstrap.task.structure.summary"),
      acceptance: [
        t("bootstrap.acceptance.sops"),
        t("bootstrap.acceptance.tools"),
        t("bootstrap.acceptance.graph"),
        t("bootstrap.acceptance.integration"),
      ],
      history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
    },
    {
      id: "opera-refine-delivery",
      origin: "bootstrap",
      title: t("bootstrap.task.refine.title"),
      phase: phaseOrder[3]?.id || "R",
      stream: "Operations",
      priority: "P1",
      status: "pending",
      required: true,
      dependsOn: ["opera-structure-system"],
      summary: t("bootstrap.task.refine.summary"),
      acceptance: [
        t("bootstrap.acceptance.outputs"),
        t("bootstrap.acceptance.delivery"),
        t("bootstrap.acceptance.ui"),
      ],
      history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
    },
    {
      id: "opera-automate-runtime",
      origin: "bootstrap",
      title: t("bootstrap.task.automate.title"),
      phase: phaseOrder[4]?.id || "A",
      stream: "Operations",
      priority: "P2",
      status: "pending",
      required: true,
      dependsOn: ["opera-refine-delivery"],
      summary: t("bootstrap.task.automate.summary"),
      acceptance: [
        t("bootstrap.acceptance.tmp"),
        t("bootstrap.acceptance.deploy"),
        t("bootstrap.acceptance.triggers"),
        t("bootstrap.acceptance.smoke"),
      ],
      history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
    },
  ];

  if (profile.repoTaskPolicy !== "skip") {
    tasks.push(
      {
        id: "repo-readme-align",
        origin: "bootstrap",
        title: t("bootstrap.task.repoReadme.title"),
        phase: phaseOrder[0]?.id || "O",
        stream: "Repository",
        priority: "P2",
        status: "pending",
        required: false,
        dependsOn: [],
        summary: t("bootstrap.task.repoReadme.summary"),
        acceptance: [],
        history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
      },
      {
        id: "repo-license-review",
        origin: "bootstrap",
        title: t("bootstrap.task.repoLicense.title"),
        phase: phaseOrder[0]?.id || "O",
        stream: "Repository",
        priority: "P3",
        status: "pending",
        required: false,
        dependsOn: [],
        summary: t("bootstrap.task.repoLicense.summary"),
        acceptance: [],
        history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
      },
      {
        id: "repo-changelog-policy",
        origin: "bootstrap",
        title: t("bootstrap.task.repoChangelog.title"),
        phase: phaseOrder[0]?.id || "O",
        stream: "Repository",
        priority: "P3",
        status: "pending",
        required: false,
        dependsOn: [],
        summary: t("bootstrap.task.repoChangelog.summary"),
        acceptance: [],
        history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
      },
    );

    if (profile.inference.gitRemote && profile.inference.gitRemote.includes("github")) {
      tasks.push({
        id: "repo-github-governance",
        origin: "bootstrap",
        title: t("bootstrap.task.repoGithub.title"),
        phase: phaseOrder[0]?.id || "O",
        stream: "Repository",
        priority: "P3",
        status: "pending",
        required: false,
        dependsOn: [],
        summary: t("bootstrap.task.repoGithub.summary"),
        acceptance: [],
        history: [{ at: nowIso(), action: "create", note: t("bootstrap.history.seeded") }],
      });
    }
  }

  return tasks;
}

function applyBootstrap(root, control, profile) {
  const context = config.ensureContext(root);
  setLocale(config.getLocale(control));
  control.meta.opera = control.meta.opera || {};
  control.meta.opera.bootstrap = profile;
  control.meta.currentFocus = profile.discovery.desiredOutcome || t("bootstrap.defaultFocus");
  control.meta.deliveryTarget = profile.discovery.payload || t("bootstrap.defaultTarget");
  control.meta.focusPhase = profile.status === "completed" ? "P" : "O";
  control.meta.phases = config.getPhases(control);

  const remainingTasks = (control.tasks || []).filter((task) => task.id !== "ops-bootstrap" && task.origin !== "bootstrap");
  control.tasks = [...remainingTasks, ...buildSeedTasks(control, profile)];

  control.decisionsPending = (profile.missingFields || []).map((field) => ({
    owner: "user",
    title: t(`bootstrap.field.${field}`),
    impact: t("bootstrap.decisionImpact"),
  }));

  control.findings = control.findings || [];
  const genesisPath = context.paths.genesisFile;
  const existingGenesis = readText(genesisPath);
  if (!existingGenesis || isVirginGenesis(existingGenesis)) {
    fs.writeFileSync(genesisPath, `${renderGenesis(control, profile)}\n`, "utf8");
  } else if (profile.status !== "completed") {
    const duplicate = control.findings.some((finding) => finding.title === t("bootstrap.finding.genesisConflictTitle"));
    if (!duplicate) {
      control.findings.push({
        status: "open",
        severity: "medium",
        title: t("bootstrap.finding.genesisConflictTitle"),
        detail: t("bootstrap.finding.genesisConflictDetail"),
        impact: t("bootstrap.finding.genesisConflictImpact"),
      });
    }
    control.meta.opera.bootstrap.status = "needs_review";
  }

  config.saveControl(context, control);
  return control;
}

function detectLegacyBootstrap(root, control) {
  const context = config.ensureContext(root);
  if (!config.isOperaInstalled(control)) return null;
  if (control.meta?.opera?.bootstrap) return control.meta.opera.bootstrap;
  const genesisContent = readText(context.paths.genesisFile);
  return {
    version: 1,
    localeAtBootstrap: config.getLocale(control),
    status: isVirginGenesis(genesisContent) ? "pending" : "needs_review",
    mode: "legacy",
    source: "legacy",
    startedAt: control.meta?.opera?.installedAt || nowIso(),
    completedAt: null,
    missingFields: isVirginGenesis(genesisContent) ? ["desiredOutcome", "sourceOfTruth", "payload", "inputSchema", "outputSchema"] : [],
    repoTaskPolicy: "optional_pending",
    discovery: {},
    inference: scanProject(context),
  };
}

module.exports = {
  scanProject,
  collectBootstrapProfile,
  applyBootstrap,
  detectLegacyBootstrap,
  isVirginGenesis,
};
