const BOARD = ["pending", "in_progress", "in_review", "blocked", "completed"];
const STATUS_ACTIONS = {
  pending: "pending", in_progress: "start", in_review: "review",
  blocked: "block", completed: "complete", cancelled: "cancel",
};
let STATUS = {
  pending: { label: "Pending", action: "pending" },
  in_progress: { label: "In progress", action: "start" },
  in_review: { label: "In review", action: "review" },
  blocked: { label: "Blocked", action: "block" },
  completed: { label: "Completed", action: "complete" },
  cancelled: { label: "Cancelled", action: "cancel" },
};
let PHASE = {};
let PHASES = [];
let LOCALE = "es";
const QUICK = ["trackops status", "trackops next", "trackops sync", "git status --short", "npm run build"];

const ui = {};
const state = {
  projects: [],
  registryFile: "",
  currentProjectId: null,
  payload: null,
  selectedTaskId: null,
  sessions: [],
  selectedSessionId: null,
  stream: null,
  flashTimer: null,
  loaded: false,
  activeTab: "overview",
};

document.addEventListener("DOMContentLoaded", async () => {
  cacheDom();
  bind();
  renderQuickCommands();
  await loadProjects();
  await refreshState();
});

function cacheDom() {
  Object.assign(ui, {
    focusSummary: document.getElementById("focusSummary"),
    projectName: document.getElementById("projectName"),
    projectSelect: document.getElementById("projectSelect"),
    runtimeBadge: document.getElementById("runtimeBadge"),
    refreshButton: document.getElementById("refreshButton"),
    syncButton: document.getElementById("syncButton"),
    phaseBadge: document.getElementById("phaseBadge"),
    branchBadge: document.getElementById("branchBadge"),
    deliveryTarget: document.getElementById("deliveryTarget"),
    summaryGrid: document.getElementById("summaryGrid"),
    nextTaskCard: document.getElementById("nextTaskCard"),
    projectList: document.getElementById("projectList"),
    registerProjectForm: document.getElementById("registerProjectForm"),
    registerRootInput: document.getElementById("registerRootInput"),
    installProjectForm: document.getElementById("installProjectForm"),
    installRootInput: document.getElementById("installRootInput"),
    repoOverview: document.getElementById("repoOverview"),
    docsList: document.getElementById("docsList"),
    decisionList: document.getElementById("decisionList"),
    phaseChart: document.getElementById("phaseChart"),
    statusChart: document.getElementById("statusChart"),
    activityChart: document.getElementById("activityChart"),
    board: document.getElementById("board"),
    editorTitle: document.getElementById("editorTitle"),
    newTaskButton: document.getElementById("newTaskButton"),
    resetTaskButton: document.getElementById("resetTaskButton"),
    taskActionStrip: document.getElementById("taskActionStrip"),
    taskForm: document.getElementById("taskForm"),
    duplicateTaskButton: document.getElementById("duplicateTaskButton"),
    commandForm: document.getElementById("commandForm"),
    commandInput: document.getElementById("commandInput"),
    commandPresets: document.getElementById("commandPresets"),
    sessionList: document.getElementById("sessionList"),
    terminalOutput: document.getElementById("terminalOutput"),
    terminalStatus: document.getElementById("terminalStatus"),
    executionMetrics: document.getElementById("executionMetrics"),
    activityList: document.getElementById("activityList"),
    findingList: document.getElementById("findingList"),
    healthRail: document.getElementById("healthRail"),
    flash: document.getElementById("flash"),
    tabButtons: Array.from(document.querySelectorAll(".tab-button")),
    tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  });

  ui.fields = {
    title: document.getElementById("taskTitle"),
    phase: document.getElementById("taskPhase"),
    priority: document.getElementById("taskPriority"),
    status: document.getElementById("taskStatus"),
    stream: document.getElementById("taskStream"),
    required: document.getElementById("taskRequired"),
    summary: document.getElementById("taskSummary"),
    dependsOn: document.getElementById("taskDependsOn"),
    acceptance: document.getElementById("taskAcceptance"),
    blocker: document.getElementById("taskBlocker"),
    note: document.getElementById("taskNote"),
  };
}

