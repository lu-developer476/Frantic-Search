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
  assert.match(header, /data-i18n="missionBrief"/);
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
