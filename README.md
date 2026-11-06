# TGIF: Pass the Build 🔥

Bonfire's Friday fika arcade game. Get three different desk stamps, then ship before 17:00. Start alone; up to eight colleagues can join the same ongoing room.

## Run

Node 22.12+ (recommended Node 24), npm.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Start a room and copy its invitation link. Empty desks review and return your builds, so one player can complete a round. Aim and click, select a desk button, or use keys 1–8. Press D to deploy a build with three stamps. Music starts muted.

```sh
npm test
npm run build
npm start
```

Production serves http://localhost:3001; PORT overrides the port. Health: /api/health. The same server handles /ws. Runtime rooms are ephemeral and reset on restart.

## Design and delivery

- [Gameplay contract](docs/GAMEPLAY.md)
- [Art and soundtrack direction](docs/DIRECTION.md)
- [Plan, architecture and validation](docs/PLAN.md)
- [Verification evidence](docs/VERIFICATION.md)

Original user-provided cover in images/. Original synthesized music sketch and its generator are included. React + TypeScript + Babylon.js + Node + WebSockets; Render deployment targets one instance.
