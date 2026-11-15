import test from "node:test";
import assert from "node:assert/strict";
import { roundedRect } from "../src/rendering/CanvasUtils.js";

function createPathContext() {
  const commands = [];
  const context = {};
  for (const name of ["beginPath", "moveTo", "lineTo", "quadraticCurveTo", "closePath"]) {
    context[name] = (...args) => commands.push([name, ...args]);
  }
  return { context, commands };
}

test("roundedRect creates a closed rounded-rectangle path", () => {
  const { context, commands } = createPathContext();

  roundedRect(context, 10, 20, 100, 60, 12);

  assert.deepEqual(commands, [
    ["beginPath"],
    ["moveTo", 22, 20],
    ["lineTo", 98, 20],
    ["quadraticCurveTo", 110, 20, 110, 32],
    ["lineTo", 110, 68],
    ["quadraticCurveTo", 110, 80, 98, 80],
    ["lineTo", 22, 80],
    ["quadraticCurveTo", 10, 80, 10, 68],
    ["lineTo", 10, 32],
    ["quadraticCurveTo", 10, 20, 22, 20],
    ["closePath"]
  ]);
});

test("roundedRect clamps the radius to half the smaller side", () => {
  const { context, commands } = createPathContext();

  roundedRect(context, 0, 0, 8, 20, 50);

  assert.deepEqual(commands[1], ["moveTo", 4, 0]);
  assert.deepEqual(commands[2], ["lineTo", 4, 0]);
  assert.deepEqual(commands[3], ["quadraticCurveTo", 8, 0, 8, 4]);
});

test("roundedRect normalizes negative dimensions and invalid radius", () => {
  const { context, commands } = createPathContext();

  roundedRect(context, 20, 30, -10, -6, Number.NaN);

  assert.deepEqual(commands[1], ["moveTo", 10, 24]);
  assert.deepEqual(commands[2], ["lineTo", 10, 24]);
  assert.deepEqual(commands.at(-1), ["closePath"]);
});
