import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("zone and Stegoceratops cooldown are not rendered inside the game canvas", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.doesNotMatch(main, /fillText\(tr\(level\(\)\.name\)/);
  assert.doesNotMatch(main, /fillText\("STEGOCERATOPS \[C\]/);
  assert.match(main, /function updateStegoceratopsHud\(\)/);
  assert.match(main, /updateStegoceratopsHud\(\);/);
});

test("the operation footer follows the canvas and includes the Stegoceratops cooldown", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const canvasOpen = html.indexOf('<div class="canvas-wrap">');
  const hudAfterCanvas = html.indexOf('\n</div>\n          <div class="hud-strip"', canvasOpen);
  const hudStart = html.indexOf('<div class="hud-strip"');
  assert.ok(canvasOpen >= 0);
  assert.ok(hudAfterCanvas > canvasOpen, "the canvas wrapper must close before the footer begins");
  assert.ok(hudStart > hudAfterCanvas);
  assert.match(html.slice(hudStart), /id="campaign-chapter"/);
  assert.match(html.slice(hudStart), /id="stegoceratops-status"/);
});

test("operation footer, game frame and hamburger menu use flat, shadow-free styling", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const flatRules = css.slice(css.lastIndexOf("/* Flat, readable operation footer"));
  assert.match(flatRules, /\.hud-strip\s*\{[^}]*box-shadow:none/s);
  assert.match(flatRules, /\.menu-toggle,[\s\S]*?\.nav-menu,[\s\S]*?\{\s*box-shadow:none/s);
  assert.match(flatRules, /grid-template-rows:auto minmax\(0,1fr\) auto/);
  assert.match(flatRules, /html\.site-mode-beige \.game-panel,[\s\S]*?box-shadow:none/);
});


test("X is labelled as dash and HABILIDAD remains reserved for the Stegoceratops call", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/i18n.js", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

  assert.match(i18n, /X EMBESTIDA/);
  assert.match(i18n, /X DASH/);
  assert.match(i18n, /dashReady: "EMBESTIDA LISTA"/);
  assert.match(i18n, /dashReady: "DASH READY"/);
  assert.match(i18n, /abilityReady: "HABILIDAD LISTA"/);
  assert.match(i18n, /abilityReady: "ABILITY READY"/);
  assert.match(html, /id="ability-status"[^>]*data-i18n="dashReady">EMBESTIDA LISTA/);
  assert.match(html, /id="stegoceratops-status"[^>]*>STEGOCERATOPS \[C\] - HABILIDAD LISTA/);
  assert.match(main, /function updatePlayerAbilityHud\(\)/);
  assert.match(main, /selected === "vasti" \? ui\("stompReady"\) : ui\("dashReady"\)/);
  assert.match(main, /X: PISOTÓN/);
  assert.match(main, /X: STOMP/);
  assert.match(i18n, /stompReady: "PISOTÓN LISTO"/);
  assert.match(i18n, /stompReady: "STOMP READY"/);
  assert.ok(main.includes('stegoceratopsStatusLabel.textContent = "STEGOCERATOPS [C] - " +'));
  assert.match(main, /stegoceratopsStatusLabel\.textContent[\s\S]*?ui\("abilityReady"\)/);
});


test("nearby interactive targets share the explicit E prompt", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/i18n.js", import.meta.url), "utf8");

  assert.match(main, /const canInteract = Boolean\(nearbyConsole \|\| nearBeta \|\| nearFerrucutus\)/);
  assert.match(main, /interactionHintLabel\.textContent = canInteract[\s\S]*?ui\("interact"\)/);
  assert.match(main, /ctx\.fillText\(ui\("interact"\), terminal\.x/);
  assert.match(i18n, /interact: "E: INTERACTUAR"/);
  assert.match(i18n, /interact: "E: INTERACT"/);
  assert.doesNotMatch(main, /"E \/\/ " \+ ui\("freeFerrucutus"\)/);
});


