export const EFFECTS_PIXEL_SCALE = 3;
export const EFFECTS_LAYER_NAMES = Object.freeze(["back-motes", "wind", "weather", "dust", "particles"]);

const ENVIRONMENT_EFFECTS = Object.freeze({
  coastal: { leaves: 0, motes: 17, wind: 14, rain: 18, ash: 0, dust: 3, windSpeed: 28, moteColor: "#d8f0e7", windColor: "#c0e7e4", rainColor: "#c3e5e8", dustColor: "#d4d3bd" },
  redwood: { leaves: 18, motes: 12, wind: 10, rain: 0, ash: 0, dust: 6, windSpeed: 19, leafColor: "#8eaa61", leafAccent: "#c6a16a", moteColor: "#e3d9a0", windColor: "#b5cda0", dustColor: "#b7a17b" },
  "black-site": { leaves: 1, motes: 5, wind: 15, rain: 0, ash: 20, dust: 24, windSpeed: 24, leafColor: "#827e57", leafAccent: "#b08a59", moteColor: "#d0ae80", windColor: "#9b8d78", ashColor: "#c5a38a", dustColor: "#a38a70" },
  containment: { leaves: 0, motes: 12, wind: 4, rain: 0, ash: 3, dust: 7, windSpeed: 8, moteColor: "#c9d9cb", windColor: "#a8c3bb", ashColor: "#adb7a7", dustColor: "#a7a18e" },
  "rosa-containment": { leaves: 0, motes: 15, wind: 3, rain: 0, ash: 0, dust: 4, windSpeed: 7, moteColor: "#d5e7d8", windColor: "#bbd4c8", dustColor: "#b3c3b4" },
  extraction: { leaves: 7, motes: 8, wind: 16, rain: 0, ash: 8, dust: 22, windSpeed: 31, leafColor: "#a58a58", leafAccent: "#71874d", moteColor: "#e5c28c", windColor: "#d5ad7e", ashColor: "#c9a58a", dustColor: "#c3a078" }
});

function createLayerCanvas() {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && typeof document.createElement === "function") return document.createElement("canvas");
  throw new Error("EnvironmentalEffectsRenderer requires OffscreenCanvas or a document canvas.");
}
function modulo(value, divisor) { return ((value % divisor) + divisor) % divisor; }
function profileFor(environment) { return ENVIRONMENT_EFFECTS[environment] ?? ENVIRONMENT_EFFECTS.coastal; }

