import type {
  Cell,
  LayerBounds,
  LevelLayer,
  TilePlacement,
} from '@/models/level';

import { TILE_SIZE } from './constants';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const coordinateKey = (cell: Cell) => `${cell.x},${cell.y}`;

export const cellsEqual = (first: Cell, second: Cell) =>
  first.x === second.x && first.y === second.y;

export const normalizeTiles = (tiles: TilePlacement[]) => {
  const tileMap = new Map<string, TilePlacement>();

  for (const tile of tiles) {
    tileMap.set(coordinateKey(tile), tile);
  }

  return [...tileMap.values()].sort((first, second) => {
    if (first.y !== second.y) {
      return first.y - second.y;
    }

    return first.x - second.x;
  });
};

export const uniqueCells = (cells: Cell[]) => {
  const cellMap = new Map<string, Cell>();

  for (const cell of cells) {
    cellMap.set(coordinateKey(cell), cell);
  }

  return [...cellMap.values()];
};

export type TileBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export const getTileBounds = (tiles: TilePlacement[]): TileBounds | null => {
  if (tiles.length === 0) {
    return null;
  }

  return tiles.reduce<TileBounds>(
    (bounds, tile) => ({
      minX: Math.min(bounds.minX, tile.x),
      maxX: Math.max(bounds.maxX, tile.x),
      minY: Math.min(bounds.minY, tile.y),
      maxY: Math.max(bounds.maxY, tile.y),
    }),
    {
      minX: tiles[0].x,
      maxX: tiles[0].x,
      minY: tiles[0].y,
      maxY: tiles[0].y,
    },
  );
};

export const layerBoundsToTileBounds = (bounds: LayerBounds): TileBounds => ({
  minX: bounds.x,
  maxX: bounds.x + bounds.width - 1,
  minY: bounds.y,
  maxY: bounds.y + bounds.height - 1,
});

export const getLayerTileBounds = (layer: LevelLayer): TileBounds | null =>
  layer.bounds
    ? layerBoundsToTileBounds(layer.bounds)
    : getTileBounds(layer.tiles);

export const isCellInTileBounds = (cell: Cell, bounds: TileBounds) =>
  cell.x >= bounds.minX &&
  cell.x <= bounds.maxX &&
  cell.y >= bounds.minY &&
  cell.y <= bounds.maxY;

export const tileColor = (tileId: number) => {
  const colors = [0x2563eb, 0x059669, 0xdc2626, 0xd97706, 0x7c3aed, 0x0891b2];

  return colors[tileId % colors.length] ?? colors[0];
};

export const getCellRect = (cell: Cell) => ({
  x: cell.x * TILE_SIZE,
  y: cell.y * TILE_SIZE,
});

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.matches('input, textarea, select, button')
  );
};
