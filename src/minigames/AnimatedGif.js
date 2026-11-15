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

/**
 * Removes a flat background connected to a GIF frame's edges.
 * Flood filling prevents matching colors inside the sprite from being removed.
 */
export function removeEdgeBackground(imageData, tolerance = 28) {
  if (!imageData?.data || !Number.isInteger(imageData.width) || !Number.isInteger(imageData.height)) return 0;

  const { data, width, height } = imageData;
  if (width < 2 || height < 2 || data.length !== width * height * 4) return 0;

  const borderColors = new Map();
  let opaqueBorderPixels = 0;

  const sampleBorderPixel = (index) => {
    const offset = index * 4;
    if (data[offset + 3] === 0) return;

    opaqueBorderPixels += 1;
    const red = data[offset], green = data[offset + 1], blue = data[offset + 2];
    const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
    let sample = borderColors.get(key);
    if (!sample) {
      sample = { count: 0, red: 0, green: 0, blue: 0 };
      borderColors.set(key, sample);
    }
    sample.count += 1;
    sample.red += red;
    sample.green += green;
    sample.blue += blue;
  };

  for (let x = 0; x < width; x += 1) {
    sampleBorderPixel(x);
    sampleBorderPixel((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sampleBorderPixel(y * width);
    sampleBorderPixel(y * width + width - 1);
  }

  if (!opaqueBorderPixels) return 0;

  let background = null;
  for (const sample of borderColors.values()) {
    if (!background || sample.count > background.count) background = sample;
  }
  const borderPixelCount = width * 2 + (height - 2) * 2;
  if (!background || background.count / borderPixelCount < 0.3) return 0;

  const backgroundColor = {
    red: Math.round(background.red / background.count),
    green: Math.round(background.green / background.count),
    blue: Math.round(background.blue / background.count)
  };
  const matchesBackground = (index) => {
    const offset = index * 4;
    return data[offset + 3] > 0 &&
      Math.abs(data[offset] - backgroundColor.red) <= tolerance &&
      Math.abs(data[offset + 1] - backgroundColor.green) <= tolerance &&
      Math.abs(data[offset + 2] - backgroundColor.blue) <= tolerance;
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let queueHead = 0, queueTail = 0, removed = 0;

  const enqueueBackgroundPixel = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    if (matchesBackground(index)) queue[queueTail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueBackgroundPixel(x);
    enqueueBackgroundPixel((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueBackgroundPixel(y * width);
    enqueueBackgroundPixel(y * width + width - 1);
  }

  while (queueHead < queueTail) {
    const index = queue[queueHead++];
    const offset = index * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
    removed += 1;

    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueueBackgroundPixel(index - 1);
    if (x < width - 1) enqueueBackgroundPixel(index + 1);
    if (y > 0) enqueueBackgroundPixel(index - width);
    if (y < height - 1) enqueueBackgroundPixel(index + width);
  }

  return removed;
}

export function getBottomTransparentPadding(imageData) {
  if (!imageData?.data || !Number.isInteger(imageData.width) || !Number.isInteger(imageData.height)) return 0;

  const { data, width, height } = imageData;
  if (width < 1 || height < 1 || data.length !== width * height * 4) return 0;

  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 0) return height - y - 1;
    }
  }
  return 0;
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
  const patchCanvas = document.createElement("canvas");
  let bottomPadding = height;
  let restore = null, previous = null;
  for (const frame of frames) {
    if (previous?.disposalType === 2) context.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
    else if (previous?.disposalType === 3 && restore) context.putImageData(restore, 0, 0);
    restore = frame.disposalType === 3 ? context.getImageData(0, 0, width, height) : null;
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const patchContext = patchCanvas.getContext("2d");
    patchContext.putImageData(new ImageData(frame.patch, frame.dims.width, frame.dims.height), 0, 0);
    // Transparent GIF pixels must be composited over the previous frame, not written as erasures.
    context.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    const snapshot = document.createElement("canvas");
    snapshot.width = width; snapshot.height = height;
    const snapshotContext = snapshot.getContext("2d", { willReadFrequently: true });
    snapshotContext.drawImage(canvas, 0, 0);
    const snapshotData = snapshotContext.getImageData(0, 0, width, height);
    if (removeEdgeBackground(snapshotData) > 0) snapshotContext.putImageData(snapshotData, 0, 0);
    bottomPadding = Math.min(bottomPadding, getBottomTransparentPadding(snapshotData));

    renderedFrames.push({ image: snapshot, delay: Math.max(20, Number(frame.delay) || 100) });
    previous = frame;
  }
  return { width, height, bottomPadding: bottomPadding === height ? 0 : bottomPadding, frames: renderedFrames };
}
