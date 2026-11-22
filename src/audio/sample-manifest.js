// Mapa evento -> archivos en public/audio. Todo es opcional: si falta un archivo
// se usa el sonido sintetizado de AudioManager. Se pueden listar varias variantes
// (se elige una al azar). Ver public/audio/CREDITS.md para autores y licencias.

export const SAMPLE_MANIFEST = {
  // Efectos
  jump: { files: ["/audio/sfx/jump.ogg"], volume: 0.5 },
  collect: { files: ["/audio/sfx/collect.ogg"], volume: 0.5 },
  hit: { files: ["/audio/sfx/hit-1.ogg", "/audio/sfx/hit-2.ogg"], volume: 0.6 },
  rescue: { files: ["/audio/sfx/rescue.ogg"], volume: 0.6 },
  "boss-warning": { files: ["/audio/sfx/boss-roar-1.ogg", "/audio/sfx/boss-roar-2.ogg"], volume: 0.7 },
  "boss-attack": { files: ["/audio/sfx/boss-attack-1.ogg", "/audio/sfx/boss-attack-2.ogg"], volume: 0.65 },
  "boss-hit": { files: ["/audio/sfx/boss-hit-1.ogg", "/audio/sfx/boss-hit-2.ogg"], volume: 0.65 },
  "boss-defeat": { files: ["/audio/sfx/boss-defeat.ogg"], volume: 0.7 },

  // Efectos previstos (ver docs/ASSET_PLAN.md). Aún sin llamadas en el código:
  // se cargan solo si el archivo existe.
  dash: { files: ["/audio/sfx/dash.ogg"], volume: 0.5 },
  stomp: { files: ["/audio/sfx/stomp.ogg"], volume: 0.65 },
  shot: { files: ["/audio/sfx/shot.ogg"], volume: 0.5 },
  eat: { files: ["/audio/sfx/eat.ogg"], volume: 0.5 },
  terminal: { files: ["/audio/sfx/terminal.ogg"], volume: 0.5 },
  door: { files: ["/audio/sfx/door.ogg"], volume: 0.55 },
  "cage-open": { files: ["/audio/sfx/cage-open.ogg"], volume: 0.6 },
  "stego-charge": { files: ["/audio/sfx/stego-charge.ogg"], volume: 0.7 },
  checkpoint: { files: ["/audio/sfx/checkpoint.ogg"], volume: 0.5 },

  // Música por tema (reemplaza al sintetizador de AdaptiveMusic si el archivo existe).
  // loop:false para stingers de victoria/derrota.
  "music-coastal": { files: ["/audio/music/coastal.ogg"], volume: 0.55 },
  "music-forest": { files: ["/audio/music/forest.ogg"], volume: 0.55 },
  "music-industrial": { files: ["/audio/music/industrial.ogg"], volume: 0.55 },
  "music-facility": { files: ["/audio/music/facility.ogg"], volume: 0.55 },
  "music-boss": { files: ["/audio/music/boss.ogg"], volume: 0.6 },
  "music-extraction": { files: ["/audio/music/extraction.ogg"], volume: 0.55 },
  "music-victory": { files: ["/audio/music/victory.ogg"], volume: 0.6, loop: false },
  "music-defeat": { files: ["/audio/music/defeat.ogg"], volume: 0.6, loop: false },
  "music-minigame-chase": { files: ["/audio/music/minigame-chase.ogg"], volume: 0.55 },
  "music-minigame-combat": { files: ["/audio/music/minigame-combat.ogg"], volume: 0.55 },

  // Ambiente en loop, por tema musical del capítulo
  "ambient-coastal": { files: ["/audio/ambient/coastal.ogg"], volume: 0.35 },
  "ambient-forest": { files: ["/audio/ambient/forest.ogg"], volume: 0.35 },
  "ambient-industrial": { files: ["/audio/ambient/industrial.ogg"], volume: 0.3 },
  "ambient-facility": { files: ["/audio/ambient/facility.ogg"], volume: 0.3 },
  "ambient-extraction": { files: ["/audio/ambient/extraction.ogg"], volume: 0.3 },
  "ambient-prairie": { files: ["/audio/ambient/prairie.ogg"], volume: 0.3 }
};
