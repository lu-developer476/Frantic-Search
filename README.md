# Frantic Search — Operation: Lost Hatchling #

**Version 1.3.1 · 2D pixel-art ambush-platformer · HTML5 Canvas · JavaScript · Vite**

Frantic Search is an unofficial fan-made dinosaur ambush-platformer. Play as Gala or Basilio, keep the other protagonist by your side, and rescue Brisa from a clandestine poaching and research operation.

## Additional game modes

- **Empty Stomach** is an endless ambush minigame starring Coral, the miniraptor in `miniraptor-run.gif`. Escape the xenoraptors and velociraptors while Parasaurolophus, Brontosaurus and Ligocristus Innocens appear in the ambient prairie herd and cross the playable lanes; predators can hunt and eat every herd species. The run has no finish line: it ends only when a predator catches Coral. Distance is scored and the personal best is stored locally.
- **Time Attack** is a finite hunting time trial. Control one hunter alongside three AI teammates, eliminate all 14 Venatosaurus across four waves, and reach extraction. The fastest successful completion is stored locally.
- **Ambush** is an endless arena with progressive waves. Play as an armed hunter against Venatosaurus, or choose Gala / Basilio to fight poachers. Enemy count, health and pressure increase over time; every second cleared wave restores one health point. Personal bests are saved separately for each role.

## Campaign

Before Chapter 1, a playable forest prologue lets the player control Brisa as she explores toward a poachers' jeep. Her capture triggers a short cinematic: Gala wakes, follows the tire tracks and helps Basilio defeat a Venatosaurus. Gala and Basilio then agree to rescue Brisa together.

The finite campaign runs through six chapters:

1. **Coastal Highway** — follow the poacher convoy.
2. **Redwood Frontier** — survive the forest route and encounter the Indoraptor.
3. **Poacher Black Site** — breach the clandestine complex.
4. **Containment Perimeter** — defeat the Indominus Rex.
5. **Brisa Containment** — restore auxiliary power, release the security lock and free Brisa.
6. **Extraction Zone** — escort Brisa to the east gate and complete the rescue.

Narrator interludes pause the simulation so the player can read the story and events. Dinosaurs never speak; all campaign text is delivered in third-person narration. The campaign only completes after Brisa has been freed and reaches the extraction gate with the player.

## Interface, languages and environment modes

- The **Jugar / Play** action opens a dinosaur-selection dialog. The campaign starts only after the player confirms Gala or Basilio.
- The hamburger menu contains the **sound toggle**, language selector (**Español / English**) and environmental mode selector.
- **Beige** applies a warm, sepia-toned treatment; **Gray** applies a cool, monochrome treatment directly to the game scene. The selected language and environmental mode are saved locally.
- The game renders directly to its 960×540 logical Canvas; pixel-art sprites retain nearest-neighbour sampling and share the scene's coordinate system.
- The original campaign, physics, boss encounters, rescue and escort systems remain intact beneath the new arcade presentation.
- Story passages are displayed one paragraph at a time. The narrator overlay suspends gameplay until the player advances with Enter or the Continue control; all text is localized in Spanish and English.


## Characters and encounters

- **Gala:** adult female Velociraptor with white hide, purple back, magenta dorsal stripe and golden-ochre eyes; fast movement, double jump and evasive dash. Her name carries the sense of distinction or display, reflecting the exotic, genetically modified colour pattern produced by human intervention and the magnificence of human capability.
- **Basilio:** Vastatosaurus rex from *King Kong* (2005), redesigned from `public/references/vastatosaurus-rex.jpg`: low, long-bodied profile, broad blunt skull, long tapering tail, short three-fingered forelimbs, powerful hind legs and muted olive-grey/brown hide with a sand-coloured underside; heavy movement, ground shockwave and aerial ground-slam. His name comes from Greek *basileus* (“king”), the same root found in *Basilosaurus* (*basileus* + *sauros*, “king lizard”).
- **Brisa:** Gala's juvenile Velociraptor offspring, sharing Gala's white, purple and magenta family pattern; she becomes an escort companion after the facility systems are restored and lunges through crates that block her route. Her name recalls the events leading to her capture, her agility and the curiosity of a young raptor.
- **Ferrucutus Cerastes:** *King Kong* (2005) ceratopsian with a heavy quadrupedal body, spiked oval frill and paired nasal horns; ally that helps bridge selected gaps and attacks enemies during exposed windows.
- **Poachers:** state-driven patrol, investigation, pursuit and ranged attack AI (they only fire projectiles, never melee); defeated poachers become edible food sources.
- **Venatosaurus:** both reference variants spawn as frequent territorial enemies. They jump while patrolling and pursuing, and use a fast pouncing charge against nearby targets. They hunt the protagonists, attack other Venatosaurus and can hunt Ligocristus.
- **Ligocristus Innocens:** procedural prey with its own health and four animated reference GIFs for idle, walking, running and jumping. Gala can defeat it with her dash, while Basilio can crush it with his stomp. Defeated Ligocristus fade out as translucent carcasses that the player, autonomous companions and Venatosaurus can consume to restore health. They can also appear as edible prey in Empty Stomach.
- **Indoraptor:** *Jurassic World: Fallen Kingdom* hybrid with a lean black body, gold dorsal stripe and elongated clawed forelimbs. Its eight-part rig supports both supplied generations: black-and-gold first generation and ivory-and-turquoise second generation, which appears at the existing phase-two health threshold. Pounce, claw, jump and feeding poses are supported.
- **Indominus Rex:** *Jurassic World* hybrid, with a massive pale body, elongated skull and prominent dorsal osteoderms; sonic roar, charge and tail sweep, then a directional ground shockwave in its enraged phase.
- **Boss combat:** encounters use readable wind-ups, attack-specific hitboxes and punish windows. Phase two adds a distinct move for each species; successfully evading an attack extends its recovery, while Basilio's ground shockwave only hits a grounded boss.

