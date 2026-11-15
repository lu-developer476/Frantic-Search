import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("the final play confirmation starts the game after the character picker closes", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const handlerStart = main.indexOf("function startFromDinoModal()");
  const handlerEnd = main.indexOf("\nfunction setMenuOpen", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "start handler must exist");

  const handler = main.slice(handlerStart, handlerEnd);
  const createClassList = (initiallyHidden) => {
    const classes = new Set(initiallyHidden ? ["hidden"] : []);
    return {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name)
    };
  };

  const dinoModal = { classList: createClassList(true) };
  const characterConfirmation = { classList: createClassList(false) };
  const desktopPlayback = { matches: true };
  let startCalls = 0;

  runInNewContext(handler + "\nstartFromDinoModal();", {
    dinoModal,
    characterConfirmation,
    desktopPlayback,
    start: () => { startCalls += 1; }
  });

  assert.equal(startCalls, 1, "confirming JUGAR must invoke the game start routine");
  assert.equal(characterConfirmation.classList.contains("hidden"), true);
});


test("desktop startup accepts any available fine pointer on hybrid devices", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(
    main.includes('window.matchMedia("(min-width: 768px) and (any-pointer: fine)")'),
    "desktop access must detect any fine pointer, not only the primary pointer"
  );
  assert.ok(
    styles.includes("@media(max-width:767px),not all and (any-pointer:fine){"),
    "CSS must hide the game only when no fine pointer is available"
  );
});

test("chapter arrival dialogue opens automatically at the level boundary", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const { GAME, LEVELS } = await import("../src/config/GameConfig.js");
  const updateStart = main.indexOf("function update(delta) {");
  const distanceUpdate = main.indexOf("distance = Math.max(0, player.x - GAME.playerX);", updateStart);
  const locationUpdate = main.indexOf("campaign.updateLocation(player.x);", updateStart);
  const sceneGuard = main.indexOf("if (!freeRoamMode && campaign.sceneOpen)", locationUpdate);
  const interactStart = main.indexOf('if (input.consume("interact"))', sceneGuard);

  assert.ok(updateStart >= 0 && distanceUpdate > updateStart && distanceUpdate < locationUpdate);
  assert.ok(locationUpdate > distanceUpdate && sceneGuard > locationUpdate);
  assert.ok(interactStart > sceneGuard, "the pending-scene guard must run before further gameplay input");

  const sceneGate = main.slice(sceneGuard, interactStart);
  assert.ok(sceneGate.includes("distanceLabel.textContent = Math.floor(distance)"));
  assert.ok(sceneGate.includes("bestLabel.textContent = Math.floor(best())"));
  assert.ok(sceneGate.includes("renderStoryPanel();"));
  assert.ok(sceneGate.includes("return;"));

  assert.equal(LEVELS[1].distance, 6055);
  assert.equal(GAME.playerX + LEVELS[1].distance, 6200);
});


test("campaign actions are grouped under the campaign menu", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/i18n.js", import.meta.url), "utf8");

  const homeStart = html.indexOf('<div id="start-menu-home"');
  const optionsStart = html.indexOf('<div id="start-menu-options"');
  const campaignStart = html.indexOf('<div id="campaign-menu"');
  const campaignEnd = html.indexOf("</div>", campaignStart);
  const homeMenu = html.slice(homeStart, optionsStart);
  const campaignMenu = html.slice(campaignStart, campaignEnd);

  assert.ok(campaignStart > optionsStart, "campaign submenu must follow the main options");
  assert.ok(!homeMenu.includes('id="continue-campaign-button"'), "continue action must not remain on the home screen");
  assert.ok(!homeMenu.includes('id="delete-campaign-save-button"'), "save management must stay inside the campaign menu");
  assert.ok(campaignMenu.includes('id="continue-campaign-button"'));
  assert.ok(campaignMenu.includes('id="new-campaign-button"'));
  assert.ok(campaignMenu.includes('id="delete-campaign-save-button"'));

  assert.ok(main.includes('campaignButton.addEventListener("click", () => showStartMenuPage("campaign"))'));
  assert.ok(main.includes('newCampaignButton.addEventListener("click", () => openDinoModal("start", "campaign"))'));
  assert.match(i18n, /newCampaign:\s*"NUEVA CAMPAÑA"/);
  assert.match(i18n, /newCampaign:\s*"NEW CAMPAIGN"/);
});