function bind() {
  ui.tabButtons.forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
  ui.projectSelect.addEventListener("change", async () => {
    state.currentProjectId = ui.projectSelect.value;
    localStorage.setItem("ops-dashboard-project", state.currentProjectId);
    state.selectedTaskId = null;
    await refreshState({ preserveSelection: false });
  });
  ui.refreshButton.addEventListener("click", async () => {
    await loadProjects();
    await refreshState({ preserveSelection: true });
  });
  ui.syncButton.addEventListener("click", syncDocs);
  ui.newTaskButton.addEventListener("click", interceptSummaryButton(resetForm));
  ui.resetTaskButton.addEventListener("click", interceptSummaryButton(resetForm));
  ui.duplicateTaskButton.addEventListener("click", duplicateTask);
  ui.taskForm.addEventListener("submit", saveTask);
  ui.taskActionStrip.addEventListener("click", handleTaskAction);
  ui.commandForm.addEventListener("submit", runCommand);
  ui.registerProjectForm.addEventListener("submit", registerProject);
  ui.installProjectForm.addEventListener("submit", installProject);
}

function interceptSummaryButton(handler) {
  return (event) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  };
}

async function api(url, options = {}) {
  const target = new URL(url, window.location.origin);
  if (options.projectAware !== false && state.currentProjectId && !target.searchParams.has("project")) {
    target.searchParams.set("project", state.currentProjectId);
  }

  const response = await fetch(target, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || "Operacion no disponible.");
  }
  return json;
}

async function loadProjects() {
  const payload = await api("/api/projects", { projectAware: false });
  state.projects = payload.projects || [];
  state.registryFile = payload.registryFile || "";

  const stored = localStorage.getItem("ops-dashboard-project");
  const preferred = state.projects.find((project) => project.id === stored && project.available)
    ? stored
    : payload.currentProjectId;
  state.currentProjectId = preferred || state.projects.find((project) => project.available)?.id || null;
  renderProjectSelector();
  renderProjectList();
}

async function refreshState({ preserveSelection = true } = {}) {
  try {
    if (!state.currentProjectId) {
      await loadProjects();
    }

    const payload = await api("/api/state");
    const ids = new Set(payload.derived.tasks.map((task) => task.id));
    state.payload = payload;

    if (!preserveSelection || (state.selectedTaskId && !ids.has(state.selectedTaskId))) {
      state.selectedTaskId = null;
    }
    if (!state.selectedTaskId && (!state.loaded || !preserveSelection)) {
      state.selectedTaskId = payload.derived.nextTask?.id || payload.derived.tasks[0]?.id || null;
    }

    // Apply dynamic i18n from server
    if (payload.i18n) {
      if (payload.i18n.locale) LOCALE = payload.i18n.locale;
      if (payload.i18n.statusLabels) {
        for (const [key, label] of Object.entries(payload.i18n.statusLabels)) {
          if (STATUS[key]) STATUS[key].label = label;
          else STATUS[key] = { label, action: STATUS_ACTIONS[key] || key };
        }
      }
      if (payload.i18n.phases) {
        PHASES = payload.i18n.phases;
        PHASE = {};
        for (const p of PHASES) PHASE[p.id] = p.label;
        rebuildPhaseSelect();
      }
    }

    state.loaded = true;
    render();
  } catch (error) {
    flash(error.message, true);
  }
}

function rebuildPhaseSelect() {
  const sel = document.getElementById("taskPhase");
  if (!sel || !PHASES.length) return;
  const currentVal = sel.value;
  sel.innerHTML = PHASES.map((p) => `<option value="${esc(p.id)}">${esc(p.id)} — ${esc(p.label)}</option>`).join("");
  if (currentVal && [...sel.options].some((o) => o.value === currentVal)) sel.value = currentVal;
}

