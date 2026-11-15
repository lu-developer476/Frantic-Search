function polygon(context, points, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  context.fill();
}

function treePalette(scene) {
  return {
    leaf: scene.tree ?? "#2f7147",
    light: scene.treeLight ?? "#55a45e",
    detail: scene.detail ?? "#34764a",
    trunk: scene.treeTrunk ?? "#604632",
    deep: scene.under ?? "#352f27",
    ridge: scene.ridge ?? "#526d60"
  };
}

function drawSteppedCrown(context, centerX, topY, width, height, color, variant = 0) {
  const side = variant % 2 ? -1 : 1;
  polygon(context, [
    [centerX, topY],
    [centerX - width * 0.16, topY + height * 0.20],
    [centerX - width * 0.34, topY + height * 0.24],
    [centerX - width * 0.25, topY + height * 0.40],
    [centerX - width * 0.49, topY + height * 0.46],
    [centerX - width * 0.37, topY + height * 0.63],
    [centerX - width * 0.52, topY + height * 0.72],
    [centerX, topY + height],
    [centerX + width * 0.52, topY + height * 0.72],
    [centerX + width * 0.37, topY + height * 0.63],
    [centerX + width * 0.49, topY + height * 0.46],
    [centerX + width * 0.25, topY + height * 0.40],
    [centerX + width * 0.34, topY + height * 0.24],
    [centerX + width * 0.16, topY + height * 0.20]
  ], color);
  context.fillStyle = side < 0 ? color : "rgba(0,0,0,0.10)";
  context.fillRect(centerX - width * 0.08, topY + height * 0.37, width * 0.16, Math.max(3, height * 0.05));
}

function drawConifer(context, prop, colors, species) {
  const centerX = prop.x;
  const topY = prop.baseY - prop.height;
  const width = prop.width;
  const height = prop.height;
  const trunkWidth = Math.max(5, Math.round(width * (species === "redwood" ? 0.16 : 0.11)));
  const trunkTop = topY + height * (species === "redwood" ? 0.46 : 0.62);

  polygon(context, [
    [centerX - trunkWidth * 0.35, trunkTop],
    [centerX + trunkWidth * 0.25, trunkTop],
    [centerX + trunkWidth * 0.62, prop.baseY],
    [centerX - trunkWidth * 0.58, prop.baseY]
  ], colors.trunk);

  if (species === "redwood") {
    polygon(context, [
      [centerX - trunkWidth * 0.36, prop.baseY - height * 0.22],
      [centerX - width * 0.25, prop.baseY - height * 0.06],
      [centerX - trunkWidth * 0.35, prop.baseY - height * 0.12],
      [centerX + trunkWidth * 0.32, prop.baseY - height * 0.12],
      [centerX + width * 0.24, prop.baseY - height * 0.04],
      [centerX + trunkWidth * 0.42, prop.baseY - height * 0.24]
    ], colors.trunk);
  }

  const narrowCrown = species === "cypress" || species === "clipped-tree";
  const tiers = narrowCrown ? 6 : species === "redwood" ? 5 : 4;
  for (let tier = tiers - 1; tier >= 0; tier -= 1) {
    const progress = tier / Math.max(1, tiers - 1);
    const tierTop = topY + height * (0.02 + progress * (narrowCrown ? 0.50 : 0.46));
    const tierWidth = width * (
      narrowCrown ? 0.30 + progress * 0.42 :
      species === "redwood" ? 0.43 + progress * 0.44 :
      0.42 + progress * 0.48
    );
    const tierHeight = height * (species === "redwood" ? 0.29 : 0.23);
    drawSteppedCrown(
      context,
      centerX + (prop.variant % 2 ? -1 : 1) * width * 0.025,
      tierTop,
      tierWidth,
      tierHeight,
      tier % 2 ? colors.leaf : colors.detail,
      prop.variant + tier
    );
    context.fillStyle = colors.light;
    context.fillRect(
      centerX - tierWidth * 0.17,
      tierTop + tierHeight * 0.36,
      Math.max(3, tierWidth * 0.19),
      Math.max(3, tierHeight * 0.045)
    );
    if (tier % 2 === 0) {
      context.fillRect(
        centerX + tierWidth * 0.13,
        tierTop + tierHeight * 0.57,
        Math.max(3, tierWidth * 0.14),
        Math.max(3, tierHeight * 0.04)
      );
    }
  }

  if (species === "redwood") {
    context.fillStyle = colors.detail;
    context.fillRect(centerX - width * 0.07, prop.baseY - height * 0.39, Math.max(3, width * 0.035), height * 0.24);
    context.fillStyle = colors.deep;
    context.fillRect(centerX + trunkWidth * 0.18, prop.baseY - height * 0.30, Math.max(2, trunkWidth * 0.22), height * 0.22);
  }
}

