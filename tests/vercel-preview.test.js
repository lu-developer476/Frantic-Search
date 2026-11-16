import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Vercel Preview deployments retain the homepage on browsers without a fine pointer", async () => {
  const [html, main, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/main.css", import.meta.url), "utf8")
  ]);

  assert.ok(html.includes(String.raw`const isVercelPreview = /^franticsearch-[a-z0-9]{6,12}-.+\.vercel\.app$/.test(hostname);`));
  assert.ok(html.includes('document.documentElement.classList.add("vercel-preview")'));
  assert.ok(main.includes('const isVercelPreview = document.documentElement.classList.contains("vercel-preview");'));
  assert.ok(main.includes("return isVercelPreview || nativeDesktopPlayback.matches;"));
  assert.ok(css.includes("html.vercel-preview .game-panel {"));
  assert.ok(css.includes("html.vercel-preview .desktop-only-notice,"));
  assert.ok(css.includes("html.vercel-preview .hud-strip {"));
});
