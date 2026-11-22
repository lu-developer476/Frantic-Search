# Audio

Carpeta para los archivos de sonido del videojuego. Todo lo que se guarde acá se publica tal cual y se accede desde la raíz del sitio, por ejemplo `/audio/music/coastal.ogg`.

## Estructura

| Subcarpeta | Contenido |
| --- | --- |
| `music/` | Temas musicales (costa, bosque, black site, instalación, jefes, extracción, victoria, derrota) |
| `sfx/` | Efectos de sonido (salto, golpe, rescate, rugidos, ataques de jefes, etc.) |
| `ambient/` | Sonido ambiente en loop (oleaje, bosque, maquinaria, viento) |

## Formatos recomendados

- **`.ogg`** (Vorbis/Opus) como formato principal: buen peso y calidad.
- **`.mp3`** o **`.m4a`** como alternativa de compatibilidad (Safari).
- **`.wav`** solo para efectos muy cortos si hace falta sin pérdida.

## Convenciones

- Nombres en minúsculas, con guiones: `boss-warning.ogg`, `forest-theme.ogg`.
- Música y ambiente: archivos en loop, normalizados y sin silencios al inicio o final.
- Efectos: duración corta (menos de 2 s en general).
- Mantener cada archivo liviano (el build usa Vite; `public/` se copia sin procesar).

## Uso desde el código

Los archivos de `public/` se referencian con ruta absoluta desde la raíz:

```js
const audio = new Audio("/audio/sfx/jump.ogg");
audio.play();
```

Actualmente el juego sintetiza música y efectos con Web Audio API (`src/audio/`). Los archivos de esta carpeta permiten reemplazar o complementar ese audio procedural.
