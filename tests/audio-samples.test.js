import test from "node:test";
import assert from "node:assert/strict";
import { SampleBank } from "../src/audio/SampleBank.js";
import { AudioManager } from "../src/audio/AudioManager.js";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.js";

const fakeContext = () => {
  const started = [];
  return {
    started,
    currentTime: 0,
    destination: {},
    decodeAudioData: async (data) => {
      if (data.byteLength === 0) throw new Error("bad audio");
      return { id: data.byteLength };
    },
    createGain: () => ({ gain: { value: 1, setTargetAtTime() {} }, connect() {}, disconnect() {} }),
    createBufferSource: () => {
      const source = { connect() {}, disconnect() {}, stop() {}, start() { started.push(source); } };
      return source;
    }
  };
};

const okResponse = (bytes) => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(bytes) });
const missing = { ok: false };

test("SampleBank ignores missing and undecodable files", async () => {
  const bank = new SampleBank(
    { a: { files: ["/ok.ogg", "/missing.ogg", "/html.ogg"] } },
    async (url) => (url === "/ok.ogg" ? okResponse(8) : url === "/html.ogg" ? okResponse(0) : missing)
  );
  await bank.load(fakeContext());
  assert.equal(bank.has("a"), true);
  assert.equal(bank.buffers.get("a").length, 1);
});

test("SampleBank survives network errors", async () => {
  const bank = new SampleBank({ a: { files: ["/x.ogg"] } }, async () => { throw new Error("offline"); });
  await bank.load(fakeContext());
  assert.equal(bank.has("a"), false);
});

test("SampleBank.play returns null without sample and a source with one", async () => {
  const context = fakeContext();
  const bank = new SampleBank({ a: { files: ["/ok.ogg"], volume: 0.4 } }, async () => okResponse(4));
  assert.equal(bank.play(context, context.destination, "a"), null);
  await bank.load(context);
  const source = bank.play(context, context.destination, "a", { loop: true });
  assert.ok(source);
  assert.equal(source.loop, true);
  assert.equal(source.gainNode.gain.value, 0.4);
});

test("AudioManager falls back to synthesized tones when no samples are loaded", () => {
  const manager = new AudioManager(new SampleBank(SAMPLE_MANIFEST, async () => missing));
  let tones = 0;
  manager.context = fakeContext();
  manager.tone = () => { tones += 1; };
  manager.jump();
  manager.hit();
  assert.equal(tones, 2);
});

test("AudioManager plays the sample instead of the tone when available", async () => {
  const context = fakeContext();
  const manager = new AudioManager(new SampleBank(SAMPLE_MANIFEST, async () => okResponse(4)));
  manager.context = context;
  await manager.samples.load(context);
  let tones = 0;
  manager.tone = () => { tones += 1; };
  manager.bossWarning();
  assert.equal(tones, 0);
  assert.equal(context.started.length, 1);
});

test("setAmbient loops the chapter ambience and ignores themes without one", async () => {
  const context = fakeContext();
  const manager = new AudioManager(new SampleBank(SAMPLE_MANIFEST, async () => okResponse(4)));
  manager.context = context;
  await manager.samples.load(context);
  manager.setAmbient("forest");
  assert.equal(manager.ambientName, "ambient-forest");
  assert.equal(manager.ambientSource.loop, true);
  manager.setAmbient("boss");
  assert.equal(manager.ambientName, "ambient-forest");
});

test("sound toggle mutes ambience", async () => {
  const context = fakeContext();
  const manager = new AudioManager(new SampleBank(SAMPLE_MANIFEST, async () => okResponse(4)));
  manager.context = context;
  await manager.samples.load(context);
  manager.setAmbient("coastal");
  assert.equal(manager.ambientGainTarget(), 1);
  manager.enabled = false;
  assert.equal(manager.ambientGainTarget(), 0);
});
