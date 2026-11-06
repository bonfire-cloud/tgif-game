export const ROUND_SECONDS = 180;
export const STATIONS = [
  {
    id: 0,
    x: -4.2,
    y: -2.25,
    label: "PO",
    verb: "Grab a ticket",
    color: "#ffec27",
  },
  {
    id: 1,
    x: 0,
    y: -2.25,
    label: "Requirements",
    verb: "Make it clear",
    color: "#28c8a8",
  },
  {
    id: 2,
    x: 4.2,
    y: -2.25,
    label: "Refinement",
    verb: "Just one more detail",
    color: "#ff77a8",
  },
  {
    id: 3,
    x: 4.2,
    y: 2.25,
    label: "Build",
    verb: "Works on my machine",
    color: "#ff8b28",
  },
  { id: 4, x: 0, y: 2.25, label: "Review", verb: "LGTM!", color: "#a7f070" },
  {
    id: 5,
    x: -4.2,
    y: 2.25,
    label: "Deploy",
    verb: "Ship it!",
    color: "#29adff",
  },
];
export const AVATAR_COLORS = [
  "#ff8b28",
  "#28c8a8",
  "#ff77a8",
  "#a7f070",
  "#ffec27",
  "#29adff",
  "#a94faa",
  "#fff1e8",
];
export const BUMPERS = [
  { x: -2.0, y: 0.15, r: 0.42 },
  { x: 2, y: -0.15, r: 0.42 },
];
export const DEPLOY = STATIONS[5];
export const TICKET_TEMPLATES = [
  { title: "Add dark mode", route: [0, 1, 2, 3, 4, 5] },
  { title: "One tiny hotfix", route: [0, 3, 4, 5] },
  { title: "Can we just…", route: [0, 2, 1, 3, 5] },
  { title: "Cloud, but cloudier", route: [0, 1, 3, 4, 5] },
];
export type Player = {
  id: string;
  name: string;
  desk: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  sprinting: boolean;
  stun: number;
  immunity: number;
  walked: number;
  meetings: number;
  target: { x: number; y: number } | null;
  inputAt: number;
};
export type Build = {
  id: number;
  title: string;
  route: number[];
  stamps: number[];
  held: number | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sender: number;
  flight: number;
  progress: number;
};
export type Meeting = {
  id: number;
  x: number;
  y: number;
  r: number;
  label: string;
  chasing: boolean;
};
export type GameEvent = {
  id: number;
  text: string;
  kind: "join" | "stamp" | "ship" | "meeting" | "throw" | "info";
  x?: number;
  y?: number;
};
export type Snapshot = {
  code: string;
  phase: "playing" | "finished";
  remaining: number;
  target: number;
  shipped: number;
  handoffs: number;
  meetings: number;
  walked: number;
  players: Player[];
  builds: Build[];
  hazards: Meeting[];
  events: GameEvent[];
  capacity: number;
};
export type ClientMessage =
  | { type: "join"; code: string; name: string; clientId: string }
  | { type: "move"; x: number; y: number; sprint?: boolean }
  | { type: "goto"; x: number; y: number; sprint?: boolean }
  | { type: "throw" }
  | { type: "claim" }
  | { type: "rematch" }
  | { type: "ping"; signal: "ready" | "full" };
export type ServerMessage =
  | { type: "welcome"; clientId: string; desk: number | null }
  | { type: "state"; state: Snapshot }
  | { type: "error"; message: string };
export const trafficFor = (humans: number) =>
  Math.min(10, Math.max(2, humans + 1));
export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y);
