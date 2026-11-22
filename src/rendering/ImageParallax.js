// Parallax de fondo con imágenes reales (public/environment/maps/**).
// Reemplaza el horizonte dibujado por código (montañas/árboles procedurales)
// en los entornos que tienen capas definidas. Si una imagen no carga, el
// renderer devuelve false y AtmosphereRenderer usa el horizonte procedural.

const PARALLAX = "environment/maps/parallax/";
const FOREST = "environment/maps/forest/";
const KEY_OLIVE = [111, 109, 81];
const KEY_DARK = [49, 48, 43];

// speed: 0 = fijo, 1 = se mueve con la cámara. scale entero para conservar el pixel-art.
// anchor "ground": la base de la imagen queda en groundY + y. anchor "top": el borde superior en y.
const REDWOOD_LAYERS = Object.freeze([
  { src: PARALLAX + "forestbg-layer10.png", speed: 0.1, scale: 3, anchor: "ground", y: -60, key: KEY_DARK },
  { src: PARALLAX + "forestbg-layer9.png", speed: 0.2, scale: 3, anchor: "ground", y: 8, key: KEY_OLIVE },
  { src: PARALLAX + "forestbg-layer8.png", speed: 0.32, scale: 3, anchor: "ground", y: 14, key: KEY_OLIVE },
  { src: PARALLAX + "forestbg-layer7.png", speed: 0.46, scale: 3, anchor: "ground", y: 20, key: KEY_OLIVE },
  { src: PARALLAX + "forestbg-layer5.png", speed: 0.62, scale: 2, anchor: "ground", y: 24, key: KEY_OLIVE }
]);

const DARK_FOREST_LAYERS = Object.freeze([
  { src: FOREST + "Back.png", speed: 0.12, scale: 2, anchor: "top", y: -40, tint: ["#0e1722", 0.62] },
  { src: FOREST + "middle.png", speed: 0.3, scale: 2, anchor: "top", y: -20, tint: ["#0e1722", 0.5] },
  { src: FOREST + "front.png", speed: 0.5, scale: 2, anchor: "top", y: 0, tint: ["#0e1722", 0.42] }
]);

export const PARALLAX_LAYERS = Object.freeze({
  redwood: REDWOOD_LAYERS,
  prairie: Object.freeze([
    { src: PARALLAX + "forestbg-layer8.png", speed: 0.28, scale: 3, anchor: "ground", y: 14, key: KEY_OLIVE, tint: ["#d8e58a", 0.22] },
    { src: PARALLAX + "forestbg-layer7.png", speed: 0.42, scale: 3, anchor: "ground", y: 20, key: KEY_OLIVE, tint: ["#d8e58a", 0.16] }
  ]),
  extraction: Object.freeze(REDWOOD_LAYERS.map((layer) => ({ ...layer, tint: ["#f0a66f", 0.34] }))),
  "black-site": Object.freeze(DARK_FOREST_LAYERS),
  containment: Object.freeze(DARK_FOREST_LAYERS.map((layer) => ({ ...layer, tint: ["#2a1d1a", 0.6] })))
});

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

// Convierte la imagen en un canvas: el color de fondo pasa a transparente y se aplica el tinte.
export function processLayerImage(image, layer, createCanvas = defaultCreateCanvas) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  if (!layer.key && !layer.tint) return image;
  const canvas = createCanvas(width, height);
  const context = canvas?.getContext?.("2d");
  if (!context) return image;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  if (layer.key) {
    try {
      const data = context.getImageData(0, 0, width, height);
      const pixels = data.data;
      const [kr, kg, kb] = layer.key;
      for (let index = 0; index < pixels.length; index += 4) {
        if (Math.abs(pixels[index] - kr) + Math.abs(pixels[index + 1] - kg) + Math.abs(pixels[index + 2] - kb) <= 6) pixels[index + 3] = 0;
      }
      context.putImageData(data, 0, 0);
    } catch {
      return image;
    }
  }
  if (layer.tint) {
    const [color, alpha] = layer.tint;
    const [r, g, b] = hexToRgb(color);
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = alpha;
    context.fillStyle = `rgb(${r},${g},${b})`;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  return canvas;
}

export class ImageParallax {
  constructor({
    baseUrl = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/",
    layers = PARALLAX_LAYERS,
    createImage = defaultCreateImage,
    createCanvas = defaultCreateCanvas
  } = {}) {
    this.baseUrl = baseUrl;
    this.layers = layers;
    this.createImage = createImage;
    this.createCanvas = createCanvas;
    this.cache = new Map();
  }

  hasEnvironment(environment) {
    return Boolean(this.layers[environment]?.length);
  }

  // Empieza a cargar las imágenes de un entorno (idempotente).
  preload(environment) {
    for (const layer of this.layers[environment] || []) this.entry(layer);
  }

  entry(layer) {
    const id = layer.src + "|" + (layer.key || "") + "|" + (layer.tint || "");
    let entry = this.cache.get(id);
    if (entry) return entry;
    entry = { drawable: null, failed: false };
    this.cache.set(id, entry);
    const image = this.createImage();
    if (!image) {
      entry.failed = true;
      return entry;
    }
    image.onload = () => {
      entry.drawable = processLayerImage(image, layer, this.createCanvas);
      if (!entry.drawable) entry.failed = true;
    };
    image.onerror = () => {
      entry.failed = true;
    };
    image.src = this.baseUrl + layer.src;
    return entry;
  }

  // Dibuja las capas del entorno. Devuelve true solo si las dibujó todas;
  // si falta alguna, no dibuja nada y el llamador usa el horizonte procedural.
  draw(context, { environment, cameraX = 0, viewportWidth = 960, groundY = 430 } = {}) {
    const layers = this.layers[environment];
    if (!context || !layers?.length) return false;
    // Se piden todas las imágenes a la vez (no una por cuadro) antes de decidir si se puede dibujar.
    const entries = layers.map((layer) => this.entry(layer));
    if (entries.some((entry) => !entry.drawable)) return false;
    const drawables = entries.map((entry) => entry.drawable);
    context.save();
    context.imageSmoothingEnabled = false;
    layers.forEach((layer, index) => {
      const image = drawables[index];
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const width = sourceWidth * layer.scale;
      const height = sourceHeight * layer.scale;
      const y = Math.round(layer.anchor === "top" ? layer.y : groundY + layer.y - height);
      const offset = (((-cameraX * layer.speed) % width) + width) % width;
      for (let x = Math.round(offset - width); x < viewportWidth; x += width) {
        context.drawImage(image, x, y, width, height);
      }
    });
    context.restore();
    return true;
  }
}
