# Inventario de recursos ambientales activos

Este inventario refleja las referencias de ejecución de la campaña y los minijuegos en `main`.

**Estado actual:** permanecen 16 imágenes ambientales. Todas están conectadas al renderizado de la campaña o de al menos un minijuego. La carpeta `maps/facility/` fue eliminada; sus props de campaña se dibujan directamente con Canvas y no dependen de spritesheets externos.

## Campaña

| Sección | Entorno | Recursos solicitados |
| --- | --- | --- |
| Apertura y prólogo de Brisa | `redwood` | Parallax `maps/parallax/forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 1. Coastal Highway | `coastal` | Parallax `forestbg-layer9.png`, `layer8.png` y `layer7.png` con tinte celeste; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 2. Redwood Frontier | `redwood` | Parallax `forestbg-layer10.png`, `layer9.png`, `layer8.png`, `layer7.png` y `layer5.png`; suelo y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| 3. Poacher Black Site | `black-site` | Capas oscuras `maps/forest/Back.png`, `middle.png` y `front.png`; superficies de `tileset-export_0.png`. |
| 4. Containment Perimeter | `containment` | Las tres capas de `maps/forest/` oscurecidas; superficies teal de `tileset-export.png`. |
| 5. Brisa Containment | `rosa-containment` | Las tres capas de `maps/forest/` con tinte azul; recortes violeta/gris de `tileset-export.png` y bloques de `tileset.png`. |
| 6. Extraction Zone | `extraction` | Parallax Redwood con tinte naranja; `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |

Los edificios, vallas, consolas, cajas, portal de extracción y límites de las arenas de jefe se representan con dibujo nativo de Canvas. La lógica de consolas, rescate y extracción permanece; no se cargan sprites desde una carpeta `facility`.

## Minijuegos

| Minijuego | Entorno | Recursos solicitados |
| --- | --- | --- |
| Persecución / Empty Stomach | `forest` | Capas `maps/forest/Back.png`, `middle.png` y `front.png`; terreno forestal compartido. |
| Carrera / Breaking Race | `prairie` | Parallax `forestbg-layer8.png` y `layer7.png`; terreno y cobertura `bg-trees1.png` y `forestbg-layer1.png` a `forestbg-layer4.png`. |
| Cacería / Time Attack | `forest` | Capas dedicadas `maps/forest/Back.png`, `middle.png` y `front.png`, con tratamiento verde; terreno exterior Redwood. |
| Emboscada / Ambush | `forest` | Capas dedicadas `maps/forest/Back.png`, `middle.png` y `front.png`, con tratamiento verde; terreno exterior Redwood. |
| Combates / Dino Fightz | `forest` | Las mismas tres capas de bosque y terreno forestal compartido. La selección reserva diez posiciones para el plantel de dinosaurios. |

Persecución, Cacería, Emboscada y Combates utilizan la carpeta `maps/forest/`; Carrera conserva `prairie`. Los cinco minijuegos comparten los renderizadores de atmósfera y terreno. No hay un mapa independiente por minijuego: el entorno se compone con capas de parallax y terreno repetido.

## Exploración: asignación pendiente de confirmar

El modo Exploración reutiliza actualmente los seis biomas de campaña mediante `selectedExplorationBiomeIndex`. Por eso, sus fondos varían entre recursos de `maps/parallax/` (Coastal, Redwood y Extraction) y `maps/forest/` (Black Site y las dos secciones de contención). Para que Exploración use exclusivamente `maps/parallax/`, debe definirse si se limitará el selector a los biomas compatibles o si se crearán variantes parallax para los seis biomas. No se ha cambiado esa selección para no eliminar opciones sin confirmación.

## Tilesets activos

Los tres tilesets están conectados a `src/rendering/EnvironmentAssets.js`:

- `tileset-export_0.png`: superficies oliva/azules para `black-site`.
- `tileset-export.png`: superficies teal y paneles violeta para `containment` y `rosa-containment`.
- `tileset.png`: recortes grises para bloques y paredes de instalación.

## Inventario restante

- `maps/forest/`: 3 capas (`Back.png`, `middle.png`, `front.png`).
- `maps/parallax/`: 10 imágenes (`bg-trees1.png` y las capas 1–5 y 7–10).
- `tilesets/`: 3 tilesets.
- `maps/facility/`: eliminada.

**Total: 16 imágenes ambientales.** Los archivos `.gitkeep` son marcadores de directorio y no recursos gráficos.
