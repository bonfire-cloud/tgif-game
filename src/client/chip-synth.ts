/** Original four-voice-style cartridge score. No samples or external audio assets. */
export const CHIP_RATE = 22050;
export const CHIP_BPM = 132;
export const CHIP_BARS = 8;
const LEAD = [
  [74, 78, 81, 0, 78, 76, 74, 0],
  [71, 74, 78, 0, 81, 78, 74, 71],
  [67, 71, 74, 0, 78, 74, 71, 67],
  [69, 73, 76, 0, 81, 76, 73, 0],
  [74, 78, 81, 86, 81, 78, 76, 74],
  [71, 74, 78, 81, 78, 74, 71, 0],
  [67, 71, 74, 78, 76, 74, 71, 67],
  [69, 73, 76, 81, 78, 76, 73, 0],
];
const CHORDS = [
  [62, 66, 69],
  [59, 62, 66],
  [55, 59, 62],
  [57, 61, 64],
];
const ROOTS = [38, 35, 31, 33];
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const pulse = (phase: number, duty: number) =>
  (phase % 1 < duty ? 1 : -1) - (duty * 2 - 1);
const triangle = (phase: number) =>
  Math.round((2 - 4 * Math.abs((phase % 1) - 0.5)) * 7.5) / 7.5 - 1;
function envelope(t: number, duration: number) {
  return (
    Math.max(0, Math.min(1, t / 0.002, (duration - t) / 0.012)) *
    (0.5 + 0.5 * Math.exp(-t * 14))
  );
}
function quantize(samples: Float32Array) {
  for (let i = 0; i < samples.length; i++)
    samples[i] =
      Math.round(Math.max(-0.95, Math.min(0.95, samples[i])) * 127) / 127;
  return samples;
}
export function renderChipLoop(rate = CHIP_RATE) {
  const step = 60 / CHIP_BPM / 4,
    total = CHIP_BARS * 16 * step,
    out = new Float32Array(Math.round(total * rate));
  let noise = 0x5a5a;
  for (let s = 0; s < CHIP_BARS * 16; s++) {
    const bar = Math.floor(s / 16),
      local = s % 16,
      chord = CHORDS[bar % 4],
      root = ROOTS[bar % 4],
      lead = LEAD[bar][Math.floor(local / 2)];
    const from = Math.round(s * step * rate),
      to = Math.min(out.length, Math.round((s + 1) * step * rate));
    for (let i = from; i < to; i++) {
      const t = i / rate - s * step,
        leadT = (local % 2) * step + t,
        leadDuration = step * 1.75;
      // Pulse 1: a bright original hook. Pulse 2: short 25% duty arpeggios.
      let sample =
        lead && leadT < leadDuration
          ? pulse(leadT * hz(lead), 0.125) *
            envelope(leadT, leadDuration) *
            0.19
          : 0;
      const arp = chord[[0, 2, 1, 2][local % 4]] + 12;
      sample += pulse(t * hz(arp), 0.25) * envelope(t, step * 0.83) * 0.065;
      // A quantized triangle bass, with the short notes of an old cartridge soundtrack.
      const bassT = (local % 2) * step + t,
        bassNote = root + [0, 0, 12, 7, 0, 12, 7, 12][Math.floor(local / 2)];
      if (bassT < step * 1.7)
        sample +=
          triangle(bassT * hz(bassNote)) * envelope(bassT, step * 1.7) * 0.2;
      // One 15-bit shift-register noise voice handles hats, kick ticks and snares.
      const snare = local === 4 || local === 12,
        downbeat = local % 8 === 0;
      const duration = snare ? 0.095 : downbeat ? 0.055 : 0.022;
      if (t < duration) {
        const divider = snare ? 3 : downbeat ? 20 : 2;
        if (i % divider === 0) {
          const bit = (noise ^ (noise >> 1)) & 1;
          noise = (noise >> 1) | (bit << 14);
        }
        sample +=
          (noise & 1 ? 1 : -1) *
          Math.exp(-t / (snare ? 0.025 : downbeat ? 0.015 : 0.006)) *
          (snare ? 0.1 : downbeat ? 0.08 : 0.035) *
          Math.min(1, t / 0.001);
      }
      out[i] = sample;
    }
  }
  // Exact zero at the loop boundary avoids a click without a musical fade-out.
  out[0] = 0;
  out[out.length - 1] = 0;
  return quantize(out);
}
export function renderChipEffect(kind: string, rate = CHIP_RATE) {
  const notes =
    kind === "retro"
      ? [74, 78, 81, 86, 81, 86]
      : kind === "ship"
        ? [74, 78, 81, 86, 90]
        : kind === "meeting"
          ? [69, 65, 62, 57]
          : [84, 91];
  const beat = kind === "retro" ? 0.1 : kind === "stamp" ? 0.055 : 0.07;
  const duration = kind === "throw" ? 0.22 : notes.length * beat + 0.035,
    out = new Float32Array(Math.ceil(duration * rate));
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    if (kind === "throw") {
      const phase = 110 * t + (880 / 12) * (1 - Math.exp(-12 * t));
      out[i] =
        pulse(phase, 0.25) * Math.exp(-t * 15) * Math.min(1, t / 0.002) * 0.4;
    } else {
      const n = Math.floor(t / beat);
      if (n < notes.length) {
        const local = t - n * beat;
        out[i] =
          pulse(local * hz(notes[n]), kind === "meeting" ? 0.5 : 0.25) *
          envelope(local, beat * 0.94) *
          0.36;
      }
    }
  }
  out[0] = 0;
  out[out.length - 1] = 0;
  return quantize(out);
}
