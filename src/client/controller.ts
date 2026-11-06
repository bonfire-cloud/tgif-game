/** Standard browser gamepad layout, reduced to the controls used by this game. */
export type ControllerDevice = {
  index: number;
  connected: boolean;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
};

export const STICK_DEAD_ZONE = 0.18;

function axis(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(-1, Math.min(1, value!)) : 0;
}

export function leftStick(axes: readonly number[]) {
  const x = axis(axes[0]),
    y = axis(axes[1]);
  const length = Math.hypot(x, y);
  if (length <= STICK_DEAD_ZONE) return { x: 0, y: 0 };
  const strength = Math.min(
    1,
    (length - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE),
  );
  // Browser sticks report up as negative Y; office screen-up is positive Y.
  return { x: (x / length) * strength, y: (-y / length) * strength };
}

function pressed(pad: ControllerDevice, button: number) {
  const b = pad.buttons[button];
  return !!b && (b.pressed || b.value > 0.5);
}

export class ControllerInput {
  private active: number | null = null;
  private previous = new Map<number, { toss: boolean; menu: boolean }>();

  reset() {
    this.active = null;
    this.previous.clear();
  }

  poll(devices: readonly (ControllerDevice | null)[]) {
    const pads = devices.filter((p): p is ControllerDevice => !!p?.connected);
    const samples = pads.map((pad) => {
      let direction = leftStick(pad.axes);
      if (!direction.x && !direction.y) {
        const x = Number(pressed(pad, 15)) - Number(pressed(pad, 14));
        const y = Number(pressed(pad, 12)) - Number(pressed(pad, 13));
        const length = Math.max(1, Math.hypot(x, y));
        direction = { x: x / length, y: y / length };
      }
      const toss = pressed(pad, 0),
        menu = pressed(pad, 9);
      const before = this.previous.get(pad.index);
      this.previous.set(pad.index, { toss, menu });
      return {
        index: pad.index,
        ...direction,
        sprint: pressed(pad, 7),
        // Held activation buttons must not fire on connect or refocus.
        toss: !!before && toss && !before.toss,
        menu: !!before && menu && !before.menu,
      };
    });
    for (const index of this.previous.keys())
      if (!pads.some((p) => p.index === index)) this.previous.delete(index);
    const current = samples.find((s) => s.index === this.active);
    const active = (s: (typeof samples)[number]) =>
      !!(s.x || s.y || s.sprint || s.toss || s.menu);
    const selected =
      current && active(current)
        ? current
        : samples.find(active) || current || samples[0];
    this.active = selected?.index ?? null;
    return {
      connected: !!selected,
      x: selected?.x ?? 0,
      y: selected?.y ?? 0,
      sprint: selected?.sprint ?? false,
      toss: selected?.toss ?? false,
      menu: selected?.menu ?? false,
    };
  }
}
