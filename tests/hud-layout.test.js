import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("zone and Stegoceratops cooldown are not rendered inside the game canvas", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.doesNotMatch(main, /fillText\(tr\(level\(\)\.name\)/);
  assert.doesNotMatch(main, /fillText\("STEGOCERATOPS \[C\]/);
  assert.match(main, /updateStegoceratopsHud\(\)/);
});

test("the Stegoceratops cooldown is part of the operation footer", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const hudStart = html.indexOf('<div class="hud-strip"');
  const hudEnd = html.indexOf("</div>", html.indexOf('id="hud-controls"'));
  assert.ok(hudStart >= 0);
  assert.match(html.slice(hudStart), /id="stegoceratops-status"/);
  assert.ok(html.indexOf('<div class="hud-strip"') > html.indexOf('<div class="canvas-wrap">'));
});

test("operation footer and hamburger menu use flat, shadow-free styling", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const flatRules = css.slice(css.lastIndexOf("/* Flat, readable operation footer"));
  assert.match(flatRules, /\.hud-strip\s*\{[^}]*box-shadow:none/s);
  assert.match(flatRules, /\.menu-toggle,[\s\S]*?\.nav-menu,[\s\S]*?\{\s*box-shadow:none/s);
  assert.match(flatRules, /grid-template-rows:auto minmax\(0,1fr\) auto/);
});
