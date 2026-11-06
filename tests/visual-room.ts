// Manual visual QA fixture: seven explicit test participants join an existing room.
// Usage: TEST_URL=https://... npx tsx tests/visual-room.ts ABCDEF
import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import {
  DESKS,
  DEPLOY,
  distance,
  type ServerMessage,
} from "../src/shared/game.js";
const base = process.env.TEST_URL || "http://localhost:3001",
  code = process.argv[2];
if (!code) throw Error("Provide an existing room code");
const clients: WebSocket[] = [];
for (let i = 2; i <= 8; i++) {
  const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws");
  clients.push(ws);
  let desk: number | null = null,
    last = 0;
  ws.on("open", () =>
    ws.send(
      JSON.stringify({
        type: "join",
        code,
        name: `QA guest ${i}`,
        clientId: randomUUID(),
      }),
    ),
  );
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;
    if (m.type === "welcome") desk = m.desk;
    if (m.type !== "state" || desk === null) return;
    const s = m.state,
      b = s.builds.find((b) => b.held === desk);
    if (!b || s.phase !== "playing" || Date.now() - last < 450) return;
    const next =
      b.stamps.length >= 3
        ? DEPLOY
        : DESKS.filter(
            (d) =>
              d.id !== desk &&
              !b.stamps.includes(d.id) &&
              !s.builds.some((b) => b.held === d.id),
          ).sort((a, c) => distance(a, b) - distance(c, b))[0];
    if (next) {
      last = Date.now();
      ws.send(JSON.stringify({ type: "pass", x: next.x, y: next.y }));
    }
  });
  ws.on("error", console.error);
}
console.log("Seven QA participants connecting to", code, "at", base);
const stop = () => {
  clients.forEach((ws) => ws.close());
  setTimeout(() => process.exit(0), 300).unref();
};
setTimeout(stop, 120000);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
