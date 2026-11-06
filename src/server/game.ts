import {
  BUMPERS,
  DEPLOY,
  DESKS,
  ROUND_SECONDS,
  distance,
  trafficFor,
  type Build,
  type GameEvent,
  type Player,
  type Snapshot,
} from "../shared/game.js";
export class Room {
  players: Player[] = [];
  builds: Build[] = [];
  events: GameEvent[] = [];
  phase: "playing" | "finished" = "playing";
  remaining = ROUND_SECONDS;
  target = 8;
  shipped = 0;
  rollbacks = 0;
  banks = 0;
  nextBuild = 1;
  nextEvent = 1;
  spawnClock = 0;
  trafficClock = 0;
  capacity = 2;
  lastActive = Date.now();
  started = false;
  constructor(public code: string) {}
  event(text: string, kind: GameEvent["kind"] = "info") {
    this.events.push({ id: this.nextEvent++, text, kind });
    this.events = this.events.slice(-5);
  }
  join(id: string, name: string): number | null {
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      existing.name = name;
      return existing.desk;
    }
    const desk = DESKS.find((d) => !this.players.some((p) => p.desk === d.id));
    if (!desk) return null;
    this.players.push({ id, name, desk: desk.id });
    this.lastActive = Date.now();
    if (!this.started) {
      this.started = true;
      this.target = 8;
      this.spawn();
    }
    this.event(`${name} clocked in at desk ${desk.id + 1}.`, "join");
    return desk.id;
  }
  leave(id: string) {
    const p = this.players.find((p) => p.id === id);
    if (!p) return;
    this.players = this.players.filter((p) => p.id !== id);
    this.lastActive = Date.now();
    this.event(`${p.name} left Auto-LGTM in charge.`, "join");
  }
  held(desk: number) {
    return this.builds.find((b) => b.held === desk);
  }
  spawn() {
    const free = this.players.filter(
      (p) =>
        !this.held(p.desk) &&
        !this.builds.some((b) => b.returningTo === p.desk),
    );
    if (!free.length) return;
    const p = free[(this.nextBuild - 1) % free.length],
      d = DESKS[p.desk];
    this.builds.push({
      id: this.nextBuild++,
      x: d.x,
      y: d.y,
      vx: 0,
      vy: 0,
      stamps: [d.id],
      held: d.id,
      sender: d.id,
      age: 0,
      flight: 0,
      wait: 0,
      banked: false,
      returningTo: null,
    });
  }
  pass(id: string, x: number, y: number) {
    if (
      this.phase !== "playing" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      Math.abs(x) > 20 ||
      Math.abs(y) > 20
    )
      return false;
    const p = this.players.find((p) => p.id === id);
    if (!p) return false;
    const b = this.held(p.desk);
    if (!b) return false;
    return this.launch(b, x, y, p.desk);
  }
  launch(b: Build, x: number, y: number, sender: number) {
    let dx = x - b.x,
      dy = y - b.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.05) return false;
    dx /= len;
    dy /= len;
    b.vx = dx * 5;
    b.vy = dy * 5;
    b.held = null;
    b.returningTo = null;
    b.sender = sender;
    b.flight = 0;
    b.wait = 0;
    b.x += dx * 0.75;
    b.y += dy * 0.75;
    return true;
  }
  catch(b: Build, desk: number) {
    const d = DESKS[desk];
    b.held = desk;
    b.returningTo = null;
    b.x = d.x;
    b.y = d.y;
    b.vx = b.vy = 0;
    b.wait = 0;
    b.flight = 0;
    if (!b.stamps.includes(desk)) {
      b.stamps.push(desk);
      this.event(
        `Build #${b.id}: ${Math.min(3, b.stamps.length)}/3 approvals.`,
        "stamp",
      );
    }
  }
  rematch() {
    if (this.phase !== "finished") return false;
    this.builds = [];
    this.remaining = ROUND_SECONDS;
    this.shipped = 0;
    this.rollbacks = 0;
    this.banks = 0;
    this.phase = "playing";
    this.capacity = trafficFor(this.players.length);
    this.target = Math.max(8, this.players.length * 4);
    this.spawnClock = 0;
    this.event("Fresh coffee. Fresh release.", "info");
    this.spawn();
    return true;
  }
  update(dt: number) {
    if (!this.players.length || !this.started || this.phase === "finished")
      return;
    this.lastActive = Date.now();
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) {
      this.phase = "finished";
      this.event("17:00. Trevlig helg!", "ship");
      return;
    }
    this.trafficClock += dt;
    if (this.trafficClock >= 6) {
      this.trafficClock = 0;
      const desired = trafficFor(this.players.length);
      this.capacity += Math.sign(desired - this.capacity);
    }
    this.spawnClock += dt;
    if (this.spawnClock > 1.5 && this.builds.length < this.capacity) {
      this.spawn();
      this.spawnClock = 0;
    }
    for (const b of [...this.builds]) {
      b.age += dt;
      if (b.held !== null) {
        b.wait += dt;
        if (!this.players.some((p) => p.desk === b.held) && b.wait > 1.25) {
          const preferred = this.players.find((p) => p.desk === b.sender);
          const candidates = preferred
            ? [preferred, ...this.players.filter((p) => p !== preferred)]
            : this.players;
          const target = candidates.find(
            (p) =>
              !this.held(p.desk) &&
              !this.builds.some(
                (other) =>
                  other !== b &&
                  other.held === null &&
                  other.returningTo === p.desk,
              ),
          );
          if (target) {
            const d = DESKS[target.desk];
            this.launch(b, d.x, d.y, b.held);
            b.returningTo = target.desk;
          }
        }
        continue;
      }
      b.flight += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.abs(b.x) > 5.45) {
        b.x = Math.sign(b.x) * 5.45;
        b.vx *= -1;
        b.banked = true;
      }
      if (Math.abs(b.y) > 3.22) {
        b.y = Math.sign(b.y) * 3.22;
        b.vy *= -1;
        b.banked = true;
      }
      if (distance(b, DEPLOY) < DEPLOY.r) {
        if (b.stamps.length >= 3) {
          this.shipped++;
          if (b.banked) this.banks++;
          this.builds = this.builds.filter((x) => x !== b);
          this.event(
            `Build #${b.id} shipped!${b.banked ? " Bank shot!" : ""}`,
            "ship",
          );
          continue;
        }
        this.reflect(b, DEPLOY.x, DEPLOY.y, DEPLOY.r + 0.1);
        this.event("Deploy needs three different desk stamps.", "info");
      }
      for (const mug of BUMPERS) {
        if (distance(b, mug) < mug.r + 0.16) {
          this.reflect(b, mug.x, mug.y, mug.r + 0.18);
          b.banked = true;
        }
      }
      for (const d of DESKS) {
        if (d.id === b.sender && b.flight < 0.4) continue;
        if (distance(b, d) < 0.64) {
          if (!this.held(d.id)) {
            this.catch(b, d.id);
          } else {
            this.reflect(b, d.x, d.y, 0.81);
            b.banked = true;
          }
          break;
        }
      }
      if (b.held === null && b.flight > 12) {
        const free = this.players.find((p) => !this.held(p.desk));
        if (free) {
          this.catch(b, free.desk);
          this.rollbacks++;
          this.event(`Build #${b.id} recovered. Keep passing!`, "info");
        }
      }
    }
    // Gentle equal-mass collisions keep simultaneous traffic physical and legible.
    for (let i = 0; i < this.builds.length; i++)
      for (let j = i + 1; j < this.builds.length; j++) {
        const a = this.builds[i],
          b = this.builds[j];
        if (a.held !== null || b.held !== null) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y,
          len = Math.hypot(dx, dy);
        if (len > 0.01 && len < 0.34) {
          const nx = dx / len,
            ny = dy / len,
            rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) {
            a.vx -= rel * nx;
            a.vy -= rel * ny;
            b.vx += rel * nx;
            b.vy += rel * ny;
            a.banked = b.banked = true;
          }
          const sep = (0.34 - len) / 2;
          a.x -= nx * sep;
          a.y -= ny * sep;
          b.x += nx * sep;
          b.y += ny * sep;
        }
      }
  }
  reflect(b: Build, x: number, y: number, r: number) {
    const dx = b.x - x,
      dy = b.y - y,
      len = Math.hypot(dx, dy) || 1,
      nx = dx / len,
      ny = dy / len;
    const dot = b.vx * nx + b.vy * ny;
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
    b.x = x + nx * r;
    b.y = y + ny * r;
  }
  snapshot(): Snapshot {
    return {
      code: this.code,
      phase: this.phase,
      remaining: this.remaining,
      target: this.target,
      shipped: this.shipped,
      rollbacks: this.rollbacks,
      banks: this.banks,
      players: this.players,
      builds: this.builds,
      events: this.events,
      capacity: this.capacity,
    };
  }
}
