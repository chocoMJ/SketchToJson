import type { LevelLayer, TilePlacement } from '@/models/level';

export const createLayerTreeFlipKey = (layers: LevelLayer[]) =>
  layers
    .map((layer) =>
      [
        layer.id,
        layer.order,
        layer.tiles
          .map((tile) => `${tile.x},${tile.y},${tile.tileId}`)
          .join('|'),
      ].join(':'),
    )
    .join(';');

export const getTileFlipId = (layerId: string, tile: TilePlacement) =>
  `side-panel-layer-${layerId}-tile-${tile.x}-${tile.y}`;
