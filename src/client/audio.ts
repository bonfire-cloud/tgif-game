import { CHIP_RATE, renderChipLoop, renderChipEffect } from "./chip-synth.js";
class ChipAudio {
  private context: AudioContext | null = null;
  private music: AudioBufferSourceNode | null = null;
  private activeEffects = new Set<AudioBufferSourceNode>();
  private buffers = new Map<string, AudioBuffer>();
  private buffer(key: string, samples: () => Float32Array) {
    if (this.buffers.has(key)) return this.buffers.get(key)!;
    const pcm = samples(),
      buffer = this.context!.createBuffer(1, pcm.length, CHIP_RATE);
    buffer.getChannelData(0).set(pcm);
    this.buffers.set(key, buffer);
    return buffer;
  }
  async setEnabled(enabled: boolean) {
    if (!enabled) {
      for (const source of this.activeEffects) source.stop();
      this.activeEffects.clear();
      if (this.context?.state === "running") await this.context.suspend();
      return;
    }
    this.context ??= new AudioContext();
    await this.context.resume();
    if (!this.music) {
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = this.buffer("score", renderChipLoop);
      source.loop = true;
      gain.gain.value = 0.23;
      source.connect(gain);
      gain.connect(this.context.destination);
      source.start();
      this.music = source;
    }
  }
  effect(kind: string) {
    if (!this.context || this.context.state !== "running") return;
    while (this.activeEffects.size >= 2) {
      const oldest = this.activeEffects.values().next().value!;
      oldest.stop();
      this.activeEffects.delete(oldest);
    }
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = this.buffer(kind, () => renderChipEffect(kind));
    gain.gain.value = 0.65;
    source.connect(gain);
    gain.connect(this.context.destination);
    this.activeEffects.add(source);
    source.onended = () => {
      this.activeEffects.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
}
export const chipAudio = new ChipAudio();
