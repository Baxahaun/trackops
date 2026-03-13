#!/usr/bin/env node

const { spawnSync } = require("child_process");
const config = require("./config");

function git(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function runGit(args, cwd, errorMessage) {
  const result = git(args, cwd);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || errorMessage);
  }
  return result.stdout.trim();
}

function parseArgs(args = []) {
  return {
    push: args.includes("--push"),
  };
}

function cmdRelease(root, args = []) {
  const context = config.ensureContext(root);
  if (context.layout !== "split") {
    throw new Error("trackops release requires a split workspace.");
  }

  const options = parseArgs(args);
  const status = runGit(["status", "--porcelain"], context.workspaceRoot, "git status failed");
  if (context.publish.requireCleanWorktree && status.trim()) {
    throw new Error("trackops release requires a clean git worktree.");
  }

  const currentBranch = runGit(["branch", "--show-current"], context.workspaceRoot, "git branch failed");
  if (currentBranch !== context.branches.development) {
    throw new Error(`trackops release must run from '${context.branches.development}'.`);
  }

  const splitCommit = runGit(
    ["subtree", "split", "--prefix", context.publish.sourceDir, context.branches.development],
    context.workspaceRoot,
    "git subtree split failed",
  );

  runGit(["branch", "-f", context.branches.publish, splitCommit], context.workspaceRoot, "git branch update failed");

  if (options.push) {
    runGit(["push", "origin", context.branches.publish, "--force-with-lease"], context.workspaceRoot, "git push failed");
  }

  console.log(`Release branch '${context.branches.publish}' updated from '${context.branches.development}'.`);
}

module.exports = { cmdRelease };
