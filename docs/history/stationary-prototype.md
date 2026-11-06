# TGIF: Pass the Build

Bonfire's three-minute Friday fika arcade game for 1–8 active players. A browser room stays open while colleagues join and leave. Overflow visitors spectate and can claim the next open desk.

## Core contract

Aim and click to slide a build, or select a desk using its button / keys 1–8. Empty desks catch automatically. Each distinct permanent desk adds one stamp. Three stamps unlock the central Deploy slot (shortcut D). A desk holds one build; occupied desks bounce incoming builds. Coffee mugs and rails support bank shots. Builds recover after a long missed volley. No player is eliminated.

The eight desk positions exist throughout a session. Vacant desks are Auto-LGTM terminals: stamp, wait briefly, then return the build to a free human desk, preferring its sender. They never create or deploy builds or pass to other helpers. Stamp identity belongs to the desk, independent of its occupant.

## Solo

Two circulating builds create a routing and timing challenge. Send to terminal A, receive back, send to terminal B, receive back, deploy. The player's starting stamp counts. The player performs the decisions and final shot. Solo starts immediately and shares the same simulation as multiplayer.

## Scaling and transitions

Traffic starts at two builds and changes at most one step every six seconds toward a cap of 2–5 based on current humans. Departures reduce replenishment; airborne builds survive. Joining claims an empty terminal with all its held / incoming builds intact. Leaving delegates that desk to a helper. A full room admits spectators. No human host owns the round. Empty rooms pause and expire after fifteen minutes.

## Round and scoring

The clock runs 16:57 → 17:00 (180 seconds). The first solo shipping target is eight. A rematch chooses max(8, 4 × current humans). Targets stay fixed during a round. Players can keep scoring beyond the target. Results show shared shipments, banked shipments and recovered builds; no personal blame or cross-roster leaderboard.

## Onboarding

“Catch. Stamp. Pass. Ship.” The UI shows each desk's availability, the held build's three stamps, live room size, room invitation link, and explicit deployment readiness. Music starts muted and is user controlled. Keyboard desk buttons provide an alternative to spatial aiming.

## Playtest questions

Is the first solo shipment understandable without explanation? Are helper return delays readable? Does 1 → 8 → 1 preserve builds, stamps, timer and useful control? Does occupancy generate conversation? Tune traffic, catch radius and target before adding new rules.