function render() {
  renderHeader();
  renderProjectList();
  renderMetrics();
  renderNext();
  renderRepo();
  renderDecisions();
  renderCharts();
  renderBoard();
  renderEditor();
  renderExecutionMetrics();
  renderActivity();
  renderFindings();
  renderHealth();
  renderSessions();
  renderTerminal();
}

function renderProjectSelector() {
  ui.projectSelect.innerHTML = state.projects
    .map(
      (project) => `
        <option value="${esc(project.id)}" ${project.id === state.currentProjectId ? "selected" : ""} ${project.available ? "" : "disabled"}>
          ${esc(project.name)}${project.available ? "" : " (no disponible)"}
        </option>
      `
    )
    .join("");
}

function renderHeader() {
  const { project, control, derived, runtime } = state.payload;
  ui.projectName.textContent = project.name;
  ui.focusSummary.textContent = `${control.meta.currentFocus} | ${derived.activePhase.label} | ${derived.totals.completed}/${derived.totals.all} completadas`;
  ui.deliveryTarget.textContent = control.meta.deliveryTarget;
  ui.phaseBadge.textContent = `${derived.activePhase.id} · ${derived.activePhase.label}`;
  ui.branchBadge.textContent = runtime.branch || "sin rama";
  ui.runtimeBadge.textContent = runtime.clean
    ? "Repo limpio"
    : `${runtime.staged} staged | ${runtime.unstaged} unstaged | ${runtime.untracked} untracked`;
  ui.runtimeBadge.className = `runtime-badge ${runtime.clean ? "is-clean" : "is-dirty"}`;
}

function renderProjectList() {
  if (!state.projects.length) {
    ui.projectList.innerHTML = '<div class="empty-state">No hay proyectos registrados.</div>';
    return;
  }

  ui.projectList.innerHTML = state.projects
    .map(
      (project) => `
        <article class="project-row ${project.id === state.currentProjectId ? "is-active" : ""}">
          <div class="project-row-meta">
            <strong>${esc(project.name)}</strong>
            <div class="meta-text">${esc(project.root)}</div>
          </div>
          <div class="tag-row">
            <span class="tag ${project.available ? "success" : "warn"}">${project.available ? "activo" : "pendiente"}</span>
            <button class="chip-button" type="button" data-project-select="${esc(project.id)}">Abrir</button>
          </div>
        </article>
      `
    )
    .join("");

  ui.projectList.querySelectorAll("[data-project-select]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.currentProjectId = button.dataset.projectSelect;
      localStorage.setItem("ops-dashboard-project", state.currentProjectId);
      renderProjectSelector();
      await refreshState({ preserveSelection: false });
    });
  });
}

function renderMetrics() {
  const { derived, runtime, docsDirty } = state.payload;
  const cards = [
    ["Open work", derived.totals.all - derived.totals.completed - derived.totals.cancelled, `${derived.totals.pending} pendientes | ${derived.totals.inProgress} activas`],
    ["Bloqueos", derived.totals.blocked, derived.blockers[0]?.title || "Sin bloqueos"],
    ["Revision", derived.totals.inReview, derived.reviewTasks[0]?.title || "Sin tareas en revision"],
    ["Repo + docs", docsDirty.length ? docsDirty.length : runtime.clean ? "OK" : "DIRTY", docsDirty.length ? `Deriva: ${docsDirty.join(", ")}` : runtime.clean ? "Alineado" : "Arbol con cambios"],
  ];

  ui.summaryGrid.innerHTML = cards
    .map(
      ([title, value, support]) => `
        <article class="metric-card">
          <p class="eyebrow">${esc(title)}</p>
          <p class="metric-value">${esc(value)}</p>
          <p class="metric-support">${esc(support)}</p>
        </article>
      `
    )
    .join("");
}