function drawBroadleaf(context, prop, colors) {
  const centerX = prop.x;
  const topY = prop.baseY - prop.height;
  const width = prop.width;
  const height = prop.height;
  const trunkWidth = Math.max(6, width * 0.13);
  const forkY = prop.baseY - height * 0.38;

  polygon(context, [
    [centerX - trunkWidth * 0.34, prop.baseY],
    [centerX - trunkWidth * 0.18, forkY],
    [centerX - width * 0.25, topY + height * 0.42],
    [centerX - width * 0.12, topY + height * 0.38],
    [centerX, forkY + height * 0.02],
    [centerX + width * 0.15, topY + height * 0.36],
    [centerX + width * 0.28, topY + height * 0.45],
    [centerX + trunkWidth * 0.32, prop.baseY]
  ], colors.trunk);

  const lobes = [
    [-0.28, 0.37, 0.44, 0.38],
    [0.06, 0.21, 0.52, 0.44],
    [0.34, 0.38, 0.43, 0.37],
    [-0.02, 0.48, 0.57, 0.37],
    [-0.36, 0.52, 0.31, 0.30],
    [0.38, 0.54, 0.31, 0.30]
  ];
  for (let index = 0; index < lobes.length; index += 1) {
    const [offset, vertical, widthRatio, heightRatio] = lobes[(index + prop.variant) % lobes.length];
    const lobeX = centerX + offset * width;
    const lobeY = topY + vertical * height;
    const lobeWidth = width * widthRatio;
    const lobeHeight = height * heightRatio;
    polygon(context, [
      [lobeX, lobeY],
      [lobeX - lobeWidth * 0.28, lobeY + lobeHeight * 0.10],
      [lobeX - lobeWidth * 0.49, lobeY + lobeHeight * 0.42],
      [lobeX - lobeWidth * 0.34, lobeY + lobeHeight * 0.78],
      [lobeX, lobeY + lobeHeight],
      [lobeX + lobeWidth * 0.38, lobeY + lobeHeight * 0.76],
      [lobeX + lobeWidth * 0.50, lobeY + lobeHeight * 0.40],
      [lobeX + lobeWidth * 0.22, lobeY + lobeHeight * 0.08]
    ], index % 3 === 0 ? colors.detail : colors.leaf);
  }

  context.fillStyle = colors.light;
  context.fillRect(centerX - width * 0.24, topY + height * 0.39, width * 0.17, Math.max(3, height * 0.045));
  context.fillRect(centerX + width * 0.12, topY + height * 0.31, width * 0.15, Math.max(3, height * 0.04));
  context.fillStyle = colors.detail;
  context.fillRect(centerX - width * 0.38, topY + height * 0.60, width * 0.13, Math.max(3, height * 0.035));
}