## Art, animation and audio — release 1.3.1

- Static PNG files in `public/references` remain the canonical artwork for still-reference characters. Ligocristus Innocens uses its four animated reference GIFs; GIF frames are decoded and drawn at the intended scale without changing collision boxes.
- Gala, Brisa, Basilio, Ferrucutus, Indoraptor and Indominus use their corresponding reference PNGs. Indoraptor and Indominus automatically switch to their second-generation PNG when their existing boss health phase changes.
- Every canonical reference PNG and animated GIF is preloaded and registered. Brontosaurus appears as ambient wildlife in the coastal and redwood chapters; Ligocristus is an animated food source and a possible prey animal in Empty Stomach; both Venatosaurus variants are active enemies; Stegoceratops is the special allied charge.
- The four legacy Velociraptor GIFs are also cached as motion references; the canonical PNG character art remains the rendered source so the in-game designs stay visually consistent with the updated environments.
- The campaign spans seven sections with individually configured lengths from 5,000 to 7,800 world units (48,400 units of generated terrain in total). Chapter boundaries, boss arenas, rescue points, wildlife, hazards, facility objectives and extraction are positioned against each section's actual length. Five Ferrucutus cages and two captive-carrying poacher encounters remain spaced across the first five sections; ordinary guards add combat encounters without adding rescue objectives.
- Single-image characters still react to game states: idle breathing, running bounce, jump lean, attack wind-up, recoil, landing, recovery, feeding motion and defeat poses. These are lightweight Canvas transforms; they do not pretend to articulate separate limbs when the source is a single complete PNG.
- Every campaign start introduces Gala and Basilio together from the left before control is handed to the selected protagonist. At chapter boundaries they leave to the right and enter the next chapter from the left; the final extraction includes Brisa.
- Press **C** to summon Stegoceratops. It charges across the full screen, defeats ordinary enemies and deals one point of damage to bosses. Cooldown: 30 seconds.
- Existing gameplay actions remain active: Gala's dash and double jump, Basilio's stomp and aerial slam, Ferrucutus' bridge and ally attacks, Brisa's companion behaviour, and both bosses' attack patterns.
- PNGs are preloaded and cached. If a reference image cannot be read, the renderer falls back to the existing sprite/fallback path rather than changing physics or character behaviour.
- Original adaptive soundtrack synthesized at runtime with Web Audio API. Themes change across the coast, forest, black site, facility, boss encounters, extraction and victory.
- Procedural sound effects for movement, damage, rescue and boss events.
- No remote music or image downloads are required at runtime. Interface typography loads Barlow, Barlow Condensed and IBM Plex Mono from Google Fonts, with system fallbacks.

## Collectibles, rewards and secondary objectives

- Twelve optional amber fossil fragments appear across outdoor chapters. Each restores one health point when possible; six raise maximum health from five to six, and completing the full survey restores health.
- Three optional research drives are hidden in the black-site and containment areas. Recovering all three reduces Stegoceratops' support cooldown from 30 to 24 seconds.
- Progress appears beneath the main mission objective. These tasks never block campaign progression.
- Collected items, the health-capacity reward and support upgrade persist in continue, checkpoint and retry snapshots.

## Campaign persistence

- Campaign progress is stored locally in the browser and can be resumed from the start screen.
- Automatic saves are written at chapter entries, unlocked checkpoints and safe intervals while the player is grounded and no boss encounter is active.
- A save preserves the selected protagonist, procedural world seed, campaign objectives and story queue, defeated boss flags, Brisa's rescue state, Ferrucutus rescues, player health and checkpoint/retry positions.
- Continue restores the saved route and campaign state. The saved campaign can also be deleted from the start screen; best distance, total rescues and other preferences remain intact.

## Performance and accessibility

- Fixed-step physics simulation at 60 Hz with a capped frame delta.
- World sections are procedurally varied from a per-run seed; reusing a seed reproduces the same platforms, hazards and wildlife placements.
- World sections and off-screen encounter entities are pruned as the camera advances.
- Canvas rendering is limited to visible world actors; transient particles are capped.
- Production builds target ES2022, minify JavaScript and CSS, and omit source maps.
- Reduced-motion preferences are respected by the interface.
- Keyboard and touch controls are supported.

## Empty Stomach controls

