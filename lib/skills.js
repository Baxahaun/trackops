#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const config = require("./config");
const { t, setLocale } = require("./i18n");

const SKILLS_TEMPLATES_DIR = path.join(__dirname, "..", "templates", "skills");

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep > 0) {
      const key = line.slice(0, sep).trim().replace(/^["']|["']$/g, "");
      const val = line.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
      fm[key] = val;
    }
  }
  return fm;
}

function getSkillsDir(root) {
  return path.join(root, ".agents", "skills");
}

function getRegistryPath(root) {
  return path.join(root, ".agent", "skills", "_registry.md");
}

function catalogSkills() {
  if (!fs.existsSync(SKILLS_TEMPLATES_DIR)) return [];
  return fs.readdirSync(SKILLS_TEMPLATES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const skillMd = path.join(SKILLS_TEMPLATES_DIR, e.name, "SKILL.md");
      if (!fs.existsSync(skillMd)) return null;
      const fm = parseFrontmatter(fs.readFileSync(skillMd, "utf8"));
      return { name: e.name, description: fm.description || "", version: fm.version || "1.0" };
    })
    .filter(Boolean);
}

function installedSkills(root) {
  const skillsDir = getSkillsDir(root);
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, "SKILL.md")))
    .map((e) => {
      const fm = parseFrontmatter(fs.readFileSync(path.join(skillsDir, e.name, "SKILL.md"), "utf8"));
      return { name: e.name, description: fm.description || "", version: fm.version || "1.0" };
    });
}

function updateRegistry(root) {
  const registryPath = getRegistryPath(root);
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  const skills = installedSkills(root);
  const lines = ["# Skills Registry", "", "| Skill | Version | Description |", "|-------|---------|-------------|"];
  for (const s of skills) {
    lines.push(`| ${s.name} | ${s.version} | ${s.description} |`);
  }
  fs.writeFileSync(registryPath, lines.join("\n") + "\n", "utf8");

  // Also update control meta
  const controlFile = config.controlFilePath(root);
  if (fs.existsSync(controlFile)) {
    try {
      const control = config.loadControl(root);
      if (control.meta.etapa) {
        control.meta.etapa.skills = skills.map((s) => s.name);
        config.saveControl(root, control);
      }
    } catch (_e) { /* ignore */ }
  }
}

function installSkill(root, skillName) {
  const control = config.loadControl(root);
  setLocale(config.getLocale(control));

  const templateDir = path.join(SKILLS_TEMPLATES_DIR, skillName);
  if (!fs.existsSync(templateDir)) {
    throw new Error(t("skill.notFound", { name: skillName }));
  }

  const targetDir = path.join(getSkillsDir(root), skillName);
  if (fs.existsSync(path.join(targetDir, "SKILL.md"))) {
    console.log(t("skill.alreadyInstalled", { name: skillName }));
    return;
  }

  copyDirRecursive(templateDir, targetDir);
  updateRegistry(root);
  console.log(t("skill.installed", { name: skillName }));
}

function removeSkill(root, skillName) {
  const control = config.loadControl(root);
  setLocale(config.getLocale(control));

  const targetDir = path.join(getSkillsDir(root), skillName);
  if (!fs.existsSync(targetDir)) {
    console.log(t("skill.notInstalled", { name: skillName }));
    return;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  updateRegistry(root);
  console.log(t("skill.removed", { name: skillName }));
}

/* ── CLI commands ── */

function cmdInstall(root, skillName) {
  if (!skillName) { console.error("Skill name required."); process.exit(1); }
  installSkill(root, skillName);
}

function cmdList(root) {
  const skills = installedSkills(root);
  if (!skills.length) { console.log("No skills installed."); return; }
  console.log(t("skill.listTitle"));
  for (const s of skills) {
    console.log(`  ${s.name} (v${s.version}) — ${s.description}`);
  }
}

function cmdRemove(root, skillName) {
  if (!skillName) { console.error("Skill name required."); process.exit(1); }
  removeSkill(root, skillName);
}

function cmdCatalog() {
  const skills = catalogSkills();
  if (!skills.length) { console.log("No skills available in catalog."); return; }
  console.log(t("skill.catalogTitle"));
  for (const s of skills) {
    console.log(`  ${s.name} (v${s.version}) — ${s.description}`);
  }
}

module.exports = { installSkill, removeSkill, installedSkills, catalogSkills, updateRegistry, cmdInstall, cmdList, cmdRemove, cmdCatalog };
