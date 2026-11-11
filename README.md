# AVOID — Operation: Lost Hatchling

A fan-made 2D survival-platformer prototype built with HTML5 Canvas 2D, vanilla JavaScript ES modules, CSS3 and Vite.

## Premise

Blue and Vasti are the two playable protagonists. Choose which dinosaur to control; the other remains alongside them. Their mission is to rescue Beta from poachers transporting her toward an illegal wildlife-trading operation. Ferrucutus Cerastes can assist with traversal and poacher encounters. Indoraptors and Indominus Rexes remain planned boss encounters.

## Stack

- HTML5 Canvas 2D
- Vanilla JavaScript (ES modules)
- CSS3
- Web Audio API (procedural sound effects)
- LocalStorage (local settings and records)
- Vite
- Vercel static hosting

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm run preview
```

Vercel configuration: Framework Preset **Vite**, Build Command **npm run build**, Output Directory **dist**.

## Controls

- A / D or Left / Right: move horizontally
- Space / Arrow Up / W: jump
- Arrow Down / S: duck while grounded
- X: character-specific ability (Blue dash / Vasti stomp)
- P: pause
- Pointer / touch on the game area: jump
- Touch controls on small screens: move, jump and use ability

## Platformer engine — 0.2.0

- Side-scrolling camera follows the controlled dinosaur.
- Horizontal movement, acceleration, gravity and landing on one-way platforms.
- Floating ledges, floor segments and traversable gaps.
- Coyote-time jump input and Blue's double jump.
- Blue: short evasive dash with a brief damage window.
- Vasti: ground shockwave or aerial ground-slam; nearby obstacles can be destroyed.
- Fixed-step simulation at 60 Hz and streamed world sections.
- Both protagonists remain visible; the unselected dinosaur follows the controlled character.

## Allies and enemies — 0.3.0

- Ferrucutus Cerastes appears in selected sectors and scouts ahead of the player.
- When a traversable floor gap is close, Ferrucutus moves into position and creates a temporary support bridge.
- Ferrucutus can charge nearby poachers and interrupt their attacks.
- Poachers use a state-driven AI: patrol, investigate, pursue, telegraph, attack, stun and defeat.
- Enemy attacks have a visible wind-up and a short lunge window.
- Blue can interrupt a hunter with her dash; Vasti can defeat nearby hunters with a ground shockwave or landing slam.
- Hunters have health and can be defeated. Defeating a carrier releases a captive and adds to the rescue counter.
- The player has three integrity points and temporary invulnerability after taking damage.
- Encounter actors and expired escort sections are pruned as the camera advances.
- Procedural Canvas silhouettes and sound cues communicate support, alerts, attacks, damage and rescues.

## Known limitations

- The world is still an endless sequence of generated sections, not yet a finite campaign with checkpoints.
- Ferrucutus and poachers use original geometric prototype art rather than final character models and animations.
- Poacher AI is currently melee-only; there are no ranged weapons, stealth systems or multi-wave encounter scripting.
- Rescued captives are represented by the rescue counter; Beta is not yet an interactable escort objective.
- Ferrucutus currently provides temporary bridge support and melee assistance; additional ally behaviors remain planned.
- Indoraptor and Indominus Rex boss logic is not implemented yet.
- A production build and browser playtest still need to be run in an environment with package registry access.

## Planned campaign milestones

1. Platform movement, physics, character abilities and terrain — implemented in 0.2.0.
2. Ferrucutus Cerastes support, hunter AI, combat feedback and captive release — implemented in 0.3.0.
3. Distinct level objectives, checkpoints and encounter scripting.
4. Indoraptor and Indominus Rex boss encounters.
5. Beta rescue finale, narrative sequences and campaign save data.
6. Visual/audio polish, balancing and deployment.

## Originality and rights

This is an unofficial fan-made implementation and is not affiliated with Universal Products & Experiences or Amblin Entertainment. Prototype visuals are generated with original Canvas geometry; no Pixeljam game assets, source code, sprites or audio are copied. Any future franchise-inspired artwork will be original fan art rather than extracted material.
