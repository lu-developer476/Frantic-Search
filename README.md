# Frantic Search — Operation: Lost Hatchling

**Version 1.0.0 · 2D survival-platformer · HTML5 Canvas · JavaScript · Vite**

Frantic Search is an unofficial fan-made dinosaur survival-platformer. Play as Blue or Vasti, keep the other protagonist by your side, and rescue Beta from a clandestine poaching and research operation.

## Campaign

The finite campaign runs through six chapters:

1. **Coastal Highway** — follow the poacher convoy.
2. **Redwood Frontier** — survive the forest route and encounter the Indoraptor.
3. **Poacher Black Site** — breach the clandestine complex.
4. **Containment Perimeter** — defeat the Indominus Rex.
5. **Beta Containment** — restore auxiliary power, release the security lock and free Beta.
6. **Extraction Zone** — escort Beta to the east gate and complete the rescue.

Dialogue scenes pause the simulation. The campaign only completes after Beta has been freed and reaches the extraction gate with the player.

## Characters and encounters

- **Blue:** fast movement, double jump and evasive dash.
- **Vasti:** heavier movement, ground shockwave and aerial ground-slam.
- **Beta:** captive hatchling who becomes an escort companion after the facility systems are restored.
- **Ferrucutus Cerastes:** ally that helps bridge selected gaps and attacks enemies during exposed windows.
- **Poachers:** state-driven patrol, investigation, pursuit and melee attack AI.
- **Indoraptor:** pounce and claw patterns with two phases.
- **Indominus Rex:** sonic roar, charge and tail sweep with two phases.

## Art, animation and audio — release 1.0.0

- 16 original, self-contained SVG vector sprites for Blue, Vasti, Beta, Ferrucutus, hunters, Indoraptor and Indominus Rex.
- Separate player poses for idle, run cycles, jump, duck and dash.
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
| Interact with terminal / Beta | E or F | E |
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

The automated suite covers campaign gating, facility terminal interaction, Beta escort, finite world generation, miniboss phases and hitboxes, sprite availability, sprite loading and adaptive music scheduling.

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

This is an unofficial fan-made project and is not affiliated with Universal Products & Experiences or Amblin Entertainment. Character sprites and soundtrack are original assets created for this project. No assets, sprites, code or music from Pixeljam's Dino Run are included.
