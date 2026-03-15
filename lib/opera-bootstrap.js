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

const TECHNICAL_LEVELS = ["low", "medium", "high", "senior"];
const PROJECT_STATES = ["idea", "draft", "existing_repo", "advanced"];
const DOC_STATES = ["none", "notes", "sos", "spec_dossier", "repo_docs"];
const DECISION_OWNERSHIPS = ["user", "shared", "agent"];
const BOOTSTRAP_MODES = ["auto", "direct", "handoff"];
const QUALITY_STATUSES = ["ready", "needs_review", "blocked"];
const CONTRACT_READINESS = ["hypothesis", "provisional", "verified", "locked"];
const CONTRACT_VERSION = 3;
const ENUM_ALIASES = {
  low: "low",
  bajo: "low",
  basic: "low",
  beginner: "low",
  medium: "medium",
  medio: "medium",
  mid: "medium",
  high: "high",
  alto: "high",
  advanced: "high",
  senior: "senior",
  idea: "idea",
  ideacion: "idea",
  ideation: "idea",
  draft: "draft",
  borrador: "draft",
  existing_repo: "existing_repo",
  existingrepo: "existing_repo",
  existing: "existing_repo",
  repo_existente: "existing_repo",
  "repo existente": "existing_repo",
  advanced_project: "advanced",
  avanzado: "advanced",
  advancedrepo: "advanced",
  none: "none",
  ninguna: "none",
  notes: "notes",
  notas: "notes",
  sos: "sos",
  spec_dossier: "spec_dossier",
  spec: "spec_dossier",
  dossier: "spec_dossier",
  repo_docs: "repo_docs",
  repodocs: "repo_docs",
  docs_repo: "repo_docs",
  user: "user",
  usuario: "user",
  shared: "shared",
  compartido: "shared",
  agent: "agent",
  agente: "agent",
};

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

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.replace(/\r?\n/g, "\n"), "utf8");
}