function renderNext() {
  const task = state.payload.derived.nextTask;
  ui.nextTaskCard.innerHTML = task ? taskSnippet(task) : '<div class="empty-state">No hay tareas abiertas.</div>';
}

function renderRepo() {
  const { project, runtime, docsDirty } = state.payload;
  const rows = [
    ["Proyecto", project.name],
    ["Ruta", project.root],
    ["Ultimo commit", runtime.lastCommit ? `${runtime.lastCommit.shortHash} | ${runtime.lastCommit.subject}` : "Sin informacion"],
    ["Divergencia", `ahead ${runtime.ahead || 0} | behind ${runtime.behind || 0}`],
    ["Registro", state.registryFile || "No disponible"],
  ];

  ui.repoOverview.innerHTML = rows
    .map(([label, value]) => `<div class="info-row"><p class="label">${esc(label)}</p><p class="value-text">${esc(value)}</p></div>`)
    .join("");

  ui.docsList.innerHTML = (docsDirty.length ? docsDirty : ["Sin deriva"])
    .map((item) => `<span class="tag ${docsDirty.length ? "warn" : "success"}">${esc(item)}</span>`)
    .join("");
}

function renderDecisions() {
  const items = state.payload.control.decisionsPending || [];
  ui.decisionList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="decision-item">
              <p class="label">${esc(item.owner || "Pendiente")}</p>
              <p class="value-text"><strong>${esc(item.title)}</strong></p>
              <p class="meta-text">${esc(item.impact || "")}</p>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">No hay decisiones pendientes.</div>';
}

function renderCharts() {
  renderPhaseChart();
  renderStatusChart();
  renderActivityChart();
}

function renderPhaseChart() {
  const stats = state.payload.derived.phaseStats || [];
  ui.phaseChart.innerHTML = `
    <div class="chart-bars">
      ${stats
        .map((item) => {
          const total = item.total || 1;
          const percent = Math.round((item.completed / total) * 100);
          return `
            <div class="chart-bar-row">
              <span>${esc(item.label)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
              <strong>${item.completed}/${item.total}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStatusChart() {
  const totals = state.payload.derived.totals;
  const rows = [
    [STATUS.pending.label, totals.pending],
    [STATUS.in_progress.label, totals.inProgress],
    [STATUS.in_review.label, totals.inReview],
    [STATUS.blocked.label, totals.blocked],
    [STATUS.completed.label, totals.completed],
  ];
  const max = Math.max(...rows.map((row) => row[1]), 1);
  ui.statusChart.innerHTML = `
    <div class="chart-bars">
      ${rows
        .map(
          ([label, value]) => `
            <div class="chart-bar-row">
              <span>${esc(label)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round((value / max) * 100)}%"></div></div>
              <strong>${value}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderActivityChart() {
  const entries = history(state.payload.control.tasks);
  const days = lastDays(10);
  const counts = new Map(days.map((day) => [day, 0]));
  entries.forEach((entry) => {
    const day = entry.at.slice(0, 10);
    if (counts.has(day)) counts.set(day, counts.get(day) + 1);
  });
  const max = Math.max(...counts.values(), 1);
  ui.activityChart.innerHTML = `
    <div class="chart-activity">
      ${Array.from(counts.entries())
        .map(
          ([day, count]) => `
            <div class="activity-bar-wrap">
              <div class="activity-bar" style="height:${Math.max(12, Math.round((count / max) * 140))}px"></div>
              <span class="activity-label">${esc(day.slice(5))}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBoard() {
  const tasks = state.payload.derived.tasks;
  const columns = tasks.some((task) => task.status === "cancelled") ? [...BOARD, "cancelled"] : BOARD;
  ui.board.innerHTML = columns.map((status) => renderColumn(status, tasks.filter((task) => task.status === status))).join("");

  ui.board.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedTaskId = card.dataset.taskId;
      renderBoard();
      renderEditor();
    });
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", card.dataset.taskId);
      event.dataTransfer.effectAllowed = "move";
    });
  });

  ui.board.querySelectorAll(".board-column").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("is-drop-target");
    });
    column.addEventListener("dragleave", () => column.classList.remove("is-drop-target"));
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.classList.remove("is-drop-target");
      const taskId = event.dataTransfer.getData("text/plain");
      await moveTask(taskId, column.dataset.status);
    });
  });
}

