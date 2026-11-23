# Clasificación de uso de audio

## Estado de los archivos

Actualmente no hay archivos de audio reales en `public/audio/music/`, `public/audio/sfx/` ni `public/audio/ambient/`: esas carpetas solo contienen `.gitkeep`. Las rutas siguientes están declaradas en `src/audio/sample-manifest.js`, pero sus muestras todavía no existen en el repositorio.

`SampleBank` intenta cargarlas de forma opcional. Cuando faltan, el juego conserva los sonidos sintetizados por `AudioManager` y la música de `AdaptiveMusic`; no se produce un error de carga.

## Campaña

| Contexto | Tema musical | Ambiente | Estado en código |
| --- | --- | --- | --- |
| Apertura y prólogo de Brisa (entorno Redwood) | `music-forest` | `ambient-forest` | Seleccionados mientras el prólogo está activo |
| 1. Coastal Highway | `music-coastal` | `ambient-coastal` | Seleccionados por `LEVELS[0]` |
| 2. Redwood Frontier | `music-forest` | `ambient-forest` | Seleccionados por `LEVELS[1]` |
| 3. Poacher Black Site | `music-industrial` | `ambient-industrial` | Seleccionados por `LEVELS[2]` |
| 4. Containment Perimeter | `music-industrial` | `ambient-industrial` | Seleccionados por `LEVELS[3]` |
| 5. Brisa Containment | `music-facility` | `ambient-facility` | Seleccionados por `LEVELS[4]` |
| 6. Extraction Zone | `music-extraction` | `ambient-extraction` | Seleccionados por `LEVELS[5]` |
| Encuentros con jefes | `music-boss` | Se conserva el ambiente del capítulo | Cambio temporal de tema mientras hay un jefe activo |
| Finalización / derrota | `music-victory` / `music-defeat` | Sin ambiente específico | Stingers de cierre; no se reproducen en loop |

La música de archivo reemplaza al sintetizador únicamente cuando se encuentra la muestra correspondiente. Las pistas esperadas son `music/{coastal,forest,industrial,facility,boss,extraction,victory,defeat}.ogg`.

## Efectos de sonido de campaña

**Conectados actualmente:** `jump`, `collect`, `hit`, `rescue`, `boss-warning`, `boss-attack`, `boss-hit`, `boss-defeat`, `dash`, `stomp`, `terminal`, `cage-open` y `stego-charge`.

**Declarados pero todavía sin llamadas desde el juego:** `shot`, `eat`, `door` y `checkpoint`. Sus archivos esperados son `sfx/shot.ogg`, `sfx/eat.ogg`, `sfx/door.ogg` y `sfx/checkpoint.ogg`.

Los archivos de efectos conectados están definidos en el manifiesto como `sfx/jump.ogg`, `collect.ogg`, `hit-1.ogg`, `hit-2.ogg`, `rescue.ogg`, `boss-roar-1.ogg`, `boss-roar-2.ogg`, `boss-attack-1.ogg`, `boss-attack-2.ogg`, `boss-hit-1.ogg`, `boss-hit-2.ogg`, `boss-defeat.ogg`, `dash.ogg`, `stomp.ogg`, `terminal.ogg`, `cage-open.ogg` y `stego-charge.ogg`.

## Minijuegos

| Minijuego | Entorno | Audio propio |
| --- | --- | --- |
| Carrera (Race) | Prairie | No conectado |
| Persecución (Persecution / Empty Stomach) | Prairie | No conectado |
| Cacería (Hunting / Time Attack) | Redwood | No conectado |
| Emboscada (Ambush) | Redwood | No conectado |

Los controladores de estos minijuegos no llaman a `AudioManager` ni seleccionan una pista o ambiente propios. El manifiesto ya contempla `music-minigame-chase`, `music-minigame-combat` y `ambient-prairie`, pero esas claves todavía no se seleccionan desde el flujo actual. No deben contarse como audio utilizado por los minijuegos hasta integrar esa reproducción.

## Cómo interpretar esta clasificación

- **En uso** significa que el flujo actual selecciona el tema o llama al efecto; no significa que el archivo exista.
- **Pendiente** significa que la clave está preparada en el manifiesto, pero el juego no la dispara.
- Por ahora, al no haber archivos de sonido, todo el audio audible procede de la síntesis Web Audio.
