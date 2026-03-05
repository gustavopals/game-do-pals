export interface MapLayerGroundConfig {
  lowTile: string;
  midTile: string;
  highTile: string;
  lowMaxNoise: number;
  midMaxNoise: number;
}

export interface MapLayerPathConfig {
  tileA: string;
  tileB: string;
  mixThreshold: number;
  radiusTiles: number;
  sampleStepPx: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

export interface MapLayerDecorRule {
  texture: string;
  minNoise: number;
  maxNoise: number;
  noiseScaleX: number;
  noiseScaleY: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

export interface MapLayerConfig {
  version: number;
  mapId: string;
  tileSize: number;
  minBaseClearRadiusTiles: number;
  ground: MapLayerGroundConfig;
  path: MapLayerPathConfig;
  decorRules: MapLayerDecorRule[];
}

export const DEFAULT_MAP_LAYER_CONFIG: MapLayerConfig = {
  version: 4,
  mapId: "wardens-field",
  tileSize: 16,
  minBaseClearRadiusTiles: 2.8,
  ground: {
    lowTile: "tile_grass_a",
    midTile: "tile_grass_b",
    highTile: "tile_grass_c",
    lowMaxNoise: 0.35,
    midMaxNoise: 0.72,
  },
  path: {
    tileA: "tile_path_a",
    tileB: "tile_path_b",
    mixThreshold: 0.48,
    radiusTiles: 1,
    sampleStepPx: 5,
    noiseOffsetX: 17,
    noiseOffsetY: 29,
  },
  decorRules: [
    {
      texture: "prop_tree",
      minNoise: 0.988,
      maxNoise: 1,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 23,
      noiseOffsetY: 9,
    },
    {
      texture: "prop_bush",
      minNoise: 0.968,
      maxNoise: 0.988,
      noiseScaleX: 4,
      noiseScaleY: 6,
      noiseOffsetX: 17,
      noiseOffsetY: 11,
    },
    {
      texture: "prop_tree_dead",
      minNoise: 0.94,
      maxNoise: 0.952,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 31,
      noiseOffsetY: 17,
    },
    {
      texture: "prop_stone",
      minNoise: 0,
      maxNoise: 0.018,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 23,
      noiseOffsetY: 9,
    },
    {
      texture: "prop_flower_blue",
      minNoise: 0.315,
      maxNoise: 0.325,
      noiseScaleX: 6,
      noiseScaleY: 6,
      noiseOffsetX: 27,
      noiseOffsetY: 5,
    },
    {
      texture: "prop_flower_gold",
      minNoise: 0.49,
      maxNoise: 0.5,
      noiseScaleX: 6,
      noiseScaleY: 6,
      noiseOffsetX: 27,
      noiseOffsetY: 5,
    },
    {
      texture: "prop_crop",
      minNoise: 0.58,
      maxNoise: 0.594,
      noiseScaleX: 6,
      noiseScaleY: 6,
      noiseOffsetX: 19,
      noiseOffsetY: 39,
    },
    {
      texture: "prop_grass_tall",
      minNoise: 0.74,
      maxNoise: 0.758,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 9,
      noiseOffsetY: 13,
    },
    {
      texture: "prop_fence",
      minNoise: 0.9,
      maxNoise: 0.912,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 47,
      noiseOffsetY: 3,
    },
    {
      texture: "prop_barrel",
      minNoise: 0.922,
      maxNoise: 0.932,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 57,
      noiseOffsetY: 3,
    },
    {
      texture: "prop_mushroom",
      minNoise: 0.245,
      maxNoise: 0.255,
      noiseScaleX: 6,
      noiseScaleY: 5,
      noiseOffsetX: 15,
      noiseOffsetY: 33,
    },
    {
      texture: "prop_crystal",
      minNoise: 0.86,
      maxNoise: 0.866,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 63,
      noiseOffsetY: 27,
    },
    {
      texture: "prop_ruin",
      minNoise: 0.834,
      maxNoise: 0.842,
      noiseScaleX: 5,
      noiseScaleY: 7,
      noiseOffsetX: 57,
      noiseOffsetY: 3,
    },
  ],
};
