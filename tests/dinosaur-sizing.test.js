import test from "node:test";
import assert from "node:assert/strict";
import {
  DINOSAUR_SIZE_PROFILES,
  SIZE_CLASSES,
  classifyDetailTier,
  classifySizeClass,
  getContainmentCageSize,
  listDinosaurSizes,
  resolveDinosaurSize
} from "../src/config/DinosaurSizing.js";
import { Player } from "../src/entities/Player.js";
import { Beta } from "../src/entities/Beta.js";
import { WildDinosaur } from "../src/entities/WildDinosaur.js";
import { FerrucutusCaptive } from "../src/entities/FerrucutusCaptive.js";
import { IndominusRexBoss } from "../src/entities/IndominusRexBoss.js";
import { Brontosaurus } from "../src/entities/LigocristusPrey.js";

test("size classes are ordered and their render bands never overlap", () => {
  for (let i = 1; i < SIZE_CLASSES.length; i += 1) {
    assert.ok(SIZE_CLASSES[i].minWidth > SIZE_CLASSES[i - 1].maxWidth, SIZE_CLASSES[i].id);
    assert.ok(SIZE_CLASSES[i].maxMeters > SIZE_CLASSES[i - 1].maxMeters);
  }
});

test("a longer species is never drawn smaller than a species of a smaller class", () => {
  const sizes = listDinosaurSizes();
  for (const a of sizes) {
    for (const b of sizes) {
      if (a.sizeRank < b.sizeRank) assert.ok(a.renderWidth < b.renderWidth, `${a.key} < ${b.key}`);
    }
  }
});

test("inside one class, detailed artwork is drawn larger than low-detail artwork", () => {
  const base = { width: 100, height: 100 };
  assert.equal(classifyDetailTier({ ...base, width: 172, height: 100 }).id, "low");
  assert.equal(classifyDetailTier({ width: 544, height: 352 }).id, "standard");
  assert.equal(classifyDetailTier({ width: 1376, height: 768 }).id, "high");
  assert.equal(classifyDetailTier({ width: 420, height: 336, detailTier: "high" }).id, "high");
  // large canvas with almost no image data is flat art, not detailed art
  assert.equal(classifyDetailTier({ width: 990, height: 650, bytes: 7168 }).id, "standard");
  const small = SIZE_CLASSES.find((c) => c.id === "small");
  assert.equal(classifySizeClass(3).id, small.id);
});

test("every profile resolves to a render width inside its own class band", () => {
  for (const key of Object.keys(DINOSAUR_SIZE_PROFILES)) {
    const size = resolveDinosaurSize(key);
    const band = SIZE_CLASSES.find((c) => c.id === size.sizeClass);
    const multiplier = DINOSAUR_SIZE_PROFILES[key].sizeMultiplier ?? 1;
    const classifiedWidth = size.renderWidth / multiplier;
    assert.ok(classifiedWidth >= band.minWidth && classifiedWidth <= band.maxWidth, key);
  }
});

test("Gala is reduced by 30 percent and remains between Brisa and Basilio", () => {
  assert.equal(DINOSAUR_SIZE_PROFILES.gala.sizeMultiplier, 0.7);
  const width = (key) => resolveDinosaurSize(key).renderWidth;
  assert.ok(width("brisa") < width("gala"));
  assert.ok(width("gala") < width("basilio"));
});

test("the real-world hierarchy holds: Brisa < Gala < Indoraptor < Basilio < Indominus < Brontosaurus", () => {
  const w = (k) => resolveDinosaurSize(k).renderWidth;
  assert.ok(w("brisa") < w("gala"));
  assert.ok(w("gala") < w("indoraptor"));
  assert.ok(w("indoraptor") < w("basilio"));
  assert.ok(w("ferrucutus") < w("basilio"));
  assert.ok(w("basilio") < w("indominus"));
  assert.ok(w("indominus") < w("brontosaurus"));
  assert.ok(w("venatosaurusImpavidus") < w("venatosaurusSaevidicus"));
});

test("entities take their hitbox from the classification", () => {
  assert.equal(new Player("blue", 0, 430).w, resolveDinosaurSize("gala").width);
  assert.equal(new Player("vasti", 0, 430).h, resolveDinosaurSize("basilio").height);
  assert.equal(new Beta({ x: 0, groundY: 430 }).w, resolveDinosaurSize("brisa").width);
  assert.equal(new Brontosaurus({ id: "b", x: 0, groundY: 430, patrolStart: 0, patrolEnd: 900 }).w, 300);
  const impavidus = new WildDinosaur({ id: "v1", kind: "venatosaurus-impavidus", x: 0, groundY: 430, patrolStart: 0, patrolEnd: 400 });
  const saevidicus = new WildDinosaur({ id: "v2", kind: "venatosaurus-saevidicus", x: 0, groundY: 430, patrolStart: 0, patrolEnd: 400 });
  assert.ok(impavidus.w < saevidicus.w);
  assert.equal(new IndominusRexBoss({ id: "i", x: 0, groundY: 430 }).w, resolveDinosaurSize("indominus").width);
});

test("the playable Vastatosaurus stays fair: bigger than Gala but with a capped hitbox", () => {
  const gala = new Player("blue", 0, 430);
  const basilio = new Player("vasti", 0, 430);
  assert.ok(basilio.w > gala.w);
  assert.ok(basilio.w <= 112 && basilio.h <= 100);
});

test("a caged Ferrucutus always fits inside its cage", () => {
  const cage = getContainmentCageSize("ferrucutus");
  const captive = new FerrucutusCaptive({ id: "c", x: 100, groundY: 430 });
  const size = resolveDinosaurSize("ferrucutus");
  assert.equal(captive.w, cage.w);
  assert.ok(cage.w >= size.renderWidth + 24);
  assert.ok(cage.h >= size.renderHeight + 24);
  assert.ok(captive.dinosaurX >= captive.x && captive.dinosaurX + captive.dinosaurW <= captive.x + captive.w);
});
