import type { LevelData, TileMapping } from '@/models/level';
import { getTileDisplayName } from '@/stores/palette';

export type ReplacementOption = {
  value: string;
  label: string;
};

export type ReplacementRenderValue = string | ReplacementOption;

export const selectContentProps = { style: 'z-index: 1100' };

export const getUsedTileCount = (level: LevelData, tileId: number) =>
  level.layers.reduce(
    (count, layer) =>
      count + layer.tiles.filter((tile) => tile.tileId === tileId).length,
    0,
  );

export const getPaletteDescription = (level: LevelData, tile: TileMapping) => {
  const usedCount = getUsedTileCount(level, tile.tileId);
  const shapes =
    tile.cvShapes.length > 0 ? `${tile.cvShapes.join(', ')}` : 'No Mapping';

  return `${usedCount} used / ${shapes}`;
};

export const getReplacementValue = (value: ReplacementRenderValue) =>
  typeof value === 'string' ? value : value.value;

export const createReplacementOptions = (
  level: LevelData,
  deleteTargetId: number | null,
) =>
  level.tileTable
    .filter((tile) => tile.tileId !== deleteTargetId)
    .map((tile) => ({
      value: String(tile.tileId),
      label: getTileDisplayName(tile),
    }));
