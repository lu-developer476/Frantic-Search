export const GAME = {
  width: 960,
  height: 540,
  groundY: 430,
  gravity: 1900,
  playerX: 145,
  fixedStep: 1 / 60,
  maxFrameDelta: 0.1
};

export const LEVELS = [
  {
    name: "COASTAL HIGHWAY",
    subtitle: "The extraction convoy left fresh tracks.",
    distance: 0,
    sky: "#243b3b",
    ground: "#293a31"
  },
  {
    name: "REDWOOD FRONTIER",
    subtitle: "Something is moving between the trees.",
    distance: 900,
    sky: "#263d35",
    ground: "#344235"
  },
  {
    name: "BLACK SITE",
    subtitle: "The poachers are close. Beta is inside.",
    distance: 1900,
    sky: "#292e35",
    ground: "#35363a"
  }
];
