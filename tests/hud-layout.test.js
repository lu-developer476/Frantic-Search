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
  assert.match(main, /stateLabel\.textContent = freeRoamMode \? ui\("inProgress"\) : "";/);
  assert.match(typography, /\.game-panel \.panel-head,[\s\S]*?font-family: var\(--font-display\)/);
  assert.match(css, /\.game-panel \.panel-head\s*\{[^}]*min-height:\s*44px;[^}]*padding-block:\s*2px;/s);
});
