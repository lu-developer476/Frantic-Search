import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("operation HUD is integrated into the canvas wrapper", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const canvasStart = html.indexOf('<div class="canvas-wrap">');
  const hudStart = html.indexOf('<div class="hud-strip"');
  const hudAfterLastCanvasLayer = html.indexOf('</section>\n                    <div class="hud-strip"', canvasStart);
  assert.ok(canvasStart >= 0 && hudStart > canvasStart);
  assert.ok(hudAfterLastCanvasLayer > canvasStart && hudAfterLastCanvasLayer < hudStart);
  assert.equal(html.split('class="hud-strip"').length - 1, 1);
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
