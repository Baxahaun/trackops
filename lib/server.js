#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const config = require("./config");
const control = require("./control");
const env = require("./env");
const registry = require("./registry");
const { t, setLocale, getMessages } = require("./i18n");
const { normalizeLocale } = require("./locale");
const runtimeState = require("./runtime-state");

const UI_DIR = path.join(__dirname, "..", "ui");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;
const PORT_SEARCH_LIMIT = 100;
const ORPHAN_TIMEOUT_MS = Number(process.env.OPS_COMMAND_ORPHAN_TIMEOUT_MS || 120000);
const MAX_COMMAND_RUNTIME_MS = Number(process.env.OPS_COMMAND_MAX_RUNTIME_MS || 600000);
const sessions = new Map();
const VIRTUAL_INTERFACE_MARKERS = ["tailscale", "vethernet", "docker", "vbox", "vmware", "hyper-v", "loopback", "virtual", "wsl"];

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff":  "font/woff",
};

/* ── helpers ── */

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(message);
}

function readJsonFileSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) { reject(new Error(t("server.payloadTooLarge", { limit: "1 MB" }))); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) { resolve({}); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (_e) { reject(new Error(t("server.invalidJson"))); }
    });
    req.on("error", reject);
  });
}

function slugify(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function toList(value) {
  if (Array.isArray(value)) return value.map((i) => String(i).trim()).filter(Boolean);
  return String(value || "").split(/\r?\n|,/).map((i) => i.trim()).filter(Boolean);
}

function parseDashboardArgs(args = []) {
  const options = {
    port: null,
    host: null,
    public: false,
    strictPort: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === "--port" || arg === "-p") && args[i + 1]) {
      options.port = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = arg.slice("--port=".length);
      continue;
    }
    if ((arg === "--host" || arg === "-H") && args[i + 1]) {
      options.host = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
      continue;
    }
    if (arg === "--public") {
      options.public = true;
      continue;
    }
    if (arg === "--strict-port") {
      options.strictPort = true;
    }
  }

  return options;
}

function parsePortValue(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(t("server.invalidPort", { value: String(value) }));
  }
  return port;
}

function isLoopbackHost(host) {
  const normalized = String(host || "").trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "localhost" || normalized === "::1";
}

function isWildcardHost(host) {
  const normalized = String(host || "").trim().toLowerCase();
  return normalized === "0.0.0.0" || normalized === "::";
}

function isPrivateIpv4(address) {
  const parts = String(address || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function getLocalUrlHost(host) {
  if (isWildcardHost(host) || isLoopbackHost(host)) return "localhost";
  return host;
}

function resolveDashboardConfig(args = [], env = process.env) {
  const options = parseDashboardArgs(args);
  const host = options.host || env.OPS_UI_HOST || (options.public ? "0.0.0.0" : DEFAULT_HOST);
  const startPort = options.port != null
    ? parsePortValue(options.port)
    : env.OPS_UI_PORT
      ? parsePortValue(env.OPS_UI_PORT)
      : DEFAULT_PORT;

  return {
    host,
    startPort,
    strictPort: options.strictPort,
    publicMode: options.public || isWildcardHost(host) || !isLoopbackHost(host),
  };
}

function isPortAvailable(host, port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", () => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, host);
  });
}

async function findAvailablePort({ host, startPort, strict }) {
  if (strict) {
    const available = await isPortAvailable(host, startPort);
    if (!available) {
      throw new Error(t("server.portBusyStrict", { port: startPort }));
    }
    return { port: startPort, requestedPort: startPort, fallbackUsed: false };
  }

  for (let offset = 0; offset < PORT_SEARCH_LIMIT; offset += 1) {
    const port = startPort + offset;
    if (port > 65535) break;
    // Probe a temporary bind before creating the real server to avoid immediate EADDRINUSE failures.
    if (await isPortAvailable(host, port)) {
      return { port, requestedPort: startPort, fallbackUsed: port !== startPort };
    }
  }

  throw new Error(t("server.portSearchExhausted", { port: startPort, limit: PORT_SEARCH_LIMIT }));
}

