import { computed } from 'nanostores';

import type {
  CvShape,
  LevelData,
  LevelLayer,
  TileIcon,
  TileMapping,
  TilePlacement,
} from '@/models/level';

import { currentSnapshot } from './history';

export const CV_SHAPE_PRESETS = [
  'star',
  'triangle',
  'line',
  'door',
  'window',
  'stairs',
] as const satisfies readonly CvShape[];

export const TILE_ICON_PRESETS = [
  'star',
  'triangle',
  'line',
  'door',
  'window',
  'stairs',
] as const satisfies readonly TileIcon[];

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/u;

export const createDefaultTileName = (tileId: number) => `Tile ${tileId}`;

export const normalizeTileName = (value: string) => value.trim();

export const getTileNameKey = (value: string) =>
  normalizeTileName(value).toLowerCase();

export const getTileDisplayName = (
  tile: Pick<TileMapping, 'name' | 'tileId'>,
) => normalizeTileName(tile.name) || createDefaultTileName(tile.tileId);

const backgroundColors = [
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#be123c',
  '#4f46e5',
] as const;

const iconColors = [
  '#f8fafc',
  '#111827',
  '#fef3c7',
  '#dbeafe',
  '#ecfeff',
] as const;

const randomItem = <T>(items: readonly T[]) =>
  items[Math.floor(Math.random() * items.length)] ?? items[0];

const cloneTileSource = (source: TilePlacement['source']) =>
  source ? { ...source } : undefined;

const cloneTile = (tile: TilePlacement): TilePlacement => ({
  ...tile,
  ...(tile.source ? { source: cloneTileSource(tile.source) } : {}),
});

const cloneLayer = (layer: LevelLayer): LevelLayer => ({
  ...layer,
  ...(layer.bounds ? { bounds: { ...layer.bounds } } : {}),
  tiles: layer.tiles.map(cloneTile),
});

export const clonePaletteTile = (tile: TileMapping): TileMapping => ({
  ...tile,
  cvShapes: [...tile.cvShapes],
});

export const normalizePaletteTile = (tile: TileMapping): TileMapping => ({
  ...clonePaletteTile(tile),
  name: normalizeTileName(tile.name),
});

export const cloneLevelData = (level: LevelData): LevelData => ({
  ...level,
  tileTable: level.tileTable.map(clonePaletteTile),
  layers: level.layers.map(cloneLayer),
});

export const isHexColor = (value: string) => HEX_COLOR_PATTERN.test(value);

export const normalizeCvShape = (value: string) => value.trim().toLowerCase();

export const isCvShape = (value: string): value is CvShape =>
  (CV_SHAPE_PRESETS as readonly string[]).includes(value);

export const getNextTileId = (tileTable: readonly TileMapping[]) => {
  if (tileTable.length === 0) {
    return 0;
  }

  return Math.max(...tileTable.map((tile) => tile.tileId)) + 1;
};

export const sortPaletteTiles = (tileTable: readonly TileMapping[]) =>
  [...tileTable].sort((first, second) => first.tileId - second.tileId);

export const buildCvShapeMapping = (tileTable: readonly TileMapping[]) => {
  const mapping = new Map<CvShape, number>();

  for (const tile of tileTable) {
    for (const shape of tile.cvShapes) {
      mapping.set(shape, tile.tileId);
    }
  }

  return mapping;
};

export const cvShapeMappingStore = computed(currentSnapshot, (snapshot) =>
  snapshot
    ? buildCvShapeMapping(snapshot.tileTable)
    : new Map<CvShape, number>(),
);

export const createRandomPaletteTile = (
  tileTable: readonly TileMapping[],
  cvShapes: CvShape[] = [],
): TileMapping => {
  const tileId = getNextTileId(tileTable);

  return {
    tileId,
    name: createDefaultTileName(tileId),
    backgroundColor: randomItem(backgroundColors),
    icon: randomItem(TILE_ICON_PRESETS),
    iconColor: randomItem(iconColors),
    cvShapes: [...cvShapes],
  };
};

