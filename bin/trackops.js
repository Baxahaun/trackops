#!/usr/bin/env node

const path = require("path");
const config = require("../lib/config");
const pkg = require("../package.json");

const command = process.argv[2];
const args = process.argv.slice(3);

function resolveRoot() {
  const root = config.resolveProjectRoot();
  if (!root) {
    console.error("No project_control.json found in this directory or any parent.");
    process.exit(1);
  }
  return root;
}

async function run() {
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

      case "opera": {
        const opera = require("../lib/opera");
        const sub = args[0];
        const root = config.resolveProjectRoot() || process.cwd();
        if (sub === "install") await opera.cmdInstall(root, args.slice(1));
        else if (sub === "bootstrap") await opera.cmdBootstrap(root, args.slice(1));
        else if (sub === "status") opera.cmdStatus(root);
        else if (sub === "configure") opera.cmdConfigure(root, args.slice(1));
        else if (sub === "upgrade") opera.cmdUpgrade(root);
        else { console.log("Usage: trackops opera <install|bootstrap|status|configure|upgrade>"); }
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
        else { console.log("Usage: trackops skill <install|list|remove|catalog> [name]"); }
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
        console.error(`Unknown command: ${command}`);
        console.error("Run 'trackops help' for usage.");
        process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

run();