function buildNetworkCandidates() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses || []) {
      if (!address || address.internal || address.family !== "IPv4") continue;
      const normalizedName = String(name || "").toLowerCase();
      const isVirtual = VIRTUAL_INTERFACE_MARKERS.some((marker) => normalizedName.includes(marker));
      const isPrivate = isPrivateIpv4(address.address);
      let priority = 3;
      if (isPrivate && !isVirtual) priority = 0;
      else if (isPrivate) priority = 1;
      else priority = 2;
      candidates.push({
        name,
        address: address.address,
        priority,
      });
    }
  }

  return candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.address.localeCompare(b.address);
  });
}

function collectReachableUrls({ host, port, publicMode }) {
  const localUrl = `http://${getLocalUrlHost(host)}:${port}`;
  const networkUrls = [];
  const seen = new Set();

  function add(url) {
    if (seen.has(url)) return;
    seen.add(url);
    networkUrls.push(url);
  }

  if (publicMode) {
    if (!isWildcardHost(host) && !isLoopbackHost(host)) {
      add(`http://${host}:${port}`);
    }

    buildNetworkCandidates().forEach((candidate) => {
      add(`http://${candidate.address}:${port}`);
    });
  }

  return { localUrl, networkUrls };
}

function copyTextToClipboard(text) {
  const commands = process.platform === "win32"
    ? [["clip"]]
    : process.platform === "darwin"
      ? [["pbcopy"]]
      : [["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]];

  let sawNonAvailabilityError = false;

  for (const [command, ...args] of commands) {
    const result = spawnSync(command, args, {
      input: text,
      encoding: "utf8",
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });

    if (!result.error && result.status === 0) {
      return { copied: true, reason: null };
    }

    if (result.error && result.error.code !== "ENOENT") {
      sawNonAvailabilityError = true;
    }
  }

  return { copied: false, reason: sawNonAvailabilityError ? "failed" : "unavailable" };
}

function renderStartupBanner(info) {
  const lines = [
    t("server.bannerTitle"),
    "",
    t("server.localUrl", { url: info.urls.localUrl }),
  ];

  if (info.publicMode) {
    if (info.urls.networkUrls.length > 0) {
      lines.push(t("server.networkUrl", { url: info.urls.networkUrls[0] }));
      info.urls.networkUrls.slice(1).forEach((url) => lines.push(t("server.networkAltUrl", { url })));
    } else {
      lines.push(t("server.noNetworkAddress"));
    }
  }

  lines.push("");

  if (info.fallbackUsed) {
    lines.push(t("server.portFallback", { requestedPort: info.requestedPort, actualPort: info.port }));
  }

  if (info.clipboard.copied) {
    lines.push(t("server.copiedToClipboard"));
  } else if (info.clipboard.reason === "failed") {
    lines.push(t("server.clipboardUnavailable"));
  }

  if (info.defaultProject) {
    lines.push(t("server.defaultProject", { name: info.defaultProject.name, id: info.defaultProject.id }));
  }

  return lines.join("\n");
}

function listenServer(server, host, port) {
  return new Promise((resolve, reject) => {
    function onError(error) {
      server.off("listening", onListening);
      reject(error);
    }

    function onListening() {
      server.off("error", onError);
      resolve(server.address());
    }

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

/* ── project resolution ── */

let startupRoot = null;

function ensureCurrentProjectRegistered() {
  if (!startupRoot) return null;
  try { return registry.registerProject(startupRoot); }
  catch (_e) { return null; }
}

function resolveProjectEntry(projectRef) {
  const current = ensureCurrentProjectRegistered();
  const entry = registry.resolveProject(projectRef, startupRoot) || current;
  if (!entry) throw new Error(t("server.projectNotResolved"));
  return entry;
}

function loadControlApi(projectRoot) {
  return control.forProject(projectRoot);
}

function buildI18nPayload(controlState) {
  const phases = config.getPhases(controlState);
  const locale = config.getLocale(controlState);
  const statusLabels = {};
  for (const s of control.STATUS_ORDER) {
    statusLabels[s] = control.statusLabel(s);
  }
  return { locale, statusLabels, phases, messages: getMessages(locale) };
}

function buildOperaState(projectRoot, controlState) {
  const context = config.ensureContext(projectRoot);
  const operaBootstrap = require("./opera-bootstrap");
  const bootstrapState =
    controlState.meta?.opera?.bootstrap ||
    operaBootstrap.detectLegacyBootstrap(context, controlState) ||
    operaBootstrap.createAwaitingBootstrapState(context);
  const qualityReport = readJsonFileSafe(path.join(context.paths.bootstrapDir, "quality-report.json"));
  const localeDoctor = runtimeState.doctorLocale(controlState.meta?.locale || null);

  return {
    installed: config.isOperaInstalled(controlState),
    version: controlState.meta?.opera?.version || null,
    model: controlState.meta?.opera?.model || null,
    stableTag: controlState.meta?.opera?.stableTag || null,
    contractVersion: controlState.meta?.opera?.contractVersion || null,
    contractReadiness: controlState.meta?.opera?.contractReadiness || qualityReport?.contractReadiness || "hypothesis",
    qualityStatus: controlState.meta?.opera?.qualityStatus || qualityReport?.status || null,
    qualityReport,
    legacyStatus: controlState.meta?.opera?.legacyStatus || bootstrapState?.status || "supported",
    localeSource: localeDoctor.source,
    bootstrap: bootstrapState,
    contractFile: context.paths.contractFile,
    policyFile: context.paths.autonomyPolicyFile,
  };
}

function getStatePayload(projectRef) {
  const project = resolveProjectEntry(projectRef);
  const api = loadControlApi(project.root);
  const controlState = api.loadControl();
  const runtime = api.refreshRepoRuntime({ quiet: true });
  const envState = env.auditEnvironment(project.root, controlState);
  const operaState = buildOperaState(project.root, controlState);

  return {
    project,
    control: controlState,
    derived: api.derive(controlState),
    runtime,
    env: envState,
    opera: operaState,
    docsDirty: api.getDocDrift(controlState),
    i18n: buildI18nPayload(controlState),
    generatedAt: new Date().toISOString(),
  };
}

function persist(projectRoot) {
  const api = loadControlApi(projectRoot);
  const controlState = api.loadControl();
  api.saveControl(controlState);
  api.syncDocs(controlState);
  api.refreshRepoRuntime({ quiet: true });
}

function updateProjectLocale(projectRoot, locale) {
  const nextLocale = normalizeLocale(locale);
  if (!nextLocale) {
    throw new Error(t("server.invalidLocale", { value: String(locale || "") }));
  }

  const api = loadControlApi(projectRoot);
  const controlState = api.loadControl();
  controlState.meta = controlState.meta || {};
  controlState.meta.locale = nextLocale;

  api.saveControl(controlState);

  if (config.isOperaInstalled(controlState)) {
    const opera = require("./opera");
    opera.installStructure(projectRoot, controlState, nextLocale, { rewriteLocalizedTemplates: true });
    api.saveControl(controlState);
  }

  api.syncDocs(controlState);
  api.refreshRepoRuntime({ quiet: true });
  setLocale(nextLocale);
  return controlState;
}

/* ── task operations ── */

function makeTaskId(controlState, seed) {
  const base = slugify(seed) || `task-${Date.now()}`;
  const existing = new Set(controlState.tasks.map((t) => t.id));
  if (!existing.has(base)) return base;
  let idx = 2;
  while (existing.has(`${base}-${idx}`)) idx += 1;
  return `${base}-${idx}`;
}

function createTask(projectRoot, payload) {
  const api = loadControlApi(projectRoot);
  const controlState = api.loadControl();
  const title = String(payload.title || "").trim();
  if (!title) throw new Error(t("server.titleRequired"));

  const task = {
    id: makeTaskId(controlState, payload.id || title),
    title,
    phase: payload.phase || config.getPhases(controlState)[0]?.id || "E",
    stream: String(payload.stream || "Operations").trim(),
    priority: payload.priority || "P1",
    status: payload.status || "pending",
    required: payload.required !== false,
    dependsOn: toList(payload.dependsOn),
    summary: String(payload.summary || "").trim(),
    acceptance: toList(payload.acceptance),
    history: [{ at: new Date().toISOString(), action: "create", note: t("server.taskCreatedNote") }],
  };

  const blocker = String(payload.blocker || "").trim();
  if (blocker) task.blocker = blocker;
  controlState.tasks.push(task);
  api.saveControl(controlState);
  api.syncDocs(controlState);
  api.refreshRepoRuntime({ quiet: true });
  return task;
}

function patchTask(projectRoot, taskId, payload) {
  const api = loadControlApi(projectRoot);
  const controlState = api.loadControl();
  const task = controlState.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(t("cli.taskNotFound", { taskId }));

  if (typeof payload.title === "string") task.title = payload.title.trim() || task.title;
  if (typeof payload.phase === "string") task.phase = payload.phase;
  if (typeof payload.stream === "string") task.stream = payload.stream.trim() || task.stream;
  if (typeof payload.priority === "string") task.priority = payload.priority;
  if (typeof payload.status === "string") task.status = payload.status;
  if (typeof payload.required === "boolean") task.required = payload.required;
  if (payload.summary !== undefined) task.summary = String(payload.summary || "").trim();
  if (payload.dependsOn !== undefined) task.dependsOn = toList(payload.dependsOn);
  if (payload.acceptance !== undefined) task.acceptance = toList(payload.acceptance);

  const blocker = String(payload.blocker || "").trim();
  if (blocker) task.blocker = blocker;
  else delete task.blocker;

  task.history = task.history || [];
  task.history.push({ at: new Date().toISOString(), action: "edit", note: String(payload.note || t("server.taskEditedNote")).trim() });

  api.saveControl(controlState);
  api.syncDocs(controlState);
  api.refreshRepoRuntime({ quiet: true });
  return task;
}

/* ── sessions (command execution) ── */

function emitSession(res, payload) { res.write(`data: ${JSON.stringify(payload)}\n\n`); }

function cleanupSession(session) {
  if (session.killTimer) { clearTimeout(session.killTimer); session.killTimer = null; }
  if (session.maxRuntimeTimer) { clearTimeout(session.maxRuntimeTimer); session.maxRuntimeTimer = null; }
}

function terminateSession(session, reason) {
  if (!session || session.status !== "running" || !session.process) return;
  cleanupSession(session);
  session.status = "terminated";
  session.exitCode = 1;
  session.output += `\n[ops] ${reason}\n`;
  try { session.process.kill(); } catch (_e) { /* noop */ }
  session.listeners.forEach((res) => {
    emitSession(res, { type: "done", status: session.status, exitCode: session.exitCode, output: session.output, projectId: session.projectId });
    res.end();
  });
  session.listeners.clear();
}

function scheduleOrphanTermination(session) {
  if (!session || session.status !== "running" || session.listeners.size > 0) return;
  cleanupSession(session);
  session.killTimer = setTimeout(() => terminateSession(session, "orphan timeout"), ORPHAN_TIMEOUT_MS);
}

function createSession(commandText, project) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    id, projectId: project.id, projectName: project.name, projectRoot: project.root,
    command: commandText, startedAt: new Date().toISOString(),
    status: "running", exitCode: null, output: "", listeners: new Set(),
  };

  const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/sh";
  const shellArgs = process.platform === "win32"
    ? ["-NoLogo", "-NoProfile", "-Command", commandText]
    : ["-lc", commandText];

  const child = spawn(shell, shellArgs, { cwd: project.root, env: process.env });
  session.process = child;
  session.killTimer = null;
  session.maxRuntimeTimer = setTimeout(() => terminateSession(session, "max runtime exceeded"), MAX_COMMAND_RUNTIME_MS);
  sessions.set(id, session);

  function pushChunk(type, chunk) {
    const text = chunk.toString("utf8");
    session.output += text;
    session.listeners.forEach((res) => emitSession(res, { type, chunk: text, status: session.status, projectId: session.projectId }));
  }

  child.stdout.on("data", (c) => pushChunk("stdout", c));
  child.stderr.on("data", (c) => pushChunk("stderr", c));
  child.on("close", (code) => {
    cleanupSession(session);
    session.status = "completed";
    session.exitCode = code;
    session.listeners.forEach((res) => {
      emitSession(res, { type: "done", status: session.status, exitCode: code, output: session.output, projectId: session.projectId });
      res.end();
    });
    session.listeners.clear();
  });
  child.on("error", (err) => {
    cleanupSession(session);
    session.status = "failed";
    session.exitCode = 1;
    session.output += `${err.message}\n`;
    session.listeners.forEach((res) => {
      emitSession(res, { type: "done", status: session.status, exitCode: 1, output: session.output, projectId: session.projectId });
      res.end();
    });
    session.listeners.clear();
  });

  return session;
}

function serveSessionStream(res, session) {
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive" });
  emitSession(res, { type: "snapshot", status: session.status, exitCode: session.exitCode, command: session.command, output: session.output, projectId: session.projectId });
  if (session.status !== "running") { res.end(); return; }
  cleanupSession(session);
  session.listeners.add(res);
  res.on("close", () => { session.listeners.delete(res); scheduleOrphanTermination(session); });
}

/* ── static files ── */

function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[\\/])+/, "");
  const filePath = path.join(UI_DIR, normalized);
  if (!filePath.startsWith(UI_DIR)) { sendText(res, 403, "Forbidden."); return; }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { sendText(res, 404, "Not found."); return; }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
}

