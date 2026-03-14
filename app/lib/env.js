#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const config = require("./config");

const SERVICE_ENV_KEYS = {
  OpenAI: ["OPENAI_API_KEY"],
  Anthropic: ["ANTHROPIC_API_KEY"],
  Stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  Supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  PostgreSQL: ["DATABASE_URL"],
  MySQL: ["DATABASE_URL"],
  Redis: ["REDIS_URL"],
  Slack: ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"],
  "Amazon S3": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET"],
  AWS: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
  "Google Cloud": ["GOOGLE_APPLICATION_CREDENTIALS"],
  Azure: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
};

function unique(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function parseEnv(text) {
  const entries = {};
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    if (!line || /^\s*#/.test(line)) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    entries[match[1]] = match[2] || "";
  }
  return entries;
}

function parseEnvKeys(text) {
  return unique(Object.keys(parseEnv(text)));
}

function normalizeEnvironmentMeta(control, context) {
  const envMeta = control.meta?.environment || {};
  return {
    rootEnvFile: envMeta.rootEnvFile || path.relative(context.workspaceRoot, context.env.rootFile).replace(/\\/g, "/"),
    exampleFile: envMeta.exampleFile || path.relative(context.workspaceRoot, context.env.exampleFile).replace(/\\/g, "/"),
    appBridgeFile: envMeta.appBridgeFile || path.relative(context.workspaceRoot, context.env.appBridgeFile).replace(/\\/g, "/"),
    bridgeMode: envMeta.bridgeMode || (context.layout === "split" ? "symlink-or-copy" : "none"),
    requiredKeys: unique(envMeta.requiredKeys),
    optionalKeys: unique(envMeta.optionalKeys),
    lastAuditAt: envMeta.lastAuditAt || null,
  };
}

function inferRequiredKeys(control, contextOrRoot) {
  const envMeta = control.meta?.environment || {};
  const fromMeta = unique([...(envMeta.requiredKeys || []), ...(envMeta.optionalKeys || [])]);
  const contractServices = readContractServices(contextOrRoot, control);
  const bootstrapServices = unique([
    ...(control.meta?.opera?.bootstrap?.discovery?.externalServices || []),
    ...(control.meta?.opera?.bootstrap?.externalServices || []),
  ]);
  const fromServices = unique(
    (contractServices.length ? contractServices : bootstrapServices)
      .flatMap((service) => SERVICE_ENV_KEYS[service] || []),
  );
  const context = config.ensureContext(contextOrRoot || process.cwd());
  const fromExample = parseEnvKeys(readText(context.env.exampleFile));
  return unique([...fromMeta, ...fromServices, ...fromExample]);
}

function readContractServices(contextOrRoot, control) {
  const context = config.ensureContext(contextOrRoot || process.cwd());
  const contractFile = context.paths.contractFile;
  if (!fs.existsSync(contractFile)) return [];
  try {
    const contract = JSON.parse(fs.readFileSync(contractFile, "utf8"));
    return Array.isArray(contract?.system?.externalServices) ? contract.system.externalServices : [];
  } catch (_error) {
    return [];
  }
}

function ensureFileWithHeader(filePath, lines) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function appendMissingKeys(filePath, keys, heading) {
  const existing = readText(filePath);
  const parsed = parseEnvKeys(existing);
  const missing = unique(keys).filter((key) => !parsed.includes(key));
  if (!missing.length) return;

  const chunks = [];
  if (existing.trim()) chunks.push("");
  if (heading) chunks.push(heading);
  missing.forEach((key) => chunks.push(`${key}=`));
  fs.appendFileSync(filePath, `${chunks.join("\n")}\n`, "utf8");
}

function safeUnlink(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch (_error) {
    // noop
  }
}

function ensureBridge(context, control) {
  const envMeta = normalizeEnvironmentMeta(control, context);
  const bridgePath = context.env.appBridgeFile;
  const exampleBridgePath = context.env.appExampleBridgeFile;
  const sourceEnv = context.env.rootFile;
  const sourceExample = context.env.exampleFile;

  if (context.layout !== "split") {
    control.meta.environment = { ...envMeta, bridgeMode: "none" };
    return "none";
  }

  fs.mkdirSync(path.dirname(bridgePath), { recursive: true });

  let mode = "copy";
  safeUnlink(bridgePath);
  try {
    fs.symlinkSync(path.relative(path.dirname(bridgePath), sourceEnv), bridgePath, "file");
    mode = "symlink";
  } catch (_error) {
    fs.copyFileSync(sourceEnv, bridgePath);
  }

  safeUnlink(exampleBridgePath);
  try {
    fs.symlinkSync(path.relative(path.dirname(exampleBridgePath), sourceExample), exampleBridgePath, "file");
  } catch (_error) {
    fs.copyFileSync(sourceExample, exampleBridgePath);
  }

  control.meta.environment = {
    ...envMeta,
    bridgeMode: mode,
  };
  return mode;
}

function syncEnvironment(contextOrRoot, controlState, options = {}) {
  const context = config.ensureContext(contextOrRoot);
  const control = controlState || config.loadControl(context);
  control.meta = control.meta || {};
  control.meta.environment = normalizeEnvironmentMeta(control, context);

  const requiredKeys = unique(options.requiredKeys || inferRequiredKeys(control, context));
  const optionalKeys = unique(options.optionalKeys || control.meta.environment.optionalKeys);

  ensureFileWithHeader(context.env.rootFile, [
    "# TrackOps workspace secrets",
    "# Do not commit this file.",
  ]);
  ensureFileWithHeader(context.env.exampleFile, [
    "# TrackOps workspace environment contract",
    "# Safe to commit. Keep only keys, never real values.",
  ]);

  appendMissingKeys(context.env.rootFile, requiredKeys, "# Required keys");
  appendMissingKeys(context.env.exampleFile, requiredKeys, "# Required keys");
  appendMissingKeys(context.env.exampleFile, optionalKeys, "# Optional keys");

  const bridgeMode = ensureBridge(context, control);
  control.meta.environment = {
    ...control.meta.environment,
    requiredKeys,
    optionalKeys,
    bridgeMode,
    lastAuditAt: new Date().toISOString(),
  };

  config.saveControl(context, control);
  return auditEnvironment(context, control);
}

function auditEnvironment(contextOrRoot, controlState) {
  const context = config.ensureContext(contextOrRoot);
  const control = controlState || config.loadControl(context);
  const envMeta = normalizeEnvironmentMeta(control, context);
  const requiredKeys = unique(envMeta.requiredKeys.length ? envMeta.requiredKeys : inferRequiredKeys(control, context));
  const envEntries = parseEnv(readText(context.env.rootFile));
  const presentKeys = requiredKeys.filter((key) => String(envEntries[key] || "").trim());
  const missingKeys = requiredKeys.filter((key) => !String(envEntries[key] || "").trim());

  return {
    ok: true,
    files: {
      rootEnv: context.env.rootFile,
      rootExample: context.env.exampleFile,
      appBridge: context.env.appBridgeFile,
    },
    bridgeMode: envMeta.bridgeMode,
    requiredKeys,
    optionalKeys: envMeta.optionalKeys,
    presentKeys,
    missingKeys,
    lastAuditAt: envMeta.lastAuditAt,
  };
}

function cmdStatus(contextOrRoot) {
  const audit = auditEnvironment(contextOrRoot);
  console.log("Environment:");
  console.log(`  Root .env: ${audit.files.rootEnv}`);
  console.log(`  Example: ${audit.files.rootExample}`);
  console.log(`  App bridge: ${audit.files.appBridge}`);
  console.log(`  Bridge mode: ${audit.bridgeMode}`);
  console.log(`  Required keys: ${audit.requiredKeys.length ? audit.requiredKeys.join(", ") : "none"}`);
  console.log(`  Present: ${audit.presentKeys.length ? audit.presentKeys.join(", ") : "none"}`);
  console.log(`  Missing: ${audit.missingKeys.length ? audit.missingKeys.join(", ") : "none"}`);
}

function cmdSync(contextOrRoot) {
  const context = config.ensureContext(contextOrRoot);
  const control = config.loadControl(context);
  const audit = syncEnvironment(context, control);
  console.log(`Environment synced at ${path.relative(context.workspaceRoot, context.env.rootFile)}`);
  if (audit.missingKeys.length) {
    console.log(`Missing required keys: ${audit.missingKeys.join(", ")}`);
  }
}

module.exports = {
  SERVICE_ENV_KEYS,
  parseEnv,
  parseEnvKeys,
  normalizeEnvironmentMeta,
  inferRequiredKeys,
  syncEnvironment,
  auditEnvironment,
  cmdStatus,
  cmdSync,
};
