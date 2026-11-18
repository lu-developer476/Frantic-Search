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
  const sceneGuard = main.indexOf("if (!explorationMode && campaign.sceneOpen)", locationUpdate);
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
  assert.ok(main.includes("${import.meta.env.BASE_URL}artwork/ambush-artwork.png"));
  assert.ok(main.includes("${import.meta.env.BASE_URL}artwork/exploration-artwork.png"));
  assert.ok(main.includes('activeStartMenuPage === "minigames"'));
});


test("start-menu headings update with the selected language on every menu page", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const headingStart = main.indexOf("function updateStartMenuHeading()");
  const menuStart = main.indexOf("function showStartMenuPage(", headingStart);
  const handlerEnd = main.indexOf("\nfunction getTutorialLines", menuStart);
  assert.ok(headingStart >= 0 && menuStart > headingStart && handlerEnd > menuStart, "menu heading handlers must exist");

  const handlers = main.slice(headingStart, handlerEnd);
  const applyStart = main.indexOf("function applyLanguage()");
  const applyEnd = main.indexOf("\nfunction setEnvironmentMode", applyStart);
  assert.ok(applyStart >= 0 && applyEnd > applyStart, "language application handler must exist");
  assert.ok(main.slice(applyStart, applyEnd).includes("updateStartMenuHeading();"), "changing locale must refresh the visible menu heading");

  const result = runInNewContext(`
    ${handlers}
    const copy = () => [startScreenTitle.textContent, startScreenSubtitle.textContent, startScreenSubtitle.hidden];
    updateStartMenuHeading();
    const spanishHome = copy();
    locale = "en";
    updateStartMenuHeading();
    const englishHome = copy();
    showStartMenuPage("campaign");
    const englishCampaign = copy();
    showStartMenuPage("minigames");
    const englishMinigames = copy();
    locale = "es";
    updateStartMenuHeading();
    const spanishMinigames = copy();
    showStartMenuPage("options");
    const spanishOptions = copy();
    [spanishHome, englishHome, englishCampaign, englishMinigames, spanishMinigames, spanishOptions];
  `, {
    activeStartMenuPage: "home",
    locale: "es",
    startScreenTitle: { textContent: "" },
    startScreenSubtitle: { textContent: "", hidden: false },
    ui: (key) => ({
      es: { startMenuTitle: "BÚSQUEDA FRENÉTICA", startMenuSubtitle: "OPERACIÓN: CRÍA PERDIDA", minigames: "MINIJUEGOS" },
      en: { startMenuTitle: "FRANTIC SEARCH", startMenuSubtitle: "OPERATION: LOST HATCHLING", minigames: "MINIGAMES" }
    })[locale][key],
    hoveredMinigameButton: null,
    focusedMinigameButton: null,
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

  assert.equal(result[0].join("|"), "BÚSQUEDA FRENÉTICA|OPERACIÓN: CRÍA PERDIDA|false");
  assert.equal(result[1].join("|"), "FRANTIC SEARCH|OPERATION: LOST HATCHLING|false");
  assert.equal(result[2].join("|"), "FRANTIC SEARCH|OPERATION: LOST HATCHLING|false");
  assert.equal(result[3].join("|"), "MINIGAMES|OPERATION: LOST HATCHLING|true");
  assert.equal(result[4].join("|"), "MINIJUEGOS|OPERATION: LOST HATCHLING|true");
  assert.equal(result[5].join("|"), "BÚSQUEDA FRENÉTICA|OPERACIÓN: CRÍA PERDIDA|false");
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

test("the hamburger menu is the only in-session tutorial entry point and remains available in free roam", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(html.includes('id="tutorial-button" class="menu-option tutorial-menu-button"'));
  assert.equal(html.includes('id="game-tutorial-button"'), false);
  assert.equal(main.includes("gameTutorialButton"), false);
  assert.doesNotMatch(styles, /game-tutorial-fab/);
  assert.ok(main.includes('document.body.classList.toggle("exploration-session", explorationMode)'));
  assert.ok(main.includes('document.body.classList.remove("game-session-active", "exploration-session")'));
  assert.doesNotMatch(styles, /body\.exploration-session\s+\.menu-toggle/);
  for (const panel of ["persecution-panel", "hunting-panel", "ambush-panel"]) {
    assert.ok(styles.includes("#" + panel + ".active:not(.playing)"), "missing pre-game staging rule for " + panel);
  }
});

test("the brand returns to the root start screen and environmental modes cover navbar and hamburger", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(html.includes('<a class="brand" href="/"'));
  assert.equal(html.includes("https://franticsearch.vercel.app/#"), false);

  for (const mode of ["beige", "gray"]) {
    assert.ok(styles.includes("html.site-mode-" + mode + " .topbar"), mode + " must theme the navbar");
    assert.ok(styles.includes("html.site-mode-" + mode + " .menu-toggle"), mode + " must theme the hamburger toggle");
    assert.ok(styles.includes("html.site-mode-" + mode + " .nav-menu"), mode + " must theme the hamburger panel");
    assert.ok(styles.includes("html.site-mode-" + mode + " .menu-option"), mode + " must theme menu options");
  }
  assert.equal(styles.includes("Keep the hamburger navigation monochrome"), false);
  assert.doesNotMatch(styles, /#171717 !important/);
});
test("Empty Stomach shares the minigame menu button color palette", async () => {
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const palette = styles.slice(styles.lastIndexOf("/* All four minigame/exploration choices"));
  for (const button of ["persecution", "hunting", "ambush", "exploration"]) {
    assert.ok(palette.includes(`#${button}-button`), `missing shared palette for ${button}`);
  }
  assert.ok(palette.includes("background: #26372f;"));
  assert.ok(palette.includes("color: #eff3e5;"));
});



test("a new campaign schedules its first frame immediately while free roam keeps its briefing", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const start = main.indexOf('function start(mode = "campaign")');
  const end = main.indexOf("\nfunction endGame()", start);
  assert.ok(start >= 0 && end > start, "the game start routine must exist");
  const handler = main.slice(start, end);

  const runStart = (mode) => {
    const events = [];
    const noOp = () => {};
    const classList = { add: noOp, remove: noOp, toggle: noOp };
    const globals = {
      desktopPlayback: { matches: true },
      running: false,
      paused: false,
      explorationMode: false,
      document: { body: { classList } },
      save: { update: noOp },
      operationHeader: { classList },
      campaignBriefHeader: { classList },
      cancelScheduledFrame: noOp,
      audio: { context: {}, unlock: noOp },
      startScreen: { classList },
      setCharacterSelectionModalOpen: noOp,
      prologueCharacterSelectionPending: false,
      dinoModal: { classList },
      cancelCharacterButton: { hidden: false },
      overlayActionButton: { hidden: false },
      overlayContent: { hidden: true },
      retryOptions: { classList },
      overlayExitButton: { hidden: false },
      failureScreenActive: false,
      pauseMenu: { classList },
      pauseConfirmation: { classList },
      pendingPauseAction: null,
      pauseActionTrigger: null,
      resetPlayer: () => events.push("reset"),
      beginCampaignPrologue: () => {
        events.push("prologue");
        globals.campaignPrologue = { active: true };
      },
      campaignPrologue: null,
      updatePlayerHealthHud: noOp,
      music: { start: noOp, setPaused: noOp, setEnabled: noOp },
      overlay: { classList },
      elapsed: 0,
      accumulator: 0,
      distance: 0,
      rescues: 0,
      campaignAutosaveElapsed: 0,
      stateLabel: { textContent: "" },
      rescuesLabel: { textContent: "" },
      updateCampaignHud: noOp,
      renderStoryPanel: noOp,
      performance: { now: () => 1 },
      render: () => events.push("render"),
      showGameplayBrief: (briefMode) => events.push("brief:" + briefMode),
      scheduleFrame: () => events.push("schedule")
    };
    globals.mode = mode;
    globals.currentMusicTheme = () => "forest";
    globals.audio.enabled = true;
    runInNewContext(handler + "\nstart(mode);", globals);
    return { events, globals };
  };

  const campaign = runStart("campaign");
  assert.deepEqual(campaign.events, ["reset", "prologue", "render", "schedule"]);
  assert.equal(campaign.globals.running, true);
  assert.equal(campaign.globals.paused, false);

  const exploration = runStart("exploration");
  assert.deepEqual(exploration.events, ["reset", "render", "brief:exploration"]);
  assert.equal(exploration.events.includes("schedule"), false);
});


test("the page stays black until load completes, then reveals all start-screen elements with one animation", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(html.includes('<html lang="es" class="site-loading">'));
  assert.match(html, /html\.site-loading,\s*html\.site-loading body\s*\{\s*background:\s*#000/i);
  assert.match(html, /html\.site-loading body\s*\{\s*visibility:\s*hidden/i);

  const loaderStart = main.indexOf("const markSiteLoaded = () =>");
  const loaderEnd = main.indexOf("\ndocument.querySelectorAll", loaderStart);
  assert.ok(loaderStart >= 0 && loaderEnd > loaderStart);
  const loader = main.slice(loaderStart, loaderEnd);
  assert.ok(loader.includes('classList.remove("site-loading")'));
  assert.ok(loader.includes('classList.add("site-loaded")'));

  const revealStart = styles.indexOf("@keyframes arriveFromBelow");
  const revealEnd = styles.indexOf("/* Start-screen identity", revealStart);
  assert.ok(revealStart >= 0 && revealEnd > revealStart);
  const reveal = styles.slice(revealStart, revealEnd);
  for (const selector of [
    ".site-loaded #start-screen-title",
    ".site-loaded #start-screen-subtitle",
    ".site-loaded #start-button",
    ".site-loaded .start-screen-artwork",
    ".site-loaded #menu-toggle"
  ]) assert.ok(reveal.includes(selector), "missing shared reveal for " + selector);
  assert.ok(reveal.includes("animation:arriveFromBelow .72s cubic-bezier(.16,1,.3,1) both"));
});
