# Art, sound and product direction

## Image interpretation

The supplied retro Bonfire cover promises ordinary office people becoming action heroes at 16:59: warm sunset, beige hardware, cable tangles, windbreakers, CRT phosphor and collective triumph. Preserve that affectionate absurdity in a readable office diorama.

## Visual system

The current direction is a late-1980s cartridge game. See [the detailed style guide](RETRO-STYLE.md). The office stays 3D for movement, depth, shadows and animation; its output is rendered at low resolution, enlarged in integer steps and quantized to sixteen colours. Cube heads, block limbs, faceted mugs, hard shadows and twelve-frame-per-second running poses give the models a sprite-like silhouette.

| Token          | Value   | Role                           |
| -------------- | ------- | ------------------------------ |
| Cartridge navy | #0B0B2B | Backgrounds and outlines        |
| Cabinet blue   | #1D2B53 | Panels and office floor         |
| Bonfire orange | #FF8B28 | Tickets, build and fire         |
| Coin yellow    | #FFEC27 | Main actions and PO             |
| Hot pink       | #FF77A8 | Refinement and meeting warnings |
| Phosphor cyan  | #29ADFF | Frames, focus and Deploy        |
| Terminal green | #A7F070 | Review, progress and success    |
| CRT cream      | #FFF1E8 | Hardware and primary text       |

Press Start 2P carries display titles and station labels; VT323 carries controls, dialogue and status. Fonts are self-hosted in public/fonts with their SIL Open Font License files, sourced from the official google/fonts repository (ofl/pressstart2p and ofl/vt323). Square frames, flat colours and hard offset shadows extend the pixel world into the interface. Controls remain at browser resolution for readability. Station status has words and indicators; ticket progress has explicit stamps. Reduced motion removes interface transitions. Keyboard focus remains visible.

The supplied cover remains the lobby's visual anchor. It is user-provided reference artwork; retain its provenance in images/ and the delivery asset at public/images/friday-cover.png.

## Soundtrack

The active score is an original 132 BPM, D-major chiptune: two pulse-style voices, sixteen-level triangle bass, and fifteen-bit LFSR noise drums. The eight-bar loop has exact zero boundaries and quantized amplitude. Coin approvals, shipping arpeggios, throw zaps, descending meeting phrases and a Retro fanfare use the same synthesizer. No external samples. Music and effects start muted behind the CHIP toggle; conversation takes priority.

src/client/chip-synth.ts is the reproducible source. Run npm run audio:preview to regenerate artifacts/8bit-score.wav from the actual game loop. The previous FM concept sketch remains at public/audio/friday-release.mp3 with docs/soundtrack-synthesis.py as historical material; the game no longer plays it. Adaptive layers for the final thirty seconds remain future polish.

## Voice

“Three approvals. One deployment slot. Everyone wants fika.” “Works on my desk.” “Auto-LGTM.” “Fresh coffee. Another round.” “Trevlig helg!” Keep operational instructions direct and put jokes in flavour text.

## Runner revision

The world is now an office floor with six visually distinct process stations. Workers have articulated running limbs, lanyards, different shirt colours and carried-ticket poses. Use squashing motion in station reactions, dust while running, speech bubbles for meetings, warm approval particles, green shipping confetti and big arcade callouts. Pink meeting groups roam the floor. The next station bounces and glows. A fixed camera keeps the complete route readable.

The end screen is “Retro / spective”: oversized retro display lettering, Went well / Surprised us columns, and a wonky yellow action-item sticky note. It reports collective progress and jokes about process. It never singles out a coworker for failure.