function drawPixelLeaf(context, x, y, size, color, accent) {
  context.fillStyle = color;
  context.fillRect(x, y, size * 3, size * 2);
  context.fillRect(x + size, y - size, size * 2, size);
  context.fillStyle = accent ?? color;
  context.fillRect(x + size, y + size, size * 2, size);
  context.fillRect(x + size * 3, y, size, size);
}
function drawAmbientBackLayer(context, { environment, cameraX, viewportWidth, viewportHeight, elapsed }) {
  const profile = profileFor(environment);
  for (let index = 0; index < profile.leaves; index += 1) {
    const size = 2 + index % 3;
    const x = Math.round(modulo(index * 113 + elapsed * (profile.windSpeed + 12 + index % 4 * 3) - cameraX * 0.14, viewportWidth + 42) - 21);
    const y = Math.round(58 + modulo(index * 47 + elapsed * (17 + index % 5 * 4), Math.max(1, viewportHeight * 0.72)));
    const drift = Math.sin(elapsed * 1.7 + index * 2.1) * 5;
    drawPixelLeaf(context, Math.round(x + drift), y, size, profile.leafColor ?? "#93ac77", profile.leafAccent ?? "#c0ad78");
  }
  for (let index = 0; index < profile.motes; index += 1) {
    const x = Math.round(modulo(index * 79 + elapsed * (8 + index % 5 * 2) - cameraX * 0.05, viewportWidth + 16) - 8);
    const y = Math.round(42 + modulo(index * 61 + elapsed * (5 + index % 4 * 2), Math.max(1, viewportHeight * 0.80)));
    const size = index % 4 === 0 ? 3 : 2;
    context.globalAlpha = 0.34 + index % 3 * 0.13;
    context.fillStyle = profile.moteColor ?? "#dce9d7";
    context.fillRect(x, y, size, size);
    if (index % 3 === 0) context.fillRect(x + size, y + 2, 2, 1);
  }
  context.globalAlpha = 1;
}
function drawWindLayer(context, { environment, cameraX, viewportWidth, viewportHeight, elapsed }) {
  const profile = profileFor(environment);
  context.save();
  for (let index = 0; index < profile.wind; index += 1) {
    const screenX = modulo(index * 149 + elapsed * profile.windSpeed * (0.72 + index % 4 * 0.08), viewportWidth + 120) - 60;
    const x = Math.round(cameraX + screenX);
    const y = Math.round(66 + modulo(index * 73 + elapsed * (11 + index % 5 * 3), Math.max(1, viewportHeight * 0.74)));
    const length = 12 + index % 5 * 7;
    context.globalAlpha = 0.13 + index % 4 * 0.035;
    context.fillStyle = profile.windColor ?? "#d5e0d2";
    context.fillRect(x, y, length, 2);
    context.fillRect(x + Math.round(length * 0.42), y + 3, Math.max(4, Math.round(length * 0.36)), 1);
  }
  context.restore();
}
function drawWeatherLayer(context, { environment, cameraX, viewportWidth, viewportHeight, elapsed }) {
  const profile = profileFor(environment);
  context.save();
  for (let index = 0; index < profile.rain; index += 1) {
    const screenX = modulo(index * 83 + elapsed * (105 + index % 4 * 18) - cameraX * 0.04, viewportWidth + 28) - 14;
    const y = modulo(index * 97 + elapsed * (175 + index % 5 * 15), viewportHeight + 18) - 9;
    context.globalAlpha = 0.26 + index % 3 * 0.08;
    context.fillStyle = profile.rainColor ?? "#c6dce0";
    context.fillRect(Math.round(cameraX + screenX), Math.round(y), 2, 8 + index % 3 * 2);
    context.fillRect(Math.round(cameraX + screenX + 2), Math.round(y + 3), 2, 4);
  }
  for (let index = 0; index < profile.ash; index += 1) {
    const screenX = modulo(index * 109 + elapsed * (12 + index % 4 * 5) - cameraX * 0.08, viewportWidth + 22) - 11;
    const y = modulo(index * 71 + elapsed * (18 + index % 5 * 6), viewportHeight + 18) - 9;
    const size = index % 5 === 0 ? 3 : 2;
    context.globalAlpha = 0.3 + index % 4 * 0.08;
    context.fillStyle = profile.ashColor ?? "#b9a18a";
    context.fillRect(Math.round(cameraX + screenX), Math.round(y), size, size);
    if (index % 6 === 0) {
      context.globalAlpha *= 0.7;
      context.fillRect(Math.round(cameraX + screenX - 2), Math.round(y + 2), 2, 1);
    }
  }
  context.restore();
}
function drawEnvironmentalDust(context, { environment, cameraX, viewportWidth, viewportHeight, elapsed }) {
  const profile = profileFor(environment);
  context.save();
  for (let index = 0; index < profile.dust; index += 1) {
    const screenX = modulo(index * 127 + elapsed * (profile.windSpeed * 0.56 + index % 4 * 3) - cameraX * 0.10, viewportWidth + 24) - 12;
    const y = Math.round(viewportHeight * 0.54 + modulo(index * 41 + elapsed * (4 + index % 3 * 2), Math.max(1, viewportHeight * 0.42)));
    const size = index % 4 === 0 ? 3 : 2;
    context.globalAlpha = 0.18 + index % 3 * 0.08;
    context.fillStyle = profile.dustColor ?? "#c4b49a";
    context.fillRect(Math.round(cameraX + screenX), y, size, size);
    if (index % 5 === 0) context.fillRect(Math.round(cameraX + screenX + size), y + 2, 3, 1);
  }
  context.restore();
}
function drawDashDustCloudLayer(context, cloud) {
  const fade = Math.max(0, Math.min(1, cloud.life / cloud.max));
  if (fade <= 0) return;
  const rise = (1 - fade) * 12;
  const puffs = [[0.10,0.72,0.15,0.23],[0.27,0.48,0.17,0.28],[0.46,0.64,0.19,0.25],[0.63,0.42,0.16,0.28],[0.80,0.65,0.16,0.23],[0.94,0.77,0.10,0.18]];
  context.save();
  context.globalAlpha = fade * 0.68;
  puffs.forEach(([px,py,rx,ry],index)=>{
    const width=Math.max(4,Math.round(cloud.w*rx*0.82));
    const height=Math.max(3,Math.round(cloud.h*ry*0.55));
    const x=Math.round(cloud.x+cloud.w*px-width/2);
    const y=Math.round(cloud.y+cloud.h*py-rise-height/2);
    context.fillStyle=index%2?"#c0b397":"#d9ccb0";
    context.fillRect(x,y,width,height);
    context.fillRect(x+Math.round(width*0.2),y-3,Math.max(3,Math.round(width*0.5)),3);
  });
  context.globalAlpha=fade*0.56;
  context.fillStyle="#e0d5bd";
  context.fillRect(cloud.x+cloud.w*0.18,cloud.y+cloud.h*0.52-rise,12,5);
  context.fillRect(cloud.x+cloud.w*0.68,cloud.y+cloud.h*0.31-rise,9,4);
  context.restore();
}

