#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const config = require("./config");
const { t, setLocale, getLocale } = require("./i18n");

const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];
const STATUS_ORDER = ["in_progress", "in_review", "pending", "blocked", "completed", "cancelled"];
const STATUS_ICONS = {
  pending: "\u23F3",
  in_progress: "\uD83D\uDEA7",
  in_review: "\uD83D\uDC40",
  blocked: "\u26D4",
  completed: "\u2705",
  cancelled: "\uD83D\uDDD1\uFE0F",
};
const CHECK_ICONS = {
  pass: "\u2705",
  warn: "\u26A0\uFE0F",
  fail: "\u274C",
  pending: "\u23F3",
};

/* ── helpers ── */

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content.replace(/\r?\n/g, "\n"), "utf8");
}

function writeJson(filePath, data) {
  writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

function git(args, root) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) return null;
  return result.stdout.replace(/\s+$/, "");
}

function statusLabel(status) {
  return t(`status.${status}`);
}

/* ── repo snapshot ── */

function getRepoSnapshot(root) {
  const branch = git(["branch", "--show-current"], root) || "detached";
  const status = git(["status", "--short"], root) || "";
  const lines = status.split(/\r?\n/).filter(Boolean);
  const lastCommitRaw = git(["log", "-1", "--pretty=format:%H%n%cs%n%s"], root);
  const divergenceRaw = git(["rev-list", "--left-right", "--count", "@{upstream}...HEAD"], root);

  let staged = 0;
  let unstaged = 0;
  let untracked = 0;

  lines.forEach((line) => {
    if (line.startsWith("??")) { untracked += 1; return; }
    if (line[0] && line[0] !== " ") staged += 1;
    if (line[1] && line[1] !== " ") unstaged += 1;
  });

  let lastCommit = null;
  if (lastCommitRaw) {
    const [hash, date, subject] = lastCommitRaw.split(/\r?\n/);
    lastCommit = { hash, shortHash: hash ? hash.slice(0, 7) : null, date, subject };
  }

  let ahead = 0;
  let behind = 0;
  if (divergenceRaw) {
    const [left, right] = divergenceRaw.split(/\s+/).map(Number);
    behind = Number.isFinite(left) ? left : 0;
    ahead = Number.isFinite(right) ? right : 0;
  }

  return { generatedAt: nowIso(), branch, clean: lines.length === 0, staged, unstaged, untracked, ahead, behind, lastCommit };
}

function refreshRepoRuntime(root, options = {}) {
  const runtimeFile = config.runtimeFilePath(root);
  fs.mkdirSync(path.dirname(runtimeFile), { recursive: true });
  const snapshot = getRepoSnapshot(root);
  writeJson(runtimeFile, snapshot);
  if (!options.quiet) {
    console.log(t("cli.runtimeUpdated", { path: path.relative(root, runtimeFile) }));
  }
  return snapshot;
}

/* ── derive ── */

function getPhaseInfo(phaseId, phases) {
  return phases.find((p) => p.id === phaseId) || { id: phaseId, label: phaseId, index: 99 };
}

function compareTasks(a, b, phases) {
  const phaseDelta = getPhaseInfo(a.phase, phases).index - getPhaseInfo(b.phase, phases).index;
  if (phaseDelta !== 0) return phaseDelta;
  const priorityDelta = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  if (priorityDelta !== 0) return priorityDelta;
  const statusDelta = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  if (statusDelta !== 0) return statusDelta;
  return a.title.localeCompare(b.title, getLocale());
}

function derive(control) {
  const phases = config.getPhases(control);
  const tasks = [...control.tasks].sort((a, b) => compareTasks(a, b, phases));
  const completedIds = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));

  const readyTasks = tasks
    .filter((task) => {
      if (task.status !== "pending") return false;
      return (task.dependsOn || []).every((dep) => completedIds.has(dep));
    })
    .sort((a, b) => {
      const focusPhase = control.meta.focusPhase || "";
      const aFocused = a.phase === focusPhase ? 0 : 1;
      const bFocused = b.phase === focusPhase ? 0 : 1;
      if (aFocused !== bFocused) return aFocused - bFocused;
      return compareTasks(a, b, phases);
    });

  const blockers = tasks.filter((t) => t.status === "blocked");
  const activeTasks = tasks.filter((t) => t.status === "in_progress");
  const reviewTasks = tasks.filter((t) => t.status === "in_review");
  const openTasks = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  const requiredOpenTasks = tasks.filter((t) => t.required !== false && !["completed", "cancelled"].includes(t.status));

  const activePhase =
    phases.find((p) => requiredOpenTasks.some((t) => t.phase === p.id)) ||
    phases[phases.length - 1];

  const phaseStats = phases.map((phase) => {
    const phaseTasks = tasks.filter((t) => t.phase === phase.id && t.required !== false);
    const completed = phaseTasks.filter((t) => t.status === "completed").length;
    return { ...phase, total: phaseTasks.length, completed, remaining: phaseTasks.length - completed };
  });

  const nextTask = activeTasks[0] || readyTasks[0] || blockers[0] || openTasks[0] || null;

  return {
    tasks, blockers, activeTasks, reviewTasks, readyTasks, nextTask, activePhase, phaseStats,
    openFindings: (control.findings || []).filter((f) => f.status === "open"),
    resolvedFindings: (control.findings || []).filter((f) => f.status === "resolved"),
    totals: {
      all: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: activeTasks.length,
      inReview: reviewTasks.length,
      blocked: blockers.length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
    },
  };
}

