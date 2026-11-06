# Bonfire Arcade: 8-bit presentation direction

## Design plan

Keep the office spatially 3D while presenting it like a late-1980s cartridge game. The renderer becomes a pixel-sprite factory: fixed orthographic camera, cube heads / block limbs, stepped poses, sharp shadows, low internal resolution, nearest-neighbour enlargement and final 16-colour quantization with restrained ordered dithering.

Core interface tokens: cartridge navy #0B0B2B, cabinet blue #1D2B53, hot pink #FF77A8, Bonfire orange #FF8B28, coin yellow #FFEC27, phosphor cyan #29ADFF. The complete 16-colour scene palette includes complementary green, red, teal, steel and furniture tones. Colours communicate the same station / player identity in the UI and world.

Press Start 2P carries the logo, result titles and station labels. VT323 carries readable controls, dialogue and status. Both are self-hosted with their OFL licenses. Use square frames, pixel bevels, hard offset shadows, bright flat colour and a character-grid rhythm. Keep controls at browser resolution so pixel rendering does not make instructions hard to read.

Layout: retain the shared floor and outbox. The floor is the dominant pixel view, framed like an arcade screen, with the score / clock above and compact controls below. The lobby uses the existing cover as box art with a cartridge-style title and start control.

## Review against the brief

The previous smooth lighting, soft shadows, rounded panels, pastel colours and condensed sans-serif type read as a contemporary toy diorama. Remove those treatments. A scanline overlay alone would not produce an 8-bit look; pixel dimensions, colour limits, silhouettes, typography and sound must agree. Keep animation responsive while stepping limb poses at 12 frames per second. Honour reduced motion.

## Sound direction

An original seamless chiptune: two pulse-style voices, stepped triangle bass and LFSR noise drums, at 132 BPM. Short pulse envelopes and simple arpeggios replace the previous FM keys / soft synth sound. Approvals use coin blips, shipping uses a rising arpeggio, throws use a descending zap, and meetings use a descending chip phrase. Sound remains user controlled and starts muted. The same pure synthesizer produces the in-game loop and a reproducible WAV preview.

## Validation

Production build and gameplay / controller tests; deterministic, non-silent, unclipped loop / effects checks; browser rendering and pointer accuracy at low resolution; readable desktop and phone controls; audio activation / mute without browser errors; CI deployment from main and public revision verification.
