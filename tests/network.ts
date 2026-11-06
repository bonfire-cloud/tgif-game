import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import {
  STATIONS,
  type Snapshot,
  type ServerMessage,
} from "../src/shared/game.js";
const base = process.env.TEST_URL || "http://localhost:3001",
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, timeout = 8000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout)
      throw Error("Timed out waiting for network state");
    await sleep(50);
  }
}
class Client {
  ws: WebSocket;
  state: Snapshot | null = null;
  desk: number | null | undefined = undefined;
  id = randomUUID();
  auto = false;
  target = -1;
  constructor(code: string, name: string) {
    this.ws = new WebSocket(base.replace(/^http/, "ws") + "/ws");
    this.ws.on("open", () =>
      this.ws.send(
        JSON.stringify({ type: "join", code, name, clientId: this.id }),
      ),
    );
    this.ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString()) as ServerMessage;
      if (m.type === "welcome") this.desk = m.desk;
      if (m.type === "state") {
        this.state = m.state;
        if (this.auto && this.desk !== null) {
          const b = m.state.builds.find((b) => b.held === this.desk),
            next = b ? b.route[b.stamps.length] : 0;
          if (next !== this.target) {
            this.target = next;
            this.ws.send(
              JSON.stringify({
                type: "goto",
                x: STATIONS[next].x,
                y: STATIONS[next].y,
              }),
            );
          }
        }
      }
    });
  }
  close() {
    this.ws.close();
  }
}
const clients: Client[] = [];
try {
  assert.equal((await fetch(base + "/api/health")).status, 200);
  const response = await fetch(base + "/api/rooms", { method: "POST" });
  assert.equal(response.status, 201);
  const { code } = (await response.json()) as { code: string };
  const solo = new Client(code, "Solo runner QA");
  solo.auto = true;
  clients.push(solo);
  await until(() => !!solo.state && solo.desk === 0);
  await until(() => (solo.state?.shipped || 0) >= 1, 60000);
  assert.ok(solo.state!.players[0].walked > 10);
  const before = solo.state!,
    target = before.target;
  for (let i = 1; i < 9; i++) {
    const c = new Client(code, "QA runner " + i);
    clients.push(c);
    await until(() => c.desk !== undefined);
  }
  await until(() => solo.state?.players.length === 8);
  assert.equal(clients[8].desk, null);
  assert.equal(solo.state!.target, target);
  assert.ok(solo.state!.remaining <= before.remaining);
  clients[1].close();
  await until(() => solo.state?.players.length === 7);
  clients[8].ws.send(JSON.stringify({ type: "claim" }));
  await until(() => clients[8].desk === 1);
  await until(() => solo.state?.players.length === 8);
  assert.ok(solo.state!.players.some((p) => p.name === "QA runner 8"));
  for (let i = 2; i < 9; i++) clients[i].close();
  await until(() => solo.state?.players.length === 1);
  console.log(
    JSON.stringify(
      {
        ok: true,
        url: base,
        room: code,
        soloShipments: solo.state!.shipped,
        walked: Math.round(solo.state!.players[0].walked),
        maxHumans: 8,
        ninthSpectated: true,
        lateClaim: true,
        namePreserved: true,
        returnedToSolo: true,
        targetPreserved: true,
      },
      null,
      2,
    ),
  );
} finally {
  clients.forEach((c) => c.close());
}