/* ── render ── */

function renderTask(task, phases) {
  const phase = getPhaseInfo(task.phase, phases);
  const detail = task.blocker || task.summary || "";
  const detailSuffix = detail ? ` — ${detail}` : "";
  return `- ${STATUS_ICONS[task.status]} \`${task.id}\` [${task.priority}] ${task.title} (${phase.id} · ${phase.label} · ${task.stream})${detailSuffix}`;
}

function renderTaskPlan(control) {
  const phases = config.getPhases(control);
  const state = derive(control);
  const blockersLabel = state.blockers.length
    ? state.blockers.map((t) => t.title).join("; ")
    : t("doc.label.noBlockers");
  const nextStep = state.nextTask ? state.nextTask.title : t("doc.label.noOpenTasks");

  const externalDecisions = (control.decisionsPending || []).length
    ? control.decisionsPending.map((d) => `- [${d.owner}] ${d.title} — ${d.impact}`).join("\n")
    : `- ${t("doc.label.noDecisions")}`;

  const readyTasks = state.readyTasks.length
    ? state.readyTasks.slice(0, 6).map((task) => renderTask(task, phases)).join("\n")
    : `- ${t("doc.label.noReadyTasks")}`;

  const phaseBlocks = phases.map((phase) => {
    const phaseTasks = state.tasks.filter((task) => task.phase === phase.id);
    const stats = state.phaseStats.find((s) => s.id === phase.id);
    const lines = phaseTasks.length
      ? phaseTasks.map((task) => renderTask(task, phases)).join("\n")
      : `- ${t("doc.label.noTasks")}`;

    const phaseStatus = phase.id === state.activePhase.id
      ? t("doc.label.phaseActive")
      : stats.remaining === 0
        ? t("doc.label.phaseClosed")
        : t("doc.label.phasePending");

    return [
      `## ${t("doc.section.phase", { phaseId: phase.id, phaseLabel: phase.label })}`,
      `- ${t("doc.label.progress", { completed: stats.completed, total: stats.total })}`,
      `- ${t("doc.label.findingStatus")}: ${phaseStatus}`,
      "",
      lines,
    ].join("\n");
  }).join("\n\n---\n\n");

  return [
    `# ${t("doc.header.taskPlan", { projectName: control.meta.projectName })}`,
    "",
    `> ${t("doc.autogenerated")}`,
    "",
    `## ${t("doc.section.operativeState")}`,
    `- ${t("doc.label.activePhase")}: ${state.activePhase.id} — ${state.activePhase.label} (${state.activePhase.index}/${phases.length})`,
    `- ${t("doc.label.currentFocus")}: ${control.meta.currentFocus}`,
    `- ${t("doc.label.deliveryTarget")}: ${control.meta.deliveryTarget}`,
    `- ${t("doc.label.blockers")}: ${blockersLabel}`,
    `- ${t("doc.label.nextStep")}: ${nextStep}`,
    "",
    `### ${t("doc.section.externalDecisions")}`,
    externalDecisions,
    "",
    `### ${t("doc.section.readyTasks")}`,
    readyTasks,
    "",
    "---",
    "",
    phaseBlocks,
  ].join("\n");
}

