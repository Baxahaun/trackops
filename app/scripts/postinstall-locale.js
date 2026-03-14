#!/usr/bin/env node

const runtimeState = require("../lib/runtime-state");
const { setLocale, t } = require("../lib/i18n");

function isGlobalInstall() {
  return String(process.env.npm_config_global || "").toLowerCase() === "true";
}

async function main() {
  if (!isGlobalInstall()) return;
  const result = await runtimeState.ensureGlobalLocale({ interactive: true });
  if (!result?.locale) return;
  setLocale(result.locale);
  process.stdout.write(`${t("postinstall.localeSet", { locale: result.locale, source: t(`locale.source.${result.source}`) })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(0);
});
