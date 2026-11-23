# Environment (ambientación)

Recursos visuales de ambientación del juego. Se acceden desde la raíz del sitio, por ejemplo `/environment/tilesets/forest.png`.

## Estructura

| Subcarpeta | Contenido |
| --- | --- |
| `maps/` | Mapas de niveles (por ejemplo `.json` exportado desde Tiled, o imágenes de fondo de mapa) |
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

El inventario de mapas, capas, tilesets y sprites de instalación activos o todavía sin referencias está en [ASSET_USAGE.md](./ASSET_USAGE.md).