function renderColumn(status, tasks) {
  return `
    <section class="board-column" data-status="${esc(status)}">
      <div class="column-head">
        <h3 class="column-title">${esc(STATUS[status].label)}</h3>
        <span class="column-count">${tasks.length}</span>
      </div>
      <div class="column-body">
        ${tasks.length ? tasks.map(renderCard).join("") : '<div class="empty-state">Sin tareas en esta columna.</div>'}
      </div>
    </section>
  `;
}

function renderCard(task) {
  return `
    <button type="button" class="task-card ${task.id === state.selectedTaskId ? "is-selected" : ""}" data-task-id="${esc(task.id)}" data-status="${esc(task.status)}" draggable="true">
      <strong class="task-title">${esc(task.title)}</strong>
      <span class="task-id">${esc(task.id)}</span>
      <p class="task-summary">${esc(task.summary || "Sin resumen operativo.")}</p>
      <div class="task-meta">
        <span class="task-chip priority-${esc(task.priority.toLowerCase())}">${esc(task.priority)}</span>
        <span class="task-chip">${esc(task.phase)} · ${esc(PHASE[task.phase] || task.phase)}</span>
        <span class="task-chip">${esc(task.stream || "General")}</span>
      </div>
    </button>
  `;
}

function renderEditor() {
  const task = selectedTask();
  ui.taskActionStrip.style.opacity = task ? "1" : "0.45";
  ui.taskActionStrip.style.pointerEvents = task ? "auto" : "none";

  if (!task) {
    ui.editorTitle.textContent = "Nueva tarea";
    ui.taskForm.reset();
    ui.fields.phase.value = PHASES[0]?.id || "";
    ui.fields.priority.value = "P1";
    ui.fields.status.value = "pending";
    ui.fields.stream.value = "Operations";
    ui.fields.required.checked = true;
    return;
  }

  ui.editorTitle.textContent = task.title;
  ui.fields.title.value = task.title || "";
  ui.fields.phase.value = task.phase || PHASES[0]?.id || "";
  ui.fields.priority.value = task.priority || "P1";
  ui.fields.status.value = task.status || "pending";
  ui.fields.stream.value = task.stream || "";
  ui.fields.required.checked = task.required !== false;
  ui.fields.summary.value = task.summary || "";
  ui.fields.dependsOn.value = (task.dependsOn || []).join("\n");
  ui.fields.acceptance.value = (task.acceptance || []).join("\n");
  ui.fields.blocker.value = task.blocker || "";
  ui.fields.note.value = "";
}

function renderExecutionMetrics() {
  const { project, runtime, docsDirty } = state.payload;
  const items = [
    ["Proyecto activo", project.name],
    ["Ruta", project.root],
    ["Rama", runtime.branch || "sin rama"],
    ["Docs con deriva", docsDirty.length ? docsDirty.join(", ") : "ninguna"],
    ["Sesiones de consola", String(state.sessions.length)],
  ];

  ui.executionMetrics.innerHTML = items
    .map(([label, value]) => `<div class="health-card"><p class="label">${esc(label)}</p><p class="value-text">${esc(value)}</p></div>`)
    .join("");
}

function renderActivity() {
  const entries = history(state.payload.control.tasks).slice(0, 12);
  ui.activityList.innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="activity-item">
              <p class="label">${esc(formatDate(entry.at))}</p>
              <p class="value-text"><strong>${esc(entry.taskTitle)}</strong> | ${esc(entry.action)}</p>
              <p class="meta-text">${esc(entry.note || "Sin nota")}</p>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">Sin actividad reciente.</div>';
}

