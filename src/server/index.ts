import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { Room } from "./game.js";
import type { ClientMessage, ServerMessage } from "../shared/game.js";
const app = express(),
  server = createServer(app),
  rooms = new Map<string, Room>();
const sockets = new Map<
  WebSocket,
  {
    room: Room;
    clientId: string;
    name: string;
    desk: number | null;
    alive: boolean;
    window: number;
    count: number;
  }
>();
app.disable("x-powered-by");
app.use(express.json({ limit: "2kb" }));
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    game: "run-the-release",
    revision: process.env.RENDER_GIT_COMMIT || "local",
    rooms: rooms.size,
  }),
);
const creates = new Map<string, { at: number; count: number }>();
app.post("/api/rooms", (req, res) => {
  const ip = req.ip || "unknown",
    entry = creates.get(ip);
  if (entry && Date.now() - entry.at < 60000 && entry.count >= 20) {
    res.status(429).json({ error: "Take a coffee break, then try again." });
    return;
  }
  creates.set(
    ip,
    entry && Date.now() - entry.at < 60000
      ? { at: entry.at, count: entry.count + 1 }
      : { at: Date.now(), count: 1 },
  );
  if (rooms.size >= 256) {
    res.status(503).json({ error: "The office is full. Try again shortly." });
    return;
  }
  let code;
  do {
    code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  } while (rooms.has(code));
  rooms.set(code, new Room(code));
  res.status(201).json({ code });
});
app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res
      .status(404)
      .json({ error: "This room has closed. Start a fresh Friday." });
    return;
  }
  res.json({
    code: room.code,
    players: room.players.length,
    phase: room.phase,
  });
});
app.use(
  express.static(resolve("dist/client"), {
    maxAge: "1h",
    setHeaders(res, path) {
      if (path.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  }),
);
app.get("/{*path}", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(resolve("dist/client/index.html"));
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 2048 });
function send(ws: WebSocket, data: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 256000)
    ws.send(JSON.stringify(data));
}
wss.on("connection", (ws) => {
  const joinTimeout = setTimeout(() => {
    if (!sockets.has(ws)) ws.close(1008, "Join a room first");
  }, 10000);
  ws.on("pong", () => {
    const c = sockets.get(ws);
    if (c) c.alive = true;
  });
  ws.on("message", (raw) => {
    let m: ClientMessage;
    try {
      m = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!m || typeof m !== "object") return;
    let c = sockets.get(ws);
    if (!c) {
      if (
        m.type !== "join" ||
        typeof m.code !== "string" ||
        typeof m.clientId !== "string" ||
        m.clientId.length > 80 ||
        m.clientId.length < 8 ||
        typeof m.name !== "string"
      )
        return;
      const room = rooms.get(m.code.toUpperCase());
      if (!room) {
        send(ws, {
          type: "error",
          message: "This room has closed. Start a fresh Friday.",
        });
        return;
      }
      const name =
        m.name
          .replace(/[<>\u0000-\u001f]/g, "")
          .trim()
          .slice(0, 18) || "Colleague";
      for (const [old, data] of sockets) {
        if (data.room === room && data.clientId === m.clientId) {
          sockets.delete(old);
          old.close(1000, "Reconnected elsewhere");
        }
      }
      const desk = room.join(m.clientId, name);
      c = {
        room,
        clientId: m.clientId,
        name,
        desk,
        alive: true,
        window: Date.now(),
        count: 0,
      };
      sockets.set(ws, c);
      clearTimeout(joinTimeout);
      send(ws, { type: "welcome", clientId: m.clientId, desk });
      send(ws, { type: "state", state: room.snapshot() });
      return;
    }
    if (Date.now() - c.window > 1000) {
      c.window = Date.now();
      c.count = 0;
    }
    if (++c.count > 60) return;
    if (m.type === "claim" && c.desk === null) {
      c.desk = c.room.join(c.clientId, c.name);
      send(ws, { type: "welcome", clientId: c.clientId, desk: c.desk });
    }
    if (m.type === "move") c.room.move(c.clientId, m.x, m.y, m.sprint);
    if (m.type === "goto") c.room.goto(c.clientId, m.x, m.y, m.sprint);
    if (m.type === "throw") c.room.toss(c.clientId);
    if (m.type === "rematch" && c.desk !== null) c.room.rematch();
    if (
      m.type === "ping" &&
      c.desk !== null &&
      (m.signal === "ready" || m.signal === "full")
    ) {
      const p = c.room.players.find((p) => p.id === c.clientId);
      if (p)
        c.room.event(
          `${p.name}: ${m.signal === "ready" ? "Catch!" : "Carrying a ticket!"}`,
          "info",
        );
    }
  });
  ws.on("error", () => {});
  ws.on("close", () => {
    clearTimeout(joinTimeout);
    const c = sockets.get(ws);
    if (c) {
      c.room.leave(c.clientId);
      sockets.delete(ws);
    }
  });
});
let last = Date.now(),
  broadcast = 0;
const tick = setInterval(() => {
  const now = Date.now(),
    dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const room of rooms.values()) room.update(dt);
  broadcast += dt;
  if (broadcast >= 0.065) {
    broadcast = 0;
    for (const [ws, c] of sockets)
      send(ws, { type: "state", state: c.room.snapshot() });
  }
}, 1000 / 30);
const heartbeat = setInterval(() => {
  for (const [ws, c] of sockets) {
    if (!c.alive) {
      ws.terminate();
      continue;
    }
    c.alive = false;
    ws.ping();
  }
  for (const [code, room] of rooms)
    if (!room.players.length && Date.now() - room.lastActive > 15 * 60000)
      rooms.delete(code);
  for (const [ip, e] of creates)
    if (Date.now() - e.at > 60000) creates.delete(ip);
}, 15000);
server.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log("TGIF listening on", Number(process.env.PORT) || 3001),
);
process.on("SIGTERM", () => {
  clearInterval(tick);
  clearInterval(heartbeat);
  for (const ws of wss.clients)
    ws.close(1012, "Office restarting. Rejoin in a moment.");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
});
