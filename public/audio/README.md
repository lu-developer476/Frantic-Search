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

## Cómo se usan los archivos (samples opcionales)

`src/audio/sample-manifest.js` define qué archivo corresponde a cada evento y a cada ambiente de capítulo. Al iniciar el audio, `SampleBank` intenta cargar cada archivo; **los que no existan se ignoran** y se usa el sonido sintetizado de siempre. Se pueden listar varias variantes por evento (se elige una al azar).

| Evento | Archivos esperados |
| --- | --- |
| Salto / recolección / rescate | `sfx/jump.ogg`, `sfx/collect.ogg`, `sfx/rescue.ogg` |
| Golpe | `sfx/hit-1.ogg`, `sfx/hit-2.ogg` |
| Jefes | `sfx/boss-roar-{1,2}.ogg`, `sfx/boss-attack-{1,2}.ogg`, `sfx/boss-hit-{1,2}.ogg`, `sfx/boss-defeat.ogg` |
| Ambiente por capítulo (loop) | `ambient/{coastal,forest,industrial,facility,extraction}.ogg` |

Autores y licencias: ver [`CREDITS.md`](./CREDITS.md). El interruptor de sonido del menú también silencia estos ambientes.



## Clasificación de uso

La clasificación comprobada de temas, efectos, ambientes, campañas y minijuegos está en [ASSET_USAGE.md](./ASSET_USAGE.md). Distingue las claves que el código ya selecciona de las muestras opcionales que todavía faltan o no están conectadas.