function renderFindings() {
  const items = state.payload.derived.openFindings || [];
  ui.findingList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="finding-item">
              <p class="label">${esc((item.severity || "info").toUpperCase())}</p>
              <p class="value-text"><strong>${esc(item.title)}</strong></p>
              <p class="meta-text">${esc(item.detail || "")}</p>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">No hay hallazgos abiertos.</div>';
}

function renderHealth() {
  const { derived, docsDirty, runtime } = state.payload;
  const completionRate = derived.totals.all ? Math.round((derived.totals.completed / derived.totals.all) * 100) : 0;
  const blockerRate = derived.totals.all ? Math.round((derived.totals.blocked / derived.totals.all) * 100) : 0;
  const items = [
    ["Completion rate", `${completionRate}%`],
    ["Blocker pressure", `${blockerRate}%`],
    ["Open findings", String((derived.openFindings || []).length)],
    ["Repo cleanliness", runtime.clean ? "limpio" : "con cambios"],
    ["Docs alignment", docsDirty.length ? "pendiente" : "alineado"],
  ];

  ui.healthRail.innerHTML = items
    .map(([label, value]) => `<div class="health-card"><p class="label">${esc(label)}</p><p class="metric-value">${esc(value)}</p></div>`)
    .join("");
}

function renderQuickCommands() {
  ui.commandPresets.innerHTML = QUICK.map((command) => `<button type="button" class="chip-button" data-command="${esc(command)}">${esc(command)}</button>`).join("");
  ui.commandPresets.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.commandInput.value = button.dataset.command;
      ui.commandInput.focus();
    });
  });
}

function renderSessions() {
  ui.sessionList.innerHTML = state.sessions.length
    ? state.sessions
        .map(
          (session) => `
            <button type="button" class="session-button ${session.id === state.selectedSessionId ? "is-selected" : ""}" data-session-id="${esc(session.id)}">
              <span>${esc(session.projectName || "Proyecto")} | ${esc(session.command)}</span>
              <span class="meta-text">${esc(session.status === "running" ? "running" : `exit ${session.exitCode ?? "-"}`)}</span>
            </button>
          `
        )
        .join("")
    : '<div class="empty-state">Aun no hay sesiones de comandos.</div>';

  ui.sessionList.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSessionId = button.dataset.sessionId;
      renderSessions();
      renderTerminal();
    });
  });
}

function renderTerminal() {
  const session = state.sessions.find((item) => item.id === state.selectedSessionId);
  if (!session) {
    ui.terminalStatus.textContent = "Lista";
    ui.terminalOutput.textContent = "Selecciona o ejecuta un comando para ver la salida.";
    return;
  }

  ui.terminalStatus.textContent = session.status === "running" ? "Ejecutando" : session.exitCode === 0 ? "Completado" : `Exit ${session.exitCode ?? "?"}`;
  ui.terminalOutput.textContent = session.output || "Sin salida todavia.";
}

async function registerProject(event) {
  event.preventDefault();
  try {
    const result = await api("/api/projects/register", {
      method: "POST",
      projectAware: false,
      body: JSON.stringify({ root: ui.registerRootInput.value.trim() }),
    });
    ui.registerProjectForm.reset();
    state.projects = result.projects || state.projects;
    state.currentProjectId = result.project.id;
    localStorage.setItem("ops-dashboard-project", state.currentProjectId);
    renderProjectSelector();
    flash("Proyecto registrado.");
    await refreshState({ preserveSelection: false });
  } catch (error) {
    flash(error.message, true);
  }
}

