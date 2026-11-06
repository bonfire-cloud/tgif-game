# TGIF: Run the Release 🔥

Play: https://bonfire-tgif.onrender.com

Bonfire's Friday office runner. Grab a ticket, run through PO / Requirements / Refinement / Build / Review / Deploy, dodge “quick” meetings, and survive the Retro. Start solo; up to eight people can join the same ongoing room.

## Run locally

Node 24 and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Move with **WASD / arrows**, hold **Shift** to sprint, **Space** to throw a ticket. Stations work when reached. Tap/click the floor to move with a pointer. Music starts muted.

```sh
npm test
npm run build
npm start
npx tsx tests/network.ts
```

Production serves http://localhost:3001 (PORT overrides it). Health: /api/health. WebSocket: /ws. Runtime rooms reset on restart.

## CI and deployment

Push to main → GitHub Actions tests + build + real WebSocket scenario → Render deploys after CI passes. Pull requests run checks. Render tracks main with autoDeployTrigger=checksPass. The service configuration is recorded in docs/deployment.json.

## Design and evidence

- [Gameplay](docs/GAMEPLAY.md)
- [Art and soundtrack](docs/DIRECTION.md)
- [Architecture and plan](docs/PLAN.md)
- [Verification](docs/VERIFICATION.md)
- [Original stationary prototype](docs/history/stationary-prototype.md)

TypeScript, React, Babylon.js, Node and WebSockets. User-provided cover artwork and an original synthesized soundtrack sketch are included.
