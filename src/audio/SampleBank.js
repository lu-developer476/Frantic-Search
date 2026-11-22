// Carga opcional de samples (public/audio/**). Si un archivo no existe o no se
// puede decodificar, simplemente no queda registrado y el juego usa el audio
// sintetizado de siempre.

export class SampleBank {
  constructor(manifest = {}, fetchImpl = globalThis.fetch?.bind(globalThis)) {
    this.manifest = manifest;
    this.fetch = fetchImpl;
    this.buffers = new Map();
    this.loading = null;
  }

  load(context) {
    if (!context || !this.fetch) return Promise.resolve();
    if (!this.loading) {
      const jobs = [];
      for (const [name, entry] of Object.entries(this.manifest)) {
        for (const url of entry.files || []) jobs.push(this.loadFile(context, name, url));
      }
      this.loading = Promise.all(jobs).then(() => undefined);
    }
    return this.loading;
  }

  async loadFile(context, name, url) {
    try {
      const response = await this.fetch(url);
      if (!response || !response.ok) return;
      const data = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(data);
      if (!this.buffers.has(name)) this.buffers.set(name, []);
      this.buffers.get(name).push(buffer);
    } catch {
      // Archivo ausente (o el servidor devolvió HTML): se usa el fallback.
    }
  }

  has(name) {
    return (this.buffers.get(name)?.length || 0) > 0;
  }

  pick(name, random = Math.random) {
    const variants = this.buffers.get(name);
    if (!variants?.length) return null;
    return variants[Math.floor(random() * variants.length) % variants.length];
  }

  // Devuelve el nodo fuente (para poder frenarlo) o null si no hay sample.
  play(context, destination, name, { loop = false, volume } = {}) {
    const buffer = this.pick(name);
    if (!buffer || !context) return null;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = volume ?? this.manifest[name]?.volume ?? 1;
    source.connect(gain);
    gain.connect(destination || context.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    source.gainNode = gain;
    return source;
  }
}