function drawPalm(context, prop, colors) {
  const centerX = prop.x;
  const topY = prop.baseY - prop.height;
  const width = prop.width;
  const height = prop.height;
  const lean = prop.variant % 2 ? -1 : 1;
  const crownX = centerX + lean * width * 0.10;
  const crownY = topY + height * 0.19;
  const trunkWidth = Math.max(5, width * 0.10);

  polygon(context, [
    [centerX - trunkWidth * 0.55, prop.baseY],
    [centerX - trunkWidth * 0.20 + lean * width * 0.12, crownY],
    [centerX + trunkWidth * 0.45 + lean * width * 0.12, crownY],
    [centerX + trunkWidth * 0.62, prop.baseY]
  ], colors.trunk);
  context.fillStyle = colors.detail;
  for (let index = 1; index <= 5; index += 1) {
    const y = prop.baseY - index * height * 0.15;
    context.fillRect(centerX - trunkWidth * 0.32 + lean * width * 0.09 * (1 - index / 6), y, trunkWidth * 0.75, 3);
  }

  const fronds = [-2.65, -2.15, -1.62, -1.10, -0.52, 0.02];
  for (let index = 0; index < fronds.length; index += 1) {
    const angle = fronds[index] + (prop.variant - 1.5) * 0.045;
    const reach = width * (0.43 + (index % 2) * 0.08);
    const endX = crownX + Math.cos(angle) * reach;
    const endY = crownY + Math.sin(angle) * height * 0.20;
    context.strokeStyle = colors.deep;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(crownX, crownY);
    context.lineTo(endX, endY);
    context.stroke();
    context.strokeStyle = colors.leaf;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(crownX, crownY + 2);
    context.lineTo(endX, endY + 2);
    context.stroke();
    const leafSteps = 5;
    for (let leaf = 1; leaf <= leafSteps; leaf += 1) {
      const ratio = leaf / (leafSteps + 1);
      const leafX = crownX + (endX - crownX) * ratio;
      const leafY = crownY + (endY - crownY) * ratio;
      const leafSize = Math.max(3, width * 0.055);
      context.fillStyle = leaf % 2 ? colors.light : colors.leaf;
      context.fillRect(leafX - leafSize * 0.5, leafY - leafSize * 0.5, leafSize, Math.max(3, leafSize * 0.65));
    }
  }
  context.fillStyle = colors.deep;
  context.fillRect(crownX - 4, crownY - 3, 8, 7);
}

function drawDeadTree(context, prop, colors) {
  const centerX = prop.x;
  const topY = prop.baseY - prop.height;
  const width = prop.width;
  const height = prop.height;
  const trunkWidth = Math.max(5, width * 0.14);
  const splitY = topY + height * 0.44;
  const direction = prop.variant % 2 ? -1 : 1;

  polygon(context, [
    [centerX - trunkWidth * 0.5, prop.baseY],
    [centerX - trunkWidth * 0.12, splitY],
    [centerX + trunkWidth * 0.18, topY + height * 0.12],
    [centerX + trunkWidth * 0.65, topY],
    [centerX + trunkWidth * 0.45, splitY + height * 0.16],
    [centerX + trunkWidth * 0.54, prop.baseY]
  ], colors.trunk);

  context.strokeStyle = colors.trunk;
  context.lineWidth = Math.max(3, width * 0.07);
  context.lineCap = "square";
  context.beginPath();
  context.moveTo(centerX, splitY);
  context.lineTo(centerX - direction * width * 0.32, topY + height * 0.30);
  context.lineTo(centerX - direction * width * 0.48, topY + height * 0.18);
  context.moveTo(centerX + trunkWidth * 0.15, topY + height * 0.36);
  context.lineTo(centerX + width * 0.34, topY + height * 0.17);
  context.lineTo(centerX + width * 0.48, topY + height * 0.22);
  context.moveTo(centerX - width * 0.06, topY + height * 0.21);
  context.lineTo(centerX - width * 0.20, topY + height * 0.04);
  context.stroke();

  context.fillStyle = colors.detail;
  context.fillRect(centerX - width * 0.43, topY + height * 0.16, width * 0.11, 3);
  context.fillRect(centerX + width * 0.30, topY + height * 0.19, width * 0.10, 3);
}

function drawTree(context, prop, x, scene) {
  const colors = treePalette(scene);
  context.save();
  context.globalAlpha = prop.opacity ?? 1;
  if (prop.flip) {
    context.translate(x * 2, 0);
    context.scale(-1, 1);
  }
  const positioned = { ...prop, x };
  switch (prop.species) {
    case "palm":
      drawPalm(context, positioned, colors);
      break;
    case "broadleaf":
      drawBroadleaf(context, positioned, colors);
      break;
    case "dead-tree":
      drawDeadTree(context, positioned, colors);
      break;
    case "cypress":
    case "clipped-tree":
    case "pine":
    case "redwood":
    case "conifer":
    default:
      drawConifer(context, positioned, colors, prop.species);
      break;
  }
  context.restore();
}

