import { test } from "node:test";
import assert from "node:assert/strict";
import { Room } from "../src/server/game.js";
import { STATIONS, distance } from "../src/shared/game.js";
const tick = (r: Room, s: number) => {
  for (let i = 0; i < s * 120; i++) r.update(1 / 120);
};
const solo = () => {
  const r = new Room("ABCDEF");
  r.join("runner-one", "Stefan");
  return r;
};
test("solo runner can complete the shipping challenge through physical stations", () => {
  const r = solo();
  let target = -1;
  for (let i = 0; i < 180 * 60 && r.shipped < r.target; i++) {
    const p = r.players[0],
      ticket = r.held(p.desk),
      next = ticket ? ticket.route[ticket.stamps.length] : 0;
    if (next !== target || (!p.target && distance(p, STATIONS[next]) > 1)) {
      r.goto(p.id, STATIONS[next].x, STATIONS[next].y);
      target = next;
    }
    r.update(1 / 60);
  }
  assert.ok(
    r.shipped >= r.target,
    `${r.shipped} shipped; runner at ${r.players[0].x},${r.players[0].y}`,
  );
  assert.ok(r.players[0].walked > 40);
});
test("station interaction requires reaching the station, not clicking it remotely", () => {
  const r = solo(),
    b = r.builds[0];
  r.goto("runner-one", STATIONS[1].x, STATIONS[1].y);
  tick(r, 0.2);
  assert.deepEqual(b.stamps, [0]);
  assert.ok(r.players[0].x < -3);
  tick(r, 2);
  assert.ok(b.stamps.includes(1));
});
test("movement is normalized, bounded and accepts only finite input", () => {
  const r = solo(),
    p = r.players[0],
    x = p.x,
    y = p.y;
  assert.ok(r.move(p.id, 1, 1));
  r.update(0.1);
  assert.ok(Math.hypot(p.x - x, p.y - y) <= 0.351);
  assert.equal(r.move(p.id, NaN, 0), false);
  assert.equal(r.goto(p.id, Infinity, 0), false);
  assert.equal(r.goto(p.id, 100, 0), false);
  assert.equal(r.move("stranger", 1, 0), false);
});
test("throwing transfers a physical ticket to another free runner", () => {
  const r = solo();
  r.join("runner-two", "Sara");
  const p = r.players[0],
    q = r.players[1],
    b = r.held(0)!;
  r.builds = r.builds.filter((t) => t === b);
  q.x = p.x + 0.9;
  q.y = p.y;
  p.facingX = 1;
  p.facingY = 0;
  r.toss(p.id);
  tick(r, 0.1);
  assert.equal(b.held, 1);
  assert.equal(r.handoffs, 1);
  assert.deepEqual(b.stamps, [0]);
});
test("late join and departure preserve ticket progress, timer and challenge", () => {
  const r = solo(),
    b = r.builds[0];
  b.stamps.push(1);
  tick(r, 2);
  const remaining = r.remaining,
    target = r.target;
  r.join("runner-two", "Sara");
  assert.equal(r.remaining, remaining);
  assert.equal(r.target, target);
  r.leave("runner-one");
  assert.equal(b.held, null);
  assert.deepEqual(b.stamps, [0, 1]);
  assert.equal(r.players.length, 1);
});
test("eight runners and a spectator can share an ongoing room", () => {
  const r = solo();
  for (let i = 2; i <= 8; i++)
    assert.notEqual(r.join("runner-" + i, "Runner " + i), null);
  assert.equal(r.join("spectator", "Viewer"), null);
  tick(r, 35);
  assert.equal(r.capacity, 9);
  const ids = r.builds.map((t) => t.id);
  for (let i = 2; i <= 8; i++) r.leave("runner-" + i);
  tick(r, 40);
  assert.equal(r.capacity, 2);
  assert.ok(ids.every((id) => r.builds.some((t) => t.id === id)));
});
test("quick meetings interrupt briefly and give escape immunity", () => {
  const r = solo();
  tick(r, 6);
  const h = r.hazards[0],
    p = r.players[0];
  p.x = h.x;
  p.y = h.y;
  p.immunity = 0;
  r.update(0.01);
  assert.equal(r.meetings, 1);
  assert.ok(p.stun > 0);
  assert.ok(p.immunity > 4);
  tick(r, 1.1);
  assert.equal(p.stun, 0);
  assert.equal(r.meetings, 1);
});
test("empty rooms pause and rounds end in a replayable Retro", () => {
  const r = solo();
  r.leave("runner-one");
  tick(r, 20);
  assert.equal(r.remaining, 180);
  r.join("runner-one", "Stefan");
  tick(r, 181);
  assert.equal(r.phase, "finished");
  assert.equal(r.move("runner-one", 1, 0), false);
  assert.ok(r.rematch());
  assert.equal(r.phase, "playing");
  assert.equal(r.remaining, 180);
  assert.equal(r.players[0].walked, 0);
});
