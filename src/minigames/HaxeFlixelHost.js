const FRAME_READY = "frantic-engine-ready";
const FRAME_FINISHED = "frantic-engine-finished";
const FRAME_PAUSED = "frantic-engine-paused";
const FRAME_EXIT = "frantic-engine-exit";

let sharedFrame = null;
let engineReady = false;
let activeHost = null;

function post(command, payload = {}) {
  if (!sharedFrame?.contentWindow || !engineReady) return false;
  sharedFrame.contentWindow.postMessage({
    type: "frantic-minigame",
    command,
    ...payload
  }, window.location.origin);
  return true;
}

function createFrame(baseUrl) {
  if (sharedFrame) return sharedFrame;
  sharedFrame = document.createElement("iframe");
  sharedFrame.className = "haxeflixel-stage";
  sharedFrame.title = "Motor HaxeFlixel de minijuegos";
  sharedFrame.allow = "autoplay";
  sharedFrame.tabIndex = 0;
  sharedFrame.setAttribute("aria-label", "Escenario del minijuego");
  sharedFrame.style.cssText = [
    "position:absolute", "inset:0", "z-index:0", "display:block",
    "width:100%", "height:100%", "border:0", "background:#182820",
    "touch-action:none"
  ].join(";");
  sharedFrame.src = `${baseUrl.replace(/\/?$/, "/")}haxeflixel/index.html`;
  return sharedFrame;
}

window.addEventListener("message", (event) => {
  if (event.source !== sharedFrame?.contentWindow) return;
  const message = event.data;
  if (!message || typeof message !== "object") return;
  if (message.type === FRAME_READY) {
    engineReady = true;
    activeHost?.flush();
  } else if (message.type === FRAME_FINISHED) {
    activeHost?.handleFinish(message);
  } else if (message.type === FRAME_PAUSED) {
    activeHost?.handlePause(Boolean(message.paused));
  } else if (message.type === FRAME_EXIT) {
    activeHost?.exit();
  }
});

export class HaxeFlixelHost {
  constructor(mode, root, onExit = () => {}, onBeforeStart = (_mode, proceed) => proceed(), baseUrl = "/") {
    this.mode = mode;
    this.root = root;
    this.onExit = onExit;
    this.onBeforeStart = onBeforeStart;
    this.baseUrl = baseUrl;
    this.running = false;
    this.paused = false;
    this.locale = "es";
    this.pending = [];
    this.selectedRole = "hunter";
    this.active = false;
    this.canvas = root.querySelector("canvas");
    this.stage = root.querySelector(".game-mode-stage") || root.querySelector(".persecution-stage");
    this.frame = null;
    this.bindControls();
    if (mode === "race") this.populateRaceCharacters();
  }

  bind(selector, callback) {
    const element = this.root.querySelector(selector);
    if (element) element.addEventListener("click", callback);
    return element;
  }

  bindControls() {
    if (this.mode === "persecution") {
      this.bind("[data-empty-start]", () => this.requestStart());
      this.bind("[data-empty-retry]", () => this.requestStart());
      this.bind("[data-empty-checkpoint]", () => this.requestStart({ checkpoint: true }));
      this.bind("[data-empty-exit]", () => this.exit());
      this.bind("[data-empty-pause]", () => this.togglePause());
    } else if (this.mode === "hunting") {
      this.bind("[data-ta-start]", () => this.requestStart({ role: "hunter" }));
      this.bind("[data-ta-predator]", () => this.requestStart({ role: "predator" }));
      this.bind("[data-ta-retry]", () => this.requestStart({ role: this.selectedRole }));
      this.bind("[data-ta-exit]", () => this.exit());
    } else if (this.mode === "ambush") {
      this.bind("[data-ambush-start]", () => this.showRoleOptions());
      this.bind("[data-ambush-show-dinosaurs]", () => this.showDinosaurOptions());
      this.bind("[data-ambush-back-to-entry]", () => this.showEntry());
      this.bind("[data-ambush-back-to-roles]", () => this.showRoleOptions());
      this.bind("[data-ambush-exit]", () => this.exit());
      this.bind("[data-ambush-retry]", () => this.requestStart({ role: this.selectedRole }));
      this.root.querySelectorAll("[data-ambush-role]").forEach((button) => {
        button.addEventListener("click", () => this.requestStart({ role: button.dataset.ambushRole }));
      });
    } else if (this.mode === "race") {
      this.bind("[data-br-start]", () => this.requestStart({ character: this.getRaceCharacter() }));
      this.bind("[data-br-retry]", () => this.requestStart({ character: this.getRaceCharacter() }));
      this.bind("[data-br-exit]", () => this.exit());
    }
  }

  populateRaceCharacters() {
    const select = this.root.querySelector("[data-br-dinosaur-select]");
    if (!select || select.options.length) return;
    const characters = [
      ["gala", "Gala — Velociraptor nublarensis"],
      ["brisa", "Brisa — Velociraptor abyssomirabilis"],
      ["venatosaurus-impavidus", "Venatosaurus impavidus"],
      ["venatosaurus-saevidicus", "Venatosaurus saevidicus"],
      ["vastatosaurus-rex", "Basilio — Vastatosaurus Rex"]
    ];
    for (const [value, label] of characters) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
  }

  getRaceCharacter() {
    return this.root.querySelector("[data-br-dinosaur-select]")?.value || "gala";
  }

  flush() {
    const queue = this.pending.splice(0);
    for (const item of queue) post(item.command, item.payload);
  }

  send(command, payload = {}) {
    if (!post(command, payload)) this.pending.push({ command, payload });
  }

