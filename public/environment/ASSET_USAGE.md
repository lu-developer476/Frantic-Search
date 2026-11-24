# Inventario de recursos ambientales activos

Este inventario refleja las referencias de ejecución en `src/rendering/ImageParallax.js`, `src/rendering/EnvironmentAssets.js`, `src/config/GameConfig.js` y `src/minigames/MinigameEnvironment.js`.

**Estado:** todos los PNG/GIF que permanecen en `public/environment/maps/**` y `public/environment/tilesets/**` están conectados al renderizado de la campaña o de los minijuegos. No quedan imágenes ambientales sin referencias de ejecución en esas carpetas.

## Campaña

| Sección | Entorno | Recursos solicitados |
| --- | --- | --- |
| Apertura y prólogo de Brisa | `redwood` | Parallax `maps/parallax/forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 1. Coastal Highway | `coastal` | Parallax `forestbg-layer9.png`, `layer8.png` y `layer7.png` con tinte celeste; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 2. Redwood Frontier | `redwood` | Parallax `forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 3. Poacher Black Site | `black-site` | Capas oscuras `maps/forest/Back.png`, `middle.png` y `front.png`; superficies de `tileset-export_0.png` y objetos de instalación. |
| 4. Containment Perimeter | `containment` | Las tres capas de `maps/forest/` oscurecidas; superficies teal de `tileset-export.png` y sprites de láser. |
| 5. Brisa Containment | `rosa-containment` | Las tres capas de `maps/forest/` con tinte azul; recortes violeta/gris de `tileset-export.png`, bloques de `tileset.png` y consolas/botón. |
| 6. Extraction Zone | `extraction` | Parallax Redwood con tinte naranja; `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`; portal de extracción. |

### Sprites de instalación activos

Los seis archivos de `maps/facility/` utilizados por el catálogo de recortes y el renderizado de campaña son:

- `crates_spritesheet.png`: cajas y obstáculos.
- `doodads_spritesheet.png`: señales y objetos de instalación.
- `computer_spritesheet.png`: estados de consolas.
- `lasers_spritesheet.png`: barreras láser de arenas de jefes.
- `button_large_spritesheet.png`: botón de interacción.
- `portal_spritesheet.png`: portal de extracción.

### Tilesets activos

Los tres tilesets están conectados a `src/rendering/EnvironmentAssets.js`:

- `tileset-export_0.png`: superficies oliva/azules para `black-site`.
- `tileset-export.png`: superficies teal y paneles violeta para `containment` y `rosa-containment`.
- `tileset.png`: recortes grises para bloques y paredes de instalación.

## Minijuegos

| Minijuego | Entorno usado | Recursos solicitados |
| --- | --- | --- |
| Race y Persecution | `prairie` | Parallax `forestbg-layer8.png` y `layer7.png`; terreno y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| Hunting y Ambush | `redwood` (`LEVELS[1]`) | Parallax `forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; terreno y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |

Los minijuegos comparten los renderizadores de atmósfera y terreno de la campaña. No hay un mapa independiente por minijuego.

## Inventario restante

- `maps/facility/`: 6 spritesheets.
- `maps/forest/`: 3 capas (`Back.png`, `middle.png`, `front.png`).
- `maps/parallax/`: 10 imágenes (`bg-trees1.png` y las capas 1–5 y 7–10).
- `tilesets/`: 3 tilesets.

En total permanecen **22 imágenes ambientales**, todas utilizadas por al menos una sección de la campaña o un minijuego. Los archivos `.gitkeep` son marcadores de directorio, no recursos gráficos.