test("lower HUD uses the full strip width and wraps complete labels without overlap", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const hudRules = css.slice(css.lastIndexOf("/* Full-width lower HUD"));

  assert.match(hudRules, /\.canvas-wrap \.hud-strip\s*\{[^}]*left:0;[^}]*right:0;[^}]*width:100%/s);
  assert.match(hudRules, /\.canvas-wrap \.hud-strip>\.hud-summary\s*\{[^}]*width:100%/s);
  assert.match(hudRules, /\.canvas-wrap \.hud-strip \.hud-status-stack\s*\{[^}]*flex-flow:row wrap/s);
  assert.match(hudRules, /\.canvas-wrap \.hud-strip \.hud-status-stack \.stegoceratops-readout\s*\{[^}]*flex:0 0 auto/s);
  assert.match(hudRules, /\.canvas-wrap \.hud-strip \.hud-summary \.hud-controls\s*\{[^}]*width:100%/s);
  assert.match(hudRules, /\.canvas-wrap \.hud-strip \.hud-summary \.hud-controls\s*\{[^}]*white-space:normal/s);
  assert.match(hudRules, /\.canvas-wrap \.hud-strip \.hud-summary \.hud-controls\s*\{[^}]*overflow:visible/s);
});


test("control copy matches the separate interaction indicator and does not duplicate E", async () => {
  const i18n = await readFile(new URL("../src/i18n.js", import.meta.url), "utf8");
  assert.match(i18n, /controls: "WAD O FLECHAS: MOVER ◦ BARRA ESPACIADORA: SALTAR ◦ X: EMBESTIR ◦ P: PAUSAR"/);
  assert.match(i18n, /controls: "WASD OR ARROW KEYS: MOVE ◦ SPACEBAR: JUMP ◦ X: DASH ◦ P: PAUSE"/);
  assert.match(i18n, /interact: "E: INTERACTUAR"/);
  assert.match(i18n, /interact: "E: INTERACT"/);
});


test("browser tab title and campaign operation header are standardized", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const typography = await readFile(new URL("../src/styles/typography.css", import.meta.url), "utf8");

  assert.match(html, /<title>Indie pixel art 8-bits<\/title>/);
  assert.match(main, /stateLabel\.textContent = explorationMode \? ui\("inProgress"\) : "";/);
  assert.match(typography, /\.game-panel \.panel-head,[\s\S]*?font-family: var\(--font-display\)/);
  assert.match(css, /\.game-panel \.panel-head\s*\{[^}]*min-height:\s*44px;[^}]*padding-block:\s*2px;/s);
});


test("canvas gameplay overlays no longer draw framed message panels or full-width HUD bands", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const hunting = await readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8");
  const ambush = await readFile(new URL("../src/minigames/Ambush.js", import.meta.url), "utf8");

  assert.ok(!main.includes("ctx.fillRect(260,464,440,46)"));
  assert.ok(!main.includes("ctx.strokeRect(260,464,440,46)"));
  assert.ok(!main.includes("ctx.fillRect(294, 22, 372, 30)"));
  assert.ok(!main.includes("ctx.strokeRect(294, 22, 372, 30)"));
  assert.ok(!main.includes("ctx.fillRect(110, GAME.height - 58, GAME.width - 220, 34)"));
  assert.ok(!main.includes("ctx.strokeRect(110, GAME.height - 58, GAME.width - 220, 34)"));
  assert.ok(!main.includes('ctx.fillRect(x-14,y-42,w+28,86)'));
  assert.ok(!main.includes('ctx.strokeRect(x-14,y-42,w+28,86)'));
  assert.ok(!main.includes("ctx.fillRect(215,185,530,90)"));
  assert.ok(!main.includes("ctx.strokeRect(215,185,530,90)"));
  assert.ok(!hunting.includes("ctx.fillRect(0, 0, WIDTH, 54)"));
  assert.ok(!ambush.includes("ctx.fillRect(0, 0, WIDTH, 58)"));
});

