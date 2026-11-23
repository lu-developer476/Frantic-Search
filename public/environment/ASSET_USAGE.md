# Clasificación de uso de recursos de entorno

Esta lista refleja las referencias de ejecución de `src/rendering/ImageParallax.js`, `src/rendering/EnvironmentAssets.js` y los controladores de minijuegos. **En uso** significa que el código solicita el recurso; no implica que todas las imágenes estén visibles en cada fotograma o en cada sección.

## Campaña

| Sección | Entorno | Recursos solicitados |
| --- | --- | --- |
| Apertura y prólogo de Brisa | `redwood` | Parallax `maps/parallax/forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 1. Coastal Highway | `coastal` | Parallax `forestbg-layer9.png`, `layer8.png` y `layer7.png` con tinte celeste; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 2. Redwood Frontier | `redwood` | Parallax `forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 3. Poacher Black Site | `black-site` | Capas oscuras `maps/forest/Back.png`, `middle.png` y `front.png`; superficie industrial de `tileset-export_0.png` y props de instalación. |
| 4. Containment Perimeter | `containment` | Las tres capas de `maps/forest/` oscurecidas; superficies teal de `tileset-export.png` y sprites de láser. |
| 5. Brisa Containment | `rosa-containment` | Las tres capas de `maps/forest/` con tinte azul; recortes violeta/gris de `tileset-export.png`, bloques de `tileset.png` y consolas/botones. |
| 6. Extraction Zone | `extraction` | Parallax de Redwood con tinte naranja; `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`; portal de extracción. |

### Recursos de instalación utilizados

Los siguientes archivos de `maps/facility/` están referenciados por el catálogo de recortes y el renderizado de campaña:

- `crates_spritesheet.png`: cajas y obstáculos.
- `doodads_spritesheet.png`: cubierta de seguridad, señales y extintor.
- `computer_spritesheet.png`: estados de consolas.
- `lasers_spritesheet.png`: límites láser de arenas de jefes.
- `button_large_spritesheet.png`: botón de interacción.
- `portal_spritesheet.png`: portal/marcador de extracción.

Los tres tilesets están en uso: `tileset-export_0.png` (superficies oliva/azules), `tileset-export.png` (superficies teal y paneles violeta) y `tileset.png` (recortes grises para bloques de instalación).

## Minijuegos

| Minijuego | Entorno usado | Recursos solicitados |
| --- | --- | --- |
| Race y Persecution | `prairie` | Parallax `forestbg-layer8.png` y `forestbg-layer7.png`; terreno y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| Hunting y Ambush | `redwood` (`LEVELS[1]`) | Parallax `forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; terreno y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |

Los minijuegos comparten los renderizadores de atmósfera y terreno de la campaña. No hay un mapa independiente por minijuego.

## Recursos presentes pero no referenciados actualmente

- `maps/parallax/forestbg-layer6.png`.
- `maps/parallax/forest-foreground-layer.png` (el primer plano sigue pendiente de integración).
- En `maps/facility/`: `blowdart_spritesheet.png`, `button_medium_spritesheet.png`, `button_small_spritesheet.png`, `computer_popup_spritesheet.png`, `computer_screen_large.png`, `dash_bar_spritesheet.png`, `doors-laboratory.gif`, `guard_notice.png`, `guard_orange_spritesheet.png`, `guard_white_spritesheet.png`, `guard_yellow_spritesheet.png`, `keyboard_indicators_spritesheet.png`, `noisemaker_large_spritesheet.png`, `noisemaker_small_spritesheet.png`, `orb_particles_spritesheet.png`, `orb_spritesheet.png`, `shadow.png` y `smoke_icon_spritesheet.png`.

Los archivos anteriores se conservan en el repositorio: quedan disponibles para futuras integraciones, pero no forman parte del renderizado actual. Los `.gitkeep` son marcadores de carpetas y no recursos visuales.
