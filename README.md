# Frantic Search — Operation: Lost Hatchling

**Version 1.3.1 · 2D pixel-art survival-platformer · HTML5 Canvas · JavaScript · Vite**

Frantic Search is an unofficial fan-made dinosaur survival-platformer. Play as Violeta or Vasti, keep the other protagonist by your side, and rescue Rosa from a clandestine poaching and research operation.

## Campaign

The finite campaign runs through six chapters:

1. **Coastal Highway** — follow the poacher convoy.
2. **Redwood Frontier** — survive the forest route and encounter the Indoraptor.
3. **Poacher Black Site** — breach the clandestine complex.
4. **Containment Perimeter** — defeat the Indominus Rex.
5. **Rosa Containment** — restore auxiliary power, release the security lock and free Rosa.
6. **Extraction Zone** — escort Rosa to the east gate and complete the rescue.

Narrator interludes pause the simulation so the player can read the story and events. Dinosaurs never speak; all campaign text is delivered in third-person narration. The campaign only completes after Rosa has been freed and reaches the extraction gate with the player.

## Interface, languages and environment modes

- The **Jugar / Play** action opens a dinosaur-selection dialog. The campaign starts only after the player confirms Violeta or Vasti.
- The hamburger menu contains the **sound toggle**, language selector (**Español / English**) and environmental mode selector.
- **Beige** applies a warm, sepia-toned treatment; **Gray** applies a cool, monochrome treatment directly to the game scene. The selected language and environmental mode are saved locally.
- The game renders directly to its 960×540 logical Canvas; pixel-art sprites retain nearest-neighbour sampling and share the scene's coordinate system.
- The original campaign, physics, boss encounters, rescue and escort systems remain intact beneath the new arcade presentation.

## Characters and encounters

- **Violeta:** adult female Velociraptor with white hide, purple back, magenta dorsal stripe and golden-ochre eyes; fast movement, double jump and evasive dash.
- **Vasti:** Vastatosaurus rex from *King Kong* (2005), redesigned from `public/references/vastatosaurus-rex.jpg`: low, long-bodied profile, broad blunt skull, long tapering tail, short three-fingered forelimbs, powerful hind legs and muted olive-grey/brown hide with a sand-coloured underside; heavy movement, ground shockwave and aerial ground-slam.
- **Rosa:** Violeta's juvenile Velociraptor offspring, sharing Violeta's white, purple and magenta family pattern; she becomes an escort companion after the facility systems are restored.
- **Ferrucutus Cerastes:** *King Kong* (2005) ceratopsian with a heavy quadrupedal body, spiked oval frill and paired nasal horns; ally that helps bridge selected gaps and attacks enemies during exposed windows.
- **Poachers:** state-driven patrol, investigation, pursuit and melee attack AI; defeated poachers become edible food sources.
- **Venatosaurus:** both reference variants spawn as frequent territorial enemies. They hunt the protagonists and fight other Venatosaurus.
- **Ligocristus Innocens:** procedural edible prey. Protagonists, companions and enemy dinosaurs can consume it or defeated poachers to restore health.
- **Indoraptor:** *Jurassic World: Fallen Kingdom* hybrid with a lean black body, gold dorsal stripe and elongated clawed forelimbs. Its eight-part rig supports both supplied generations: black-and-gold first generation and ivory-and-turquoise second generation, which appears at the existing phase-two health threshold. Pounce, claw, jump and feeding poses are supported.
- **Indominus Rex:** *Jurassic World* hybrid, with a massive pale body, elongated skull and prominent dorsal osteoderms; sonic roar, charge and tail sweep with two phases.

## Art, animation and audio — release 1.3.1

- The PNG files in `public/references` are the canonical in-game character artwork. The renderer loads them directly, detects their transparent bounds, and draws the cropped sprite at the correct scale without changing collision boxes.
- Violeta, Rosa, Vasti, Ferrucutus, Indoraptor and Indominus use their corresponding reference PNGs. Indoraptor and Indominus automatically switch to their second-generation PNG when their existing boss health phase changes.
- Every canonical reference PNG is preloaded and registered. Brontosaurus appears as ambient wildlife in the coastal and redwood chapters; Ligocristus is a food source; both Venatosaurus variants are active enemies; Stegoceratops is the special allied charge.
- The four legacy Velociraptor GIFs are also cached as motion references; the canonical PNG character art remains the rendered source so the in-game designs stay visually consistent with the updated environments.
- Ferrucutus captives are procedurally distributed in all six chapters, with a chapter-specific rescue cap (3, 3, 4, 2, 2, 2).
- Single-image characters still react to game states: idle breathing, running bounce, jump lean, crouch, attack wind-up, recoil, landing, recovery, feeding motion and defeat poses. These are lightweight Canvas transforms; they do not pretend to articulate separate limbs when the source is a single complete PNG.
- Every campaign start introduces Violeta and Vasti together from the left before control is handed to the selected protagonist. At chapter boundaries they leave to the right and enter the next chapter from the left; the final extraction includes Rosa.
- Press **C** to summon Stegoceratops. It charges across the full screen, defeats ordinary enemies and deals one point of damage to bosses. Cooldown: 30 seconds.
- Existing gameplay actions remain active: Violeta's dash and double jump, Vasti's stomp and aerial slam, Ferrucutus' bridge and ally attacks, Rosa's companion behaviour, and both bosses' attack patterns.
- PNGs are preloaded and cached. If a reference image cannot be read, the renderer falls back to the existing sprite/fallback path rather than changing physics or character behaviour.
- Original adaptive soundtrack synthesized at runtime with Web Audio API. Themes change across the coast, forest, black site, facility, boss encounters, extraction and victory.
- Procedural sound effects for movement, damage, rescue and boss events.
- No remote music, image or font downloads are required at runtime.

## Performance and accessibility

- Fixed-step physics simulation at 60 Hz with a capped frame delta.
- World sections are procedurally varied from a per-run seed; reusing a seed reproduces the same platforms, hazards and wildlife placements.
- World sections and off-screen encounter entities are pruned as the camera advances.
- Canvas rendering is limited to visible world actors; transient particles are capped.
- Production builds target ES2022, minify JavaScript and CSS, and omit source maps.
- Reduced-motion preferences are respected by the interface.
- Keyboard and touch controls are supported.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | A / D or ← / → | ← / → |
| Jump | Space / W / ↑ | ↑ |
| Duck | S / ↓ | — |
| Character ability | X | X |
| Stegoceratops special ally | C | — |
| Interact with terminal / Rosa | E or F | E |
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

The automated suite covers campaign gating, facility terminal interaction, Rosa escort, finite world generation, chapter-scaled Ferrucutus captive counts, wildlife enemy behaviour, miniboss phases and hitboxes, sprite availability, sprite loading and adaptive music scheduling.

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
