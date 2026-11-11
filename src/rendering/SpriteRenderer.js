const SPRITES = [
  "blue-idle", "blue-run-a", "blue-run-b", "blue-jump", "blue-dash", "blue-duck",
  "vasti-idle", "vasti-run-a", "vasti-run-b", "vasti-jump", "vasti-duck",
  "beta", "ferrucutus", "hunter", "indoraptor", "indominus"
];

export class SpriteRenderer {
  constructor(baseUrl = import.meta.env.BASE_URL) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    this.images = new Map();
    this.failed = new Set();
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
      if (typeof image.decode === "function") image.decode().catch(() => {});
    };
    image.onerror = () => {
      this.failed.add(name);
      this.images.delete(name);
    };
    this.images.set(name, image);
    image.src = this.baseUrl + "assets/sprites/" + name + ".svg";
    return image;
  }

  draw(context, name, x, y, width, height, { alpha = 1, facing = 1, flip = false } = {}) {
    const image = this.get(name);
    if (!image || !image.complete || image.naturalWidth === 0) return false;

    context.save();
    context.globalAlpha *= alpha;
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

    return this.draw(context, pose, x, y, width, height, {
      alpha,
      facing: player?.facing ?? 1
    });
  }

  readiness() {
    const ready = [...this.images.values()].filter((image) => image.complete && image.naturalWidth > 0).length;
    return { ready, total: SPRITES.length, failed: this.failed.size };
  }
}
