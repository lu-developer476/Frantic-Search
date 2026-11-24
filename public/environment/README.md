# Environment (ambientación)

Recursos visuales de ambientación del juego. Los escenarios combinan capas de mapa, parallax y tilesets desde los renderizadores compartidos.

## Estructura

| Subcarpeta | Contenido |
| --- | --- |
| `maps/forest/` | Tres capas de bosque utilizadas en Black Site/contención y en Cacería, Emboscada y Combates |
| `maps/parallax/` | Capas de fondo, vegetación y terreno de los biomas exteriores |
| `maps/facility/` | Eliminada; los objetos de instalación se dibujan con Canvas |
| `tilesets/` | Tilesets e imágenes de tiles (`.png`) usados por los mapas |

## Convenciones

- Nombres en minúsculas, con guiones: `coastal-highway.json`, `redwood-tileset.png`.
- Tilesets en PNG, con tamaño de tile consistente (por ejemplo 16×16 o 32×32).
- Mantener el estilo pixel-art: sin suavizado, tamaños múltiplos del tile.
- Cada mapa debe referenciar su tileset con una ruta relativa dentro de esta carpeta (por ejemplo `../tilesets/redwood-tileset.png`).

## Uso desde el código

```js
const map = await fetch("/environment/maps/coastal-highway.json").then((r) => r.json());
const tileset = new Image();
tileset.src = "/environment/tilesets/coastal-tileset.png";
```


## Clasificación de uso

El inventario de mapas, capas y tilesets activos está en [ASSET_USAGE.md](./ASSET_USAGE.md).
