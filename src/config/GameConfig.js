export const GAME = {
  width: 960,
  height: 540,
  groundY: 430,
  gravity: 1900,
  playerX: 145,
  fixedStep: 1 / 60,
  maxFrameDelta: 0.1,
  campaignEndX: 14400
};

export const WORLD = {
  sectionLength: 2100,
  sectionCount: 7
};

export const LEVELS = [
  {
    name: "COASTAL HIGHWAY",
    subtitle: "The extraction convoy left fresh tracks.",
    distance: 0,
    sky: "#59c7da", ground: "#99613c", environment: "wild",
    sun: "#ffe16d", sunShade: "#e5ad54", cloud: "#eff8df", cloudShadow: "#9fc9bf",
    mountain: "#9bc5c3", snow: "#e8f3d9", ridge: "#5d8e98",
    treeTrunk: "#76513a", tree: "#257b46", treeLight: "#37a958",
    grass: "#39ba4c", soil: "#99613c", under: "#5e3d2e", detail: "#258744",
    rock: "#d1b079", platform: "#8b6844", platformTop: "#d3ad66", platformShadow: "#4c392e",
    building: "#59686a", buildingShadow: "#34484d", buildingLight: "#91a8a0", window: "#f4d57d", warning: "#e88a54"
  },
  {
    name: "REDWOOD FRONTIER",
    subtitle: "Something is moving between the trees.",
    distance: 1955,
    sky: "#78c8d0", ground: "#865638", environment: "forest",
    sun: "#ffdb78", sunShade: "#dfa95e", cloud: "#e9f1d8", cloudShadow: "#94b8ac",
    mountain: "#82aeb3", snow: "#e2edd8", ridge: "#476f75",
    treeTrunk: "#654632", tree: "#1f7141", treeLight: "#2b9850",
    grass: "#2d9e4c", soil: "#865638", under: "#573a2c", detail: "#246f3d",
    rock: "#b4a17b", platform: "#6b7650", platformTop: "#b3b56b", platformShadow: "#354a36",
    building: "#59686a", buildingShadow: "#34484d", buildingLight: "#91a8a0", window: "#f4d57d", warning: "#e88a54"
  },
  {
    name: "POACHER BLACK SITE",
    subtitle: "An illegal research complex hides beyond the forest.",
    distance: 4055,
    sky: "#d18a69", ground: "#6e4a38", environment: "industrial",
    sun: "#ffd47a", sunShade: "#e5a260", cloud: "#f0c39a", cloudShadow: "#a97967",
    mountain: "#9a786d", snow: "#eac7a5", ridge: "#60535a",
    treeTrunk: "#654632", tree: "#566148", treeLight: "#7b7952",
    grass: "#80724c", soil: "#6e4a38", under: "#49352d", detail: "#a28a58",
    rock: "#b7a07a", platform: "#60544a", platformTop: "#a18b65", platformShadow: "#383531",
    building: "#4d5557", buildingShadow: "#303b40", buildingLight: "#86918a", window: "#e6c67d", warning: "#f4a15f"
  },
  {
    name: "CONTAINMENT PERIMETER",
    subtitle: "The Indominus is guarding the inner wing.",
    distance: 8255,
    sky: "#bb8167", ground: "#625044", environment: "industrial",
    sun: "#f6cb78", sunShade: "#dca56c", cloud: "#e8c6a6", cloudShadow: "#9b7469",
    mountain: "#8d7978", snow: "#e9d4b2", ridge: "#514e56",
    treeTrunk: "#654632", tree: "#4a5c4c", treeLight: "#718065",
    grass: "#78664b", soil: "#625044", under: "#40362f", detail: "#8f7955",
    rock: "#ab9677", platform: "#5b554e", platformTop: "#a08e6f", platformShadow: "#353431",
    building: "#424f55", buildingShadow: "#29383e", buildingLight: "#7e9293", window: "#d9c38b", warning: "#e88a54"
  },
  {
    name: "ROSA CONTAINMENT",
    subtitle: "Restore the facility systems and reach the cell block.",
    distance: 10355,
    sky: "#799ba7", ground: "#695346", environment: "facility",
    sun: "#f6d58a", sunShade: "#d9ad78", cloud: "#dae9dc", cloudShadow: "#8aa6a5",
    mountain: "#788f96", snow: "#e3e8d7", ridge: "#4b6269",
    treeTrunk: "#574b42", tree: "#3c6650", treeLight: "#608366",
    grass: "#73804d", soil: "#695346", under: "#43372f", detail: "#9b9860",
    rock: "#a89a7c", platform: "#59645d", platformTop: "#a8a06c", platformShadow: "#303c39",
    building: "#3d555d", buildingShadow: "#283b43", buildingLight: "#8aa2a3", window: "#d7d18b", warning: "#ef9a62"
  },
  {
    name: "EXTRACTION ZONE",
    subtitle: "Get Rosa out. Bring everyone home.",
    distance: 12095,
    sky: "#f0a66f",
    ground: "#795039",
    environment: "facility",
    sun: "#ffe58a",
    sunShade: "#e8b65d",
    cloud: "#fff0d2",
    cloudShadow: "#d69a7a",
    mountain: "#b58b85",
    snow: "#f0d7b4",
    ridge: "#765d65",
    treeTrunk: "#574333",
    tree: "#37684d",
    treeLight: "#5b8b59",
    grass: "#85a34c",
    soil: "#795039",
    under: "#4a352a",
    detail: "#9e9b58",
    rock: "#b9a17b",
    platform: "#696044",
    platformTop: "#b7a66b",
    platformShadow: "#3c392e",
    building: "#3e5660",
    buildingShadow: "#293c43",
    buildingLight: "#8aa2a3",
    window: "#e3d28f",
    warning: "#ef9a62"
  }
];
