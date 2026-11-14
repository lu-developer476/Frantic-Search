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

test("the canvas stage keeps its native 16:9 drawing ratio and fills its container", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Full-width gameplay stage"));
  assert.match(rules, /\.canvas-wrap\s*\{[^}]*aspect-ratio:16 \/ 9/s);
  assert.match(rules, /\.canvas-wrap canvas#game\s*\{[^}]*width:100%[^}]*height:100%[^}]*object-fit:fill/s);
  assert.match(rules, /\.layout\s*\{[^}]*max-width:none/s);
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
  assert.match(html, /class="menu-icon"/);
  assert.match(css, /\.menu-toggle\.open \.menu-icon path/);
});
