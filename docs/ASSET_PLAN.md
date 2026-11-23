# Plan de assets: audio, tilesets y mapas

Decisiones para reemplazar lo generado por código (música/SFX de Web Audio y escenarios dibujados con Canvas) por assets reales, según la historia de la campaña y los minijuegos.

## 1. Estado actual (hallazgos)

- `public/audio/{music,sfx,ambient}` están **vacías** (solo `.gitkeep`). `SampleBank` ya soporta samples opcionales con fallback sintetizado, pero nada se carga todavía.
- La **música** es 100 % procedural (`MusicManager`/`AdaptiveMusic`, 8 temas). No existe un camino para reproducir música desde archivo.
- Hay assets visuales en `public/environment/` que **ningún `.js` referencia**: `tilesets/` (3 PNG), `maps/forest` (3 capas), `maps/parallax` (12 capas), `maps/facility` (spritesheets + `doors-laboratory.gif`).
- Escenario (`AtmosphereRenderer`, `TerrainRenderer`, `EnvironmentAssets`): armado solo con los assets de `public/environment/**`, con un tema por `environment` (`coastal`, `redwood`, `black-site`, `containment`, `rosa-containment`, `extraction`, `prairie`). Se eliminó la generación procedural (`VegetationRenderer`, `SceneryGenerator`, `SceneryRenderer`, clima/viento/motas).

## 2. Decisión de tilesets y mapas

### Campaña (6 capítulos + prólogo)

| Sección | `environment` | Fondo / parallax | Tileset de suelo y plataformas | Objetos |
| --- | --- | --- | --- | --- |
| Prólogo (Brisa, bosque) | `redwood` | `forest/Back`, `middle`, `front` (3 capas grises, teñidas con `multiply` a verde/ocre de atardecer) | Suelo con `parallax/forestbg-layer1..4` (franjas de pasto) | Arbustos de `layer1/2` |
| 1. Coastal Highway | `coastal` | **Sin asset en el repo.** Se necesita un set costero CC0 (acantilado + mar + cielo). Mientras tanto: `parallax/layer7-9` teñidas con celeste como colinas lejanas | Franjas de pasto `layer1..4` + piedra de `tileset.png` para la ruta | — |
| 2. Redwood Frontier | `redwood` | `parallax/layer10` (más lejano) → `layer9` → `layer8` → `layer7` → `layer5` (árboles grandes) → `forest-foreground-layer` (primer plano, velocidad > 1) | Franjas `layer1..4` | `bg-trees1` como árbol de borde/obstáculo |
| 3. Poacher Black Site | `black-site` | `forest/Back` + `middle` oscurecidos (bosque que rodea el complejo) | `tilesets/tileset-export_0.png` (placas oliva/azul, paneles con remaches) | `facility/crates`, `doodads` (cartel de riesgo, extintor), `lasers` |
| 4. Containment Perimeter | `containment` | `forest/front` como silueta + cielo ceniza | `tilesets/tileset-export.png` (bloques teal con franjas de peligro amarillas) para muros del perímetro | `lasers`, `noisemaker`, `button_*` |
| 5. Brisa Containment | `rosa-containment` (interior) | Pared de fondo con `tileset-export.png` (paneles violeta/gris, consolas) | Mismo tileset, piso de rejilla | `computer_*` → `FacilityConsole`; `button_*` para el cerrojo; `doors-laboratory.gif` para la puerta de la celda de Brisa; `orb`/`portal` para el efecto de energía restaurada |
| 6. Extraction Zone | `extraction` | Parallax del cap. 2 con tinte naranja de atardecer (coherente con `sky: #f0a66f`) | Franjas `layer1..4` + reja/puerta de `tileset-export_0` para la puerta este | `portal` como luz de la extracción |

Los guardias de `facility/guard_{white,yellow,orange}_spritesheet.png` quedan **solo como referencia de silueta humana** para los poachers: el estilo es otro (16 px) y no coincide con los dinosaurios de `references/`.

### Minijuegos

| Minijuego | Escena (`MINIGAME_ENVIRONMENT_SCENES`) | Decisión |
| --- | --- | --- |
| Empty Stomach (Race/Persecution) | `prairie` | Pradera abierta: `parallax/layer7` + `layer8` (colinas con árboles) y `layer1..4` como franjas de carrera por carril. Sin primer plano oscuro para no tapar a la manada. |
| Time Attack (Hunting) | `LEVELS[1]` redwood | Parallax completo del cap. 2 (`layer10 → 5`) más `forest-foreground-layer`. |
| Ambush | `LEVELS[1]` redwood | Arena más cerrada: `forest/Back + middle + front` oscurecidos (más tensión que en Time Attack) y suelo `layer1..4`. |

### Pendientes de assets (no están en el repo)

- Capítulo 1 costero (mar, acantilado, autopista).
- Tileset exterior para plataformas flotantes del bosque (hoy solo hay franjas de pasto).
- Si se quiere un set 100 % consistente, usar un pack pixel-art CC0 (p. ej. de Kenney u OpenGameArt) y **confirmar licencia y tamaño de tile** antes de incluirlo; todos los tiles deben ser múltiplos del mismo tamaño (`public/environment/README.md`).

## 3. Decisión de audio

### Música (hoy procedural → archivos `.ogg` en loop)

