import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the mission brief shares the top panel bar with distance, rescues, record, health and game state", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const headerStart = html.indexOf('<div class="panel-head">');
  const canvasStart = html.indexOf('<div class="canvas-wrap">');
  const missionStart = html.indexOf('<section class="mission-brief-header"');
  const header = html.slice(headerStart, canvasStart);

  assert.ok(headerStart >= 0);
  assert.ok(missionStart > headerStart && missionStart < canvasStart);
  assert.match(header, /id="distance"/);
  assert.match(header, /id="rescues"/);
  assert.match(header, /id="best"/);
  assert.match(header, /id="player-health-meter"/);
  assert.match(header, /id="game-state"/);
  assert.doesNotMatch(header, /INFORME DE MISIÓN|MISSION BRIEF|missionBrief/);
  assert.match(header, /id="campaign-chapter"/);
  assert.match(header, /id="campaign-objective"/);
  assert.equal(html.split('id="campaign-chapter"').length - 1, 1);
  assert.equal(html.split('id="campaign-objective"').length - 1, 1);
  assert.doesNotMatch(html.slice(canvasStart), /mission-banner|campaign-chapter|campaign-objective/);
});

test("the full canvas scales into the available viewport without losing its 16:9 ratio", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Full-width gameplay stage"));
  assert.match(rules, /\.layout\s*\{[^}]*height:100%[^}]*min-height:0[^}]*overflow:hidden/s);
  assert.match(rules, /\.game-panel\s*\{[^}]*height:100%[^}]*grid-template-rows:auto minmax\(0,1fr\)/s);
  assert.match(rules, /\.canvas-wrap\s*\{[^}]*display:flex[^}]*height:100%[^}]*aspect-ratio:auto/s);
  assert.match(rules, /\.canvas-wrap canvas#game\s*\{[^}]*width:auto[^}]*height:100%[^}]*max-width:100%[^}]*max-height:100%[^}]*aspect-ratio:16 \/ 9[^}]*object-fit:contain/s);
});

test("no yellow strip remains at the bottom edge of the canvas", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Full-width gameplay stage"));
  assert.match(rules, /border-bottom:0 !important/);
  assert.match(rules, /\.canvas-wrap \.hud-strip,[\s\S]*?border-top:0 !important/);
});

test("hamburger close icon is rendered as a vector instead of transformed blurry bars", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  assert.match(html, /<svg class="menu-icon"/);
  assert.match(html, /<path class="menu-x"/);
  assert.match(css, /\.menu-toggle\.open \.menu-x\s*\{[^}]*display:block/s);
});

test("the mission brief is styled inside the top metrics bar, not over the canvas", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Mission title and objective"));
  assert.match(rules, /\.panel-head\s*\{[^}]*grid-template-columns:[^}]*minmax\(220px,1\.25fr\)/s);
  assert.match(rules, /\.panel-head \.mission-brief-header\s*\{[^}]*border-left:2px solid/s);
  assert.match(rules, /\.canvas-wrap \.mission-banner\{display:none !important\}/);
});


test("chapter and objective share one line and the mission kicker is removed", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const headerStart = html.indexOf('<div class="panel-head">');
  const canvasStart = html.indexOf('<div class="canvas-wrap">');
  const header = html.slice(headerStart, canvasStart);
  const rules = css.slice(css.lastIndexOf("/* Keep the live chapter and objective"));

  assert.doesNotMatch(header, /INFORME DE MISIÓN|MISSION BRIEF|mission-brief-kicker/);
  assert.match(header, /id="campaign-chapter"/);
  assert.match(header, /id="campaign-objective"/);
  assert.match(rules, /\.panel-head \.mission-brief-header\s*\{[^}]*display:flex[^}]*flex-wrap:nowrap[^}]*align-items:baseline/s);
  assert.match(rules, /\.panel-head \.mission-brief-header small,[\s\S]*?white-space:nowrap/s);
  assert.match(rules, /\.panel-head \.mission-brief-header strong\s*\{/);
});


test("mission kicker is absent and chapter plus objective are a single horizontal line", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const header = html.slice(html.indexOf('<div class="panel-head">'), html.indexOf('<div class="canvas-wrap">'));
  const rules = css.slice(css.lastIndexOf("/* Keep the mission name"));
  assert.doesNotMatch(header, /INFORME DE MISIÓN|MISSION BRIEF|mission-brief-kicker|aria-label="Informe de misión"/);
  assert.match(header, /id="campaign-chapter"/);
  assert.match(header, /id="campaign-objective"/);
  assert.match(rules, /\.panel-head \.mission-brief-header\s*\{[^}]*display:flex[^}]*flex-direction:row[^}]*flex-wrap:nowrap/s);
});