function renderProgress(control) {
  const phases = config.getPhases(control);
  const state = derive(control);
  const blockersLabel = state.blockers.length
    ? state.blockers.map((t) => t.title).join("; ")
    : t("doc.label.noBlockers");
  const nextStep = state.nextTask ? state.nextTask.title : t("doc.label.noOpenTasks");
  const lastTest = (control.checks || {}).lastTest || { status: "pending" };
  const latestHistory = state.tasks
    .flatMap((task) => (task.history || []).map((entry) => ({ ...entry, taskId: task.id, taskTitle: task.title })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  const activeLines = state.activeTasks.length
    ? state.activeTasks.map((task) => renderTask(task, phases)).join("\n")
    : `- ${t("doc.label.noActiveTasks")}`;

  const reviewLines = state.reviewTasks.length
    ? state.reviewTasks.map((task) => renderTask(task, phases)).join("\n")
    : `- ${t("doc.label.noReviewTasks")}`;

  const blockerLines = state.blockers.length
    ? state.blockers.map((task) => renderTask(task, phases)).join("\n")
    : `- ${t("doc.label.noActiveBlockers")}`;

  const historyLines = latestHistory.length
    ? latestHistory.map((e) => `- [${e.at.slice(0, 10)}] \`${e.taskId}\` ${e.action}${e.note ? ` — ${e.note}` : ""}`).join("\n")
    : `- ${t("doc.label.noHistory")}`;

  const milestoneLines = (control.milestones || [])
    .map((m) => {
      const items = m.items.map((item) => `- ${item}`).join("\n");
      return [`### [${m.date}] — ${m.title}`, items].join("\n");
    })
    .join("\n\n");

  return [
    `# ${t("doc.header.progress", { projectName: control.meta.projectName })}`,
    "",
    `> ${t("doc.autogenerated")}`,
    "",
    `## ${t("doc.section.currentState")}`,
    `- ${t("doc.label.phase")}: ${state.activePhase.label} (${state.activePhase.index}/${phases.length})`,
    `- ${t("doc.label.blockers")}: ${blockersLabel}`,
    `- ${t("doc.label.lastTest")}: ${CHECK_ICONS[lastTest.status]} ${lastTest.date || t("status.pending")}${lastTest.note ? ` — ${lastTest.note}` : ""}`,
    `- ${t("doc.label.nextStepShort")}: ${nextStep}`,
    `- ${t("doc.label.lastUpdate")}: ${(control.meta.updatedAt || "").slice(0, 10)}`,
    "",
    "---",
    "",
    `## ${t("doc.section.executionSummary")}`,
    `- ${t("doc.label.totalTasks")}: ${state.totals.all}`,
    `- ${t("doc.label.completedTasks")}: ${state.totals.completed}`,
    `- ${t("doc.label.inProgressTasks")}: ${state.totals.inProgress}`,
    `- ${t("doc.label.inReviewTasks")}: ${state.totals.inReview}`,
    `- ${t("doc.label.pendingTasks")}: ${state.totals.pending}`,
    `- ${t("doc.label.blockedTasks")}: ${state.totals.blocked}`,
    "",
    `### ${t("doc.section.activeTasks")}`,
    activeLines,
    "",
    `### ${t("doc.section.reviewTasks")}`,
    reviewLines,
    "",
    `### ${t("doc.section.activeBlockers")}`,
    blockerLines,
    "",
    `### ${t("doc.section.recentActivity")}`,
    historyLines,
    "",
    "---",
    "",
    `## ${t("doc.section.milestones")}`,
    "",
    milestoneLines,
  ].join("\n");
}

function renderFindings(control) {
  const state = derive(control);
  const openLines = state.openFindings.length
    ? state.openFindings
        .map((f) =>
          `### [${f.severity.toUpperCase()}] ${f.title}\n- ${t("doc.label.findingStatus")}: ${t("doc.label.findingOpen")}\n- ${t("doc.label.findingDetail")}: ${f.detail}\n- ${t("doc.label.findingImpact")}: ${f.impact}`
        )
        .join("\n\n")
    : t("doc.label.noFindings");

  const resolvedLines = state.resolvedFindings.length
    ? state.resolvedFindings
        .map((f) =>
          `### [${f.severity.toUpperCase()}] ${f.title}\n- ${t("doc.label.findingStatus")}: ${t("doc.label.findingResolved")}\n- ${t("doc.label.findingDetail")}: ${f.detail}\n- ${t("doc.label.findingImpact")}: ${f.impact}`
        )
        .join("\n\n")
    : t("doc.label.noResolvedFindings");

  return [
    `# ${t("doc.header.findings", { projectName: control.meta.projectName })}`,
    "",
    `> ${t("doc.autogenerated")}`,
    "",
    `## ${t("doc.section.openFindings")}`,
    "",
    openLines,
    "",
    "---",
    "",
    `## ${t("doc.section.resolvedFindings")}`,
    "",
    resolvedLines,
  ].join("\n");
}

/* ── doc sync ── */

function buildDocMap(control) {
  return { taskPlan: renderTaskPlan(control), progress: renderProgress(control), findings: renderFindings(control) };
}

function getDocDrift(root, control) {
  const docs = buildDocMap(control);
  const docFiles = config.docFilePaths(root);
  return Object.entries({ task_plan: [docFiles.taskPlan, docs.taskPlan], progress: [docFiles.progress, docs.progress], findings: [docFiles.findings, docs.findings] })
    .filter(([, [filePath, expected]]) => {
      if (!fs.existsSync(filePath)) return true;
      return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n") !== `${expected}\n`;
    })
    .map(([name]) => name);
}

function syncDocs(root, control) {
  const docs = buildDocMap(control);
  const docFiles = config.docFilePaths(root);
  writeText(docFiles.taskPlan, `${docs.taskPlan}\n`);
  writeText(docFiles.progress, `${docs.progress}\n`);
  writeText(docFiles.findings, `${docs.findings}\n`);
}

/* ── task management ── */

function updateTask(root, control, action, taskId, note) {
  const task = control.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(t("cli.taskNotFound", { taskId }));

  const actionMap = { start: "in_progress", review: "in_review", complete: "completed", done: "completed", block: "blocked", pending: "pending", cancel: "cancelled" };

  if (action === "note") {
    task.history = task.history || [];
    task.history.push({ at: nowIso(), action: "note", note: note || t("cli.emptyNote") });
  } else {
    const nextStatus = actionMap[action];
    if (!nextStatus) throw new Error(t("cli.actionNotSupported", { action }));

    task.status = nextStatus;
    if (nextStatus === "blocked") {
      task.blocker = note || task.blocker || t("cli.undocumentedBlocker");
    } else {
      delete task.blocker;
    }
    task.history = task.history || [];
    task.history.push({ at: nowIso(), action, note: note || "" });
  }

  config.saveControl(root, control);
  syncDocs(root, control);
  refreshRepoRuntime(root, { quiet: true });
}

/* ── CLI commands ── */

function initLocale(root) {
  try {
    const control = config.loadControl(root);
    setLocale(config.getLocale(control));
  } catch (_err) {
    setLocale("es");
  }
}

function cmdStatus(root) {
  initLocale(root);
  const control = config.loadControl(root);
  const state = derive(control);
  const phases = config.getPhases(control);
  const repo = refreshRepoRuntime(root, { quiet: true });
  const drift = getDocDrift(root, control);

  console.log(t("cli.status.title", { projectName: control.meta.projectName }));
  console.log(t("cli.status.focus", { focus: control.meta.currentFocus }));
  console.log(t("cli.status.activePhase", { phaseId: state.activePhase.id, phaseLabel: state.activePhase.label }));
  console.log(t("cli.status.tasks", {
    completed: state.totals.completed, inProgress: state.totals.inProgress,
    inReview: state.totals.inReview, pending: state.totals.pending, blocked: state.totals.blocked,
  }));
  console.log("");
  console.log(t("cli.status.readyTasks"));
  if (state.readyTasks.length) {
    state.readyTasks.slice(0, 5).forEach((task) => console.log(renderTask(task, phases)));
  } else {
    console.log(t("cli.status.noReadyTasks"));
  }
  console.log("");
  console.log(t("cli.status.blockers"));
  if (state.blockers.length) {
    state.blockers.forEach((task) => console.log(renderTask(task, phases)));
  } else {
    console.log(t("cli.status.noBlockers"));
  }
  console.log("");
  console.log(t("cli.status.decisions"));
  if ((control.decisionsPending || []).length) {
    control.decisionsPending.forEach((d) => console.log(`- ${d.title} (${d.owner}) — ${d.impact}`));
  } else {
    console.log(`- ${t("cli.status.noDecisions")}`);
  }
  console.log("");
  console.log(t("cli.status.repo"));
  const treeStatus = repo.clean
    ? t("cli.status.treeClean")
    : t("cli.status.treeDirty", { staged: repo.staged, unstaged: repo.unstaged, untracked: repo.untracked });
  console.log(`- ${t("cli.status.branch", { branch: repo.branch, treeStatus })}`);
  if (repo.lastCommit) {
    console.log(`- ${t("cli.status.lastCommit", { hash: repo.lastCommit.shortHash, subject: repo.lastCommit.subject })}`);
  }
  if (repo.ahead || repo.behind) {
    console.log(`- ${t("cli.status.divergence", { ahead: repo.ahead, behind: repo.behind })}`);
  }
  console.log(`- ${t("cli.status.runtime", { path: path.relative(root, config.runtimeFilePath(root)) })}`);
  console.log("");
  const syncStatus = drift.length
    ? t("cli.status.docsSyncedNo", { files: drift.join(", ") })
    : t("cli.status.docsSyncedYes");
  console.log(t("cli.status.docsSynced", { status: syncStatus }));
}

function cmdNext(root) {
  initLocale(root);
  const control = config.loadControl(root);
  const ready = derive(control).readyTasks.slice(0, 10);
  if (!ready.length) {
    console.log(t("cli.noReadyTasks"));
    return;
  }
  ready.forEach((task, i) => {
    console.log(`${i + 1}. ${task.title}`);
    console.log(`   id: ${task.id}`);
    console.log(`   ${t("cli.next.phase")}: ${task.phase} · ${t("cli.next.priority")}: ${task.priority} · ${t("cli.next.stream")}: ${task.stream}`);
    if (task.summary) console.log(`   ${t("cli.next.summary")}: ${task.summary}`);
  });
}

function cmdSync(root) {
  initLocale(root);
  const control = config.loadControl(root);
  syncDocs(root, control);
  refreshRepoRuntime(root, { quiet: true });
  console.log(t("cli.docsSynced"));
}

function cmdRefreshRepo(root, args) {
  refreshRepoRuntime(root, { quiet: (args || []).includes("--quiet") });
}

function cmdTask(root, args) {
  initLocale(root);
  const [action, taskId, ...noteParts] = args || [];
  if (!action || !taskId) throw new Error(t("cli.mustProvideActionAndId"));
  const control = config.loadControl(root);
  updateTask(root, control, action, taskId, noteParts.join(" ").trim());
  console.log(t("cli.taskUpdated", { taskId, action }));
}

function cmdInstallHooks(root) {
  initLocale(root);
  const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(t("cli.hooksError"));
  console.log(t("cli.hooksInstalled"));
}

function cmdHelp() {
  console.log("trackops — Operational project control");
  console.log("");
  console.log("Usage: trackops <command> [args]");
  console.log("");
  console.log("Commands:");
  console.log("  init [--with-opera] [--locale es|en] [--name \"...\"]");
  console.log("    Initialize trackops in the current directory.");
  console.log("  status");
  console.log("    Show project state: focus, active phase, ready tasks, blockers, repo.");
  console.log("  next");
  console.log("    Prioritized queue of next executable tasks.");
  console.log("  sync");
  console.log("    Regenerate task_plan.md, progress.md, findings.md from project_control.json.");
  console.log("  dashboard");
  console.log("    Launch local web dashboard.");
  console.log("  refresh-repo [--quiet]");
  console.log("    Update .tmp/project-control-runtime.json with repo state.");
  console.log("  install-hooks");
  console.log("    Configure git core.hooksPath to use .githooks.");
  console.log("  register");
  console.log("    Register current project in the multi-project portfolio.");
  console.log("  projects");
  console.log("    List registered projects.");
  console.log("  task <action> <id> [note]");
  console.log("    Actions: start, review, complete, block, pending, cancel, note.");
  console.log("  opera install|status|configure|upgrade");
  console.log("    Manage OPERA methodology.");
  console.log("  skill install|list|remove|catalog <name>");
  console.log("    Manage skills.");
  console.log("  help");
  console.log("    Show this help.");
}

/* ── project-scoped API (used by server) ── */

function forProject(root) {
  initLocale(root);
  return {
    loadControl: () => config.loadControl(root),
    saveControl: (ctrl) => config.saveControl(root, ctrl),
    derive,
    buildDocMap,
    getDocDrift: (ctrl) => getDocDrift(root, ctrl),
    syncDocs: (ctrl) => syncDocs(root, ctrl),
    updateTask: (ctrl, action, id, note) => updateTask(root, ctrl, action, id, note),
    getRepoSnapshot: () => getRepoSnapshot(root),
    refreshRepoRuntime: (opts) => refreshRepoRuntime(root, opts),
    getPhases: (ctrl) => config.getPhases(ctrl),
    getLocale: (ctrl) => config.getLocale(ctrl),
    statusLabel,
  };
}

module.exports = {
  buildDocMap, derive, getDocDrift, getRepoSnapshot, refreshRepoRuntime, syncDocs, updateTask,
  forProject, statusLabel, renderTask, getPhaseInfo,
  cmdStatus, cmdNext, cmdSync, cmdRefreshRepo, cmdTask, cmdInstallHooks, cmdHelp,
  PRIORITY_ORDER, STATUS_ORDER, STATUS_ICONS, CHECK_ICONS,
};