| Action | Keyboard |
|---|---|
| Move | A / D or ← / → |
| Jump | Space / ↑ / W |
| Exit minigame | Esc |

## Time Attack controls

| Action | Keyboard / mouse |
|---|---|
| Move | A / D or ← / → |
| Jump | W / ↑ |
| Fire | Space / F or left mouse button |
| Pause / resume | P |
| Exit minigame | Esc |

## Ambush controls

| Role | Controls |
|---|---|
| Hunter | A / D or arrows to move · Space to jump · F or left mouse button to fire |
| Gala / Basilio | A / D or arrows to move · Space to jump · X to use the character ability |
| Both | P to pause · Esc to exit |

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | A / D or ← / → | ← / → |
| Jump | Space / W / ↑ | ↑ |
| Character ability | X | X |
| Stegoceratops special ally | C | — |
| Interact with terminal / Brisa | E or F | E |
| Pause | P | — |
| Advance narrator text | Enter | Continue button |

## Local development

Requires Node.js **20.19+** or **22.12+**.

```bash
npm install
npm run dev
```

## Tests and production build

The project uses Node's built-in test runner; no test framework dependency is required.

```bash
npm test
npm run build
npm run preview
# or run tests and build in one command
npm run check
```

The automated suite covers campaign gating, facility terminal interaction, Brisa escort, finite world generation, deterministic collectible placement and save validation, chapter-scaled Ferrucutus captive counts, wildlife enemy behaviour, boss phases, attack patterns, dodge recovery and hitboxes, Time Attack wave planning and completion timing, Ambush wave scaling, wave-clear gates and record handling, sprite availability, sprite loading and adaptive music scheduling.

## Deploy to Vercel

The repository includes `vercel.json` with Vite framework detection, `npm run build`, and the `dist` output directory.

1. Import `lu-developer476/Frantic-Search` into Vercel.
2. Select **main** as the Production Branch.
3. Keep the Vite build settings: Build Command `npm run build`, Output Directory `dist`.
4. Deploy.

Vercel uses the root asset path (`/`). After Git integration is connected, pushes to `main` trigger production deployments and other branches can be used for previews.

## Repository scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Vite development server |
| `npm test` | Automated Node.js tests |
| `npm run build` | Production build for Vercel |
| `npm run preview` | Preview the last production build |
| `npm run check` | Run tests and root production build |

## Originality and rights

This is an unofficial fan-made project and is not affiliated with Universal Products & Experiences or Amblin Entertainment. Character sprites and soundtrack are original assets created for this project. The visual direction takes inspiration from classic 8-bit side-scrolling arcade runners; no assets, sprites, code or music from Pixeljam's Dino Run are included.


## Procedural environment scenery

- Outdoor sections generate deterministic far and mid tree layers from the world seed, with separate species, silhouettes, size ranges and density for the coast, redwood frontier, black-site perimeter, containment campus and extraction route.
- Ground details such as ferns, fallen logs, driftwood, rocks, shrubs, stumps, planters and rubble add biome-specific context.
- Scenery generation uses independent random streams and protected gameplay zones, so decorative placement does not reshuffle platforms, enemy encounters or rescue objectives.
- Brisa's indoor containment environment intentionally remains free of outdoor vegetation.

## Clasificación del tamaño de los dinosaurios

El tamaño físico de cada dinosaurio sale de un único módulo, `src/config/DinosaurSizing.js`:

1. **Especie → clase de tamaño** según su longitud real: `tiny` (<2 m), `small` (<4 m), `medium` (<6 m), `large` (<10 m), `huge` (<18 m), `colossal`. Las bandas de píxeles de cada clase no se solapan, así que una especie más grande nunca se dibuja más chica que una de una clase menor.
2. **Nivel de detalle del arte → posición dentro de la banda**: el arte de baja resolución o plano se dibuja hacia el extremo inferior, el de alta resolución hacia el superior.
3. El hitbox se deriva del tamaño dibujado según el rol (jugable, criatura, jefe, aliado). Los jugables tienen un hitbox acotado para que el juego siga siendo justo.

| Dinosaurio | Clase | Detalle | Dibujado | Hitbox |
|---|---|---|---|---|
| Brisa (juvenil) | tiny | bajo | 70 | 48×48 |
| Ligocristus | tiny | estándar | 78 | 64×45 |
| Venatosaurus impavidus | small | bajo | 101 | 83×68 |
| Gala (raptor adulta) | small | alto | 125 | 69×67 |
| Venatosaurus saevidicus | medium | alto | 162 | 133×109 |
| Indoraptor | medium | alto | 162 | 133×124 |
| Ferrucutus | large | estándar | 188 | 169×101 |
| Stegoceratops | large | alto | 199 | 179×106 |
| Basilio (V-Rex) | huge | bajo | 222 | 112×99 |
| Indominus rex | huge | alto | 270 | 221×148 |
| Brontosaurus | colossal | estándar | 340 | 300×178 |

Para agregar un dinosaurio, sumá un perfil en `DINOSAUR_SIZE_PROFILES`; las jaulas (`getContainmentCageSize`) se adaptan solas.
