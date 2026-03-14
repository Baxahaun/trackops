#!/usr/bin/env node

const config = require("./config");
const runtimeState = require("./runtime-state");
const { setLocale, t } = require("./i18n");
const { normalizeLocale } = require("./locale");

function formatLocaleSource(source) {
  return t(`locale.source.${String(source || "").trim()}`) || source || t("locale.none");
}

function resolveProjectLocale(root) {
  const context = config.resolveWorkspaceContext(root || process.cwd());
  if (!context) return null;
  try {
    return config.getLocale(config.loadControl(context));
  } catch (_error) {
    return null;
  }
}

function cmdLocale(args = [], root) {
  const sub = args[0];
  const projectLocale = resolveProjectLocale(root);
  const doctor = runtimeState.doctorLocale(projectLocale);
  setLocale(doctor.effectiveLocale);

  if (sub === "get" || !sub) {
    console.log(`${t("locale.effective")}: ${doctor.effectiveLocale}`);
    console.log(`${t("locale.source")}: ${formatLocaleSource(doctor.source)}`);
    console.log(`${t("locale.global")}: ${doctor.globalLocale || t("locale.none")}`);
    if (doctor.projectLocale) {
      console.log(`${t("locale.project")}: ${doctor.projectLocale}`);
    }
    return;
  }

  if (sub === "set") {
    const nextLocale = normalizeLocale(args[1]);
    if (!nextLocale) {
      throw new Error(t("locale.invalid", { value: String(args[1] || "") }));
    }
    runtimeState.writeRuntimeState({ locale: nextLocale, localeSource: "manual" });
    setLocale(nextLocale);
    console.log(t("locale.updated", { locale: nextLocale }));
    return;
  }

  console.log(t("cli.usage.locale"));
}

function cmdDoctor(args = [], root) {
  const sub = args[0];
  if (sub !== "locale") {
    console.log(t("cli.usage.doctor"));
    return;
  }

  const projectLocale = resolveProjectLocale(root);
  const doctor = runtimeState.doctorLocale(projectLocale);
  setLocale(doctor.effectiveLocale);
  console.log(`${t("locale.effective")}: ${doctor.effectiveLocale}`);
  console.log(`${t("locale.source")}: ${formatLocaleSource(doctor.source)}`);
  console.log(`${t("locale.global")}: ${doctor.globalLocale || t("locale.none")}`);
  console.log(`${t("locale.project")}: ${doctor.projectLocale || t("locale.none")}`);
  console.log(`${t("locale.env")}: ${doctor.envLocale || t("locale.none")}`);
  console.log(`${t("locale.system")}: ${doctor.systemLocale}`);
  console.log(`${t("locale.runtimeFile")}: ${doctor.runtimeFile}`);
}

module.exports = {
  cmdLocale,
  cmdDoctor,
};
