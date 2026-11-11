export const GAME = {
  width: 960,
  height: 540,
  groundY: 430,
  gravity: 1900,
  playerX: 145,
  fixedStep: 1 / 60,
  maxFrameDelta: 0.1,
  campaignEndX: 9050
};

export const LEVELS = [
  {
    name: "COASTAL HIGHWAY",
    subtitle: "The extraction convoy left fresh tracks.",
    distance: 0,
    sky: "#243b3b",
    ground: "#293a31",
    environment: "wild"
  },
  {
    name: "REDWOOD FRONTIER",
    subtitle: "Something is moving between the trees.",
    distance: 1355,
    sky: "#263d35",
    ground: "#344235",
    environment: "forest"
  },
  {
    name: "POACHER BLACK SITE",
    subtitle: "An illegal research complex hides beyond the forest.",
    distance: 2855,
    sky: "#292e35",
    ground: "#35363a",
    environment: "industrial"
  },
  {
    name: "CONTAINMENT PERIMETER",
    subtitle: "The Indominus is guarding the inner wing.",
    distance: 5855,
    sky: "#262d35",
    ground: "#35383b",
    environment: "industrial"
  },
  {
    name: "BETA CONTAINMENT",
    subtitle: "Restore the facility systems and reach the cell block.",
    distance: 7355,
    sky: "#1c2c30",
    ground: "#41484a",
    environment: "facility"
  },
  {
    name: "EXTRACTION ZONE",
    subtitle: "Get Beta out. Bring everyone home.",
    distance: 8255,
    sky: "#263c3a",
    ground: "#3a473e",
    environment: "facility"
  }
];
