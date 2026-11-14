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
