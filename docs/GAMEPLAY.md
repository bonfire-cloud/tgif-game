# TGIF: Run the Release

Bonfire's office runner for 1–8 people, three-minute rounds, late joining, and an end-of-round Retro. The first stationary passing prototype is retained in history/stationary-prototype.md. Player feedback led to this physical movement game.

## The loop

Run a little office worker with WASD or arrows. Hold Shift to sprint. Carry one ticket through its highlighted route. Reach each station and stay in its service circle for about 0.7 seconds to process it. Space throws the carried ticket forward; a free teammate catches it by getting close. Walk over dropped tickets to pick them up. Tap/click floor movement is available for touch and mouse play.

PO provides tickets. Station vocabulary: PO, Requirements, Refinement, Build, Review, Deploy. Each ticket has a readable route, shown in the HUD. Features take the full route; hotfixes skip the early meetings; scope-creep tickets reverse some planning steps. The next station has a bouncing arrow and highlighted sign. A station can process one ticket at a time.

## Friction and comedy

Pink “Quick sync?” ghosts patrol both outer station rows and side aisles. They make short, staggered chases toward nearby ticket carriers, calling out the runner’s name. Patrol speed is 1.85 units/s and chase speed 2.65, below walking (3.5) and sprinting (5.1). The five-second opening grace period remains. Ghosts briefly stop a runner. A four-second immunity window allows escape. Giant coffee mugs are physical obstacles. Sprinting, route choice, station queues and thrown hand-offs create the challenge. There is no elimination, personal blame meter or separate repair minigame.

## Solo and dynamic multiplayer

All stations run automatically, so one human can finish the challenge without bots or coworkers. Rounds begin immediately. Up to eight players join the ongoing simulation as running characters; nobody owns the room as a host. Each new player gets a ticket when capacity allows. On departure, their held ticket drops at their last position with its route progress intact. A full room supports spectators who can claim the next open slot. Empty rooms pause and expire after fifteen minutes.

Ticket capacity approaches current humans + 1, bounded at 2–10, changing gradually every five seconds. Existing tickets survive departures. The target stays fixed during a round: five initially, then max(5, 3 × humans) on rematch.

## The Retro

16:57 → 17:00. Keep shipping beyond the target. Characters celebrate at the end. The Retro shows “Went well” (shipments, hand-offs), “Surprised us” (meetings, metres run), and a cheeky action item for next Friday. Start another sprint from the same room.

## Feedback

Running limbs, body bounce, carried-ticket pose, dust, roaming meeting groups, speech bubbles, station rings, next-stop arrow, processing progress, approval particles, shipping confetti, arcade callouts and a loud Retro reveal. Music and synthesized event sounds are user controlled and start muted. Reduced motion suppresses decorative effects.

## Controllers

Standard browser gamepads use left-stick direction and proportional tilt speed, with a radial 18% dead zone to prevent drift. D-pad movement is also supported. Hold RT/R2 to sprint, press A/Cross once to throw, and press Menu/Options at the Retro to start another round. The first held activation button does not fire an action. Live controller hints replace keyboard hints when a pad is exposed by the browser.

Keyboard direction takes priority while keys are pressed. Centred sticks leave pointer movement available. Losing focus or disconnecting stops movement; refocusing cannot replay a held action. Each browser player can use their own controller in the same multiplayer room.
