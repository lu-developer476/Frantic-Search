# AVOID — Operation: Lost Hatchling

A fan-made 2D survival-platformer prototype. Built with HTML5 Canvas 2D, vanilla JavaScript ES modules, CSS3 and Vite.

## Premise

Blue and Vasti are the two playable protagonists. Choose which dinosaur to control; the other remains alongside them. Their mission is to rescue Beta from poachers transporting her toward an illegal wildlife-trading operation. Ferrucutus Cerastes allies and boss encounters featuring Indoraptors and Indominus Rexes remain planned campaign features.

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

\`\`\`bash
npm install
npm run dev
\`\`\`

## Production

\`\`\`bash
npm run build
npm run preview
\`\`\`

Vercel configuration: Framework Preset **Vite**, Build Command **npm run build**, Output Directory **dist**.

## Controls

- A / D or Left / Right: move horizontally
- Space / Arrow Up / W: jump
- Arrow Down / S: duck while grounded
- X: character-specific ability
- P: pause
- Pointer / touch on the game area: jump

## Platformer engine — 0.2.0

- Side-scrolling camera follows the controlled dinosaur.
- Horizontal movement, acceleration, gravity and landing on one-way platforms.
- Floating ledges, floor segments and traversable gaps.
- Coyote-time jump input and Blue's double jump.
- Blue: short evasive dash with a brief damage window.
- Vasti: ground shockwave or aerial ground-slam; nearby obstacles can be destroyed.
- Collision detection is separated from movement and physics.
- Procedurally streamed world sections extend as the player advances.
- Both protagonists remain visible; the unselected dinosaur follows the controlled character.
- Three biome palettes, obstacle encounters, distance tracking and local records.
- Web Audio sound effects and LocalStorage persistence.

## Known limitations

- The world is still an endless sequence of generated sections, not yet a finite campaign with checkpoints.
- Obstacles are prototype geometry; hunters are not yet animated enemies with AI.
- Rescues are still represented by passing hunter encounters; Beta is not yet an interactable entity.
- No Ferrucutus ally sequence or boss AI is implemented yet.
- Visuals are original Canvas geometric placeholders, not final character art.
- A production build and browser playtest still need to be run in an environment with package registry access.

## Planned campaign milestones

1. Platform movement, physics, character abilities and terrain — implemented in 0.2.0.
2. Level objectives, checkpoints, enemy AI and combat feedback.
3. Ferrucutus Cerastes ally encounters and traversal assistance.
4. Indoraptor and Indominus Rex boss encounters.
5. Beta rescue finale, narrative sequences and campaign save data.
6. Visual/audio polish, balancing and deployment.

## Originality and rights

This is an unofficial fan-made implementation and is not affiliated with Universal Products & Experiences or Amblin Entertainment. Prototype visuals are generated with original Canvas geometry; no Pixeljam game assets, source code, sprites or audio are copied. Any future franchise-inspired artwork will be original placeholder/fan art rather than extracted material.
