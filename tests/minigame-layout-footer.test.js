import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("all minigame intros share the Empty Stomach presentation without losing their own copy", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  for (const id of ["persecution-panel", "hunting-panel", "ambush-panel"]) {
    assert.ok(html.includes(`id="${id}" class="${id.replace("-panel", "")}-panel game-mode-panel`) ||
      html.includes(`id="${id}" class="${id === "persecution-panel" ? "persecution-panel" : id} game-mode-panel`));
  }
  for (const stage of ["persecution-stage", "hunting-stage", "ambush-stage"]) {
    assert.ok(html.includes(`class="${stage} game-mode-stage"`));
  }
  for (const intro of ["persecution-intro", "hunting-intro", "ambush-intro"]) {
    assert.ok(html.includes(`class="${intro} game-mode-intro"`));
  }

  assert.ok(html.includes("data-ta-title>HUNTING</h2>"));
  assert.ok(html.includes("data-ta-subtitle>"));
  assert.ok(html.includes('class="hunting-instructions game-mode-instructions" data-ta-instructions'));
  assert.ok(html.includes("data-ambush-title>AMBUSH</h2>"));
  assert.ok(html.includes("data-ambush-subtitle>"));
  assert.ok(html.includes('class="ambush-instructions game-mode-instructions" data-ambush-instructions'));
  assert.ok(html.includes("data-empty-title>PERSECUSIÓN</h2>"));
  assert.ok(styles.includes(".game-mode-intro {"));
  assert.ok(styles.includes(".hunting-panel.active,"));
  assert.ok(styles.includes(".ambush-panel.active"));
  assert.ok(styles.includes(".hunting-panel.playing .hunting-top"));
  assert.ok(styles.includes(".ambush-panel.playing .ambush-top"));
});

test("Free Roam displays its localized title and controls in the shared full-screen intro", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");
  const start = main.indexOf("function showGameplayBrief(");
  const end = main.indexOf("function closeGameplayBrief", start);
  assert.ok(start >= 0 && end > start, "gameplay brief handler must exist");
  const handler = main.slice(start, end);

  const makeClassList = () => {
    const classes = new Set();
    return {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    };
  };
  const dialogClasses = makeClassList();
  const contextClasses = makeClassList();
  const context = { classList: contextClasses, textContent: "", hidden: true };
  const list = { hidden: false };
  const note = { hidden: false };
  const title = { textContent: "" };
  const dialog = { classList: dialogClasses };
  const continueButton = { focus() {} };

  runInNewContext(handler + String.fromCharCode(10) + 'showGameplayBrief("exploration");', {
    getTutorialLines: () => ["EXPLORACIÓN", "MOVE A / D", "JUMP WITH SPACE", "PAUSE WITH P"],
    pendingGameplayBriefAction: null,
    running: false,
    paused: false,
    gameplayBriefPausedGame: false,
    gameplayBriefTitle: title,
    gameplayBriefDialog: dialog,
    gameplayBriefContext: context,
    gameplayBriefList: list,
    gameplayBriefNote: note,
    gameplayBriefContinueButton: continueButton,
    populateInstructionList() {}
  });

  assert.equal(title.textContent, "EXPLORACIÓN");
  assert.equal(dialogClasses.contains("exploration-brief"), true);
  assert.equal(contextClasses.contains("game-mode-instructions"), true);
  assert.equal(context.textContent, "MOVE A / D · JUMP WITH SPACE · PAUSE WITH P");
  assert.equal(context.hidden, false);
  assert.equal(list.hidden, true);
  assert.equal(note.hidden, true);
  assert.ok(styles.includes(".gameplay-brief-dialog.exploration-brief"));
});

test("the copyright footer is part of the start screen and remains independent of menu navigation", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(html.includes('<footer class="start-screen-footer" role="contentinfo">© 2026 Todos los derechos reservados - Diseño y Programación por <a href="https://lu-dev-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer">Lucas Montenegro</a> ®</footer>'));
  assert.ok(html.indexOf('id="start-screen"') < html.indexOf('class="start-screen-footer"'));
  const footerStyles = styles.slice(styles.indexOf(".start-screen-footer {"));
  assert.ok(footerStyles.includes("position: absolute;"));
});
