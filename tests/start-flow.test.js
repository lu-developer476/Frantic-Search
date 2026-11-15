import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("the final play confirmation starts the game after the character picker closes", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const handlerStart = main.indexOf("function startFromDinoModal()");
  const handlerEnd = main.indexOf("\nfunction setMenuOpen", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "start handler must exist");

  const handler = main.slice(handlerStart, handlerEnd);
  const createClassList = (initiallyHidden) => {
    const classes = new Set(initiallyHidden ? ["hidden"] : []);
    return {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name)
    };
  };

  const dinoModal = { classList: createClassList(true) };
  const characterConfirmation = { classList: createClassList(false) };
  const desktopPlayback = { matches: true };
  let startCalls = 0;

  runInNewContext(handler + "\nstartFromDinoModal();", {
    dinoModal,
    characterConfirmation,
    desktopPlayback,
    start: () => { startCalls += 1; }
  });

  assert.equal(startCalls, 1, "confirming JUGAR must invoke the game start routine");
  assert.equal(characterConfirmation.classList.contains("hidden"), true);
});


test("desktop startup accepts any available fine pointer on hybrid devices", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/main.css", import.meta.url), "utf8");

  assert.ok(
    main.includes('window.matchMedia("(min-width: 768px) and (any-pointer: fine)")'),
    "desktop access must detect any fine pointer, not only the primary pointer"
  );
  assert.ok(
    styles.includes("@media(max-width:767px),not all and (any-pointer:fine){"),
    "CSS must hide the game only when no fine pointer is available"
  );
});
