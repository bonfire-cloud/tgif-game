# Verification: Run the Release

## Gameplay and network

Ten simulation tests cover solo target completion, real station proximity, bounded movement, physical hand-offs, preserved progress on departure, eight active players and spectators, meeting interruption / immunity, pause / Retro / replay, retained team distance and pointer sprint speed.

The local and public real-WebSocket tests passed: one runner physically traversed the route and shipped a ticket; eight humans joined the ongoing room; the ninth spectated; a freed slot was claimed with its name intact; the room returned to one human with the challenge preserved. See artifacts/runner-local-network.json and artifacts/runner-render-network.json.

## Browser evidence from Render

Captured from https://bonfire-tgif.onrender.com/room/B53390, running main revision dda6a9b5c8424c9aec3e25688dc3a6e155912434:

- artifacts/runner-solo-render.jpg: one player carrying a ticket at Requirements, after actual WASD input.
- artifacts/runner-eight-render.jpg: eight connected runners, seven explicitly named QA participants.
- artifacts/runner-live.gif: 40 unaltered browser captures encoded as a 7.46-second animation (resized / palette encoded for delivery). Shows running, carrying, stations, meetings and ship effects. The QA participants use real WebSocket clients.
- artifacts/runner-retro-render.jpg: actual 17:00 Retro after the full three-minute round. Team distance retention was corrected after this capture.

The first stationary prototype's evidence is retained separately in artifacts/history-stationary/.

## CI/CD proof

main contains the merged runner. https://github.com/bonfire-cloud/tgif-game/actions/runs/42204161375 passed the test, build, multiplayer and deployment jobs. Render deploy dep-dbmqsb61egvs73dcb9gg became live from the deploy_hook trigger. Its public health endpoint reported the exact tested commit dda6a9b5c8424c9aec3e25688dc3a6e155912434.

The final evidence / tuning commit runs the same pipeline. GitHub Actions owns deployment: Render's duplicate Git auto-deployment is disabled, branch is main, deploy hook is an encrypted repository secret. The deploy job pins GITHUB_SHA and waits for /api/health.revision to match before marking deployment successful.

## Practical limits

Free Render hosting can cold-start after inactivity. Rooms are in memory and reset on restart / deploy. The music is the original rough 35-second cue, currently looping. Gameplay balance still benefits from a Friday playtest with real coworkers.

## Controller and sync-patrol update

The suite now has 22 checks. Controller tests use simulated standard Gamepad API samples: all screen directions, analog speed, diagonal limits, dead zone, malformed axes, D-pad, held sprint, single-press throw / rematch, sparse device slots, unplug / reconnect / focus resets, and feeding decoded controls through the real server movement and throwing contract. Light stick pressure changes walking speed without weakening throws. Physical hardware is a manual check.

Patrol tests cover all six stations and both side aisles, smooth bounded movement, interruption of campers at every station, chasing outer-lane carriers, immunity / escape, five-second grace, staggered multiplayer routes and rematch reset. Solo challenge completion still passes under the revised hazards. Browser QA confirmed keyboard fallback still moves the character, the revised ghost can catch a player near PO, controller instructions render correctly, and no warning/error logs were reported.
