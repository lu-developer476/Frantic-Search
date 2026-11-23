import test from "node:test";
import assert from "node:assert/strict";
import { EnvironmentalEffectsRenderer } from "../src/rendering/EnvironmentalEffectsRenderer.js";

function context() {
  const fills = [];
  return { fills, save() {}, restore() {}, globalAlpha: 1, fillStyle: "", fillRect(...args) { fills.push(args); } };
}

test("effects only render gameplay feedback: dash dust and particles", () => {
  const renderer = new EnvironmentalEffectsRenderer();
  assert.equal(typeof renderer.drawWind, "undefined");
  assert.equal(typeof renderer.drawWeather, "undefined");
  assert.equal(typeof renderer.drawAmbientBack, "undefined");
  const target = context();
  renderer.drawDust(target, { dustClouds: [] });
  renderer.drawParticles(target, { particles: [] });
  assert.equal(target.fills.length, 0);
  renderer.drawParticles(target, { particles: [{ x: 10.4, y: 20.6, size: 2, color: "#fff", life: 1, max: 2 }, { x: 1, y: 1, size: 2, color: "#fff", life: 0, max: 2 }] });
  assert.deepEqual(target.fills, [[10, 21, 2, 2]]);
  renderer.drawDust(target, { dustClouds: [{ x: 0, y: 0, w: 40, h: 20, life: 1, max: 2 }] });
  assert.ok(target.fills.length > 1);
});
