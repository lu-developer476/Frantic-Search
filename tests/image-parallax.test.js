import test from "node:test";
import assert from "node:assert/strict";
import { ImageParallax, PARALLAX_LAYERS, processLayerImage } from "../src/rendering/ImageParallax.js";

function fakeImages() {
  const images = [];
  const createImage = () => {
    const image = { naturalWidth: 297, naturalHeight: 60, width: 297, height: 60 };
    images.push(image);
    return image;
  };
  return { images, createImage };
}

function fakeContext() {
  const draws = [];
  return {
    draws,
    save() {},
    restore() {},
    drawImage: (...args) => draws.push(args)
  };
}

test("each campaign and minigame environment with real art has parallax layers", () => {
  for (const name of ["coastal", "redwood", "forest", "prairie", "extraction", "black-site", "containment", "rosa-containment"]) {
    assert.ok(PARALLAX_LAYERS[name]?.length > 0, name);
  }
});

test("draw returns false until every layer image has loaded", () => {
  const { images, createImage } = fakeImages();
  const parallax = new ImageParallax({ baseUrl: "/", createImage, createCanvas: () => null });
  const context = fakeContext();
  assert.equal(parallax.draw(context, { environment: "prairie" }), false);
  assert.equal(context.draws.length, 0);
  for (const image of images) image.onload();
  assert.equal(parallax.draw(context, { environment: "prairie", viewportWidth: 960 }), true);
  assert.ok(context.draws.length > 0);
});

test("failed images are not drawn", () => {
  const { images, createImage } = fakeImages();
  const parallax = new ImageParallax({ createImage, createCanvas: () => null });
  parallax.preload("prairie");
  for (const image of images) image.onerror();
  assert.equal(parallax.draw(fakeContext(), { environment: "prairie" }), false);
});

test("unknown environments are not handled", () => {
  const parallax = new ImageParallax({ createImage: () => null });
  assert.equal(parallax.hasEnvironment("unknown"), false);
  assert.equal(parallax.draw(fakeContext(), { environment: "unknown" }), false);
});

test("layers tile across the viewport and scroll slower than the camera", () => {
  const { images, createImage } = fakeImages();
  const parallax = new ImageParallax({ createImage, createCanvas: () => null });
  parallax.preload("prairie");
  for (const image of images) image.onload();
  const context = fakeContext();
  parallax.draw(context, { environment: "prairie", cameraX: 1000, viewportWidth: 960 });
  const first = context.draws.filter(([, , y]) => y === context.draws[0][2]);
  assert.ok(first.length >= 2);
  const covered = first.reduce((max, [, x, , w]) => Math.max(max, x + w), 0);
  assert.ok(covered >= 960);
  const [, x0] = first[0];
  assert.ok(x0 <= 0 && x0 > -891 * 2);
});

test("color key makes the background transparent and tint is applied", () => {
  const pixels = new Uint8ClampedArray([111, 109, 81, 255, 10, 20, 30, 255]);
  const calls = [];
  const context = {
    imageSmoothingEnabled: true,
    drawImage: () => calls.push("drawImage"),
    getImageData: () => ({ data: pixels }),
    putImageData: () => calls.push("putImageData"),
    fillRect: () => calls.push("fillRect"),
    set globalCompositeOperation(value) { calls.push(value); }
  };
  const canvas = { getContext: () => context };
  const result = processLayerImage(
    { naturalWidth: 2, naturalHeight: 1 },
    { key: [111, 109, 81], tint: ["#f0a66f", 0.3] },
    () => canvas
  );
  assert.equal(result, canvas);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[7], 255);
  assert.ok(calls.includes("fillRect"));
});


test("the forest minigame parallax preserves the original map colors", () => {
  const layers = PARALLAX_LAYERS.forest;
  assert.deepEqual(layers.map(layer => layer.src), [
    "environment/maps/forest/Back.png",
    "environment/maps/forest/middle.png",
    "environment/maps/forest/front.png"
  ]);
  for (const layer of layers) {
    assert.equal(layer.tint, undefined, layer.src);
    assert.equal(layer.key, undefined, layer.src);
  }
});
