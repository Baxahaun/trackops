#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const config = require("./config");
const control = require("./control");
const registry = require("./registry");
const { t, setLocale } = require("./i18n");

const UI_DIR = path.join(__dirname, "..", "ui");
const HOST = process.env.OPS_UI_HOST || "127.0.0.1";
const PORT = Number(process.env.OPS_UI_PORT || 4173);
const ORPHAN_TIMEOUT_MS = Number(process.env.OPS_COMMAND_ORPHAN_TIMEOUT_MS || 120000);
const MAX_COMMAND_RUNTIME_MS = Number(process.env.OPS_COMMAND_MAX_RUNTIME_MS || 600000);
const sessions = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
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
  return { locale, statusLabels, phases };
}

function getStatePayload(projectRef) {
  const project = resolveProjectEntry(projectRef);
  const api = loadControlApi(project.root);
  const controlState = api.loadControl();
  const runtime = api.refreshRepoRuntime({ quiet: true });

  return {
    project,
    control: controlState,
    derived: api.derive(controlState),
    runtime,
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
        const result = initMod.initProject(body.root, {});
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

    sendJson(res, 404, { ok: false, error: "API route not found." });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}

/* ── server start ── */

function run() {
  startupRoot = config.resolveProjectRoot() || process.cwd();

  try {
    const ctrl = config.loadControl(startupRoot);
    setLocale(config.getLocale(ctrl));
  } catch (_e) {
    setLocale("es");
  }

  ensureCurrentProjectRegistered();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if (url.pathname.startsWith("/api/")) { handleApi(req, res, url); return; }
    serveStatic(res, url.pathname);
  });

  function shutdown() {
    sessions.forEach((s) => { if (s.status === "running") terminateSession(s, "dashboard shutdown"); });
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);

  server.listen(PORT, HOST, () => {
    const current = ensureCurrentProjectRegistered();
    console.log(t("server.ready", { host: HOST, port: PORT }));
    if (current) console.log(t("server.defaultProject", { name: current.name, id: current.id }));
  });
}

if (require.main === module) {
  run();
}

module.exports = { run };
