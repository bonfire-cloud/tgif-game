import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  renderChipLoop,
  renderChipEffect,
  CHIP_RATE,
  CHIP_BPM,
  CHIP_BARS,
} from "../src/client/chip-synth.js";
import { ARCADE_PALETTE, arcadeColour } from "../src/client/retro.js";
import { STATIONS, AVATAR_COLORS } from "../src/shared/game.js";
function stats(pcm: Float32Array) {
  let peak = 0,
    sum = 0,
    energy = 0;
  for (const v of pcm) {
    assert.ok(Number.isFinite(v));
    peak = Math.max(peak, Math.abs(v));
    sum += v;
    energy += v * v;
  }
  return { peak, mean: sum / pcm.length, rms: Math.sqrt(energy / pcm.length) };
}
test("chip score is non-silent, has headroom and an exact zero loop boundary", () => {
  const pcm = renderChipLoop(),
    s = stats(pcm);
  assert.equal(
    pcm.length,
    Math.round(((CHIP_BARS * 4 * 60) / CHIP_BPM) * CHIP_RATE),
  );
  assert.ok(s.peak < 0.9 && s.peak > 0.2);
  assert.ok(s.rms > 0.04);
  assert.ok(Math.abs(s.mean) < 0.025);
  assert.equal(pcm[0], 0);
  assert.equal(pcm.at(-1), 0);
  assert.ok(new Set(pcm).size <= 255);
});
test("the original chip loop is reproducible", () => {
  const hash = (pcm: Float32Array) =>
    createHash("sha256").update(new Uint8Array(pcm.buffer)).digest("hex");
  assert.equal(hash(renderChipLoop()), hash(renderChipLoop()));
});
test("chip game effects are distinct finite signals with safe headroom", () => {
  const hashes = new Set<string>();
  for (const kind of ["stamp", "ship", "throw", "meeting", "retro"]) {
    const pcm = renderChipEffect(kind),
      s = stats(pcm);
    assert.ok(s.peak < 0.9 && s.rms > 0.03);
    assert.equal(pcm[0], 0);
    assert.equal(pcm.at(-1), 0);
    hashes.add(
      createHash("sha256").update(new Uint8Array(pcm.buffer)).digest("hex"),
    );
  }
  assert.equal(hashes.size, 5);
});
test("station and player identities use the fixed sixteen-colour palette", () => {
  assert.equal(ARCADE_PALETTE.length, 16);
  assert.equal(new Set(AVATAR_COLORS).size, 8);
  for (const color of [...STATIONS.map((s) => s.color), ...AVATAR_COLORS])
    assert.equal(arcadeColour(color), color);
});