| Tema (`musicTheme`) | Dónde suena | Carácter elegido |
| --- | --- | --- |
| `coastal` | Cap. 1 | Pulso medio, tensión de persecución, sin melodía brillante |
| `forest` | Prólogo, cap. 2 | Ambiental, cuerdas/percusión suave, misterio |
| `industrial` | Caps. 3 y 4 | Ritmo mecánico, sintetizadores graves |
| `facility` | Cap. 5 | Lento, mínimo, suspense (88 bpm en la versión procedural) |
| `boss` | Indoraptor e Indominus Rex | Rápido, percusivo, graves (128 bpm) |
| `extraction` | Cap. 6 | Épico y esperanzador, sube de intensidad |
| `victory` / `defeat` | Final / derrota | Stinger corto (5–15 s), sin loop |
| `minigame-chase` | Empty Stomach | Tempo alto, ritmo constante |
| `minigame-combat` | Time Attack y Ambush | Percusión marcada, sube con las oleadas |

Pistas candidatas: OpenGameArt/Kenney para CC0, o autores con CC-BY (requieren crédito en `CREDITS.md`). **No incluí ningún archivo**: elegir cada pista concreta y verificar su licencia antes de publicar.

### Ambientes en loop (ya definidos en `CREDITS.md`)

Se mantienen `coastal`, `forest`, `industrial`, `facility`, `extraction`. Se agregan `prairie` (reutilizar `forest.ogg` con menos volumen más viento) para Empty Stomach.

### Efectos nuevos propuestos

| Evento | Archivo | Origen sugerido |
| --- | --- | --- |
| Dash de Gala | `sfx/dash.ogg` | Kenney (whoosh) |
| Pisotón / golpe de suelo de Basilio | `sfx/stomp.ogg` | Kenney impacto grave |
| Disparo del cazador / poacher | `sfx/shot.ogg` | Kenney / 80 CC0 creature SFX |
| Rugido por especie (Venatosaurus, Indoraptor) | `sfx/roar-*.ogg` | 80 CC0 creature SFX |
| Comer (carcasas, presas) | `sfx/eat.ogg` | 80 CC0 creature SFX |
| Terminal / consola / cerrojo | `sfx/terminal.ogg`, `sfx/door.ogg` | Kenney Sci-Fi Sounds |
| Jaula de Ferrucutus abierta | `sfx/cage-open.ogg` | Kenney Sci-Fi Sounds |
| Carga de Stegoceratops | `sfx/stego-charge.ogg` | T-rex calls / rubberduck |
| Checkpoint | `sfx/checkpoint.ogg` | Kenney Digital Audio |
| Pausa / menú | `sfx/ui-click.ogg` | Kenney Interface Sounds |

Los eventos ya existentes (`jump`, `collect`, `hit`, `rescue`, `boss-*`) conservan sus nombres en `src/audio/sample-manifest.js`.

## 4. Qué falta hacer en código (en orden)

1. **Audio**: descargar los `.ogg` elegidos a `public/audio/**` y completar `CREDITS.md`. El manifiesto ya admite los nombres nuevos.
2. **Música desde archivo**: `MusicManager`/`AdaptiveMusic` solo sintetizan. Hay que añadir un camino que reproduzca `music-<tema>` con `SampleBank.play(..., { loop: true })` y mantenga el *duck*/pausa actuales; el procedural queda como fallback.
3. **Métodos de `AudioManager`** para los SFX nuevos (`dash`, `stomp`, `shot`, `eat`, `terminal`, `door`, `cageOpen`, `stegoCharge`, `checkpoint`) con fallback a `tone()`, y llamarlos desde los sistemas que hoy no suenan.
4. **Cargador de imágenes de entorno** (parecido a `SpriteRenderer`) que precargue tilesets y capas y cachee patrones; `AtmosphereRenderer`/`TerrainRenderer` dibujan la imagen si está cargada y, si no, el código actual.
5. **Parallax por capas** con velocidades (más lejos = más lento) y teñido por capítulo con `globalCompositeOperation`.
6. Actualizar tests (`sprites-and-music`, `terrain-renderer`, `atmosphere-renderer`, `audio-samples`) para cubrir ambos caminos (con asset y fallback).

## 5. Estado de implementación

Hecho en código:
- `src/rendering/ImageParallax.js`: carga las capas reales, hace color-key del fondo y las dibuja con parallax para los siete entornos (`coastal` reutiliza las capas del bosque teñidas de celeste; `rosa-containment` las del bosque oscuro teñidas de azul). `AtmosphereRenderer` pinta el color de cielo plano y encima las capas; no hay horizonte procedural.
- `src/rendering/EnvironmentAssets.js`: catálogo único de recortes (tilesets, parallax, `facility/*`) y temas de terreno; cachea cada PNG y cada recorte una sola vez. `TerrainRenderer` rellena suelo, plataformas y rocas repitiendo esos recortes; `main.js` dibuja cajas, terminales, portal de extracción y láser de arena con los sprites de `facility/`.
- `AdaptiveMusic` reproduce `music-<tema>` desde archivo si existe, con el sintetizador como fallback.
- `AudioManager`: `dash`, `stomp`, `shot`, `eat`, `terminal`, `door`, `cageOpen`, `stegoCharge`, `checkpoint`. Conectados en `main.js`: dash, stomp, jaula, terminal y Stegoceratops.

Pendiente: foreground del parallax (`forest-foreground-layer.png`), llamadas a `shot`/`eat`/`door`/`checkpoint`, música de minijuegos y los archivos de audio en sí.