function drawRock(context, prop, colors, left, top) {
  const width = prop.width;
  const height = prop.height;
  polygon(context, [
    [left, prop.baseY],
    [left + width * 0.10, top + height * 0.40],
    [left + width * 0.34, top + height * 0.10],
    [left + width * 0.62, top],
    [left + width * 0.88, top + height * 0.34],
    [left + width, prop.baseY]
  ], colors.deep);
  polygon(context, [
    [left + width * 0.10, prop.baseY - height * 0.08],
    [left + width * 0.34, top + height * 0.10],
    [left + width * 0.62, top],
    [left + width * 0.72, top + height * 0.38],
    [left + width * 0.40, top + height * 0.50]
  ], colors.rock);
  context.fillStyle = colors.highlight;
  context.fillRect(left + width * 0.42, top + height * 0.22, width * 0.20, Math.max(2, height * 0.07));
}

function drawFern(context, prop, colors, left, top) {
  const center = left + prop.width * 0.5;
  const base = prop.baseY;
  context.strokeStyle = colors.stem;
  context.lineWidth = 2;
  const fronds = [-1.1, -0.72, -0.35, 0.12, 0.50, 0.88];
  for (let index = 0; index < fronds.length; index += 1) {
    const angle = fronds[index];
    const reach = prop.width * (0.30 + (index % 2) * 0.09);
    const endX = center + Math.cos(angle) * reach;
    const endY = base - Math.sin(Math.abs(angle) + 0.45) * prop.height * 0.78 - prop.height * 0.12;
    context.beginPath();
    context.moveTo(center, base);
    context.lineTo(endX, endY);
    context.stroke();
    for (let leaf = 1; leaf <= 4; leaf += 1) {
      const ratio = leaf / 5;
      const leafX = center + (endX - center) * ratio;
      const leafY = base + (endY - base) * ratio;
      const leafWidth = Math.max(4, prop.width * 0.12);
      context.fillStyle = leaf % 2 ? colors.leaf : colors.highlight;
      context.fillRect(leafX - leafWidth * 0.5, leafY - 2, leafWidth, 4);
    }
  }
  context.fillStyle = colors.deep;
  context.fillRect(center - 3, base - 6, 6, 6);
}

function drawLog(context, prop, colors, left, top) {
  const width = prop.width;
  const height = prop.height;
  polygon(context, [
    [left, top + height * 0.42],
    [left + width * 0.10, top + height * 0.14],
    [left + width * 0.86, top],
    [left + width, top + height * 0.42],
    [left + width * 0.93, prop.baseY],
    [left + width * 0.08, prop.baseY]
  ], colors.trunk);
  context.fillStyle = colors.highlight;
  context.fillRect(left + width * 0.16, top + height * 0.25, width * 0.58, Math.max(2, height * 0.12));
  context.fillStyle = colors.deep;
  context.fillRect(left + width * 0.86, top + height * 0.32, width * 0.09, height * 0.54);
  context.fillStyle = colors.rock;
  context.fillRect(left + width * 0.89, top + height * 0.40, width * 0.035, height * 0.28);
}

function drawShrub(context, prop, colors, left, top) {
  const width = prop.width;
  const height = prop.height;
  const blocks = [
    [0.04, 0.48, 0.34, 0.48],
    [0.22, 0.18, 0.40, 0.72],
    [0.51, 0.36, 0.42, 0.60],
    [0.36, 0.02, 0.34, 0.66],
    [0.69, 0.58, 0.25, 0.40]
  ];
  context.fillStyle = colors.deep;
  context.fillRect(left + width * 0.12, top + height * 0.62, width * 0.78, height * 0.38);
  blocks.forEach(([x, y, w, h], index) => {
    context.fillStyle = index % 2 ? colors.leaf : colors.deep;
    context.fillRect(left + width * x, top + height * y, width * w, height * h);
  });
  context.fillStyle = colors.highlight;
  context.fillRect(left + width * 0.35, top + height * 0.24, width * 0.18, Math.max(2, height * 0.08));
  context.fillRect(left + width * 0.70, top + height * 0.48, width * 0.11, Math.max(2, height * 0.07));
}