test("ambient modes style the navbar and the full campaign status strip", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const ambientRules = css.slice(css.lastIndexOf("/* The environmental selector controls"));

  assert.ok(ambientRules.includes("html.site-mode-beige .topbar"));
  assert.ok(ambientRules.includes("html.site-mode-gray .nav-menu"));
  assert.ok(ambientRules.includes("html.site-mode-beige .game-panel > .panel-head"));
  assert.ok(ambientRules.includes("html.site-mode-gray .game-panel > .panel-head .panel-health-fill"));
  assert.ok(ambientRules.includes("background: var(--site-surface-raised)"));
  assert.ok(ambientRules.includes("background: var(--site-accent)"));
});

test("campaign metrics and mission context share the available header width", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const layoutRules = css.slice(css.lastIndexOf("/* Rebalance the campaign strip"));

  assert.ok(layoutRules.includes("grid-template-columns: minmax(0, 1.08fr) minmax(0, 1.32fr) minmax(112px, .48fr)"));
  assert.ok(layoutRules.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"));
  assert.ok(layoutRules.includes("#secondary-objectives"));
  assert.ok(layoutRules.includes("grid-column: 1 / -1"));
  assert.ok(layoutRules.includes("#game-state:empty"));
});


test("campaign header stays in one line and selected character health remains visible and green", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const hunting = await readFile(new URL("../src/minigames/Hunting.js", import.meta.url), "utf8");
  const ambush = await readFile(new URL("../src/minigames/Ambush.js", import.meta.url), "utf8");

  assert.ok(html.includes('id="player-health-damage"'));
  assert.ok(main.includes("displayedPlayerHealthRatio !== null && ratio < displayedPlayerHealthRatio"));
  assert.ok(main.includes('playerHealthDamage.classList.add("is-fading")'));
  assert.ok(css.includes("grid-template-rows: minmax(30px, auto)"));
  assert.ok(css.includes("@keyframes player-health-damage-fade"));
  assert.ok(css.includes("background: #4cdb70 !important"));
  assert.ok(hunting.includes('i < this.player.health ? "#4cdb70"'));
  assert.ok(ambush.includes('i < this.player.health ? "#4cdb70"'));
  assert.ok(main.includes('ctx.fillStyle="#4cdb70";ctx.fillRect(x,y,w*(activeBoss.health/activeBoss.maxHealth),10)'));
});


test("story, pause, retry and pre-game briefing surfaces respond to both ambient themes", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const themeRules = css.slice(css.lastIndexOf("/* Environmental palettes extend"));

  for (const mode of ["beige", "gray"]) {
    assert.ok(themeRules.includes(`html.site-mode-${mode} .story-panel`));
    assert.ok(themeRules.includes(`html.site-mode-${mode} .pause-confirmation-card`));
    assert.ok(themeRules.includes(`html.site-mode-${mode} .pause-menu h2`));
    assert.ok(themeRules.includes(`html.site-mode-${mode} .gameplay-brief-card`));
    assert.ok(themeRules.includes(`html.site-mode-${mode} .tutorial-card`));
    assert.ok(themeRules.includes(`html.site-mode-${mode} .retry-options`));
  }
  assert.ok(themeRules.includes("background: var(--site-surface-raised)"));
  assert.ok(themeRules.includes("color: var(--site-accent-contrast)"));
});

test("Time Attack and Ambush reuse the Empty Stomach pre-game intro layout; Free Roam uses its shared briefing card", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const sharedIntro = css.slice(css.lastIndexOf("/* === Shared minigame intro"));

  for (const selector of [".persecution-intro", ".hunting-intro", ".ambush-intro"]) {
    assert.ok(sharedIntro.includes(selector));
  }
  assert.ok(sharedIntro.includes(".hunting-panel:not(.playing) .hunting-top"));
  assert.ok(sharedIntro.includes(".ambush-panel:not(.playing) .ambush-top"));
  assert.ok(sharedIntro.includes(".gameplay-brief-card"));
  assert.ok(sharedIntro.includes(".gameplay-brief-continue"));
});
