import { parseGIF, decompressFrames } from "gifuct-js";
export function getAnimatedFrameIndex(frames, elapsedMs) {
  if (!frames.length) return -1;
  const durations = frames.map((frame) => Math.max(20, Number(frame.delay) || 100));
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let position = ((Math.max(0, elapsedMs) % total) + total) % total;
  for (let index = 0; index < durations.length; index += 1) {
    if (position < durations[index]) return index;
    position -= durations[index];
  }
  return frames.length - 1;
}
export async function loadAnimatedGif(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GIF load failed (${response.status}): ${url}`);
  const parsed = parseGIF(await response.arrayBuffer());
  const frames = decompressFrames(parsed, true);
  if (!frames.length) throw new Error(`GIF has no frames: ${url}`);
  const width = parsed.lsd.width, height = parsed.lsd.height;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const renderedFrames = [];
  let restore = null, previous = null;
  for (const frame of frames) {
    if (previous?.disposalType === 2) context.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
    else if (previous?.disposalType === 3 && restore) context.putImageData(restore, 0, 0);
    restore = frame.disposalType === 3 ? context.getImageData(0, 0, width, height) : null;
    context.putImageData(new ImageData(frame.patch, frame.dims.width, frame.dims.height), frame.dims.left, frame.dims.top);
    const snapshot = document.createElement("canvas");
    snapshot.width = width; snapshot.height = height;
    snapshot.getContext("2d").drawImage(canvas, 0, 0);
    renderedFrames.push({ image: snapshot, delay: Math.max(20, Number(frame.delay) || 100) });
    previous = frame;
  }
  return { width, height, frames: renderedFrames };
}
