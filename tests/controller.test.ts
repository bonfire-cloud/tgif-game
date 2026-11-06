import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ControllerInput,
  leftStick,
  type ControllerDevice,
} from "../src/client/controller.js";
import { Room } from "../src/server/game.js";
function pad(index = 0): ControllerDevice {
  return {
    index,
    connected: true,
    axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}
function button(p: ControllerDevice, index: number, down: boolean) {
  p.buttons = p.buttons.map((b, i) =>
    i === index ? { pressed: down, value: down ? 1 : 0 } : b,
  );
}
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-9, `${a} differs from ${b}`);

test("left stick points in screen directions with proportional speed and no diagonal boost", () => {
  assert.deepEqual(leftStick([1, 0]), { x: 1, y: -0 });
  assert.deepEqual(leftStick([0, -1]), { x: 0, y: 1 });
  close(leftStick([-0.6, 0.8]).x, -0.6);
  close(leftStick([-0.6, 0.8]).y, -0.8);
  const diagonal = leftStick([1, -1]);
  close(Math.hypot(diagonal.x, diagonal.y), 1);
  const partial = leftStick([0.5, 0]);
  assert.ok(partial.x > 0 && partial.x < 0.5);
});
test("radial dead zone rejects drift and invalid readings", () => {
  assert.deepEqual(leftStick([0.1, -0.1]), { x: 0, y: 0 });
  assert.deepEqual(leftStick([NaN, Infinity]), { x: 0, y: 0 });
  assert.deepEqual(leftStick([]), { x: 0, y: 0 });
  close(leftStick([100, -100]).x, Math.SQRT1_2);
});
test("A/Cross and Menu are single press actions, while RT remains held", () => {
  const input = new ControllerInput(),
    p = pad();
  input.poll([p]);
  button(p, 0, true);
  button(p, 9, true);
  button(p, 7, true);
  let state = input.poll([p]);
  assert.equal(state.toss, true);
  assert.equal(state.menu, true);
  assert.equal(state.sprint, true);
  state = input.poll([p]);
  assert.equal(state.toss, false);
  assert.equal(state.menu, false);
  assert.equal(state.sprint, true);
  button(p, 0, false);
  input.poll([p]);
  button(p, 0, true);
  assert.equal(input.poll([p]).toss, true);
});
test("connect, disconnect and refocus do not leave stuck movement or phantom throws", () => {
  const input = new ControllerInput(),
    p = pad();
  p.axes = [1, 0];
  button(p, 0, true);
  assert.equal(input.poll([p]).toss, false);
  assert.equal(input.poll([p]).x, 1);
  assert.deepEqual(input.poll([null]), {
    connected: false,
    x: 0,
    y: 0,
    sprint: false,
    toss: false,
    menu: false,
  });
  assert.equal(input.poll([p]).toss, false);
  input.reset();
  assert.equal(input.poll([p]).toss, false);
  button(p, 0, false);
  input.poll([p]);
  button(p, 0, true);
  assert.equal(input.poll([p]).toss, true);
});
test("an active second controller works with sparse browser slots and an idle first pad", () => {
  const input = new ControllerInput(),
    first = pad(0),
    second = pad(3);
  input.poll([first, null, null, second]);
  second.axes = [0, -1];
  assert.equal(input.poll([first, null, null, second]).y, 1);
  second.connected = false;
  assert.equal(input.poll([first, null, null, second]).y, 0);
});
test("D-pad supports screen directions when the stick is centred", () => {
  const input = new ControllerInput(),
    p = pad();
  button(p, 12, true);
  button(p, 15, true);
  const s = input.poll([p]);
  close(s.x, Math.SQRT1_2);
  close(s.y, Math.SQRT1_2);
});
test("controller samples drive server movement and throwing through the existing input contract", () => {
  const room = new Room("PAD123");
  room.join("controller-player", "Controller QA");
  const input = new ControllerInput(),
    p = pad();
  input.poll([p]);
  const player = room.players[0],
    start = { x: player.x, y: player.y };
  p.axes = [1, -1];
  button(p, 7, true);
  let s = input.poll([p]);
  room.move(player.id, s.x, s.y, s.sprint);
  room.update(0.1);
  close(player.x - start.x, 5.1 * 0.1 * Math.SQRT1_2);
  close(player.y - start.y, 5.1 * 0.1 * Math.SQRT1_2);
  button(p, 0, true);
  s = input.poll([p]);
  assert.ok(s.toss);
  room.toss(player.id);
  assert.equal(room.builds[0].held, null);
  s = input.poll([]);
  room.move(player.id, s.x, s.y, s.sprint);
  const stopped = { x: player.x, y: player.y };
  room.update(0.1);
  close(player.x, stopped.x);
  close(player.y, stopped.y);
});

test("light stick pressure controls walking speed without weakening a throw", () => {
  const room = new Room("PAD123");
  room.join("controller-player", "Controller QA");
  const input = new ControllerInput(),
    p = pad();
  p.axes = [0.4, 0];
  const s = input.poll([p]);
  room.move("controller-player", s.x, s.y, false);
  room.update(0.1);
  room.toss("controller-player");
  close(room.builds[0].vx, 7);
  close(room.builds[0].vy, 0);
});
