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

test("post-Indoraptor and Indominus campaign dialogue follows the selected language", () => {
  const scenes = [
    [
      "THREATS NEUTRALIZED",
      "AMENAZAS NEUTRALIZADAS"
    ],
    [
      "Both Indoraptor specimens have been defeated. The route to Poacher Black Site is now open.",
      "Ambos ejemplares de Indoraptor han sido derrotados. El camino hacia la Base Clandestina de los Cazadores ya está abierto."
    ],
    [
      "The two genetically distinct predators are no longer guarding the route. The search for Rosa continues beyond the perimeter.",
      "Los dos depredadores genéticamente distintos ya no custodian el camino. La búsqueda de Rosa continúa más allá del perímetro."
    ],
    [
      "Three distinct Indominus Rex specimens occupy the reinforced containment yard. They are separate individuals, and all three must be defeated before the facility's auxiliary systems can be reached.",
      "Tres ejemplares distintos de Indominus Rex ocupan el patio de contención reforzado. Son individuos separados y habrá que derrotarlos a los tres antes de acceder a los sistemas auxiliares de la instalación."
    ],
    [
      "All three Indominus Rex specimens are defeated. Their containment systems fall silent, but Rosa's cell remains sealed behind the facility's security network.",
      "Los tres ejemplares de Indominus Rex han sido derrotados. Sus sistemas de contención quedan en silencio, pero la celda de Rosa sigue sellada detrás de la red de seguridad de la instalación."
    ],
    [
      "With every perimeter specimen neutralized, the path to the containment wing is finally open.",
      "Con todos los ejemplares del perímetro neutralizados, el camino hacia el ala de contención finalmente está abierto."
    ]
  ];

  for (const [english, spanish] of scenes) {
    assert.equal(translateText(english, "es"), spanish);
    assert.equal(translateText(spanish, "en"), english);
  }
});
