// Manual visual QA: seven named test runners join an existing room for two minutes.
import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { STATIONS, type ServerMessage } from "../src/shared/game.js";
const base = process.env.TEST_URL || "http://localhost:3001",
  code = process.argv[2];
if (!code) throw Error("Provide a room code");
const clients: WebSocket[] = [];
for (let i = 2; i <= 8; i++) {
  const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws");
  clients.push(ws);
  let desk: number | null = null,
    target = -1;
  ws.on("open", () =>
    ws.send(
      JSON.stringify({
        type: "join",
        code,
        name: `QA runner ${i}`,
        clientId: randomUUID(),
      }),
    ),
  );
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;
    if (m.type === "welcome") desk = m.desk;
    if (m.type !== "state" || desk === null || m.state.phase !== "playing")
      return;
    const b = m.state.builds.find((b) => b.held === desk),
      next = b ? b.route[b.stamps.length] : 0;
    if (next !== target) {
      target = next;
      ws.send(
        JSON.stringify({
          type: "goto",
          x: STATIONS[next].x,
          y: STATIONS[next].y,
        }),
      );
    }
  });
  ws.on("error", console.error);
}
console.log("Seven QA runners joining", code);
const stop = () => {
  clients.forEach((c) => c.close());
  setTimeout(() => process.exit(0), 250).unref();
};
setTimeout(stop, 120000);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
