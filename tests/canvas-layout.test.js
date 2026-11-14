import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the mission brief is placed above the canvas while the status HUD stays below", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const canvasStart = html.indexOf('<div class="canvas-wrap">');
  const bannerStart = html.indexOf('<section class="mission-banner"');
  const hudStart = html.indexOf('<div class="hud-strip"');
  const panelEnd = html.indexOf("\\n        </section>", hudStart);

  assert.ok(canvasStart >= 0);
  assert.ok(bannerStart > canvasStart);
  assert.ok(hudStart > bannerStart);
  assert.ok(panelEnd > hudStart);
  const banner = html.slice(bannerStart, html.indexOf("</section>", bannerStart));
  const hud = html.slice(hudStart, panelEnd);

  assert.match(banner, /data-i18n="missionBrief"/);
  assert.match(banner, /id="campaign-chapter"/);
  assert.match(banner, /id="campaign-objective"/);
  assert.doesNotMatch(hud, /campaign-chapter|campaign-objective/);
  assert.match(hud, /id="ability-status"/);
  assert.match(hud, /id="stegoceratops-status"/);
  assert.match(hud, /id="interaction-hint"/);
  assert.equal(html.split('id="campaign-chapter"').length - 1, 1);
  assert.equal(html.split('id="campaign-objective"').length - 1, 1);
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


test("the upper mission brief is styled as a compact upper-right canvas overlay", async () => {
  const css = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const rules = css.slice(css.lastIndexOf("/* Full-width gameplay stage"));
  assert.match(rules, /\.canvas-wrap \.mission-banner\s*\{[^}]*position:absolute[^}]*top:[^}]*right:[^}]*width:24%/s);
  assert.match(rules, /\.canvas-wrap \.mission-banner strong\s*\{/);
  assert.match(rules, /\.canvas-wrap \.hud-strip\s*\{[^}]*inset:auto 0 0/s);
});