async function installProject(event) {
  event.preventDefault();
  try {
    const result = await api("/api/projects/install", {
      method: "POST",
      projectAware: false,
      body: JSON.stringify({ root: ui.installRootInput.value.trim() }),
    });
    ui.installProjectForm.reset();
    state.projects = result.projects || state.projects;
    state.currentProjectId = result.project.id;
    localStorage.setItem("ops-dashboard-project", state.currentProjectId);
    renderProjectSelector();
    flash("Sistema ops instalado y registrado.");
    await refreshState({ preserveSelection: false });
  } catch (error) {
    flash(error.message, true);
  }
}

async function saveTask(event) {
  event.preventDefault();
  const payload = {
    projectId: state.currentProjectId,
    title: ui.fields.title.value.trim(),
    phase: ui.fields.phase.value,
    priority: ui.fields.priority.value,
    status: ui.fields.status.value,
    stream: ui.fields.stream.value.trim(),
    required: ui.fields.required.checked,
    summary: ui.fields.summary.value.trim(),
    dependsOn: split(ui.fields.dependsOn.value),
    acceptance: split(ui.fields.acceptance.value),
    blocker: ui.fields.blocker.value.trim(),
    note: ui.fields.note.value.trim(),
  };

  try {
    if (!payload.title) throw new Error("El titulo es obligatorio.");
    if (state.selectedTaskId) {
      await api(`/api/tasks/${encodeURIComponent(state.selectedTaskId)}`, { method: "PUT", body: JSON.stringify(payload) });
      flash("Tarea actualizada.");
    } else {
      const result = await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
      state.selectedTaskId = result.task.id;
      flash("Tarea creada.");
    }
    await refreshState({ preserveSelection: true });
  } catch (error) {
    flash(error.message, true);
  }
}

async function handleTaskAction(event) {
  const button = event.target.closest("[data-task-action]");
  if (!button) return;
  if (!state.selectedTaskId) {
    flash("Selecciona una tarea primero.", true);
    return;
  }

  try {
    const action = button.dataset.taskAction;
    const note = ui.fields.note.value.trim() || `Cambio a ${STATUS[toStatus(action)].label} desde dashboard.`;
    await api(`/api/tasks/${encodeURIComponent(state.selectedTaskId)}/action`, {
      method: "POST",
      body: JSON.stringify({ projectId: state.currentProjectId, action, note }),
    });
    flash("Estado actualizado.");
    await refreshState({ preserveSelection: true });
  } catch (error) {
    flash(error.message, true);
  }
}

async function moveTask(taskId, status) {
  const task = findTask(taskId);
  if (!task || task.status === status) return;

  try {
    await api(`/api/tasks/${encodeURIComponent(taskId)}/action`, {
      method: "POST",
      body: JSON.stringify({
        projectId: state.currentProjectId,
        action: STATUS[status].action,
        note: `Movida a ${STATUS[status].label} desde el tablero.`,
      }),
    });
    flash(`Tarea movida a ${STATUS[status].label}.`);
    await refreshState({ preserveSelection: true });
  } catch (error) {
    flash(error.message, true);
  }
}

function resetForm() {
  state.selectedTaskId = null;
  renderEditor();
}

function duplicateTask() {
  const task = selectedTask();
  if (!task) {
    flash("Selecciona una tarea para duplicarla.", true);
    return;
  }

  state.selectedTaskId = null;
  renderEditor();
  ui.fields.title.value = `${task.title} (copia)`;
  ui.fields.phase.value = task.phase || PHASES[0]?.id || "";
  ui.fields.priority.value = task.priority || "P1";
  ui.fields.status.value = "pending";
  ui.fields.stream.value = task.stream || "";
  ui.fields.required.checked = task.required !== false;
  ui.fields.summary.value = task.summary || "";
  ui.fields.dependsOn.value = (task.dependsOn || []).join("\n");
  ui.fields.acceptance.value = (task.acceptance || []).join("\n");
  ui.fields.note.value = "Duplicada desde el dashboard.";
  ui.editorTitle.textContent = "Nueva tarea desde base";
}