test("dash and Stegoceratops readiness labels share one horizontal HUD row", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const start = html.indexOf('<div class="hud-status-stack">');
  const end = html.indexOf("</div>", start);
  const stack = html.slice(start, end);
  const rules = css.slice(css.lastIndexOf("/* Dash and allied Stegoceratops"));
  assert.ok(stack.indexOf('id="ability-status"') < stack.indexOf('id="stegoceratops-status"'));
  assert.match(rules, /\.canvas-wrap \.hud-status-stack\s*\{[^}]*display:flex[^}]*flex-direction:row[^}]*flex-wrap:nowrap/s);
  assert.match(rules, /\.hud-status-stack \.ability-readout,[\s\S]*?white-space:nowrap/s);
  assert.match(rules, /\.hud-status-stack \.stegoceratops-readout\s*\{[^}]*white-space:nowrap/s);
});


test("the control legend is updated in Spanish and English", async () => {
  const i18n = await readFile(new URL("../src/i18n.js", import.meta.url), "utf8");
  assert.match(i18n, /controls: "WAD O FLECHAS: MOVER ◦ BARRA ESPACIADORA: SALTO ◦ X: EMBESTIDA ◦ E: INTERACCIÓN ◦ P: PAUSA"/);
  assert.match(i18n, /controls: "WASD OR ARROW KEYS: MOVE ◦ SPACEBAR: JUMP ◦ X: DASH ◦ E: INTERACT ◦ P: PAUSE"/);
  assert.doesNotMatch(i18n, /C STEGOCERATOPS/);
});

test("the bottom HUD strip uses compact vertical spacing to preserve canvas visibility", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Compact the lower control strip"));
  assert.match(rules, /\.canvas-wrap \.hud-strip>div\.hud-summary\s*\{[^}]*padding:clamp\(4px,\.42vw,6px\)/s);
  assert.match(rules, /\.canvas-wrap \.hud-summary \.hud-controls\s*\{[^}]*white-space:nowrap/s);
  assert.match(rules, /@media\(max-width:900px\)[\s\S]*?padding:5px 10px/);
  assert.match(rules, /@media\(max-height:720px\)[\s\S]*?padding:4px 10px/);
});


test("both operation bars have zero vertical padding and centered content", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Unified edge-safe typography"));
  assert.match(rules, /\.panel-head\s*\{[^}]*align-content:center[^}]*padding-block:0/s);
  assert.match(rules, /\.canvas-wrap \.hud-strip>div\.hud-summary\s*\{[^}]*align-content:center[^}]*padding-block:0/s);
  assert.match(rules, /@media\(max-width:900px\)[\s\S]*?padding-block:0/);
});

test("all top and bottom bar labels use one shared responsive font size and safe wrapping", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Unified edge-safe typography"));
  assert.match(rules, /--operation-hud-font-size:clamp\(9px,\.78vw,11px\)/);
  assert.match(rules, /\.panel-head \.panel-metric small,[\s\S]*?font-size:var\(--operation-hud-font-size\)/);
  assert.match(rules, /\.canvas-wrap \.hud-summary \.ability-readout,[\s\S]*?font-size:var\(--operation-hud-font-size\)/);
  assert.match(rules, /\.canvas-wrap \.hud-summary \.hud-controls\s*\{[^}]*overflow-wrap:anywhere/s);
  assert.match(rules, /\.canvas-wrap \.hud-summary \.interaction-readout\s*\{[^}]*overflow-wrap:anywhere/s);
});


test("reference health bars follow the visible head side for left- and right-facing actors", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../src/rendering/SpriteRenderer.js", import.meta.url), "utf8");
  assert.match(main, /const headOffset = facing > 0 \? 0\.82 : 0\.18/);
  assert.match(renderer, /vasti: \{ file: "vastatosaurus-rex\.png", sourceFacing: -1/);
});

test("character selection and narrator panels share readable, edge-safe typography", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Remove the mission accent"));
  assert.match(rules, /\.panel-head \.mission-brief-header\s*\{[^}]*padding-left:0[^}]*border-left:0/s);
  assert.match(rules, /\.dino-dialog \.character-number,[\s\S]*?font-size:var\(--operation-hud-font-size\)/);
  assert.match(rules, /\.story-kicker,[\s\S]*?font-size:var\(--operation-hud-font-size\)/);
  assert.match(rules, /\.story-text\s*\{[^}]*overflow-wrap:anywhere/s);
  assert.match(rules, /\.story-card\s*\{[^}]*max-height:100%[^}]*overflow-y:auto[^}]*padding:clamp/s);
  assert.match(rules, /\.dino-dialog \.character-card\s*\{[^}]*padding:clamp/s);
});
