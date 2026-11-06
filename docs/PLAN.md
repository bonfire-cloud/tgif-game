# Delivery and architecture

## Current scope

A physical office runner replaces the stationary desk-passing prototype after user playtest feedback. Requirements: 1–8 humans; solo completion; late join; leave/rejoin; meaningful movement and hand-offs; office-process stations; animations; Retro results. Preserve the retro Bonfire cover. The presentation now uses pixel-rendered 3D, a sixteen-colour palette, self-hosted pixel fonts and an original procedural chiptune. Main deploys automatically after CI passes.

## Ownership

- src/shared/game.ts: station geometry, ticket routes, player / event / network contracts.
- src/server/game.ts: authoritative movement, sprinting, station proximity and dwell, queues, meeting hazards, physical throwing and pickup, scoring, room lifecycle.
- src/server/index.ts: Express, WebSocket sessions and snapshots, rate/payload limits, heartbeat and idle cleanup.
- src/client/scene.ts: Babylon office floor, station models, articulated avatars, carried tickets, particles, meeting groups, projected labels.
- src/client/main.tsx: React joining, input lifecycle, camera overlays, mission HUD, sound and Retro.
- src/client/retro.ts: scene palette and the final quantization / dithering pass.
- src/client/chip-synth.ts and audio.ts: deterministic PCM score / effects and browser audio lifecycle.

One Node service serves both client and WebSockets. It binds 0.0.0.0:PORT. Runtime rooms are in memory and reset on deploy/restart. One instance is intentional; multiple instances would require room-aware routing and shared coordination.

## Release pipeline

main is the release branch. GitHub Actions runs simulation tests, TypeScript, Vite build and a real WebSocket test. GitHub Actions deploys the exact tested main commit through its encrypted Render deploy-hook secret, then waits for the public health revision to match, so only successful CI revisions deploy. Pull requests run the same checks without changing the live game. No deploy secrets are stored in source.

## Validation gates

- Solo can ship the target by physically visiting stations.
- Station orders cannot be completed remotely by sending a destination.
- Movement is bounded, normalized and finite; sprint is server owned.
- Throwing / catching preserves progress, including departure drops.
- A single ongoing round supports 1 → 8 → spectator → claim → 1.
- Meetings interrupt briefly, with escape immunity.
- Empty rooms pause; finished rounds produce a replayable Retro.
- Browser checks cover rendering, actual keyboard movement, route progress and remote deployment.
- Pixel rendering preserves pointer accuracy; desktop and phone controls remain readable.
- Chip score and effects are deterministic, non-silent, bounded and click-free at their boundaries.

## Remaining tuning

Tune running speed, station dwell, meeting paths and ticket routes with real coworkers. The chip score loops seamlessly; adaptive musical layers remain a possible follow-up. Tap-to-move avoids mugs locally; manual keyboard and controller movement give full control. Physical gamepad hardware still needs a manual check. No persistent scores or accounts.
