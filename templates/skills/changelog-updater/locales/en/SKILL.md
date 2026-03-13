---
name: "changelog-updater"
description: "Automatically update CHANGELOG.md from the latest commit after a successful commit."
metadata:
  version: "1.0"
  type: "project"
---

# Changelog Updater

Use this skill right after a successful commit to update `CHANGELOG.md` from the git history. It should parse the latest commit, classify it using Conventional Commit semantics, and append the entry to the proper dated section.
