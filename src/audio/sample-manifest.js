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

  // Ambiente en loop, por tema musical del capítulo
  "ambient-coastal": { files: ["/audio/ambient/coastal.ogg"], volume: 0.35 },
  "ambient-forest": { files: ["/audio/ambient/forest.ogg"], volume: 0.35 },
  "ambient-industrial": { files: ["/audio/ambient/industrial.ogg"], volume: 0.3 },
  "ambient-facility": { files: ["/audio/ambient/facility.ogg"], volume: 0.3 },
  "ambient-extraction": { files: ["/audio/ambient/extraction.ogg"], volume: 0.3 }
};
