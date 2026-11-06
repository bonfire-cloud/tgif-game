# TGIF: Run the Release 🔥

Play: https://bonfire-tgif.onrender.com

Bonfire's Friday office runner. Grab a ticket, run through PO / Requirements / Refinement / Build / Review / Deploy, dodge “quick” meetings, and survive the Retro. Start solo; up to eight people can join the same ongoing room.

## Run locally

Node 24 and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Move with **WASD / arrows**, hold **Shift** to sprint, **Space** to throw a ticket. Stations work when reached. Tap/click the floor to move with a pointer. Standard gamepads: **left stick** moves, **RT/R2** sprints, **A/Cross** throws, **Menu/Options** starts the next round. Press a controller button once to make it visible to the browser. Music starts muted.

The office uses pixel-rendered 3D, a fixed sixteen-colour palette and self-hosted Press Start 2P / VT323 fonts. Turn **CHIP ON** for the original pulse / triangle / noise-channel score and arcade effects. Generate the same soundtrack as a WAV with `npm run audio:preview`.

```sh
npm test
npm run build
npm start
npx tsx tests/network.ts
```

Production serves http://localhost:3001 (PORT overrides it). Health: /api/health. WebSocket: /ws. Runtime rooms reset on restart.

## CI and deployment

Push to main → GitHub Actions tests + build + real WebSocket scenario → the deploy job triggers Render and waits for the exact commit to become live. Pull requests run checks. GitHub Actions deploys the exact tested main commit through its encrypted Render deploy-hook secret, then waits for the public health revision to match. The service configuration is recorded in docs/deployment.json.

## Design and evidence

- [Gameplay](docs/GAMEPLAY.md)
- [Art and soundtrack](docs/DIRECTION.md)
- [8-bit style guide](docs/RETRO-STYLE.md)
- [Architecture and plan](docs/PLAN.md)
- [Verification](docs/VERIFICATION.md)
- [Original stationary prototype](docs/history/stationary-prototype.md)

TypeScript, React, Babylon.js, Node and WebSockets. User-provided cover artwork and an original synthesized chiptune are included. Font licenses are in public/fonts.
