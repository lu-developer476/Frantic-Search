import test from "node:test";
import assert from "node:assert/strict";
import { hasTranslation, t, supportedLocales, translateText } from "../src/i18n.js";

test("Spanish Latin American menu labels are localized", () => {
  assert.equal(t("timeAttack", "es"), "HORA DE ATACAR");
  assert.equal(t("survival", "es"), "SUPERVIVENCIA");
});

test("English menu labels remain unchanged", () => {
  assert.equal(t("timeAttack", "en"), "TIME ATTACK");
  assert.equal(t("survival", "en"), "SURVIVAL");
});


test("Empty Stomach uses the localized Spanish title and keeps the English title", () => {
  assert.equal(t("emptyStomach", "es"), "ESTÓMAGO VACÍO");
  assert.equal(t("emptyStomach", "en"), "EMPTY STOMACH");
});

test("Every localization reference in the interface is defined in both languages", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const keys = new Set([
    ...[...html.matchAll(/\bdata-i18n(?:-aria)?="([^"]+)"/g)].map((match) => match[1]),
    "documentTitle",
    "metaDescription"
  ]);

  assert.deepEqual(supportedLocales(), ["es", "en"]);
  for (const key of keys) {
    assert.equal(hasTranslation(key, "es"), true, `Missing Spanish translation for ${key}`);
    assert.equal(hasTranslation(key, "en"), true, `Missing English translation for ${key}`);
  }
});

test("Every configured campaign chapter subtitle has a Spanish translation", async () => {
  const { LEVELS } = await import("../src/config/GameConfig.js");
  for (const level of LEVELS) {
    assert.notEqual(translateText(level.subtitle, "es"), level.subtitle, level.name);
  }
});