/* ── API handler ── */

async function handleApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/projects") {
      const current = ensureCurrentProjectRegistered();
      sendJson(res, 200, { ok: true, currentProjectId: current?.id || null, registryFile: registry.REGISTRY_FILE, projects: registry.listProjects() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/projects/register") {
      const body = await parseBody(req);
      const project = registry.registerProject(body.root || startupRoot || process.cwd());
      sendJson(res, 201, { ok: true, project, projects: registry.listProjects() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/projects/install") {
      const body = await parseBody(req);
      if (!body.root) { sendJson(res, 400, { ok: false, error: "Project path required." }); return; }
      try {
        const initMod = require("./init");
        const result = initMod.initProject(body.root, { locale: body.locale || null });
        if (body.withOpera) {
          const opera = require("./opera");
          await opera.install(result.root, {
            locale: body.locale || null,
            bootstrap: body.bootstrap !== false,
            interactive: false,
            answers: body.bootstrapAnswers || {},
            bootstrapMode: body.bootstrapMode || "auto",
            technicalLevel: body.technicalLevel || null,
            projectState: body.projectState || null,
            docsState: body.docsState || null,
            decisionOwnership: body.decisionOwnership || null,
          });
        }
        const project = registry.registerProject(result.root);
        sendJson(res, 201, { ok: true, project, projects: registry.listProjects() });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      sendJson(res, 200, getStatePayload(url.searchParams.get("project")));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/projects/locale") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const controlState = updateProjectLocale(project.root, body.locale);
      sendJson(res, 200, {
        ok: true,
        locale: config.getLocale(controlState),
        state: getStatePayload(project.id),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const task = createTask(project.root, body);
      sendJson(res, 201, { ok: true, task, state: getStatePayload(project.id) });
      return;
    }

    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === "PUT" && taskMatch) {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const task = patchTask(project.root, decodeURIComponent(taskMatch[1]), body);
      sendJson(res, 200, { ok: true, task, state: getStatePayload(project.id) });
      return;
    }

    const actionMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/action$/);
    if (req.method === "POST" && actionMatch) {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const action = String(body.action || "").trim();
      if (!action) { sendJson(res, 400, { ok: false, error: "Action required." }); return; }
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      api.updateTask(controlState, action, decodeURIComponent(actionMatch[1]), body.note || "");
      sendJson(res, 200, { ok: true, state: getStatePayload(project.id) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sync") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      api.syncDocs(controlState);
      api.refreshRepoRuntime({ quiet: true });
      sendJson(res, 200, { ok: true, state: getStatePayload(project.id) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/env") {
      const project = resolveProjectEntry(url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      sendJson(res, 200, env.auditEnvironment(project.root, controlState));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/env/sync") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      const result = env.syncEnvironment(project.root, controlState);
      api.syncDocs(api.loadControl());
      api.refreshRepoRuntime({ quiet: true });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/opera/bootstrap") {
      const project = resolveProjectEntry(url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      const operaState = buildOperaState(project.root, controlState);
      const bootstrap = operaState.bootstrap;
      sendJson(res, 200, {
        ok: true,
        mode: bootstrap.mode || null,
        status: bootstrap.status || "awaiting_intake",
        technicalLevel: bootstrap.technicalLevel || null,
        projectState: bootstrap.projectState || null,
        documentationState: bootstrap.documentationState || null,
        decisionOwnership: bootstrap.decisionOwnership || null,
        handoffFiles: bootstrap.handoffFiles || null,
        intakeFiles: bootstrap.intakeFiles || null,
        reviewFiles: bootstrap.reviewFiles || null,
        contractVersion: operaState.contractVersion,
        contractReadiness: operaState.contractReadiness,
        legacyStatus: operaState.legacyStatus,
        qualityReport: operaState.qualityReport,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/opera/handoff") {
      const project = resolveProjectEntry(url.searchParams.get("project"));
      const context = config.ensureContext(project.root);
      const operaBootstrap = require("./opera-bootstrap");
      const files = operaBootstrap.bootstrapFilePaths(context);
      let handoffJson = null;
      if (fs.existsSync(files.json)) {
        try {
          handoffJson = JSON.parse(fs.readFileSync(files.json, "utf8"));
        } catch (_error) {
          handoffJson = null;
        }
      }
      sendJson(res, 200, {
        ok: true,
        markdownFile: files.markdown,
        jsonFile: files.json,
        openQuestionsFile: files.openQuestions,
        qualityReportFile: files.qualityReport,
        markdown: fs.existsSync(files.markdown) ? fs.readFileSync(files.markdown, "utf8") : "",
        json: handoffJson,
        openQuestions: fs.existsSync(files.openQuestions) ? fs.readFileSync(files.openQuestions, "utf8") : "",
        qualityReport: readJsonFileSafe(files.qualityReport),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/opera/bootstrap/intake") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const opera = require("./opera");
      const profile = await opera.runBootstrap(project.root, {
        interactive: false,
        bootstrapMode: body.bootstrapMode || "auto",
        technicalLevel: body.technicalLevel || null,
        projectState: body.projectState || null,
        docsState: body.documentationState || body.docsState || null,
        decisionOwnership: body.decisionOwnership || null,
        answers: body.answers || {},
      });
      sendJson(res, 200, { ok: true, profile, state: getStatePayload(project.id) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/opera/status") {
      const project = resolveProjectEntry(url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      sendJson(res, 200, { ok: true, ...buildOperaState(project.root, controlState) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/opera/bootstrap/resume") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const opera = require("./opera");
      const profile = await opera.runBootstrap(project.root, { interactive: false, resume: true });
      sendJson(res, 200, { ok: true, profile, state: getStatePayload(project.id) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/commands") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const commandText = String(body.command || "").trim();
      if (!commandText) { sendJson(res, 400, { ok: false, error: t("server.commandRequired") }); return; }
      const session = createSession(commandText, project);
      sendJson(res, 201, { ok: true, session: { id: session.id, command: session.command, startedAt: session.startedAt, status: session.status, projectId: session.projectId, projectName: session.projectName } });
      return;
    }

    const sessionInfoMatch = url.pathname.match(/^\/api\/commands\/([^/]+)$/);
    if (req.method === "GET" && sessionInfoMatch) {
      const session = sessions.get(decodeURIComponent(sessionInfoMatch[1]));
      if (!session) { sendJson(res, 404, { ok: false, error: t("server.sessionNotFound") }); return; }
      sendJson(res, 200, { ok: true, session });
      return;
    }

    const sessionStreamMatch = url.pathname.match(/^\/api\/commands\/([^/]+)\/stream$/);
    if (req.method === "GET" && sessionStreamMatch) {
      const session = sessions.get(decodeURIComponent(sessionStreamMatch[1]));
      if (!session) { sendText(res, 404, t("server.sessionNotFound")); return; }
      serveSessionStream(res, session);
      return;
    }

    const sessionCancelMatch = url.pathname.match(/^\/api\/commands\/([^/]+)\/cancel$/);
    if (req.method === "POST" && sessionCancelMatch) {
      const session = sessions.get(decodeURIComponent(sessionCancelMatch[1]));
      if (!session) { sendJson(res, 404, { ok: false, error: t("server.sessionNotFound") }); return; }
      terminateSession(session, "manually cancelled");
      sendJson(res, 200, { ok: true, session });
      return;
    }

    /* ── Time Tracking ── */

    if (req.method === "GET" && url.pathname === "/api/time") {
      const project = resolveProjectEntry(url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      const entries = controlState.timeEntries || [];
      sendJson(res, 200, { ok: true, entries });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/time/start") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      const entryId = `te-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const entry = {
        id:        entryId,
        taskId:    String(body.taskId || "").trim(),
        taskTitle: String(body.taskTitle || "").trim(),
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        durationMs: 0,
      };
      if (!controlState.timeEntries) controlState.timeEntries = [];
      controlState.timeEntries.push(entry);
      api.saveControl(controlState);
      sendJson(res, 201, { ok: true, entry });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/time/stop") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const api = loadControlApi(project.root);
      const controlState = api.loadControl();
      const entries = controlState.timeEntries || [];
      const entry = entries.find(e => e.id === body.entryId);
      if (!entry) { sendJson(res, 404, { ok: false, error: "Entry not found." }); return; }
      entry.stoppedAt  = new Date().toISOString();
      entry.durationMs = new Date(entry.stoppedAt) - new Date(entry.startedAt);
      api.saveControl(controlState);
      sendJson(res, 200, { ok: true, entry });
      return;
    }

    /* ── Skills Hub ── */

    if (req.method === "GET" && url.pathname === "/api/skills/local") {
      const project = resolveProjectEntry(url.searchParams.get("project"));
      const context = config.ensureContext(project.root);
      const skillsDir = fs.existsSync(context.paths.skillsDir) ? context.paths.skillsDir : null;
      
      const skills = [];
      if (skillsDir) {
        try {
          const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
                         .filter(dirent => dirent.isDirectory())
                         .map(dirent => dirent.name);
          
          for (const d of dirs) {
            const skillMdPath = path.join(skillsDir, d, "SKILL.md");
            let description = "";
            let title = d;
            if (fs.existsSync(skillMdPath)) {
              const content = fs.readFileSync(skillMdPath, "utf-8");
              // Parse basic YAML frontmatter for title/description if exists
              const titleMatch = content.match(/title:\s*(.+)/i) || content.match(/name:\s*(.+)/i);
              const descMatch = content.match(/description:\s*(.+)/i) || content.match(/desc:\s*(.+)/i);
              if (titleMatch) title = titleMatch[1].replace(/['"]/g, '');
              if (descMatch) description = descMatch[1].replace(/['"]/g, '');
            }
            skills.push({ id: d, title, description, path: skillMdPath });
          }
        } catch (err) {
          console.error("Error reading skills dir:", err);
        }
      }
      sendJson(res, 200, { ok: true, skills });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/skills/discover") {
      // Mocked recommendations/catalog for skills.sh integration
      // Ideally this calls a raw json from github
      const catalog = [
        { id: "changelog-updater", title: "Changelog Updater", description: "Mantiene automatizado el CHANGELOG basado en commits.", url: "https://skills.sh/changelog-updater.md" },
        { id: "commiter", title: "Git Commiter", description: "Genera mensajes de commit strictos siguiendo Conventional Commits y Emojis.", url: "https://skills.sh/commiter.md" },
        { id: "project-starter-skill", title: "Project Starter", description: "Skill para discovery y estructuracion inicial guiada con TrackOps y OPERA.", url: "https://skills.sh/project-starter.md" },
        { id: "tdd-master", title: "TDD Master", description: "Fuerza el ciclo Red-Green-Refactor en las implementaciones.", url: "https://skills.sh/tdd-master.md" },
        { id: "e2e-tester", title: "E2E Tester", description: "Plantillas y comandos para frameworks de Test End-to-End.", url: "https://skills.sh/e2e-tester.md" }
      ];
      // Simulate network wait
      setTimeout(() => {
        sendJson(res, 200, { ok: true, catalog });
      }, 400);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/skills/install") {
      const body = await parseBody(req);
      const project = resolveProjectEntry(body.projectId || body.project || url.searchParams.get("project"));
      const skillId = body.skillId;
      
      if (!skillId) { sendJson(res, 400, { ok: false, error: "Missing skillId parameter" }); return; }

      const context = config.ensureContext(project.root);
      const skillsDir = context.paths.skillsDir;
      if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
      
      const targetSkillDir = path.join(skillsDir, skillId);
      if (!fs.existsSync(targetSkillDir)) fs.mkdirSync(targetSkillDir, { recursive: true });
      
      const targetMdPath = path.join(targetSkillDir, "SKILL.md");
      const templateContent = `---
name: ${skillId}
description: Skill instalada desde skills.sh
---

# ${skillId}

Instructions para el agente relativas a esta skill...
`;

      fs.writeFileSync(targetMdPath, templateContent, "utf-8");
      sendJson(res, 201, { ok: true, message: "Instalado correctamente", path: targetMdPath });
      return;
    }


    sendJson(res, 404, { ok: false, error: "API route not found." });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

/* ── server start ── */

async function run(args = []) {
  startupRoot = config.resolveProjectRoot() || process.cwd();

  try {
    const ctrl = config.loadControl(startupRoot);
    setLocale(config.getLocale(ctrl));
  } catch (_e) {
    setLocale("es");
  }

  const dashboardConfig = resolveDashboardConfig(args, process.env);
  const portSelection = await findAvailablePort({
    host: dashboardConfig.host,
    startPort: dashboardConfig.startPort,
    strict: dashboardConfig.strictPort,
  });
  const resolvedPort = portSelection.port;
  const fallbackBaseHost = getLocalUrlHost(dashboardConfig.host);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || `${fallbackBaseHost}:${resolvedPort}`}`);
    if (url.pathname.startsWith("/api/")) { handleApi(req, res, url); return; }
    serveStatic(res, url.pathname);
  });

  function shutdown() {
    sessions.forEach((s) => { if (s.status === "running") terminateSession(s, "dashboard shutdown"); });
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);

  await listenServer(server, dashboardConfig.host, resolvedPort);
  const current = ensureCurrentProjectRegistered();
  const urls = collectReachableUrls({
    host: dashboardConfig.host,
    port: resolvedPort,
    publicMode: dashboardConfig.publicMode,
  });
  const clipboard = copyTextToClipboard(urls.localUrl);

  console.log(renderStartupBanner({
    port: resolvedPort,
    requestedPort: portSelection.requestedPort,
    fallbackUsed: portSelection.fallbackUsed,
    publicMode: dashboardConfig.publicMode,
    urls,
    clipboard,
    defaultProject: current,
  }));

  return server;
}

if (require.main === module) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { run };
