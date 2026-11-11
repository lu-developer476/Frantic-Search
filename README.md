# AVOID — Operation: Lost Hatchling

A fan-made 2D survival-platformer built with HTML5 Canvas 2D, vanilla JavaScript ES modules, CSS3 and Vite.

## Story

Blue and Vasti pursue a poacher convoy carrying Beta toward an unregistered research complex. The campaign follows the trail from the coastal highway through the redwood frontier and into a clandestine containment facility. The objective is to defeat the apex threats, restore the facility systems, release Beta and escort her to the east extraction gate.

## Stack

- HTML5 Canvas 2D
- Vanilla JavaScript (ES modules)
- CSS3
- Web Audio API (procedural sound effects)
- LocalStorage (settings and campaign completion statistics)
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
- X: character-specific ability (Blue dash / Vasti stomp)
- E / F: interact with terminals and Beta
- P: pause
- Pointer / touch on the game area: jump
- Mobile touch controls: move, jump, use ability and interact

## Platformer engine — 0.2.0

- Side-scrolling camera, horizontal movement, acceleration, gravity and one-way platform landings.
- Floating ledges, floor segments, traversable gaps and coyote-time jump input.
- Blue: double jump and evasive dash.
- Vasti: ground shockwave and aerial ground-slam.
- Fixed-step simulation at 60 Hz and streamed world sections.
- Both protagonists remain visible; the unselected dinosaur follows the controlled character.

## Allies and enemies — 0.3.0

- Ferrucutus Cerastes scouts selected sectors, bridges certain floor gaps and charges nearby poachers.
- Poachers use patrol, investigate, pursue, telegraph, attack, stun and defeat states.
- Hunters have health; defeating a carrier releases a captive and increments the rescue counter.
- Player integrity, temporary post-hit invulnerability, collision feedback and audio cues.

## Miniboss encounters — 0.4.0

- Indoraptor encounter: pounce and claw patterns with a faster second phase.
- Indominus Rex encounter: sonic roar, charge and tail sweep with a faster second phase.
- Arena boundaries, clear attack telegraphs, boss health bars, vulnerability windows and phase cues.
- Blue, Vasti and Ferrucutus can damage bosses during exposed recovery windows.

## Narrative campaign — 0.5.0

- Opening briefing and chapter scenes pause gameplay until the player advances the dialogue.
- Campaign chapters: Coastal Highway, Redwood Frontier, Poacher Black Site, Containment Perimeter, Beta Containment and Extraction Zone.
- Facility exteriors, security fences, perimeter lighting, containment structures and an east extraction gate are rendered as world scenery.
- The final facility is a finite level segment; world generation stops at the extraction area.
- Two interactive terminals control the auxiliary power relay and containment security lock. The security terminal stays locked until power is restored.
- Beta is a distinct hatchling entity. She appears confined in cell block C, can be freed only after both systems are online and the Indominus Rex is defeated, then follows the player.
- The campaign completes only when the rescued Beta reaches the extraction gate with the player.
- A final narrative sequence confirms the rescue and saves campaign-completion statistics locally.
- E / F and the on-screen mobile interaction control activate the terminals and release Beta.

## Known limitations

- This is a finite prototype campaign, not yet a full production-length game with multiple branching paths or replayable mission selection.
- Narrative is delivered through dialogue panels; there are no voiced performances or cinematic camera sequences yet.
- Facility structures, Beta and dinosaur models use original Canvas geometry placeholders rather than final illustrated sprites.
- The extraction finale is a playable objective, but there is no persistent world map, chapter select or New Game+ system yet.
- A production Vite build and end-to-end browser playtest still need to run in an environment with package registry access.

## Planned next steps

1. Replace geometric character placeholders with original sprite sheets and animation states.
2. Add mission-specific checkpoints, save/resume and campaign chapter selection.
3. Add richer stealth, environmental puzzles and poacher weapon behaviours.
4. Polish narrative presentation, sound design, difficulty and accessibility.
5. Run production build, cross-browser playtests and deploy to Vercel.

## Originality and rights

This is an unofficial fan-made implementation and is not affiliated with Universal Products & Experiences or Amblin Entertainment. Prototype visuals are generated with original Canvas geometry; no Pixeljam game assets, source code, sprites or audio are copied. Any franchise-inspired artwork is original fan art rather than extracted material.
