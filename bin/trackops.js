#!/usr/bin/env node

const path = require("path");
const config = require("../lib/config");
const runtimeState = require("../lib/runtime-state");
const { setLocale, t } = require("../lib/i18n");
const pkg = require("../package.json");

const command = process.argv[2];
const args = process.argv.slice(3);

function initCliLocale() {
  let projectLocale = null;
  try {
    const context = config.resolveWorkspaceContext();
    if (context) {
      projectLocale = config.getLocale(config.loadControl(context));
    }
  } catch (_error) {
    projectLocale = null;
  }
  const doctor = runtimeState.doctorLocale(projectLocale);
  setLocale(doctor.effectiveLocale);
}

function resolveRoot() {
  const context = config.resolveWorkspaceContext();
  if (!context) {
    console.error(t("cli.error.noWorkspace"));
    process.exit(1);
  }
  return context.workspaceRoot;
}

async function run() {
  initCliLocale();
  try {
    switch (command) {
      case "init":
        await require("../lib/init").cmdInit(args);
        break;

      case "status":
        require("../lib/control").cmdStatus(resolveRoot());
        break;

      case "next":
        require("../lib/control").cmdNext(resolveRoot());
        break;

      case "sync":
        require("../lib/control").cmdSync(resolveRoot());
        break;

      case "dashboard":
        await require("../lib/server").run(args);
        break;

      case "refresh-repo":
        require("../lib/control").cmdRefreshRepo(resolveRoot(), args);
        break;

      case "install-hooks":
        require("../lib/control").cmdInstallHooks(resolveRoot());
        break;

      case "task":
        require("../lib/control").cmdTask(resolveRoot(), args);
        break;

      case "register":
        require("../lib/registry").cmdRegister(config.resolveProjectRoot() || process.cwd());
        break;

      case "projects":
        require("../lib/registry").cmdList();
        break;

      case "workspace": {
        const workspace = require("../lib/workspace");
        const sub = args[0];
        const root = config.resolveProjectRoot() || process.cwd();
        if (sub === "status") workspace.cmdStatus(root);
        else if (sub === "migrate") workspace.cmdMigrate(root, args.slice(1));
        else console.log(t("cli.usage.workspace"));
        break;
      }

      case "env": {
        const env = require("../lib/env");
        const sub = args[0];
        const root = config.resolveProjectRoot() || process.cwd();
        if (sub === "status") env.cmdStatus(root);
        else if (sub === "sync") env.cmdSync(root);
        else console.log(t("cli.usage.env"));
        break;
      }

      case "release":
        require("../lib/release").cmdRelease(config.resolveProjectRoot() || process.cwd(), args);
        break;

      case "locale":
        require("../lib/preferences").cmdLocale(args, config.resolveProjectRoot() || process.cwd());
        break;

      case "doctor":
        require("../lib/preferences").cmdDoctor(args, config.resolveProjectRoot() || process.cwd());
        break;

      case "opera": {
        const opera = require("../lib/opera");
        const sub = args[0];
        const root = config.resolveProjectRoot() || process.cwd();
        if (sub === "install") await opera.cmdInstall(root, args.slice(1));
        else if (sub === "bootstrap") await opera.cmdBootstrap(root, args.slice(1));
        else if (sub === "handoff") opera.cmdHandoff(root, args.slice(1));
        else if (sub === "status") opera.cmdStatus(root);
        else if (sub === "configure") opera.cmdConfigure(root, args.slice(1));
        else if (sub === "upgrade") opera.cmdUpgrade(root, args.slice(1));
        else { console.log(t("cli.usage.opera")); }
        break;
      }

      case "skill": {
        const skills = require("../lib/skills");
        const sub = args[0];
        const root = config.resolveProjectRoot() || process.cwd();
        if (sub === "install") skills.cmdInstall(root, args[1]);
        else if (sub === "list") skills.cmdList(root);
        else if (sub === "remove") skills.cmdRemove(root, args[1]);
        else if (sub === "catalog") skills.cmdCatalog();
        else { console.log(t("cli.usage.skill")); }
        break;
      }

      case "version":
      case "--version":
      case "-v":
        console.log(pkg.version);
        break;

      case "help":
      case "--help":
      case "-h":
      case undefined:
        require("../lib/control").cmdHelp();
        break;

      default:
        console.error(t("cli.error.unknownCommand", { command }));
        console.error(t("cli.error.runHelp"));
        process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

run();