async function syncDocs() {
  try {
    await api("/api/sync", { method: "POST", body: JSON.stringify({ projectId: state.currentProjectId }) });
    flash("Documentacion sincronizada.");
    await refreshState({ preserveSelection: true });
  } catch (error) {
    flash(error.message, true);
  }
}

async function runCommand(event) {
  event.preventDefault();
  const command = ui.commandInput.value.trim();
  if (!command) {
    flash("Introduce un comando.", true);
    return;
  }

  try {
    const result = await api("/api/commands", {
      method: "POST",
      body: JSON.stringify({ projectId: state.currentProjectId, command }),
    });
    const session = {
      id: result.session.id,
      command,
      projectId: result.session.projectId,
      projectName: result.session.projectName,
      status: "running",
      exitCode: null,
      output: "",
    };
    state.sessions.unshift(session);
    state.selectedSessionId = session.id;
    ui.commandForm.reset();
    setActiveTab("execution");
    renderSessions();
    renderTerminal();
    streamSession(session.id);
  } catch (error) {
    flash(error.message, true);
  }
}

function streamSession(sessionId) {
  if (state.stream) state.stream.close();
  const source = new EventSource(`/api/commands/${encodeURIComponent(sessionId)}/stream`);
  state.stream = source;

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const session = upsertSession(sessionId);

    if (data.type === "snapshot") {
      session.command = data.command || session.command;
      session.status = data.status;
      session.exitCode = data.exitCode ?? session.exitCode;
      session.output = data.output || "";
    }

    if (data.type === "stdout" || data.type === "stderr") {
      session.output += data.chunk || "";
      session.status = data.status || session.status;
    }

    if (data.type === "done") {
      session.status = data.status || "completed";
      session.exitCode = data.exitCode;
      session.output = data.output || session.output;
      source.close();
      state.stream = null;
      refreshState({ preserveSelection: true });
    }

    renderSessions();
    renderTerminal();
  };

  source.onerror = () => {
    source.close();
    if (state.stream === source) state.stream = null;
  };
}

function upsertSession(id) {
  let session = state.sessions.find((item) => item.id === id);
  if (!session) {
    session = { id, command: id, status: "running", exitCode: null, output: "" };
    state.sessions.unshift(session);
  }
  state.selectedSessionId = id;
  return session;
}

function setActiveTab(tabId) {
  state.activeTab = tabId;
  ui.tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tabId));
  ui.tabPanels.forEach((panel) => {
    const active = panel.id === `tab-${tabId}`;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
}

function selectedTask() {
  return findTask(state.selectedTaskId);
}

function findTask(id) {
  return state.payload?.derived.tasks.find((task) => task.id === id) || null;
}

function history(tasks) {
  return tasks
    .flatMap((task) => (task.history || []).map((entry) => ({ ...entry, taskTitle: task.title })))
    .sort((left, right) => (left.at < right.at ? 1 : -1));
}

function split(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toStatus(action) {
  const match = Object.entries(STATUS).find(([, meta]) => meta.action === action);
  return match ? match[0] : action;
}

function taskSnippet(task) {
  return `
    <article class="task-snippet">
      <p class="label">${esc(task.phase)} · ${esc(PHASE[task.phase] || task.phase)} · ${esc(task.priority)}</p>
      <p class="value-text"><strong>${esc(task.title)}</strong></p>
      <p class="meta-text">${esc(task.summary || "Sin resumen operativo.")}</p>
    </article>
  `;
}

function lastDays(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

function formatDate(value) {
  try {
    const locale = LOCALE === "en" ? "en-US" : `${LOCALE}-${LOCALE.toUpperCase()}`;
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

function flash(message, isError = false) {
  ui.flash.textContent = message;
  ui.flash.className = `flash is-visible${isError ? " is-error" : ""}`;
  clearTimeout(state.flashTimer);
  state.flashTimer = window.setTimeout(() => {
    ui.flash.className = "flash";
  }, 3200);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
