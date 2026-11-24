// Assets predeterminados del proyecto (public/environment/**).
//
// Todo el escenario se arma con estas imágenes: no se dibuja ningún mapa,
// tile ni objeto por código. Cada recorte ("slice") se prepara UNA sola vez
// (recorte + escala entera + color-key + tinte) y se guarda en caché; el
// bucle de dibujo solo hace drawImage de canvases ya listos.

const PARALLAX = "environment/maps/parallax/";
const FOREST = "environment/maps/forest/";
const TILESETS = "environment/tilesets/";

// Color de fondo plano de las capas de parallax (se vuelve transparente).
export const KEY_OLIVE = Object.freeze([111, 109, 81]);
export const KEY_DARK = Object.freeze([49, 48, 43]);

function defaultCreateImage() {
  return typeof Image === "function" ? new Image() : null;
}

function defaultCreateCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function imageSize(image) {
  return [image?.naturalWidth || image?.width || 0, image?.naturalHeight || image?.height || 0];
}

// Convierte una imagen en un canvas listo para dibujar: recorte, escala entera
// (vecino más cercano), color de fondo -> transparente y tinte opcional.
// spec = { crop: [sx, sy, sw, sh], prescale, key: [r, g, b], tint: [hex, alpha] }
export function processLayerImage(image, spec, createCanvas = defaultCreateCanvas) {
  const [width, height] = imageSize(image);
  if (!width || !height) return null;
  const crop = spec.crop;
  const prescale = spec.prescale ?? 1;
  if (!spec.key && !spec.tint && !crop && prescale === 1) return image;

  const [sx, sy, sw, sh] = crop ?? [0, 0, width, height];
  const outWidth = Math.max(1, Math.round(sw * prescale));
  const outHeight = Math.max(1, Math.round(sh * prescale));
  const canvas = createCanvas(outWidth, outHeight);
  const context = canvas?.getContext?.("2d");
  if (!context) return image;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, sx, sy, sw, sh, 0, 0, outWidth, outHeight);

  if (spec.key) {
    try {
      const data = context.getImageData(0, 0, outWidth, outHeight);
      const pixels = data.data;
      const [kr, kg, kb] = spec.key;
      for (let index = 0; index < pixels.length; index += 4) {
        if (Math.abs(pixels[index] - kr) + Math.abs(pixels[index + 1] - kg) + Math.abs(pixels[index + 2] - kb) <= 6) {
          pixels[index + 3] = 0;
        }
      }
      context.putImageData(data, 0, 0);
    } catch {
      return canvas;
    }
  }
  if (spec.tint) {
    const [color, alpha] = spec.tint;
    const [r, g, b] = hexToRgb(color);
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = alpha;
    context.fillStyle = `rgb(${r},${g},${b})`;
    context.fillRect(0, 0, outWidth, outHeight);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  return canvas;
}

function specId(spec) {
  return [spec.src, spec.crop?.join(",") ?? "", spec.prescale ?? 1, spec.key?.join(",") ?? "", spec.tint?.join(",") ?? ""].join("|");
}

// Cargador con caché: cada PNG se pide una vez y cada recorte se procesa una vez.
export class EnvironmentAssets {
  constructor({
    baseUrl = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/",
    createImage = defaultCreateImage,
    createCanvas = defaultCreateCanvas
  } = {}) {
    this.baseUrl = baseUrl;
    this.createImage = createImage;
    this.createCanvas = createCanvas;
    this.sources = new Map();
    this.slices = new Map();
  }

  source(src) {
    let record = this.sources.get(src);
    if (record) return record;
    record = { image: null, loaded: false, failed: false, waiting: [] };
    this.sources.set(src, record);
    const image = this.createImage();
    if (!image) {
      record.failed = true;
      return record;
    }
    record.image = image;
    image.onload = () => {
      record.loaded = true;
      for (const [spec, entry] of record.waiting) this.prepare(spec, entry, image);
      record.waiting = [];
    };
    image.onerror = () => {
      record.failed = true;
      for (const [, entry] of record.waiting) entry.failed = true;
      record.waiting = [];
    };
    image.src = this.baseUrl + src;
    return record;
  }

  prepare(spec, entry, image) {
    entry.drawable = processLayerImage(image, spec, this.createCanvas);
    if (!entry.drawable) entry.failed = true;
  }

  entry(spec) {
    const id = specId(spec);
    let entry = this.slices.get(id);
    if (entry) return entry;
    entry = { drawable: null, failed: false };
    this.slices.set(id, entry);
    const record = this.source(spec.src);
    if (record.failed) entry.failed = true;
    else if (record.loaded) this.prepare(spec, entry, record.image);
    else record.waiting.push([spec, entry]);
    return entry;
  }

  // Canvas/imagen listo o null si todavía no cargó.
  get(spec) {
    return this.entry(spec).drawable;
  }

  preload(specs) {
    for (const spec of specs) this.entry(spec);
  }

  isReady(specs) {
    return specs.every((spec) => Boolean(this.entry(spec).drawable));
  }
}

let sharedAssets = null;
export function sharedEnvironmentAssets() {
  if (!sharedAssets) sharedAssets = new EnvironmentAssets();
  return sharedAssets;
}

// ---------------------------------------------------------------------------
// Catálogo de recortes. prescale = escala entera aplicada al preparar el recorte.
// Los tilesets de 16 px de arte se dibujan a 48 px (3x), igual que el resto del juego.
// ---------------------------------------------------------------------------

const TS_OLIVE = TILESETS + "tileset-export_0.png";
const TS_TEAL = TILESETS + "tileset-export.png";
const TS_GREY = TILESETS + "tileset.png";

