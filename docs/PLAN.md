# Delivery plan and architecture

## Accepted scope

Persist design and planning; deliver a real TypeScript browser multiplayer game; host on Render; capture visual proof from the deployed address. Support solo, eight humans, late joining, departures, reconnect and replay.

## Components

- src/shared/game.ts: geometry and network contracts.
- src/server/game.ts: authoritative room simulation at 30 Hz; permanent desk ownership; helper automation; collisions; stamps; scoring; adaptive traffic.
- src/server/index.ts: Express static assets, room creation, health endpoint, WebSocket sessions, snapshots around 15 Hz, heartbeat and room expiry.
- src/client/scene.ts: Babylon.js office diorama and puck interpolation.
- src/client/main.tsx: React lobby, name/code joining, HUD, invite link, outbox, keyboard controls, audio and reconnect.

A single Node service serves the client and WebSockets. It binds 0.0.0.0 and PORT. Room state is in memory: deploys/restarts clear rooms. One instance is intentional; scaling to multiple instances requires room routing and shared state. No database or account is needed for the office game.

## Validation gates

1. TypeScript and production build.
2. Simulation tests: legal stamps, solo shipment, late takeover, departure, traffic ramp, fixed target, finished round, input validation.
3. Real WebSocket integration: one client, eight clients, ninth spectator, departure and spectator claim, malformed / unauthorized actions.
4. Local browser: lobby, enter room, 3D rendering, routing, stamps, deploy, responsive controls.
5. Git source pushed to deployment branch; Render live deploy at matching commit.
6. Remote health, socket integration, browser gameplay and screenshots with deployed URL.

## Release tradeoffs

Initial capacity: eight active seats, additional spectators. No competitive cross-roster leaderboard. Gameplay requires a modern WebGL-capable browser, with desk buttons retained when rendering fails. Sound is an original rough concept cue. Room persistence and seamless adaptive music are later work.

## Deployment

Use the existing bonfire-cloud/tgif-game Git remote, branch codex/pass-the-build. Render single Node web service in Frankfurt, smallest available compute plan. Build npm ci && npm run build; start npm start; health /api/health. Workspace requires explicit selection. Check .node-version and package-lock.json for reproducible runtime inputs.