export const validatePaletteTiles = (tileTable: readonly TileMapping[]) => {
  const errors: string[] = [];
  const tileIds = new Set<number>();
  const tileNames = new Set<string>();
  const cvShapes = new Set<CvShape>();

  for (const tile of tileTable) {
    if (!Number.isInteger(tile.tileId) || tile.tileId < 0) {
      errors.push('Tile ID must be a non-negative integer.');
    }

    if (tileIds.has(tile.tileId)) {
      errors.push(`Tile ID ${tile.tileId} is already used.`);
    }

    tileIds.add(tile.tileId);

    const tileName = normalizeTileName(tile.name);
    const tileNameKey = getTileNameKey(tile.name);

    if (!tileName) {
      errors.push('Tile name is required.');
    }

    if (tileNameKey && tileNames.has(tileNameKey)) {
      errors.push(`Tile name ${tileName} is already used.`);
    }

    tileNames.add(tileNameKey);

    if (!isHexColor(tile.backgroundColor)) {
      errors.push('Background color must be a #RRGGBB value.');
    }

    if (!TILE_ICON_PRESETS.includes(tile.icon)) {
      errors.push('Icon must be one of the palette presets.');
    }

    if (!isHexColor(tile.iconColor)) {
      errors.push('Icon color must be a #RRGGBB value.');
    }

    for (const shape of tile.cvShapes) {
      if (cvShapes.has(shape)) {
        errors.push(`CV shape ${shape} is already mapped.`);
      }

      cvShapes.add(shape);
    }
  }

  return errors;
};

export const validatePaletteTileUpdate = (
  level: LevelData,
  originalTileId: number | null,
  nextTile: TileMapping,
) => {
  const nextTileTable =
    originalTileId === null
      ? [
          ...level.tileTable.map(clonePaletteTile),
          normalizePaletteTile(nextTile),
        ]
      : level.tileTable.map((tile) =>
          tile.tileId === originalTileId
            ? normalizePaletteTile(nextTile)
            : clonePaletteTile(tile),
        );

  return validatePaletteTiles(nextTileTable);
};

export const addPaletteTileToLevel = (
  level: LevelData,
  tile: TileMapping,
): LevelData => ({
  ...cloneLevelData(level),
  tileTable: sortPaletteTiles([...level.tileTable, normalizePaletteTile(tile)]),
});

export const updatePaletteTileInLevel = (
  level: LevelData,
  originalTileId: number,
  nextTile: TileMapping,
): LevelData => ({
  ...cloneLevelData(level),
  tileTable: sortPaletteTiles(
    level.tileTable.map((tile) =>
      tile.tileId === originalTileId
        ? normalizePaletteTile(nextTile)
        : clonePaletteTile(tile),
    ),
  ),
  layers: level.layers.map((layer) => ({
    ...layer,
    ...(layer.bounds ? { bounds: { ...layer.bounds } } : {}),
    tiles: layer.tiles.map((tile) => ({
      ...cloneTile(tile),
      tileId: tile.tileId === originalTileId ? nextTile.tileId : tile.tileId,
    })),
  })),
});

export const deletePaletteTileFromLevel = (
  level: LevelData,
  tileId: number,
  replacementTileId: number | null,
): LevelData => {
  const deletedTile = level.tileTable.find((tile) => tile.tileId === tileId);

  if (!deletedTile) {
    return cloneLevelData(level);
  }

  const deletedShapes = new Set(deletedTile.cvShapes);
  const nextTileTable = level.tileTable.flatMap((tile) => {
    if (tile.tileId === tileId) {
      return [];
    }

    if (replacementTileId !== null && tile.tileId === replacementTileId) {
      return [
        {
          ...clonePaletteTile(tile),
          cvShapes: [...new Set([...tile.cvShapes, ...deletedShapes])],
        },
      ];
    }

    return [clonePaletteTile(tile)];
  });

  return {
    ...cloneLevelData(level),
    tileTable: sortPaletteTiles(nextTileTable),
    layers: level.layers.map((layer) => ({
      ...layer,
      ...(layer.bounds ? { bounds: { ...layer.bounds } } : {}),
      tiles: layer.tiles.flatMap((tile) => {
        if (tile.tileId !== tileId) {
          return [cloneTile(tile)];
        }

        if (replacementTileId === null) {
          return [];
        }

        return [
          {
            ...cloneTile(tile),
            tileId: replacementTileId,
          },
        ];
      }),
    })),
  };
};