  open() {
    if (!this.stage) return;
    activeHost = this;
    this.active = true;
    this.running = false;
    this.paused = false;
    this.root.classList.add("active");
    this.root.classList.remove("playing", "paused");
    this.root.setAttribute("aria-hidden", "false");
    if (this.canvas) this.canvas.style.display = "none";
    this.frame = createFrame(this.baseUrl);
    this.stage.append(this.frame);
    this.frame.style.display = "block";
    this.send("open", { mode: this.mode, locale: this.locale });
    if (this.mode === "ambush") this.showEntry();
    if (this.mode === "persecution") {
      this.root.querySelector("[data-empty-result]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-empty-start]")?.removeAttribute("hidden");
      this.root.querySelector("[data-empty-retry]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-empty-pause-overlay]")?.setAttribute("hidden", "");
    }
  }

  requestStart(options = {}) {
    if (!this.active) return;
    this.selectedRole = options.role || this.selectedRole;
    this.onBeforeStart(this.mode, () => this.start(options));
  }

  start(options = {}) {
    if (!this.active) return;
    this.running = true;
    this.paused = false;
    this.root.classList.add("playing");
    this.root.classList.remove("paused");
    this.root.querySelector("[data-empty-result], [data-ta-result], [data-ambush-result], [data-br-result]")?.setAttribute("hidden", "");
    if (this.mode === "persecution") {
      this.root.querySelector("[data-empty-controls]")?.removeAttribute("hidden");
      this.root.querySelector("[data-empty-start]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-empty-retry]")?.setAttribute("hidden", "");
    } else if (this.mode === "hunting") {
      this.root.querySelector("[data-ta-start]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-ta-predator]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-ta-retry]")?.setAttribute("hidden", "");
    } else if (this.mode === "ambush") {
      this.root.querySelector("[data-ambush-entry]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-ambush-options]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-ambush-dinosaurs]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-ambush-retry]")?.setAttribute("hidden", "");
    } else if (this.mode === "race") {
      this.root.querySelector("[data-br-start]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-br-retry]")?.setAttribute("hidden", "");
    }
    this.frame?.focus();
    this.send("start", { mode: this.mode, locale: this.locale, options });
  }

  showRoleOptions() {
    this.root.querySelector("[data-ambush-entry]")?.setAttribute("hidden", "");
    this.root.querySelector("[data-ambush-dinosaurs]")?.setAttribute("hidden", "");
    this.root.querySelector("[data-ambush-options]")?.removeAttribute("hidden");
    this.root.querySelector("[data-ambush-hunter]")?.focus();
  }

  showDinosaurOptions() {
    this.root.querySelector("[data-ambush-options]")?.setAttribute("hidden", "");
    this.root.querySelector("[data-ambush-dinosaurs]")?.removeAttribute("hidden");
    this.root.querySelector("[data-ambush-gala]")?.focus();
  }

  showEntry() {
    this.root.querySelector("[data-ambush-entry]")?.removeAttribute("hidden");
    this.root.querySelector("[data-ambush-options]")?.setAttribute("hidden", "");
    this.root.querySelector("[data-ambush-dinosaurs]")?.setAttribute("hidden", "");
  }

  togglePause() {
    if (!this.running) return;
    const nextPaused = !this.paused;
    this.send(nextPaused ? "pause" : "resume");
    this.handlePause(nextPaused);
  }

  handlePause(paused) {
    this.paused = paused;
    this.root.classList.toggle("paused", paused);
    const overlay = this.root.querySelector("[data-empty-pause-overlay]");
    if (overlay) {
      overlay.hidden = !paused;
      const label = overlay.querySelector("[data-empty-pause-label]");
      if (label) label.textContent = this.locale === "es" ? "PAUSA" : "PAUSED";
    }
  }

  handleFinish(message) {
    this.running = false;
    this.paused = false;
    this.root.classList.remove("playing", "paused");
    const result = this.root.querySelector("[data-empty-result], [data-ta-result], [data-ambush-result], [data-br-result]");
    if (result) {
      result.textContent = message.result || (this.locale === "es" ? "FIN DE LA PARTIDA" : "GAME OVER");
      result.hidden = false;
    }
    if (this.mode === "ambush") {
      this.root.querySelector("[data-ambush-entry]")?.removeAttribute("hidden");
      this.root.querySelector("[data-ambush-options]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-ambush-dinosaurs]")?.setAttribute("hidden", "");
    }
    const retry = this.root.querySelector("[data-empty-retry], [data-ta-retry], [data-ambush-retry], [data-br-retry]");
    if (retry) retry.hidden = false;
    const start = this.root.querySelector("[data-empty-start], [data-ta-start], [data-ambush-start], [data-br-start]");
    if (start && this.mode !== "ambush") start.hidden = true;
    if (this.mode === "persecution") {
      this.root.querySelector("[data-empty-controls]")?.setAttribute("hidden", "");
      this.root.querySelector("[data-empty-exit]")?.removeAttribute("hidden");
    }
  }

  setLocale(locale) {
    this.locale = locale === "en" ? "en" : "es";
    this.send("locale", { locale: this.locale });
  }

  exit() {
    if (!this.active) return;
    this.send("exit", { mode: this.mode });
    this.active = false;
    this.running = false;
    this.paused = false;
    this.root.classList.remove("active", "playing", "paused");
    this.root.setAttribute("aria-hidden", "true");
    if (this.canvas) this.canvas.style.display = "";
    this.root.querySelector("[data-empty-controls]")?.setAttribute("hidden", "");
    this.root.querySelector("[data-empty-pause-overlay]")?.setAttribute("hidden", "");
    if (this.frame) this.frame.style.display = "none";
    if (activeHost === this) activeHost = null;
    this.onExit();
  }

  destroy() {
    if (this.active) this.exit();
  }
}
