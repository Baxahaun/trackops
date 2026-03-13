#!/usr/bin/env node

const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "locales");

let currentLocale = "es";
let currentMessages = null;
let fallbackMessages = null;

function loadMessages(localeId) {
  try {
    return require(path.join(LOCALES_DIR, `${localeId}.json`));
  } catch (_error) {
    return null;
  }
}

function ensureLoaded() {
  if (currentMessages) return;
  currentMessages = loadMessages(currentLocale) || {};
  if (currentLocale !== "es") {
    fallbackMessages = loadMessages("es") || {};
  } else {
    fallbackMessages = currentMessages;
  }
}

function setLocale(localeId) {
  currentLocale = localeId || "es";
  currentMessages = null;
  fallbackMessages = null;
}

function getLocale() {
  return currentLocale;
}

function t(key, params) {
  ensureLoaded();
  let message =
    currentMessages[key] ||
    (fallbackMessages && fallbackMessages[key]) ||
    key;
  if (params) {
    message = message.replace(/\{(\w+)\}/g, (match, paramKey) =>
      params[paramKey] !== undefined ? String(params[paramKey]) : match
    );
  }
  return message;
}

function getMessages(localeId) {
  const locale = localeId || currentLocale || "es";
  return {
    ...(locale !== "es" ? (loadMessages("es") || {}) : {}),
    ...(loadMessages(locale) || {}),
  };
}

module.exports = { setLocale, getLocale, t, getMessages };
