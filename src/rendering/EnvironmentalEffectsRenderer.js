// Efectos de juego (feedback inmediato): nubes de polvo del dash y partículas de impacto.
// Se eliminaron el viento, el clima y las motas ambientales generadas por código.

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
  drawDust(context, { dustClouds = [] } = {}) {
    if (!context || dustClouds.length === 0) return;
    for (const cloud of dustClouds) drawDashDustCloudLayer(context, cloud);
  }

  drawParticles(context, { particles = [] } = {}) {
    if (!context || particles.length === 0) return;
    context.save();
    for (const particle of particles) {
      const alpha = particle.max > 0 ? Math.max(0, Math.min(1, particle.life / particle.max)) : 0;
      if (alpha <= 0) continue;
      context.globalAlpha = alpha;
      context.fillStyle = particle.color;
      const size = Math.max(1, Math.round(particle.size));
      context.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    }
    context.restore();
  }
}