function writeJson(filePath, data) {
  writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function unique(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeEnum(value, allowed) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  const alias = ENUM_ALIASES[normalized] || normalized;
  return allowed.includes(alias) ? alias : null;
}

function choiceHint(allowed) {
  if (allowed === TECHNICAL_LEVELS) return "low|medium|high|senior (o bajo|medio|alto)";
  if (allowed === PROJECT_STATES) return "idea|draft|existing_repo|advanced";
  if (allowed === DOC_STATES) return "none|notes|sos|spec_dossier|repo_docs";
  if (allowed === DECISION_OWNERSHIPS) return "user|shared|agent (o usuario|compartido|agente)";
  return Array.isArray(allowed) ? allowed.join("|") : null;
}

function explanationModeFor(technicalLevel) {
  if (technicalLevel === "low") return "guided";
  if (technicalLevel === "medium") return "balanced";
  return "expert";
}

function bootstrapRelativePaths(context) {
  if (context.layout === "split") {
    return {
      markdown: "ops/bootstrap/agent-handoff.md",
      json: "ops/bootstrap/agent-handoff.json",
      intakeJson: "ops/bootstrap/intake.json",
      specDossier: "ops/bootstrap/spec-dossier.md",
      openQuestions: "ops/bootstrap/open-questions.md",
      qualityReport: "ops/bootstrap/quality-report.json",
    };
  }

  return {
    markdown: "bootstrap/agent-handoff.md",
    json: "bootstrap/agent-handoff.json",
    intakeJson: "bootstrap/intake.json",
    specDossier: "bootstrap/spec-dossier.md",
    openQuestions: "bootstrap/open-questions.md",
    qualityReport: "bootstrap/quality-report.json",
  };
}

function bootstrapFilePaths(context) {
  return {
    dir: context.paths.bootstrapDir,
    markdown: path.join(context.paths.bootstrapDir, "agent-handoff.md"),
    json: path.join(context.paths.bootstrapDir, "agent-handoff.json"),
    intakeJson: path.join(context.paths.bootstrapDir, "intake.json"),
    specDossier: path.join(context.paths.bootstrapDir, "spec-dossier.md"),
    openQuestions: path.join(context.paths.bootstrapDir, "open-questions.md"),
    qualityReport: path.join(context.paths.bootstrapDir, "quality-report.json"),
  };
}

function contractRelativePath(context) {
  return context.layout === "split"
    ? "ops/contract/operating-contract.json"
    : "contract/operating-contract.json";
}

function policyRelativePath(context) {
  return context.layout === "split"
    ? "ops/policy/autonomy.json"
    : "policy/autonomy.json";
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

function getBootstrapState(control, contextOrRoot) {
  const context = config.ensureContext(contextOrRoot);
  const bootstrap = control.meta?.opera?.bootstrap;
  if (!bootstrap) return null;
  const relative = bootstrapRelativePaths(context);
  return {
    ...bootstrap,
    handoffFiles: bootstrap.handoffFiles || {
      markdown: relative.markdown,
      json: relative.json,
    },
    intakeFiles: bootstrap.intakeFiles || {
      json: relative.intakeJson,
      specDossier: relative.specDossier,
    },
    reviewFiles: bootstrap.reviewFiles || {
      openQuestions: relative.openQuestions,
      qualityReport: relative.qualityReport,
    },
  };
}

function buildAvailableArtifacts(context, docsState) {
  const artifacts = [];
  if (docsState === "repo_docs") {
    const readmePath = path.join(context.appRoot, "README.md");
    if (fs.existsSync(readmePath)) {
      artifacts.push({
        kind: "readme",
        location: "repo",
        path: path.relative(context.workspaceRoot, readmePath).replace(/\\/g, "/"),
      });
    }
  }
  return artifacts;
}

function determineBootstrapMode(intake, requestedMode) {
  const normalizedRequested = normalizeEnum(requestedMode || "auto", BOOTSTRAP_MODES) || "auto";

  if (normalizedRequested === "handoff") {
    return { requestedMode: normalizedRequested, mode: "agent_handoff", routeReason: "forced_handoff" };
  }

  if (normalizedRequested === "direct") {
    const hasCore = intake.technicalLevel && intake.projectState && intake.documentationState && intake.decisionOwnership;
    return {
      requestedMode: normalizedRequested,
      mode: hasCore ? "direct_cli" : "agent_handoff",
      routeReason: hasCore ? "forced_direct" : "insufficient_docs",
    };
  }

  if (!["high", "senior"].includes(intake.technicalLevel)) {
    return { requestedMode: normalizedRequested, mode: "agent_handoff", routeReason: "non_technical_user" };
  }
  if (!["existing_repo", "advanced"].includes(intake.projectState)) {
    return { requestedMode: normalizedRequested, mode: "agent_handoff", routeReason: "idea_stage" };
  }
  if (!["sos", "spec_dossier", "repo_docs"].includes(intake.documentationState)) {
    return { requestedMode: normalizedRequested, mode: "agent_handoff", routeReason: "insufficient_docs" };
  }
  if (!["user", "shared"].includes(intake.decisionOwnership)) {
    return { requestedMode: normalizedRequested, mode: "agent_handoff", routeReason: "agent_owned_decisions" };
  }
  return { requestedMode: normalizedRequested, mode: "direct_cli", routeReason: "technical_existing_project" };
}

function directMissingFields(discovery) {
  const missing = [];
  if (!discovery.problemStatement) missing.push("problemStatement");
  if (!discovery.targetUser) missing.push("targetUser");
  if (!discovery.singularDesiredOutcome) missing.push("singularDesiredOutcome");
  if (!discovery.sourceOfTruth) missing.push("sourceOfTruth");
  if (!discovery.payload) missing.push("payload");
  if (!Object.keys(discovery.inputSchema || {}).length) missing.push("inputSchema");
  if (!Object.keys(discovery.outputSchema || {}).length) missing.push("outputSchema");
  return missing;
}

function buildHandoffPayload(control, profile, context) {
  const relative = bootstrapRelativePaths(context);
  return {
    version: 1,
    skill: "project-starter-skill",
    technicalLevel: profile.technicalLevel,
    explanationMode: explanationModeFor(profile.technicalLevel),
    decisionOwnership: profile.discovery?.decisionOwnership || profile.decisionOwnership || null,
    projectState: profile.projectState,
    documentationState: profile.documentationState,
    availableArtifacts: control.meta?.discovery?.availableArtifacts || [],
    problemStatement: profile.discovery?.problemStatement || "",
    targetUser: profile.discovery?.targetUser || "",
    singularDesiredOutcome: profile.discovery?.singularDesiredOutcome || "",
    files: {
      intakeJson: relative.intakeJson,
      specDossier: relative.specDossier,
      openQuestions: relative.openQuestions,
    },
  };
}

function buildHandoffPrompt(control, profile) {
  const lines = [
    "# TrackOps agent handoff",
    "",
    "Use `project-starter-skill` as a discovery and structuring skill for this project.",
    "",
    "## User profile",
    `- Technical level: ${profile.technicalLevel || "unknown"}`,
    `- Explanation mode: ${explanationModeFor(profile.technicalLevel)}`,
    `- Decision ownership: ${profile.discovery?.decisionOwnership || profile.decisionOwnership || "unknown"}`,
    "",
    "## Project state",
    `- Project state: ${profile.projectState || "unknown"}`,
    `- Documentation state: ${profile.documentationState || "unknown"}`,
    "",
    "## What to do",
    "- Start from the user, not from architecture assumptions.",
    "- Adapt depth and language to the user's technical level.",
    "- If documentation exists, read it, summarize it, and consolidate it.",
    "- If documentation does not exist, help the user turn the idea into a workable project specification.",
    "- Write `ops/bootstrap/intake.json` with the structured discovery output.",
    "- Write `ops/bootstrap/spec-dossier.md` with the narrative or technical specification that OPERA will ingest.",
    "- Write `ops/bootstrap/open-questions.md` if important uncertainties remain.",
    "- Include explicit fields for problem statement, target user, desired outcome, source of truth, delivery target, and schemas.",
  ];

  if (profile.discovery?.singularDesiredOutcome) {
    lines.push("", `Known project intention: ${profile.discovery.singularDesiredOutcome}`);
  }

  return `${lines.join("\n")}\n`;
}

async function askQuestion(rl, message, defaultValue) {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${message}${suffix}: `);
  return String(answer || "").trim() || String(defaultValue || "").trim();
}

async function askEnumQuestion(rl, message, defaultValue, allowed) {
  const hint = choiceHint(allowed);
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await rl.question(`${message}${hint ? ` [${hint}]` : ""}${suffix}: `);
  const normalized = normalizeEnum(answer || defaultValue, allowed);
  return normalized || normalizeEnum(defaultValue, allowed);
}

async function collectBootstrapProfile(root, control, options = {}) {
  const context = config.ensureContext(root);
  const locale = config.getLocale(control);
  setLocale(locale);
  const scan = scanProject(context);
  const previousUser = control.meta?.userProfile || {};
  const previousDiscovery = control.meta?.discovery || {};
  const previousBootstrap = getBootstrapState(control, context);
  const previous = previousBootstrap?.discovery || {};
  const interactive = options.interactive !== false && isInteractive();

  const defaults = {
    technicalLevel: normalizeEnum(options.technicalLevel || options.answers?.technicalLevel || previousUser.technicalLevel, TECHNICAL_LEVELS),
    projectState: normalizeEnum(options.projectState || options.answers?.projectState || previousDiscovery.projectState, PROJECT_STATES),
    documentationState: normalizeEnum(options.docsState || options.answers?.documentationState || previousDiscovery.documentationState, DOC_STATES),
    decisionOwnership: normalizeEnum(options.decisionOwnership || options.answers?.decisionOwnership || previous.decisionOwnership, DECISION_OWNERSHIPS),
    problemStatement: options.answers?.problemStatement || previous.problemStatement || "",
    targetUser: options.answers?.targetUser || previous.targetUser || "",
    singularDesiredOutcome:
      options.answers?.singularDesiredOutcome ||
      options.answers?.desiredOutcome ||
      previous.singularDesiredOutcome ||
      previous.desiredOutcome ||
      scan.description ||
      "",
    userLanguage: options.answers?.userLanguage || previous.userLanguage || locale,
    needsPlainLanguage: options.answers?.needsPlainLanguage ?? previous.needsPlainLanguage ?? false,
    recommendedStack: normalizeList(options.answers?.recommendedStack || previous.recommendedStack || scan.stacks),
    externalServices: normalizeList(options.answers?.externalServices || previous.externalServices || scan.services),
    sourceOfTruth: options.answers?.sourceOfTruth || previous.sourceOfTruth || scan.sourceOfTruthHint || "",
    payload: options.answers?.payload || previous.payload || scan.payloadHint || "",
    behaviorRules: normalizeList(options.answers?.behaviorRules || previous.behaviorRules || ""),
    inputSchema: options.answers?.inputSchema || previous.inputSchema || {},
    outputSchema: options.answers?.outputSchema || previous.outputSchema || {},
    architecturalInvariants: normalizeList(options.answers?.architecturalInvariants || previous.architecturalInvariants || ""),
    pipeline: normalizeList(options.answers?.pipeline || previous.pipeline || ""),
    templates: normalizeList(options.answers?.templates || previous.templates || ""),
    availableArtifacts: Array.isArray(previousDiscovery.availableArtifacts) ? previousDiscovery.availableArtifacts : [],
  };

  const answers = { ...defaults };

  if (interactive) {
    console.log("");
    console.log(t("bootstrap.header"));
    console.log(t("bootstrap.subtitle"));
    console.log(t("bootstrap.instructions"));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      answers.technicalLevel = await askEnumQuestion(rl, t("bootstrap.question.technicalLevel"), defaults.technicalLevel || "medium", TECHNICAL_LEVELS) || "medium";
      answers.projectState = await askEnumQuestion(rl, t("bootstrap.question.projectState"), defaults.projectState || "idea", PROJECT_STATES) || "idea";
      answers.documentationState = await askEnumQuestion(rl, t("bootstrap.question.docsState"), defaults.documentationState || "none", DOC_STATES) || "none";
      answers.decisionOwnership = await askEnumQuestion(rl, t("bootstrap.question.decisionOwnership"), defaults.decisionOwnership || "shared", DECISION_OWNERSHIPS) || "shared";
    } finally {
      rl.close();
    }
  }

  answers.availableArtifacts = answers.availableArtifacts.length
    ? answers.availableArtifacts
    : buildAvailableArtifacts(context, answers.documentationState);

  const routing = determineBootstrapMode(answers, options.bootstrapMode);

  if (routing.mode === "agent_handoff") {
    return {
      version: 2,
      status: "awaiting_agent",
      mode: "agent_handoff",
      routeReason: routing.routeReason,
      technicalLevel: answers.technicalLevel,
      projectState: answers.projectState,
      documentationState: answers.documentationState,
      decisionOwnership: answers.decisionOwnership,
      startedAt: previousBootstrap?.startedAt || nowIso(),
      completedAt: null,
      missingFields: ["intakeJson", "specDossier"],
      discovery: answers,
      inference: scan,
    };
  }

  if (interactive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      answers.problemStatement = await askQuestion(rl, t("bootstrap.question.problemStatement"), defaults.problemStatement);
      answers.targetUser = await askQuestion(rl, t("bootstrap.question.targetUser"), defaults.targetUser);
      answers.singularDesiredOutcome = await askQuestion(rl, t("bootstrap.question.desiredOutcome"), defaults.singularDesiredOutcome);
      answers.externalServices = normalizeList(await askQuestion(rl, t("bootstrap.question.externalServices"), defaults.externalServices.join(", ")));
      answers.sourceOfTruth = await askQuestion(rl, t("bootstrap.question.sourceOfTruth"), defaults.sourceOfTruth);
      answers.payload = await askQuestion(rl, t("bootstrap.question.payload"), defaults.payload);
      answers.behaviorRules = normalizeList(await askQuestion(rl, t("bootstrap.question.behaviorRules"), defaults.behaviorRules.join("; ")));
      answers.inputSchema = parseJsonValue(await askQuestion(rl, t("bootstrap.question.inputSchema"), JSON.stringify(defaults.inputSchema)));
      answers.outputSchema = parseJsonValue(await askQuestion(rl, t("bootstrap.question.outputSchema"), JSON.stringify(defaults.outputSchema)));
      answers.architecturalInvariants = normalizeList(await askQuestion(rl, t("bootstrap.question.invariants"), defaults.architecturalInvariants.join("; ")));
      answers.pipeline = normalizeList(await askQuestion(rl, t("bootstrap.question.pipeline"), defaults.pipeline.join("; ")));
      answers.templates = normalizeList(await askQuestion(rl, t("bootstrap.question.templates"), defaults.templates.join(", ")));
    } finally {
      rl.close();
    }
  }

  const missingFields = directMissingFields(answers);
  return {
    version: 2,
    status: missingFields.length ? "awaiting_intake" : "completed",
    mode: "direct_cli",
    routeReason: routing.routeReason,
    technicalLevel: answers.technicalLevel,
    projectState: answers.projectState,
    documentationState: answers.documentationState,
    decisionOwnership: answers.decisionOwnership,
    startedAt: previousBootstrap?.startedAt || nowIso(),
    completedAt: missingFields.length ? null : nowIso(),
    missingFields,
    discovery: answers,
    inference: scan,
  };
}

function isVirginGenesis(content) {
  const text = String(content || "");
  return !text.trim() || /TODO:/i.test(text) || /The Constitution of the project/i.test(text) || /La Constitución del proyecto/i.test(text);
}

function parseSpecSections(specText) {
  const sections = {};
  const lines = String(specText || "").split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [key, value.join("\n").trim()]),
  );
}

function buildOpenQuestions(missingFields, contradictions) {
  const lines = ["# Open questions", ""];
  if (missingFields.length) {
    lines.push("## Missing fields", "");
    missingFields.forEach((field) => lines.push(`- ${field}`));
    lines.push("");
  }
  if (contradictions.length) {
    lines.push("## Contradictions", "");
    contradictions.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  if (!missingFields.length && !contradictions.length) {
    lines.push("- None.");
  }
  return `${lines.join("\n")}\n`;
}

function qualityStatusFor(missingFields, contradictions) {
  if (missingFields.length >= 2) return "blocked";
  if (missingFields.length || contradictions.length) return "needs_review";
  return "ready";
}

function contractReadinessFor(profile, qualityStatus) {
  if (qualityStatus === "blocked") return "hypothesis";
  if (qualityStatus === "needs_review") return "provisional";
  if (
    ["sos", "spec_dossier"].includes(profile.documentationState) &&
    profile.discovery?.decisionOwnership === "user" &&
    profile.mode === "direct_cli"
  ) {
    return "locked";
  }
  return "verified";
}

function buildQualityReport(context, profile, specText) {
  const sections = parseSpecSections(specText);
  const missingFields = directMissingFields(profile.discovery);
  if (!profile.discovery.decisionOwnership) missingFields.push("decisionOwnership");
  if (!profile.discovery.problemStatement) missingFields.push("problemStatement");
  if (!profile.discovery.targetUser) missingFields.push("targetUser");

  const contradictions = [];
  const mappings = [
    ["problem statement", "problemStatement", profile.discovery.problemStatement],
    ["target user", "targetUser", profile.discovery.targetUser],
    ["singular desired outcome", "singularDesiredOutcome", profile.discovery.singularDesiredOutcome],
    ["delivery target", "payload", profile.discovery.payload],
    ["source of truth", "sourceOfTruth", profile.discovery.sourceOfTruth],
  ];
  for (const [sectionName, fieldName, expected] of mappings) {
    const actual = sections[sectionName];
    if (!actual) {
      missingFields.push(fieldName);
      continue;
    }
    if (expected && actual && normalizeText(actual) !== normalizeText(expected)) {
      contradictions.push(`${sectionName}: spec dossier and intake disagree`);
    }
  }

  const status = qualityStatusFor(unique(missingFields), contradictions);
  const contractReadiness = contractReadinessFor(profile, status);
  const report = {
    version: 1,
    status,
    missingFields: unique(missingFields),
    contradictions,
    contractReadiness,
    validatedAt: nowIso(),
    handoffMode: profile.mode,
  };
  const files = bootstrapFilePaths(context);
  writeJson(files.qualityReport, report);
  writeText(files.openQuestions, buildOpenQuestions(report.missingFields, report.contradictions));
  return report;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function buildOperatingContract(control, profile, qualityReport, context) {
  const discovery = profile.discovery || {};
  return {
    version: CONTRACT_VERSION,
    intent: {
      problemStatement: discovery.problemStatement || "",
      targetUser: discovery.targetUser || "",
      singularDesiredOutcome: discovery.singularDesiredOutcome || "",
      deliveryTarget: discovery.payload || "",
    },
    userModel: {
      technicalLevel: profile.technicalLevel || null,
      explanationMode: explanationModeFor(profile.technicalLevel),
      decisionOwnership: discovery.decisionOwnership || profile.decisionOwnership || null,
      language: discovery.userLanguage || config.getLocale(control),
      needsPlainLanguage: Boolean(discovery.needsPlainLanguage || profile.technicalLevel === "low"),
    },
    evidence: {
      projectState: profile.projectState || null,
      documentationState: profile.documentationState || null,
      sourceArtifacts: discovery.availableArtifacts || [],
      repoScan: profile.inference || {},
    },
    system: {
      sourceOfTruth: discovery.sourceOfTruth || "",
      externalServices: discovery.externalServices || [],
      inputSchema: discovery.inputSchema || {},
      outputSchema: discovery.outputSchema || {},
      behaviorRules: discovery.behaviorRules || [],
      architecturalInvariants: discovery.architecturalInvariants || [],
    },
    execution: {
      pipeline: discovery.pipeline || [],
      templates: discovery.templates || [],
      phaseModel: "opera-v3",
      taskSeeds: buildSeedTasks(control, profile).map((task) => task.id),
    },
    governance: {
      policyFile: policyRelativePath(context),
      riskProfile: "standard",
      approvalRules: [
        "destructive_changes_require_approval",
        "production_deploy_requires_approval",
        "external_side_effects_require_approval",
      ],
    },
    quality: {
      contractReadiness: qualityReport.contractReadiness,
      openQuestions: qualityReport.missingFields.concat(qualityReport.contradictions),
      lastValidatedAt: qualityReport.validatedAt,
    },
  };
}

function writeAutonomyPolicy(context) {
  const payload = {
    version: 1,
    defaultRiskProfile: "standard",
    levels: {
      green: ["read_files", "run_tests", "update_operational_docs", "write_tmp_files"],
      yellow: ["install_dependencies", "change_structure", "modify_pipeline"],
      red: ["delete_persistent_data", "deploy_to_production", "external_side_effects", "security_changes"],
    },
    approvalRules: {
      destructive_changes_require_approval: true,
      production_deploy_requires_approval: true,
      external_side_effects_require_approval: true,
    },
  };
  writeJson(context.paths.autonomyPolicyFile, payload);
}

function renderGenesis(control, contract) {
  const locale = config.getLocale(control);
  const templatePath = resolveLocalizedFile(TEMPLATES_DIR, locale, "genesis.md");
  let content = fs.readFileSync(templatePath, "utf8");
  const rules = (contract.system.behaviorRules || []).map((item) => `- ${item}`).join("\n") || `- ${t("bootstrap.noneDefined")}`;
  const invariants = (contract.system.architecturalInvariants || []).map((item) => `- ${item}`).join("\n") || `- ${t("bootstrap.noneDefined")}`;
  const services = (contract.system.externalServices || []).length
    ? contract.system.externalServices.map((item) => `| ${item} | ${t("bootstrap.servicePending")} | ${t("bootstrap.servicePending")} |`).join("\n")
    : `| — | — | — |`;
  const pipeline = (contract.execution.pipeline || []).length
    ? contract.execution.pipeline.map((item) => `- ${item}`).join("\n")
    : `- ${t("bootstrap.noneDefined")}`;
  const templates = (contract.execution.templates || []).length
    ? contract.execution.templates.map((item) => `- \`${item}\``).join("\n")
    : `- ${t("bootstrap.noneDefined")}`;
  const schema = JSON.stringify({
    input: {
      source: contract.system.sourceOfTruth,
      schema: contract.system.inputSchema || {},
    },
    output: {
      destination: contract.intent.deliveryTarget,
      schema: contract.system.outputSchema || {},
    },
  }, null, 2);

  const replacements = {
    PROJECT_NAME: control.meta.projectName || "Project",
    DESIRED_OUTCOME: contract.intent.singularDesiredOutcome || t("bootstrap.pendingValue"),
    SERVICES_TABLE: services,
    SOURCE_OF_TRUTH: contract.system.sourceOfTruth || t("bootstrap.pendingValue"),
    PAYLOAD: contract.intent.deliveryTarget || t("bootstrap.pendingValue"),
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
  const firstTaskStatus =
    profile.status === "completed"
      ? "completed"
      : ["blocked", "needs_review"].includes(profile.status)
        ? "blocked"
      : profile.mode === "agent_handoff"
        ? (profile.status === "awaiting_agent" ? "blocked" : "pending")
        : "blocked";
  const tasks = [
    {
      id: "opera-bootstrap",
      origin: "bootstrap",
      title: t("bootstrap.task.bootstrap.title"),
      phase: phaseOrder[0]?.id || "O",
      stream: "Operations",
      priority: "P0",
      status: firstTaskStatus,
      required: true,
      dependsOn: [],
      summary: profile.mode === "agent_handoff"
        ? t("bootstrap.task.bootstrap.handoffSummary")
        : t("bootstrap.task.bootstrap.summary"),
      acceptance: profile.mode === "agent_handoff"
        ? [
            t("bootstrap.acceptance.intake"),
            t("bootstrap.acceptance.specDossier"),
            t("bootstrap.acceptance.resume"),
          ]
        : [
            t("bootstrap.acceptance.discovery"),
            t("bootstrap.acceptance.schema"),
            t("bootstrap.acceptance.rules"),
            t("bootstrap.acceptance.plan"),
          ],
      blocker: profile.status === "completed"
        ? undefined
        : profile.mode === "agent_handoff"
          ? t("bootstrap.blocker.awaitingAgent")
          : t("bootstrap.blocker.missingData"),
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

  return tasks;
}

function createAwaitingBootstrapState(context) {
  return {
    version: CONTRACT_VERSION,
    mode: null,
    status: "awaiting_intake",
    routeReason: null,
    technicalLevel: null,
    projectState: null,
    documentationState: null,
    decisionOwnership: null,
    startedAt: nowIso(),
    completedAt: null,
    missingFields: [],
    discovery: {},
    handoffFiles: {
      markdown: bootstrapRelativePaths(context).markdown,
      json: bootstrapRelativePaths(context).json,
    },
    intakeFiles: {
      json: bootstrapRelativePaths(context).intakeJson,
      specDossier: bootstrapRelativePaths(context).specDossier,
    },
    reviewFiles: {
      openQuestions: bootstrapRelativePaths(context).openQuestions,
      qualityReport: bootstrapRelativePaths(context).qualityReport,
    },
    inference: scanProject(context),
  };
}

function applyBootstrap(root, control, profile) {
  const context = config.ensureContext(root);
  setLocale(config.getLocale(control));
  control.meta = control.meta || {};
  control.meta.opera = control.meta.opera || {};
  control.meta.opera.model = "v3";
  writeAutonomyPolicy(context);
  control.meta.userProfile = {
    technicalLevel: profile.technicalLevel || null,
    explanationMode: explanationModeFor(profile.technicalLevel),
    capturedAt: nowIso(),
  };
  control.meta.discovery = {
    projectState: profile.projectState || null,
    documentationState: profile.documentationState || null,
    availableArtifacts: Array.isArray(profile.discovery?.availableArtifacts) ? profile.discovery.availableArtifacts : [],
  };
  const relative = bootstrapRelativePaths(context);
  control.meta.opera.bootstrap = {
    ...profile,
    handoffFiles: {
      markdown: relative.markdown,
      json: relative.json,
    },
    intakeFiles: {
      json: relative.intakeJson,
      specDossier: relative.specDossier,
    },
    reviewFiles: {
      openQuestions: relative.openQuestions,
      qualityReport: relative.qualityReport,
    },
  };
  control.meta.currentFocus = profile.discovery.singularDesiredOutcome || profile.discovery.desiredOutcome || t("bootstrap.defaultFocus");
  control.meta.deliveryTarget = profile.discovery.payload || t("bootstrap.defaultTarget");
  control.meta.focusPhase = profile.status === "completed" ? "P" : "O";
  control.meta.phases = config.getPhases(control);
  control.meta.opera.legacyStatus = "supported";

  const remainingTasks = (control.tasks || []).filter((task) => task.id !== "ops-bootstrap" && task.origin !== "bootstrap");
  control.tasks = [...remainingTasks, ...buildSeedTasks(control, profile)];

  control.decisionsPending = (profile.missingFields || [])
    .filter((field) => !["intakeJson", "specDossier"].includes(field))
    .map((field) => ({
      owner: "user",
      title: t(`bootstrap.field.${field}`),
      impact: t("bootstrap.decisionImpact"),
    }));
  if (profile.mode === "agent_handoff" && profile.status !== "completed") {
    control.decisionsPending.unshift({
      owner: "user",
      title: t("bootstrap.pendingDecision.handoff"),
      impact: t("bootstrap.pendingDecision.handoffImpact"),
    });
  }

  control.findings = control.findings || [];
  const files = bootstrapFilePaths(context);
  if (profile.mode === "agent_handoff") {
    writeJson(files.json, buildHandoffPayload(control, profile, context));
    writeText(files.markdown, buildHandoffPrompt(control, profile));
    if (!fs.existsSync(files.specDossier)) {
      writeText(files.specDossier, "# Spec dossier\n\nUse this file to consolidate the project specification before OPERA ingest.\n");
    }
    writeText(files.openQuestions, buildOpenQuestions(["intakeJson", "specDossier"], []));
  }
  const genesisPath = context.paths.genesisFile;
  if (profile.status === "completed") {
    const specText = fs.existsSync(files.specDossier) && readText(files.specDossier).trim()
      ? readText(files.specDossier)
      : `## Problem statement\n${profile.discovery.problemStatement || ""}\n\n## Target user\n${profile.discovery.targetUser || ""}\n\n## Singular desired outcome\n${profile.discovery.singularDesiredOutcome || ""}\n\n## Delivery target\n${profile.discovery.payload || ""}\n\n## Source of truth\n${profile.discovery.sourceOfTruth || ""}\n`;
    const qualityReport = profile.qualityReport || buildQualityReport(context, profile, specText);
    const contract = buildOperatingContract(control, profile, qualityReport, context);
    writeJson(context.paths.contractFile, contract);
    fs.writeFileSync(genesisPath, `${renderGenesis(control, contract)}\n`, "utf8");
    control.meta.opera.contractVersion = CONTRACT_VERSION;
    control.meta.opera.contractReadiness = qualityReport.contractReadiness;
    control.meta.opera.contractFile = contractRelativePath(context);
    control.meta.opera.qualityStatus = qualityReport.status;
  } else if (["needs_review", "blocked"].includes(profile.status)) {
    control.meta.opera.contractVersion = null;
    control.meta.opera.contractReadiness = profile.qualityReport?.contractReadiness || "hypothesis";
    control.meta.opera.qualityStatus = profile.qualityReport?.status || profile.status;
  } else {
    control.meta.opera.contractVersion = null;
    control.meta.opera.contractReadiness = "hypothesis";
    control.meta.opera.qualityStatus = profile.status;
  }

  config.saveControl(context, control);
  return control;
}

function resumeBootstrap(root, control) {
  const context = config.ensureContext(root);
  const bootstrap = getBootstrapState(control, context);
  if (!bootstrap) {
    return { resumed: false, status: "awaiting_intake", reason: "no_bootstrap_state" };
  }

  const files = bootstrapFilePaths(context);
  const intake = readJson(files.intakeJson);
  const specDossier = readText(files.specDossier);
  if (!intake || !specDossier.trim()) {
    return { resumed: false, status: "awaiting_agent", reason: "missing_agent_artifacts" };
  }

  const discovery = {
    ...bootstrap.discovery,
    ...intake,
    singularDesiredOutcome: intake.singularDesiredOutcome || bootstrap.discovery?.singularDesiredOutcome || "",
    externalServices: normalizeList(intake.externalServices || bootstrap.discovery?.externalServices || []),
    behaviorRules: normalizeList(intake.behaviorRules || bootstrap.discovery?.behaviorRules || []),
    architecturalInvariants: normalizeList(intake.architecturalInvariants || bootstrap.discovery?.architecturalInvariants || []),
    pipeline: normalizeList(intake.pipeline || bootstrap.discovery?.pipeline || []),
    templates: normalizeList(intake.templates || bootstrap.discovery?.templates || []),
    inputSchema: intake.inputSchema || bootstrap.discovery?.inputSchema || {},
    outputSchema: intake.outputSchema || bootstrap.discovery?.outputSchema || {},
  };
  const missingFields = directMissingFields(discovery);
  const profile = {
    ...bootstrap,
    mode: bootstrap.mode || "agent_handoff",
    status: missingFields.length ? "needs_review" : "completed",
    technicalLevel: intake.technicalLevel || bootstrap.technicalLevel || null,
    projectState: intake.projectState || bootstrap.projectState || null,
    documentationState: intake.documentationState || bootstrap.documentationState || null,
    decisionOwnership: intake.decisionOwnership || bootstrap.decisionOwnership || null,
    completedAt: missingFields.length ? null : nowIso(),
    missingFields,
    discovery,
    inference: scanProject(context),
  };
  const qualityReport = buildQualityReport(context, profile, specDossier);
  profile.status = qualityReport.status === "ready" ? "completed" : qualityReport.status;
  profile.completedAt = qualityReport.status === "ready" ? nowIso() : null;
  profile.qualityReport = qualityReport;
  return { resumed: true, profile };
}

function detectLegacyBootstrap(root, control) {
  const context = config.ensureContext(root);
  if (!config.isOperaInstalled(control)) return null;
  if (control.meta?.opera?.bootstrap) return getBootstrapState(control, context);
  if (control.meta?.opera?.model === "v3") {
    return createAwaitingBootstrapState(context);
  }
  if (!fs.existsSync(context.paths.contractFile)) {
    return {
      version: CONTRACT_VERSION,
      status: "legacy_unsupported",
      mode: null,
      routeReason: "legacy_unsupported",
      technicalLevel: null,
      projectState: null,
      documentationState: null,
      decisionOwnership: null,
      startedAt: control.meta?.opera?.installedAt || nowIso(),
      completedAt: null,
      missingFields: [],
      discovery: {},
      inference: scanProject(context),
    };
  }
  return null;
}

module.exports = {
  TECHNICAL_LEVELS,
  PROJECT_STATES,
  DOC_STATES,
  DECISION_OWNERSHIPS,
  BOOTSTRAP_MODES,
  QUALITY_STATUSES,
  CONTRACT_READINESS,
  CONTRACT_VERSION,
  bootstrapFilePaths,
  bootstrapRelativePaths,
  contractRelativePath,
  policyRelativePath,
  scanProject,
  collectBootstrapProfile,
  applyBootstrap,
  resumeBootstrap,
  detectLegacyBootstrap,
  getBootstrapState,
  buildQualityReport,
  buildOperatingContract,
  writeAutonomyPolicy,
  createAwaitingBootstrapState,
  isVirginGenesis,
};
