import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { translateText } from "../src/i18n.js";

test("runtime campaign scenes render inline copy when their ID is not in the scene catalog", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const start = main.indexOf("function renderStoryPanel(");
  const end = main.indexOf("\nfunction showCampaignEnding()", start);
  assert.ok(start >= 0 && end > start, "campaign story renderer must exist");

  const panelClasses = new Set(["hidden"]);
  const storyPanel = {
    classList: {
      add: (name) => panelClasses.add(name),
      remove: (name) => panelClasses.delete(name)
    }
  };
  const storyTitle = { textContent: "" };
  const storyText = { textContent: "" };
  const storyProgress = { textContent: "" };
  const storyNextButton = { textContent: "" };
  const duckChanges = [];
  const scene = {
    id: "security-terminal-locked",
    title: "SECURITY TERMINAL LOCKED",
    lines: ["The security terminal has no auxiliary power. The power relay must be activated first."],
    index: 0
  };

  const renderer = main.slice(start, end);
  runInNewContext(renderer + "\nrenderStoryPanel();", {
    campaign: { sceneOpen: true, activeScene: scene },
    getCampaignSceneCopy: () => null,
    translateText,
    locale: "es",
    storyPanel,
    storyTitle,
    storyText,
    storyProgress,
    storyNextButton,
    music: { setDucked: (value) => duckChanges.push(value) },
    ui: (key) => ({ continue: "CONTINUAR", next: "SIGUIENTE" })[key] ?? key
  });

  assert.equal(panelClasses.has("hidden"), false, "uncatalogued runtime scenes must remain visible");
  assert.equal(storyTitle.textContent, "TERMINAL DE SEGURIDAD BLOQUEADA");
  assert.equal(storyText.textContent, "El terminal de seguridad no tiene energía auxiliar. Primero es necesario activar el relé de energía.");
  assert.equal(storyProgress.textContent, "1 / 1");
  assert.equal(storyNextButton.textContent, "CONTINUAR");
  assert.deepEqual(duckChanges, [true]);
});

test("every runtime-queued campaign scene has Spanish copy", () => {
  const runtimeScenes = [
    [
      "THE NOISE IN THE WOODS",
      "At 2,000 meters, Brisa reaches a narrow service track and spots a lone poachers' jeep. No hunters are visible; the vehicle appears abandoned.",
      "As she approaches, two hunters burst from cover and cut off her way home. Brisa struggles, but they force her into the jeep and speed away. Gala wakes to the engine and follows the tracks."
    ],
    [
      "A FIGHT IN THE UNDERGROWTH",
      "After following Brisa's tracks for 500 meters, Gala reaches a rocky opening at 2,500 meters. Basilio is already fighting two predators: a Venatosaurus impavidus and a Venatosaurus saevidicus.",
      "The two animals attack from different angles. Gala closes in to help Basilio, and the struggle spreads across the 2,200–2,800 meter clearing."
    ],
    [
      "AN UNEXPECTED ALLY",
      "The fight carries across the rocky clearing. Gala and Basilio work together against the Venatosaurus impavidus and Venatosaurus saevidicus, using their different strengths to keep the predators at bay.",
      "At 2,800 meters, both predators are defeated. Basilio agrees to help Gala follow the poachers' trail and bring Brisa home."
    ],
    [
      "SECURITY TERMINAL LOCKED",
      "The security terminal has no auxiliary power. The power relay must be activated first."
    ],
    [
      "CELL BLOCK C",
      "Brisa's cell remains sealed. Auxiliary power must be restored and the security lock disengaged before she can be freed."
    ]
  ];

  for (const scene of runtimeScenes) {
    for (const sourceText of scene) {
      assert.notEqual(
        translateText(sourceText, "es"),
        sourceText,
        "missing Spanish translation for: " + sourceText
      );
    }
  }
});
