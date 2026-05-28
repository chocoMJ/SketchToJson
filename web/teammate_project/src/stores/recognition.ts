import type {
  Cell,
  LayerBounds,
  LevelData,
  LevelLayer,
  RecognitionPayload,
  RecognizedObject,
  TileMapping,
  TilePlacement,
} from '@/models/level';

import { currentSnapshot, replaceLevel } from './history';
import {
  buildCvShapeMapping,
  createRandomPaletteTile,
  isCvShape,
  normalizeCvShape,
} from './palette';

type CellRange = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type RecognitionLayerBuildOptions = {
  importId?: string;
  layerName?: string;
  origin?: Cell;
  tileSize?: number;
  viewportWidth?: number;
};

export type RecognitionLayerBuildResult = {
  importId: string;
  layer: LevelLayer;
  tileMappings: TileMapping[];
};

const DEFAULT_TILE_SIZE = 32;
const DEFAULT_VIEWPORT_WIDTH = 1024;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const coordinateKey = (cell: Cell) => `${cell.x},${cell.y}`;

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'recognition';
};

const getUniqueId = (base: string, existingIds: Set<string>) => {
  if (!existingIds.has(base)) {
    return base;
  }

  let index = 2;

  while (existingIds.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
};

const getNextLayerOrder = (level: LevelData) => {
  if (level.layers.length === 0) {
    return 0;
  }

  return Math.max(...level.layers.map((layer) => layer.order)) + 1;
};

const getLayerBounds = (
  payload: RecognitionPayload,
  options: RecognitionLayerBuildOptions,
): LayerBounds => {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const viewportWidth = Math.max(
    options.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH,
    tileSize,
  );
  const targetWidthCells = Math.max(
    1,
    Math.floor((viewportWidth * 0.5) / tileSize),
  );
  const targetHeightCells = Math.max(
    1,
    Math.round(targetWidthCells * (payload.image.height / payload.image.width)),
  );
  const origin = options.origin ?? { x: 0, y: -targetHeightCells };

  return {
    x: origin.x,
    y: origin.y,
    width: targetWidthCells,
    height: targetHeightCells,
  };
};

const getObjectCellRange = (
  object: RecognizedObject,
  payload: RecognitionPayload,
  bounds: LayerBounds,
): CellRange | null => {
  const boundsRight = bounds.x + bounds.width;
  const boundsTop = bounds.y + bounds.height;
  const scaleX = bounds.width / payload.image.width;
  const scaleY = bounds.height / payload.image.height;
  const left = bounds.x + object.x * scaleX;
  const right = bounds.x + (object.x + object.width) * scaleX;

  // Image coordinates are top-left/downward; editor cells are bottom-left/upward.
  const top = boundsTop - object.y * scaleY;
  const bottom = boundsTop - (object.y + object.height) * scaleY;
  const clippedLeft = clamp(Math.min(left, right), bounds.x, boundsRight);
  const clippedRight = clamp(Math.max(left, right), bounds.x, boundsRight);
  const clippedBottom = clamp(Math.min(bottom, top), bounds.y, boundsTop);
  const clippedTop = clamp(Math.max(bottom, top), bounds.y, boundsTop);

  if (clippedLeft >= clippedRight || clippedBottom >= clippedTop) {
    return null;
  }

  return {
    minX: Math.floor(clippedLeft),
    maxX: Math.ceil(clippedRight) - 1,
    minY: Math.floor(clippedBottom),
    maxY: Math.ceil(clippedTop) - 1,
  };
};

const buildTileMappingResolver = (level: LevelData) => {
  const shapeTileIds = buildCvShapeMapping(level.tileTable);
  const tileMappings: TileMapping[] = [];

  const resolveTileId = (rawShape: string) => {
    const normalizedShape = normalizeCvShape(rawShape);

    if (!isCvShape(normalizedShape)) {
      return null;
    }

    const existingTileId = shapeTileIds.get(normalizedShape);

    if (existingTileId !== undefined) {
      return existingTileId;
    }

    const tileMapping = createRandomPaletteTile(
      [...level.tileTable, ...tileMappings],
      [normalizedShape],
    );

    tileMappings.push(tileMapping);
    shapeTileIds.set(normalizedShape, tileMapping.tileId);

    return tileMapping.tileId;
  };

  return {
    resolveTileId,
    tileMappings,
  };
};

export const buildRecognitionLayer = (
  level: LevelData,
  payload: RecognitionPayload,
  options: RecognitionLayerBuildOptions = {},
): RecognitionLayerBuildResult => {
  const existingLayerIds = new Set(level.layers.map((layer) => layer.id));
  const existingImportIds = new Set(
    level.layers.flatMap((layer) =>
      layer.id.startsWith('cv-') ? [layer.id, layer.id.slice(3)] : [layer.id],
    ),
  );
  const baseImportId = slugify(
    options.importId ?? payload.id ?? payload.name ?? 'recognition-import',
  );
  const importId = getUniqueId(baseImportId, existingImportIds);
  const layerId = getUniqueId(`cv-${importId}`, existingLayerIds);
  const layerName =
    options.layerName ??
    payload.name ??
    payload.image.name ??
    `CV Import ${getNextLayerOrder(level) + 1}`;
  const bounds = getLayerBounds(payload, options);
  const objectIds = new Set<string>();
  const tileMap = new Map<string, TilePlacement>();
  const tileMappingResolver = buildTileMappingResolver(level);

  for (const [objectIndex, object] of payload.objects.entries()) {
    const objectId = getUniqueId(
      `${importId}-${slugify(object.id ?? `object-${objectIndex + 1}`)}`,
      objectIds,
    );
    const range = getObjectCellRange(object, payload, bounds);

    objectIds.add(objectId);

    if (!range) {
      continue;
    }

    const tileId = tileMappingResolver.resolveTileId(object.shape);

    if (tileId === null) {
      continue;
    }

    for (let y = range.minY; y <= range.maxY; y += 1) {
      for (let x = range.minX; x <= range.maxX; x += 1) {
        tileMap.set(coordinateKey({ x, y }), {
          x,
          y,
          tileId,
          source: {
            type: 'recognition',
            importId,
            objectId,
          },
        });
      }
    }
  }

  return {
    importId,
    layer: {
      id: layerId,
      name: layerName,
      order: getNextLayerOrder(level),
      bounds,
      tiles: [...tileMap.values()].sort((first, second) => {
        if (first.y !== second.y) {
          return first.y - second.y;
        }

        return first.x - second.x;
      }),
    },
    tileMappings: tileMappingResolver.tileMappings,
  };
};

export const insertRecognitionLayer = (
  payload: RecognitionPayload,
  options: RecognitionLayerBuildOptions = {},
) => {
  const snapshot = currentSnapshot.get();

  if (!snapshot) {
    return null;
  }

  const result = buildRecognitionLayer(snapshot, payload, options);

  replaceLevel({
    ...snapshot,
    tileTable: [...snapshot.tileTable, ...result.tileMappings],
    layers: [...snapshot.layers, result.layer],
  });

  return result.layer.id;
};
