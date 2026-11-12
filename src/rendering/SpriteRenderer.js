const SPRITE_ASSET_VERSION = "20261112-sprite-fix-1";

const SPRITES = [
  "blue-idle", "blue-run-a", "blue-run-b", "blue-jump", "blue-dash", "blue-duck",
  "vasti-idle", "vasti-run-a", "vasti-run-b", "vasti-jump", "vasti-duck",
  "beta", "ferrucutus", "hunter", "indoraptor", "indominus"
];

export class SpriteRenderer {
  constructor(baseUrl = import.meta.env?.BASE_URL ?? "/", onAssetChange = null) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    this.images = new Map();
    this.failed = new Set();
    this.loaded = new Set();
    this.onAssetChange = typeof onAssetChange === "function" ? onAssetChange : null;
    this.preload();
  }

  preload() {
    for (const name of SPRITES) this.get(name);
  }

  get(name) {
    if (this.images.has(name) || this.failed.has(name)) return this.images.get(name) ?? null;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (image.naturalWidth > 0) {
        this.loaded.add(name);
        this.failed.delete(name);
      } else {
        this.failed.add(name);
        console.error("[Frantic Search] Sprite loaded with zero naturalWidth:", name, image.src);
      }
      if (typeof image.decode === "function") image.decode().catch(() => {});
      this.onAssetChange?.(name, this.readiness());
    };
    image.onerror = () => {
      this.failed.add(name);
      this.images.delete(name);
      console.error("[Frantic Search] Sprite request failed:", name, image.src);
      this.onAssetChange?.(name, this.readiness());
    };
    this.images.set(name, image);
    image.src = this.baseUrl + "assets/sprites/" + name + ".svg?v=" + SPRITE_ASSET_VERSION;
    return image;
  }

  draw(context, name, x, y, width, height, { alpha = 1, facing = 1, flip = false } = {}) {
    const image = this.get(name);
    if (!image || !image.complete || image.naturalWidth === 0) return false;

    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha *= alpha;
    // Pixel-align the raster target. Fractional camera/entity coordinates soften SVG edges.
    x = Math.round(x);
    y = Math.round(y);
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (facing < 0 || flip) {
      context.translate(x + width, y);
      context.scale(-1, 1);
      context.drawImage(image, 0, 0, width, height);
    } else {
      context.drawImage(image, x, y, width, height);
    }
    context.restore();
    return true;
  }

  drawDinosaur(context, kind, x, y, width, height, player, elapsed, alpha = 1) {
    const prefix = kind === "blue" ? "blue" : "vasti";
    let pose = prefix + "-idle";

    if (kind === "blue" && player?.dashTimer > 0) {
      pose = "blue-dash";
    } else if (player?.duck) {
      pose = prefix + "-duck";
    } else if (player && !player.onGround) {
      pose = prefix + "-jump";
    } else if (player && Math.abs(player.vx) > 30) {
      const frame = Math.floor(elapsed * 10) % 2 === 0 ? "a" : "b";
      pose = prefix + "-run-" + frame;
    } else if (player && kind === "blue") {
      pose = "blue-idle";
    }

    // Prevent the obsolete vector drawing from appearing while a sprite is loading.
    // onAssetChange triggers a redraw as soon as the requested image settles.
    this.draw(context, pose, x, y, width, height, {
      alpha,
      facing: player?.facing ?? 1
    });
    return true;
  }

  readiness() {
    const ready = this.loaded.size;
    return { ready, total: SPRITES.length, failed: this.failed.size };
  }
}
