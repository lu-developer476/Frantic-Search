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


test("the title screen and menu previews use the canonical artwork filenames", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

  assert.ok(html.includes("%BASE_URL%artwork/8bits-artwork.png"));
  assert.ok(html.includes("https://franticsearch.vercel.app/artwork/8bits-artwork.png"));
  assert.ok(main.includes("${import.meta.env.BASE_URL}artwork/8bits-artwork.png"));
  assert.ok(main.includes("${import.meta.env.BASE_URL}artwork/coral-8bits-artwork.png"));
  assert.ok(main.includes("${import.meta.env.BASE_URL}artwork/survival-artwork.png"));
  assert.ok(main.includes("${import.meta.env.BASE_URL}artwork/free-roam-artwork.png"));
  assert.ok(main.includes('activeStartMenuPage === "minigames"'));
});


test("the minigames menu updates the start-screen title and subtitle", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const handlerStart = main.indexOf("function showStartMenuPage(");
  const handlerEnd = main.indexOf("\nfunction getTutorialLines", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "menu page handler must exist");

  const handler = main.slice(handlerStart, handlerEnd);
  const result = runInNewContext(`
    ${handler}
    showStartMenuPage("minigames");
    const minigamesCopy = [startScreenTitle.textContent, startScreenSubtitle.hidden];
    showStartMenuPage("options");
    const restoredCopy = [startScreenTitle.textContent, startScreenSubtitle.hidden, startScreenSubtitle.textContent];
    [minigamesCopy, restoredCopy];
  `, {
    hoveredMinigameButton: null,
    focusedMinigameButton: null,
    activeStartMenuPage: "home",
    startScreenTitle: { textContent: "BÚSQUEDA FRENÉTICA" },
    startScreenSubtitle: { textContent: "OPERACIÓN: CRÍA PERDIDA", hidden: false },
    defaultStartScreenTitle: "BÚSQUEDA FRENÉTICA",
    defaultStartScreenSubtitle: "OPERACIÓN: CRÍA PERDIDA",
    ui: (key) => ({
      minigames: "MINIJUEGOS"
    })[key],
    updateMinigamePreview: () => {},
    startMenuHome: {},
    startMenuOptions: {},
    campaignMenu: {},
    minigamesMenu: {},
    startButton: { setAttribute: () => {} },
    campaignButton: { setAttribute: () => {} },
    minigamesButton: { setAttribute: () => {} },
    startScreen: { classList: { remove: () => {} } }
  });

  assert.equal(result[0][0], "MINIJUEGOS");
  assert.equal(result[0][1], true, "the minigames page must not display a subtitle");
  assert.equal(result[1][0], "BÚSQUEDA FRENÉTICA");
  assert.equal(result[1][1], false, "the regular start-screen subtitle must return");
  assert.equal(result[1][2], "OPERACIÓN: CRÍA PERDIDA");
});


test("the delete-save control is visible but disabled until a real campaign checkpoint is saved", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const start = main.indexOf("function refreshContinueCampaignButton()");
  const end = main.indexOf("\nfunction persistCampaignProgressSnapshot", start);
  assert.ok(start >= 0 && end > start, "save-control refresh handler must exist");
  const handler = main.slice(start, end);

  const evaluate = (hasSave, checkpointReached, desktopAvailable = true) => {
    const continueButton = { hidden: false, disabled: false };
    const deleteButton = { hidden: true, disabled: false };
    runInNewContext(handler + "\nrefreshContinueCampaignButton();", {
      continueCampaignButton: continueButton,
      deleteCampaignSaveButton: deleteButton,
      save: {
        getCampaignProgress: () => hasSave ? { snapshot: {} } : null,
        get: (key) => key === "campaignCheckpointReached" && checkpointReached
      },
      desktopPlayback: { matches: desktopAvailable }
    });
    return { continueButton, deleteButton };
  };

  const empty = evaluate(false, false);
  assert.equal(empty.continueButton.hidden, true);
  assert.equal(empty.deleteButton.hidden, false);
  assert.equal(empty.deleteButton.disabled, true);

  const started = evaluate(true, false);
  assert.equal(started.continueButton.hidden, false);
  assert.equal(started.deleteButton.hidden, false);
  assert.equal(started.deleteButton.disabled, true);

  const checkpoint = evaluate(true, true);
  assert.equal(checkpoint.deleteButton.disabled, false);

  const unavailableDesktop = evaluate(true, true, false);
  assert.equal(unavailableDesktop.deleteButton.disabled, true);
});

test("session shortcuts are suppressed on minigame start screens and during free roam", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(main.includes('document.body.classList.toggle("free-roam-session", freeRoamMode)'));
  assert.ok(main.includes('document.body.classList.remove("game-session-active", "free-roam-session")'));
  assert.match(styles, /body\.free-roam-session \.menu-toggle/);
  assert.match(styles, /body\.free-roam-session \.game-tutorial-fab/);
  for (const panel of ["empty-stomach-panel", "time-attack-panel", "survival-panel"]) {
    assert.ok(styles.includes(`#${panel}.active:not(.playing)`), `missing start-screen visibility rule for ${panel}`);
  }
});

test("Empty Stomach shares the minigame menu button color palette", async () => {
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const palette = styles.slice(styles.lastIndexOf("/* All four minigame/free-roam choices"));
  for (const button of ["empty-stomach", "time-attack", "survival", "free-roam"]) {
    assert.ok(palette.includes(`#${button}-button`), `missing shared palette for ${button}`);
  }
  assert.ok(palette.includes("background: #26372f;"));
  assert.ok(palette.includes("color: #eff3e5;"));
});
