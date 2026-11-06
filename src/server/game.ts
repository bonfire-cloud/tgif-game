import {
  BUMPERS,
  STATIONS,
  TICKET_TEMPLATES,
  ROUND_SECONDS,
  distance,
  trafficFor,
  type Build,
  type GameEvent,
  type Player,
  type Snapshot,
  type Meeting,
} from "../shared/game.js";
export class Room {
  players: Player[] = [];
  builds: Build[] = [];
  events: GameEvent[] = [];
  hazards: Meeting[] = [];
  phase: "playing" | "finished" = "playing";
  remaining = ROUND_SECONDS;
  target = 5;
  shipped = 0;
  handoffs = 0;
  meetings = 0;
  nextBuild = 1;
  nextEvent = 1;
  spawnClock = 0;
  trafficClock = 0;
  capacity = 2;
  lastActive = Date.now();
  started = false;
  constructor(public code: string) {}
  event(
    text: string,
    kind: GameEvent["kind"] = "info",
    point?: { x: number; y: number },
  ) {
    this.events.push({
      id: this.nextEvent++,
      text,
      kind,
      ...(point ? { x: point.x, y: point.y } : {}),
    });
    this.events = this.events.slice(-8);
  }
  join(id: string, name: string): number | null {
    const old = this.players.find((p) => p.id === id);
    if (old) {
      old.name = name;
      return old.desk;
    }
    const slot = Array.from({ length: 8 }, (_, i) => i).find(
      (i) => !this.players.some((p) => p.desk === i),
    );
    if (slot === undefined) return null;
    const p: Player = {
      id,
      name,
      desk: slot,
      x: -4.2 + (slot % 3) * 0.35,
      y: -1.25 + Math.floor(slot / 3) * 0.3,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      sprinting: false,
      stun: 0,
      immunity: 2,
      walked: 0,
      meetings: 0,
      target: null,
      inputAt: Date.now(),
    };
    this.players.push(p);
    this.lastActive = Date.now();
    if (!this.started) {
      this.started = true;
      this.spawn(p);
    } else if (this.builds.length < trafficFor(this.players.length)) {
      this.spawn(p);
    }
    this.event(`${name} ran into the office!`, "join", p);
    return slot;
  }
  leave(id: string) {
    const p = this.players.find((p) => p.id === id);
    if (!p) return;
    const b = this.held(p.desk);
    if (b) {
      b.held = null;
      b.x = p.x;
      b.y = p.y;
      b.vx = b.vy = 0;
      b.sender = -1;
    }
    this.players = this.players.filter((p) => p.id !== id);
    this.lastActive = Date.now();
    this.event(
      `${p.name} headed for fika. Their ticket is up for grabs.`,
      "join",
      p,
    );
  }
  held(slot: number) {
    return this.builds.find((b) => b.held === slot);
  }
  spawn(owner?: Player) {
    const template =
      TICKET_TEMPLATES[(this.nextBuild - 1) % TICKET_TEMPLATES.length];
    const slot = (this.nextBuild - 1) % 3;
    this.builds.push({
      id: this.nextBuild++,
      title: template.title,
      route: [...template.route],
      stamps: [0],
      held: owner && !this.held(owner.desk) ? owner.desk : null,
      x: owner?.x ?? -4.5 + slot * 0.4,
      y: owner?.y ?? -1.65,
      vx: 0,
      vy: 0,
      sender: -1,
      flight: 2,
      progress: 0,
    });
  }
  move(id: string, x: number, y: number, sprint = false) {
    const p = this.players.find((p) => p.id === id);
    if (
      !p ||
      this.phase !== "playing" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return false;
    const len = Math.max(1, Math.hypot(x, y));
    p.vx = x / len;
    p.vy = y / len;
    p.sprinting = !!sprint;
    p.target = null;
    p.inputAt = Date.now();
    return true;
  }
  goto(id: string, x: number, y: number) {
    const p = this.players.find((p) => p.id === id);
    if (
      !p ||
      this.phase !== "playing" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      Math.abs(x) > 8 ||
      Math.abs(y) > 6
    )
      return false;
    p.target = {
      x: Math.max(-5.5, Math.min(5.5, x)),
      y: Math.max(-3.3, Math.min(3.3, y)),
    };
    p.sprinting = false;
    p.inputAt = Date.now();
    return true;
  }
  toss(id: string) {
    const p = this.players.find((p) => p.id === id);
    if (!p || this.phase !== "playing" || p.stun > 0) return false;
    const b = this.held(p.desk);
    if (!b) return false;
    b.held = null;
    b.x = p.x + p.facingX * 0.6;
    b.y = p.y + p.facingY * 0.6;
    b.vx = p.facingX * 7;
    b.vy = p.facingY * 7;
    b.sender = p.desk;
    b.flight = 0;
    b.progress = 0;
    this.event(`${p.name}: catch!`, "throw", p);
    return true;
  }
  rematch() {
    if (this.phase !== "finished") return false;
    this.phase = "playing";
    this.remaining = ROUND_SECONDS;
    this.shipped = 0;
    this.handoffs = 0;
    this.meetings = 0;
    this.builds = [];
    this.hazards = [];
    this.capacity = trafficFor(this.players.length);
    this.target = Math.max(5, this.players.length * 3);
    this.spawnClock = 0;
    for (const p of this.players) {
      p.x = -4.2 + (p.desk % 3) * 0.4;
      p.y = -1.2 + Math.floor(p.desk / 3) * 0.3;
      p.vx = p.vy = p.stun = p.walked = p.meetings = 0;
      p.target = null;
      p.immunity = 2;
      this.spawn(p);
    }
    this.event("Action item: ship it before the next retro.");
    return true;
  }
  update(dt: number) {
    if (!this.players.length || !this.started || this.phase === "finished")
      return;
    this.lastActive = Date.now();
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) {
      this.phase = "finished";
      for (const p of this.players) {
        p.vx = p.vy = 0;
        p.target = null;
      }
      this.event("17:00. Time for the Retro!", "ship", { x: 0, y: 0 });
      return;
    }
    const elapsed = ROUND_SECONDS - this.remaining;
    this.hazards =
      elapsed < 5
        ? []
        : [
            {
              id: 0,
              x: Math.sin(elapsed * 0.46) * 2.9,
              y: Math.cos(elapsed * 0.31) * 0.95,
              r: 0.86,
              label: "Quick sync?",
            },
            ...(this.players.length >= 4
              ? [
                  {
                    id: 1,
                    x: Math.cos(elapsed * 0.38 + 2) * 3.1,
                    y: Math.sin(elapsed * 0.43) * 1.2,
                    r: 0.8,
                    label: "Got a minute?",
                  },
                ]
              : []),
          ];
    this.trafficClock += dt;
    if (this.trafficClock >= 5) {
      this.trafficClock = 0;
      this.capacity += Math.sign(
        trafficFor(this.players.length) - this.capacity,
      );
    }
    this.spawnClock += dt;
    if (this.spawnClock > 2 && this.builds.length < this.capacity) {
      this.spawn();
      this.spawnClock = 0;
    }
    const occupiedStations = new Set<number>();
    for (const p of this.players) {
      p.immunity = Math.max(0, p.immunity - dt);
      p.stun = Math.max(0, p.stun - dt);
      let ix = p.vx,
        iy = p.vy;
      if (p.target) {
        const dx = p.target.x - p.x,
          dy = p.target.y - p.y,
          len = Math.hypot(dx, dy);
        if (len < 0.1) {
          p.target = null;
          ix = iy = 0;
        } else {
          ix = dx / len;
          iy = dy / len;
          // Tap-to-move steers around mug bumpers; keyboard movement stays fully manual.
          for (const mug of BUMPERS) {
            const dx = mug.x - p.x,
              dy = mug.y - p.y,
              projection = dx * ix + dy * iy,
              cross = dx * iy - dy * ix;
            if (
              projection > 0 &&
              projection < 1.2 &&
              Math.abs(cross) < mug.r + 0.35
            ) {
              const sign = cross >= 0 ? 1 : -1;
              const nx = -iy * sign,
                ny = ix * sign;
              ix = ix * 0.35 + nx * 0.9;
              iy = iy * 0.35 + ny * 0.9;
              break;
            }
          }
        }
      } else if (Date.now() - p.inputAt > 450) ix = iy = 0;
      if (p.stun <= 0) {
        const speed = p.sprinting ? 5.1 : 3.5,
          ox = p.x,
          oy = p.y;
        p.x = Math.max(-5.45, Math.min(5.45, p.x + ix * speed * dt));
        p.y = Math.max(-3.3, Math.min(3.3, p.y + iy * speed * dt));
        for (const mug of BUMPERS) {
          const d = distance(p, mug),
            r = mug.r + 0.22;
          if (d < r) {
            const nx = (p.x - mug.x) / (d || 1),
              ny = (p.y - mug.y) / (d || 1);
            p.x = mug.x + nx * r;
            p.y = mug.y + ny * r;
          }
        }
        const moved = Math.hypot(p.x - ox, p.y - oy);
        p.walked += moved;
        if (Math.hypot(ix, iy) > 0.1) {
          p.facingX = ix;
          p.facingY = iy;
        }
      }
      if (
        p.immunity === 0 &&
        this.hazards.some((h) => distance(p, h) < h.r + 0.13)
      ) {
        p.stun = 1.0;
        p.immunity = 4.2;
        p.meetings++;
        this.meetings++;
        this.event(
          `${p.name} got ambushed by a “quick” meeting!`,
          "meeting",
          p,
        );
      }
      let b = this.held(p.desk);
      if (!b) {
        b = this.builds.find(
          (b) =>
            b.held === null &&
            distance(b, p) < 0.65 &&
            (b.sender !== p.desk || b.flight > 0.8),
        );
        if (b) {
          if (b.sender >= 0 && b.sender !== p.desk) {
            this.handoffs++;
            this.event("Clean hand-off!", "stamp", p);
          }
          b.held = p.desk;
          b.vx = b.vy = 0;
          b.progress = 0;
        }
      }
      if (!b) continue;
      b.x = p.x;
      b.y = p.y;
      const next = b.route[b.stamps.length],
        station = STATIONS[next];
      if (
        station &&
        distance(p, station) < 0.95 &&
        p.stun === 0 &&
        !occupiedStations.has(next)
      ) {
        occupiedStations.add(next);
        b.progress += dt;
        const dwell = next === 5 ? 0.42 : 0.72;
        if (b.progress >= dwell) {
          b.progress = 0;
          if (next === 5) {
            this.shipped++;
            this.builds = this.builds.filter((v) => v !== b);
            this.event(`${b.title}: SHIPPED!`, "ship", p);
          } else {
            b.stamps.push(next);
            this.event(`${station.label}: ${station.verb}!`, "stamp", p);
          }
        }
      } else b.progress = 0;
    }
    for (const b of this.builds) {
      if (b.held !== null) continue;
      b.flight += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const friction = Math.exp(-dt * 3);
      b.vx *= friction;
      b.vy *= friction;
      if (Math.abs(b.x) > 5.45) {
        b.x = Math.sign(b.x) * 5.45;
        b.vx *= -0.6;
      }
      if (Math.abs(b.y) > 3.3) {
        b.y = Math.sign(b.y) * 3.3;
        b.vy *= -0.6;
      }
    }
  }
  snapshot(): Snapshot {
    return {
      code: this.code,
      phase: this.phase,
      remaining: this.remaining,
      target: this.target,
      shipped: this.shipped,
      handoffs: this.handoffs,
      meetings: this.meetings,
      players: this.players,
      builds: this.builds,
      hazards: this.hazards,
      events: this.events,
      capacity: this.capacity,
    };
  }
}