export class EnvironmentalEffectsRenderer {
  constructor({ pixelScale = EFFECTS_PIXEL_SCALE, createCanvas = createLayerCanvas } = {}) {
    if (!Number.isInteger(pixelScale) || pixelScale < 1) throw new RangeError("Effects pixelScale must be a positive integer.");
    this.pixelScale=pixelScale; this.width=0; this.height=0;
    this.layers=EFFECTS_LAYER_NAMES.map(name=>{
      const canvas=createCanvas();
      const context=canvas.getContext("2d",{alpha:true});
      if(!context)throw new Error("Unable to create a 2D effects layer: "+name);
      return {name,canvas,context};
    });
    this.layerByName=Object.fromEntries(this.layers.map(layer=>[layer.name,layer]));
  }
  resize(width,height) {
    const pixelWidth=Math.max(1,Math.ceil(width/this.pixelScale));
    const pixelHeight=Math.max(1,Math.ceil(height/this.pixelScale));
    if(width===this.width&&height===this.height)return;
    this.width=width;this.height=height;
    for(const layer of this.layers){
      layer.canvas.width=pixelWidth;layer.canvas.height=pixelHeight;
      layer.context.imageSmoothingEnabled=false;
      layer.context.setTransform(1/this.pixelScale,0,0,1/this.pixelScale,0,0);
    }
  }
  drawLayer(targetContext,name,{cameraX=0,viewportWidth=targetContext?.canvas?.width??960,viewportHeight=targetContext?.canvas?.height??540}={},draw) {
    if(!targetContext||typeof draw!=="function")return;
    const layer=this.layerByName[name];
    if(!layer)throw new RangeError("Unknown effects layer: "+name);
    const width=Math.max(1,Math.ceil(viewportWidth)),height=Math.max(1,Math.ceil(viewportHeight));
    const cameraOffset=Math.round(cameraX);
    this.resize(width,height);
    layer.context.setTransform(1/this.pixelScale,0,0,1/this.pixelScale,0,0);
    layer.context.globalAlpha=1;layer.context.shadowBlur=0;layer.context.clearRect(0,0,width,height);
    layer.context.save();
    try{layer.context.translate(-cameraOffset,0);draw(layer.context);}
    finally{layer.context.restore();}
    targetContext.save();targetContext.imageSmoothingEnabled=false;targetContext.globalAlpha=1;
    targetContext.drawImage(layer.canvas,cameraOffset,0,width,height);
    targetContext.restore();
  }
  drawAmbientBack(targetContext,{environment,cameraX=0,viewportWidth,viewportHeight,elapsed=0}={}) {
    this.drawLayer(targetContext,"back-motes",{viewportWidth,viewportHeight},context=>drawAmbientBackLayer(context,{environment,cameraX,viewportWidth,viewportHeight,elapsed}));
  }
  drawWind(targetContext,{environment,cameraX=0,viewportWidth,viewportHeight,elapsed=0}={}) {
    this.drawLayer(targetContext,"wind",{cameraX,viewportWidth,viewportHeight},context=>drawWindLayer(context,{environment,cameraX,viewportWidth,viewportHeight,elapsed}));
  }
  drawWeather(targetContext,{environment,cameraX=0,viewportWidth,viewportHeight,elapsed=0}={}) {
    this.drawLayer(targetContext,"weather",{cameraX,viewportWidth,viewportHeight},context=>drawWeatherLayer(context,{environment,cameraX,viewportWidth,viewportHeight,elapsed}));
  }
  drawDust(targetContext,{environment,cameraX=0,viewportWidth,viewportHeight,elapsed=0,dustClouds=[]}={}) {
    this.drawLayer(targetContext,"dust",{cameraX,viewportWidth,viewportHeight},context=>{
      drawEnvironmentalDust(context,{environment,cameraX,viewportWidth,viewportHeight,elapsed});
      for(const cloud of dustClouds)drawDashDustCloudLayer(context,cloud);
    });
  }
  drawParticles(targetContext,{cameraX=0,viewportWidth,viewportHeight,particles=[]}={}) {
    this.drawLayer(targetContext,"particles",{cameraX,viewportWidth,viewportHeight},context=>{
      for(const particle of particles){
        const alpha=particle.max>0?Math.max(0,Math.min(1,particle.life/particle.max)):0;
        if(alpha<=0)continue;
        context.globalAlpha=alpha;context.fillStyle=particle.color;
        const size=Math.max(1,Math.round(particle.size));
        context.fillRect(Math.round(particle.x),Math.round(particle.y),size,size);
      }
      context.globalAlpha=1;
    });
  }
}