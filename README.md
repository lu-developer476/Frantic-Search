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

Dialogue scenes pause the simulation. The campaign only completes after Rosa has been freed and reaches the extraction gate with the player.

## Interface, languages and environment modes

- The **Jugar / Play** action opens a dinosaur-selection dialog. The campaign starts only after the player confirms Violeta or Vasti.
- The hamburger menu contains the **sound toggle**, language selector (**Español / English**) and environmental mode selector.
- **Beige** applies a warm, sepia-toned treatment; **Gray** applies a cool, monochrome treatment directly to the game scene. The selected language and environmental mode are saved locally.
- The 320×180 internal render buffer is enlarged to the 960×540 logical canvas with nearest-neighbour sampling; characters, terrain, scenery and particles share the same pixel grid.
- The original campaign, physics, boss encounters, rescue and escort systems remain intact beneath the new arcade presentation.

## Characters and encounters

- **Violeta:** adult female Velociraptor with white hide, purple back, magenta dorsal stripe and golden-ochre eyes; fast movement, double jump and evasive dash.
- **Vasti:** Vastatosaurus rex from *King Kong* (2005), with a reinforced skull, olive-green, brown and beige hide, crocodilian armor scales and five-fingered forelimbs; heavy movement, ground shockwave and aerial ground-slam.
- **Rosa:** Violeta's juvenile Velociraptor offspring, sharing Violeta's white, purple and magenta family pattern; she becomes an escort companion after the facility systems are restored.
- **Ferrucutus Cerastes:** *King Kong* (2005) ceratopsian with a heavy quadrupedal body, spiked oval frill and paired nasal horns; ally that helps bridge selected gaps and attacks enemies during exposed windows.
- **Poachers:** state-driven patrol, investigation, pursuit and melee attack AI.
- **Indoraptor:** *Jurassic World: Fallen Kingdom* hybrid, with a lean black body, gold dorsal stripe and elongated clawed forelimbs; pounce and claw patterns with two phases.
- **Indominus Rex:** *Jurassic World* hybrid, with a massive pale body, elongated skull and prominent dorsal osteoderms; sonic roar, charge and tail sweep with two phases.

## Art, animation and audio — release 1.3.1

- Original self-contained, hard-edged pixel-art SVG sprites replace the former smooth vector illustrations. Characters are built from stepped pixel clusters and a limited arcade palette.
- Violeta and Vasti have distinct idle, two-frame run, jump and duck poses; Violeta also has a dash pose. Rosa, Ferrucutus, poachers, Indoraptor and Indominus Rex use matching pixel-art silhouettes. Species-specific anatomy and franchise-lineage metadata are covered by the automated suite.
- The sprites are rendered through a 320×180 low-resolution buffer and nearest-neighbour upscaling, matching the game's crisp 8-bit presentation.
- Sprite images are preloaded and cached; the Canvas geometry remains as a safe fallback if a sprite cannot load.
- Original adaptive soundtrack synthesized at runtime with Web Audio API. Themes change across the coast, forest, black site, facility, boss encounters, extraction and victory.
- Procedural sound effects for movement, damage, rescue and boss events.
- No remote music, image or font downloads are required at runtime.

## Performance and accessibility

- Fixed-step physics simulation at 60 Hz with a capped frame delta.
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
| Interact with terminal / Rosa | E or F | E |
| Pause | P | — |
| Advance story dialogue | Enter | Continue button |

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

The automated suite covers campaign gating, facility terminal interaction, Rosa escort, finite world generation, miniboss phases and hitboxes, sprite availability, sprite loading and adaptive music scheduling.

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
