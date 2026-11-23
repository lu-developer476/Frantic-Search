// Dibuja las familias de objetos del mundo directamente sobre el contexto del
// juego. Antes cada familia pasaba por un canvas offscreen a un tercio de
// resolución (10 limpiezas + composiciones por cuadro); ahora se dibuja en el lugar.
export const OBJECT_LAYER_NAMES = Object.freeze([
  "collectibles", "facility", "arena-boundary", "interactives", "obstacles",
  "cage-back", "cage-front", "food", "projectiles", "containment-shell"
]);

export class ObjectRenderer {
  drawLayer(context, layerName, _options, draw) {
    if (!context || typeof draw !== "function") return;
    if (!OBJECT_LAYER_NAMES.includes(layerName)) {
      throw new RangeError("Unknown object render layer: " + layerName);
    }
    context.save();
    try {
      draw(context);
    } finally {
      context.restore();
    }
  }
}
