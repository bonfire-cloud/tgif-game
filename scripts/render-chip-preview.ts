import { writeFileSync, mkdirSync } from "node:fs";
import { CHIP_RATE, renderChipLoop } from "../src/client/chip-synth.js";
const pcm = renderChipLoop(),
  buffer = Buffer.alloc(44 + pcm.length * 2);
buffer.write("RIFF");
buffer.writeUInt32LE(buffer.length - 8, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(CHIP_RATE, 24);
buffer.writeUInt32LE(CHIP_RATE * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(pcm.length * 2, 40);
for (let i = 0; i < pcm.length; i++)
  buffer.writeInt16LE(Math.round(pcm[i] * 32767), 44 + i * 2);
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/8bit-score.wav", buffer);
console.log({
  file: "artifacts/8bit-score.wav",
  seconds: pcm.length / CHIP_RATE,
  peak: pcm.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
});
