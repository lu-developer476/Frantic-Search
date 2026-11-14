const BINDINGS = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["Space", "ArrowUp", "KeyW"],
  ability: ["KeyX"],
  special: ["KeyC"],
  interact: ["KeyE", "KeyF"]
};

export class InputManager {
  constructor(target = window, surface = null) {
    this.target = target;
    this.keys = new Set();
    this.virtualDown = new Set();
    this.pressed = new Set();
    this.downHandler = (event) => {
      const action = this.actionFor(event.code);
      if (!action) return;
      if (["Space", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(action);
      this.keys.add(event.code);
    };
    this.upHandler = (event) => this.keys.delete(event.code);
    this.blurHandler = () => {
      this.keys.clear();
      this.virtualDown.clear();
      this.pressed.clear();
    };
    target.addEventListener("keydown", this.downHandler);
    target.addEventListener("keyup", this.upHandler);
    target.addEventListener("blur", this.blurHandler);

    this.pointerHandler = () => this.pressed.add("jump");
    surface?.addEventListener("pointerdown", this.pointerHandler);
  }

  actionFor(code) {
    return Object.entries(BINDINGS).find(([, codes]) => codes.includes(code))?.[0] ?? null;
  }

  isDown(action) {
    return this.virtualDown.has(action) || (BINDINGS[action]?.some((code) => this.keys.has(code)) ?? false);
  }

  setAction(action, active) {
    if (active) {
      if (!this.virtualDown.has(action)) this.pressed.add(action);
      this.virtualDown.add(action);
    } else {
      this.virtualDown.delete(action);
    }
  }

  consume(action) {
    const wasPressed = this.pressed.has(action);
    this.pressed.delete(action);
    return wasPressed;
  }

  destroy() {
    this.target.removeEventListener("keydown", this.downHandler);
    this.target.removeEventListener("keyup", this.upHandler);
    this.target.removeEventListener("blur", this.blurHandler);
  }
}
