# AVOID — Operation: Lost Hatchling

A fan-made 2D survival-platformer prototype inspired by the side-scrolling runner genre. Built with HTML5 Canvas 2D, vanilla JavaScript ES modules, CSS3 and Vite.

## Premise
Blue and Vasti are the two playable protagonists. Choose which dinosaur to control; the other remains alongside them throughout the run. Their mission is to rescue Beta from poachers transporting her toward an illegal wildlife-trading operation. Ferrucutus Cerastes allies and boss encounters featuring Indoraptors and Indominus Rexes are planned campaign features.

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
- Space / Arrow Up / W: jump
- Arrow Down / S: duck
- P: pause
- Pointer / touch on the game area: jump

## Current prototype — 0.1.0
- Selectable Blue or Vasti.
- Both protagonists remain visible in every run.
- Procedural Canvas landscape with three biome palettes.
- Obstacles, collision detection, progressive speed and distance tracking.
- Poacher encounters count as rescued captives when passed.
- Procedural Web Audio sound effects.
- Local best-distance, rescue total, selected character and mute preference.
- Responsive mission UI and Vercel-ready Vite configuration.

## Planned campaign milestones
1. Distinct level layouts, checkpoints and objective-based progression.
2. Ferrucutus Cerastes ally encounters and traversal assistance.
3. Indoraptor and Indominus Rex boss encounters.
4. Beta rescue finale, narrative sequences and campaign save data.

## Originality and rights
This is an unofficial fan-made implementation and is not affiliated with Universal Products & Experiences or Amblin Entertainment. Prototype visuals are generated with original Canvas geometry; no Pixeljam game assets, source code, sprites or audio are copied. Any future franchise-inspired artwork will be original placeholder/fan art rather than extracted material.
