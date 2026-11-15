import test from "node:test";
import assert from "node:assert/strict";
import { t } from "../src/i18n.js";

test("Spanish Latin American menu labels are localized", () => {
  assert.equal(t("timeAttack", "es"), "HORA DE ATACAR");
  assert.equal(t("survival", "es"), "SUPERVIVENCIA");
});

test("English menu labels remain unchanged", () => {
  assert.equal(t("timeAttack", "en"), "TIME ATTACK");
  assert.equal(t("survival", "en"), "SURVIVAL");
});
