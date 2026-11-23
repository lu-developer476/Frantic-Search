import { ImageParallax } from "./ImageParallax.js";

// Fondo del escenario: color plano de cielo de la escena + capas de parallax
// con las imágenes predeterminadas del proyecto (public/environment/maps/**).
// No se genera horizonte, sol, nubes ni iluminación por código.
export class AtmosphereRenderer {
  constructor({ parallax = new ImageParallax() } = {}) {
    this.parallax = parallax;
  }

  draw(context, {
    scene,
    environment = scene?.environment,
    cameraX = 0,
    viewportWidth = context?.canvas?.width ?? 960,
    viewportHeight = context?.canvas?.height ?? 540,
    groundY = 430
  } = {}) {
    if (!context || !scene) return false;
    context.save();
    context.fillStyle = scene.sky;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
    context.restore();
    if (!this.parallax.hasEnvironment(environment)) return false;
    this.parallax.preload(environment);
    return this.parallax.draw(context, { environment, cameraX, viewportWidth, groundY });
  }
}