function drawGroundProp(context, prop, scene) {
  const width = prop.width;
  const height = prop.height;
  const left = prop.x - width * 0.5;
  const top = prop.baseY - height;
  const colors = {
    leaf: scene.tree ?? "#3f784a",
    highlight: scene.treeLight ?? "#77a85c",
    deep: scene.under ?? "#3d342b",
    stem: scene.treeTrunk ?? "#66513b",
    trunk: scene.treeTrunk ?? "#66513b",
    rock: scene.rock ?? "#a99976",
    highlightRock: scene.platformTop ?? "#c1a77e"
  };
  colors.highlight = colors.highlight ?? colors.highlightRock;

  context.save();
  context.globalAlpha = prop.opacity ?? 1;
  if (prop.flip) {
    context.translate(prop.x * 2, 0);
    context.scale(-1, 1);
  }

  switch (prop.kind) {
    case "fern":
      drawFern(context, prop, colors, left, top);
      break;
    case "boulder":
    case "moss-rock":
    case "broken-concrete":
    case "rubble":
      drawRock(context, prop, colors, left, top);
      break;
    case "driftwood":
    case "fallen-log":
      drawLog(context, prop, colors, left, top);
      break;
    case "dead-shrub":
      context.strokeStyle = colors.stem;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(prop.x, prop.baseY);
      context.lineTo(prop.x - width * 0.12, top + height * 0.3);
      context.lineTo(prop.x - width * 0.42, top);
      context.moveTo(prop.x - width * 0.07, top + height * 0.36);
      context.lineTo(prop.x + width * 0.36, top + height * 0.08);
      context.stroke();
      break;
    case "stump":
      context.fillStyle = colors.trunk;
      context.fillRect(left + width * 0.18, top + height * 0.20, width * 0.64, height * 0.80);
      context.fillStyle = colors.deep;
      context.fillRect(left + width * 0.12, top + height * 0.12, width * 0.76, height * 0.20);
      context.fillStyle = colors.highlightRock;
      context.fillRect(left + width * 0.30, top + height * 0.16, width * 0.30, Math.max(2, height * 0.06));
      break;
    case "dune-grass":
      context.strokeStyle = colors.highlight;
      context.lineWidth = 3;
      for (let index = 0; index < 7; index += 1) {
        const offset = (index - 3) * width * 0.095;
        context.beginPath();
        context.moveTo(prop.x + offset, prop.baseY);
        context.lineTo(prop.x + offset + (index - 3) * 2, top + height * (0.16 + (index % 3) * 0.10));
        context.stroke();
      }
      break;
    case "planter":
      context.fillStyle = "#5b6055";
      context.fillRect(left, top + height * 0.50, width, height * 0.50);
      context.fillStyle = "#9a9b77";
      context.fillRect(left - 3, top + height * 0.44, width + 6, Math.max(4, height * 0.14));
      drawShrub(context, { ...prop, baseY: top + height * 0.54, width: width * 0.78, height: height * 0.66 }, colors, left + width * 0.11, top - height * 0.10);
      break;
    case "clipped-shrub":
    case "shrub":
    default:
      drawShrub(context, prop, colors, left, top);
      break;
  }
  context.restore();
}

/** Draws the far and mid tree layers in camera-relative parallax space. */
export function drawBackgroundScenery(context, props, cameraX, viewportWidth, scene) {
  const ordered = [...props].sort((left, right) => left.parallax - right.parallax);
  for (const prop of ordered) {
    const screenX = viewportWidth * (1 - prop.parallax) * 0.5 +
      (prop.x - cameraX) * prop.parallax;
    if (screenX + prop.width < -180 || screenX - prop.width > viewportWidth + 180) continue;
    drawTree(context, prop, Math.round(screenX), scene);
  }
}

/** Draws low-profile environmental details in world space, behind gameplay actors. */
export function drawGroundScenery(context, prop, scene) {
  drawGroundProp(context, prop, scene);
}