function brick(tint) {
  return { src: PARALLAX + "bg-trees1.png", crop: [0, 246, 256, 188], prescale: 2, tint: [tint, 0.55] };
}

export const SLICES = Object.freeze({
  // Exterior: franjas de pasto y matas de la línea de suelo (297 px de ancho, 3x = 891).
  grassEdge: { src: PARALLAX + "forestbg-layer3.png", crop: [0, 55, 297, 5], prescale: 3, key: KEY_OLIVE },
  grassShade: { src: PARALLAX + "forestbg-layer4.png", crop: [0, 57, 297, 3], prescale: 3, key: KEY_OLIVE },
  coverBush: { src: PARALLAX + "forestbg-layer1.png", prescale: 3, key: KEY_OLIVE },
  coverSprigs: { src: PARALLAX + "forestbg-layer2.png", prescale: 3, key: KEY_OLIVE },
  // Instalación industrial (olivo/azul).
  oliveCap: { src: TS_OLIVE, crop: [384, 48, 288, 96] },
  bluePlate: { src: TS_OLIVE, crop: [336, 480, 96, 96] },
  // Perímetro de contención (teal con franjas de peligro).
  tealCap: { src: TS_TEAL, crop: [432, 1152, 288, 144], prescale: 1 / 3 },
  tealBody: { src: TS_TEAL, crop: [144, 1224, 288, 216], prescale: 1 / 3 },
  // Interior de contención (paneles violeta/gris).
  purpleCap: { src: TS_TEAL, crop: [432, 144, 288, 72], prescale: 1 / 3 },
  purpleBody: { src: TS_TEAL, crop: [432, 288, 288, 144], prescale: 1 / 3 },
  // Muro de fondo del interior y bloques de edificio (tileset.png, 16 px -> 48 px).
  greyWall: { src: TS_GREY, crop: [32, 0, 16, 16], prescale: 3, tint: ["#16212b", 0.45] },
  greyBlock: { src: TS_GREY, crop: [32, 32, 16, 16], prescale: 3 },

});


// Tema de terreno por entorno: textura de relleno (body), borde superior (cap)
// y, en exteriores, las matas que decoran la línea de suelo.
const SOIL_TINTS = Object.freeze({
  coastal: "#99613c", redwood: "#865638", prairie: "#87613d", extraction: "#795039"
});

function outdoorTheme(environment) {
  const tint = SOIL_TINTS[environment];
  return Object.freeze({
    kind: "outdoor",
    body: brick(tint),
    rock: { ...brick("#7a7466"), tint: ["#7a7466", 0.6] },
    cap: SLICES.grassEdge,
    capShade: SLICES.grassShade,
    cover: Object.freeze([SLICES.coverBush, SLICES.coverSprigs])
  });
}

export const TERRAIN_THEMES = Object.freeze({
  coastal: outdoorTheme("coastal"),
  redwood: outdoorTheme("redwood"),
  prairie: outdoorTheme("prairie"),
  extraction: outdoorTheme("extraction"),
  forest: outdoorTheme("redwood"),
  "black-site": Object.freeze({
    kind: "tile", body: SLICES.bluePlate, rock: SLICES.bluePlate, cap: SLICES.oliveCap, cover: Object.freeze([])
  }),
  containment: Object.freeze({
    kind: "tile", body: SLICES.tealBody, rock: SLICES.tealBody, cap: SLICES.tealCap, cover: Object.freeze([])
  }),
  "rosa-containment": Object.freeze({
    kind: "tile", body: SLICES.purpleBody, rock: SLICES.purpleBody, cap: SLICES.purpleCap, cover: Object.freeze([])
  })
});

export function terrainTheme(environment) {
  return TERRAIN_THEMES[environment] ?? TERRAIN_THEMES.redwood;
}

export function themeSpecs(theme) {
  return [theme.body, theme.rock, theme.cap, theme.capShade, ...theme.cover].filter(Boolean);
}


// ---------------------------------------------------------------------------
// Helpers de dibujo
// ---------------------------------------------------------------------------

// Rellena el rectángulo (x, y, w, h) repitiendo `image`. Solo recorre los mosaicos
// dentro de [visibleLeft, visibleRight]; los bordes se recortan con el rectángulo
// de origen de drawImage (sin clip ni patrones, y sin costuras).
export function fillTiled(context, image, x, y, w, h, {
  visibleLeft = -Infinity, visibleRight = Infinity, originX = 0, originY = y
} = {}) {
  const [tileWidth, tileHeight] = imageSize(image);
  if (!tileWidth || !tileHeight || !(w > 0) || !(h > 0)) return;
  const left = Math.round(Math.max(x, visibleLeft));
  const right = Math.round(Math.min(x + w, visibleRight));
  const top = Math.round(y);
  const bottom = Math.round(y + h);
  if (right <= left || bottom <= top) return;
  const startX = originX + Math.floor((left - originX) / tileWidth) * tileWidth;
  const startY = originY + Math.floor((top - originY) / tileHeight) * tileHeight;
  for (let ty = startY; ty < bottom; ty += tileHeight) {
    const dy = Math.max(ty, top);
    const sy = dy - ty;
    const dh = Math.min(ty + tileHeight, bottom) - dy;
    for (let tx = startX; tx < right; tx += tileWidth) {
      const dx = Math.max(tx, left);
      const sx = dx - tx;
      const dw = Math.min(tx + tileWidth, right) - dx;
      if (dw > 0 && dh > 0) context.drawImage(image, sx, sy, dw, dh, dx, dy, dw, dh);
    }
  }
}
