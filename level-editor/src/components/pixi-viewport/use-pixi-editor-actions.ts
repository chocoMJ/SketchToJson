import type { Accessor } from 'solid-js';

import type {
  Cell,
  LayerBounds,
  LevelData,
  TilePlacement,
} from '@/models/level';
import {
  setClipboard,
  setSelection,
  type TileClipboard,
} from '@/stores/editor';
import {
  addTiles,
  moveTiles,
  deleteTiles as recordDeleteTiles,
  resizeLayer as recordResizeLayer,
  replaceTiles,
} from '@/stores/history';
import { rebuildRecognitionLayerTiles } from '@/stores/recognition';

import { DEFAULT_TILE_ID } from './constants';
import {
  cellsEqual,
  coordinateKey,
  getLayerTileBounds,
  isCellInTileBounds,
  layerBoundsToTileBounds,
  normalizeTiles,
  tileBoundsToLayerBounds,
  uniqueCells,
} from './util';

const cloneTile = (tile: TilePlacement): TilePlacement => ({ ...tile });

const layerBoundsEqual = (first: LayerBounds, second: LayerBounds) =>
  first.x === second.x &&
  first.y === second.y &&
  first.width === second.width &&
  first.height === second.height;

const getResampledSourceCoordinate = (
  sourceStart: number,
  sourceSize: number,
  targetSize: number,
  targetOffset: number,
) =>
  sourceStart +
  Math.min(
    sourceSize - 1,
    Math.floor(((targetOffset + 0.5) * sourceSize) / targetSize),
  );

const resampleLayerTiles = (
  tiles: TilePlacement[],
  startBounds: LayerBounds,
  endBounds: LayerBounds,
) => {
  const sourceBounds = layerBoundsToTileBounds(startBounds);
  const sourceTilesByCoordinate = new Map<string, TilePlacement>();
  const outsideTiles: TilePlacement[] = [];
  const resizedTiles: TilePlacement[] = [];

  for (const tile of tiles) {
    if (!isCellInTileBounds(tile, sourceBounds)) {
      outsideTiles.push(cloneTile(tile));
      continue;
    }

    sourceTilesByCoordinate.set(coordinateKey(tile), tile);
  }

  for (let yOffset = 0; yOffset < endBounds.height; yOffset += 1) {
    const sourceY = getResampledSourceCoordinate(
      startBounds.y,
      startBounds.height,
      endBounds.height,
      yOffset,
    );

    for (let xOffset = 0; xOffset < endBounds.width; xOffset += 1) {
      const sourceX = getResampledSourceCoordinate(
        startBounds.x,
        startBounds.width,
        endBounds.width,
        xOffset,
      );
      const sourceTile = sourceTilesByCoordinate.get(
        coordinateKey({ x: sourceX, y: sourceY }),
      );

      if (!sourceTile) {
        continue;
      }

      resizedTiles.push({
        ...sourceTile,
        x: endBounds.x + xOffset,
        y: endBounds.y + yOffset,
      });
    }
  }

  return normalizeTiles([...outsideTiles, ...resizedTiles]);
};

type UsePixiEditorActionsParams = {
  activeLayerId: Accessor<string>;
  brushTileId: Accessor<number>;
  clipboard: Accessor<TileClipboard | null>;
  selection: Accessor<TilePlacement[]>;
  snapshot: Accessor<LevelData>;
};

export const usePixiEditorActions = ({
  activeLayerId,
  brushTileId,
  clipboard,
  selection,
  snapshot,
}: UsePixiEditorActionsParams) => {
  const getActiveLayer = () =>
    snapshot().layers.find((layer) => layer.id === activeLayerId()) ??
    snapshot().layers[0] ??
    null;

  const getActiveTiles = () => getActiveLayer()?.tiles ?? [];

  const findTileAt = (cell: Cell) =>
    getActiveTiles().find((tile) => cellsEqual(tile, cell)) ?? null;

  const getLayer = (layerId: string | null) =>
    layerId
      ? (snapshot().layers.find((layer) => layer.id === layerId) ?? null)
      : null;

  const getLayerBounds = (layerId: string | null) => {
    const layer = getLayer(layerId);

    return layer ? getLayerTileBounds(layer) : null;
  };

  const getLayerResizeBounds = (layerId: string | null) => {
    const layer = getLayer(layerId);

    if (!layer) {
      return null;
    }

    if (layer.bounds) {
      return { ...layer.bounds };
    }

    const bounds = getLayerTileBounds(layer);

    return bounds ? tileBoundsToLayerBounds(bounds) : null;
  };

  const getBrushTileId = () => {
    const selectedTileId = brushTileId();

    return snapshot().tileTable.some((tile) => tile.tileId === selectedTileId)
      ? selectedTileId
      : (snapshot().tileTable[0]?.tileId ?? DEFAULT_TILE_ID);
  };

  const dispatchAddOrReplace = (
    tiles: TilePlacement[],
    nextSelection?: TilePlacement[],
  ) => {
    const normalizedTiles = normalizeTiles(tiles.map(cloneTile));
    const normalizedSelection = normalizeTiles(
      (nextSelection ?? normalizedTiles).map(cloneTile),
    );
    const activeTilesByCoordinate = new Map(
      getActiveTiles().map((tile) => [coordinateKey(tile), tile]),
    );
    const changedTiles = normalizedTiles.filter((tile) => {
      const existingTile = activeTilesByCoordinate.get(coordinateKey(tile));

      return !existingTile || existingTile.tileId !== tile.tileId;
    });

    if (changedTiles.length === 0) {
      setSelection(normalizedSelection);
      return;
    }

    const changedKeys = new Set(changedTiles.map(coordinateKey));
    const replacedTiles = getActiveTiles().filter((tile) =>
      changedKeys.has(coordinateKey(tile)),
    );

    if (replacedTiles.length > 0) {
      replaceTiles(activeLayerId(), changedTiles, replacedTiles);
    } else {
      addTiles(activeLayerId(), changedTiles);
    }

    setSelection(normalizedSelection);
  };

  const selectTilesInRect = (
    startCell: Cell,
    endCell: Cell,
    baseSelection: TilePlacement[],
    additive: boolean,
  ) => {
    const minX = Math.min(startCell.x, endCell.x);
    const maxX = Math.max(startCell.x, endCell.x);
    const minY = Math.min(startCell.y, endCell.y);
    const maxY = Math.max(startCell.y, endCell.y);
    const selected = getActiveTiles().filter(
      (tile) =>
        tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY,
    );

    if (!additive) {
      setSelection(normalizeTiles(selected));
      return;
    }

    setSelection(normalizeTiles([...baseSelection, ...selected]));
  };

  const paintCells = (cells: Cell[]) => {
    const tiles = uniqueCells(cells).map((cell) => ({
      ...cell,
      tileId: getBrushTileId(),
    }));

    dispatchAddOrReplace(tiles);
  };

  const eraseCells = (cells: Cell[]) => {
    const targetKeys = new Set(uniqueCells(cells).map(coordinateKey));
    const deletedTiles = getActiveTiles().filter((tile) =>
      targetKeys.has(coordinateKey(tile)),
    );

    if (deletedTiles.length === 0) {
      return;
    }

    recordDeleteTiles(activeLayerId(), deletedTiles);
    setSelection(
      selection().filter((tile) => !targetKeys.has(coordinateKey(tile))),
    );
  };

  const deleteSelection = () => {
    if (selection().length === 0) {
      return;
    }

    const selectedKeys = new Set(selection().map(coordinateKey));
    const deletedTiles = getActiveTiles().filter((tile) =>
      selectedKeys.has(coordinateKey(tile)),
    );

    if (deletedTiles.length === 0) {
      setSelection([]);
      return;
    }

    recordDeleteTiles(activeLayerId(), deletedTiles);
    setSelection([]);
  };

  const moveSelection = (delta: Cell) => {
    if (selection().length === 0 || (delta.x === 0 && delta.y === 0)) {
      return;
    }

    const selectedKeys = new Set(selection().map(coordinateKey));
    const movedTiles = normalizeTiles(
      selection().map((tile) => ({
        ...tile,
        x: tile.x + delta.x,
        y: tile.y + delta.y,
      })),
    );
    const movedKeys = new Set(movedTiles.map(coordinateKey));
    const replacedTiles = getActiveTiles().filter(
      (tile) =>
        !selectedKeys.has(coordinateKey(tile)) &&
        movedKeys.has(coordinateKey(tile)),
    );

    if (replacedTiles.length > 0) {
      replaceTiles(activeLayerId(), movedTiles, [
        ...selection(),
        ...replacedTiles,
      ]);
    } else {
      moveTiles(
        activeLayerId(),
        selection().map((tile) => ({
          start: { x: tile.x, y: tile.y },
          end: { x: tile.x + delta.x, y: tile.y + delta.y },
          tileId: tile.tileId,
          ...(tile.source ? { source: { ...tile.source } } : {}),
        })),
      );
    }

    setSelection(movedTiles);
  };

  const moveLayer = (layerId: string, delta: Cell) => {
    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    const layer = getLayer(layerId);

    if (!layer || (layer.tiles.length === 0 && !layer.bounds)) {
      return;
    }

    moveTiles(
      layerId,
      layer.tiles.map((tile) => ({
        start: { x: tile.x, y: tile.y },
        end: { x: tile.x + delta.x, y: tile.y + delta.y },
        tileId: tile.tileId,
        ...(tile.source ? { source: { ...tile.source } } : {}),
      })),
      layer.bounds
        ? {
            start: { ...layer.bounds },
            end: {
              ...layer.bounds,
              x: layer.bounds.x + delta.x,
              y: layer.bounds.y + delta.y,
            },
          }
        : undefined,
    );
    setSelection([]);
  };

  const resizeLayer = async (layerId: string, endBounds: LayerBounds) => {
    const layer = getLayer(layerId);
    const startBounds = getLayerResizeBounds(layerId);

    if (!layer || !startBounds || layerBoundsEqual(startBounds, endBounds)) {
      return;
    }

    const shouldRebuildFromImage = Boolean(
      layer.source?.type === 'recognition' &&
        (layer.source.payload.image.data || layer.source.payload.image.src),
    );
    let endTiles: TilePlacement[];

    if (shouldRebuildFromImage) {
      try {
        endTiles =
          (await rebuildRecognitionLayerTiles(snapshot(), layer, endBounds)) ??
          [];
      } catch (error) {
        console.warn('Recognition image resize failed.', error);
        return;
      }
    } else {
      endTiles = resampleLayerTiles(layer.tiles, startBounds, endBounds);
    }

    recordResizeLayer(
      layerId,
      layer.bounds ? { ...layer.bounds } : null,
      endBounds,
      layer.tiles,
      endTiles,
    );
    setSelection([]);
  };

  const copySelection = () => {
    if (selection().length === 0) {
      return;
    }

    const selectedTiles = selection();
    const minX = Math.min(...selectedTiles.map((tile) => tile.x));
    const maxX = Math.max(...selectedTiles.map((tile) => tile.x));
    const minY = Math.min(...selectedTiles.map((tile) => tile.y));
    const maxY = Math.max(...selectedTiles.map((tile) => tile.y));
    const nextClipboard: TileClipboard = {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      origin: { x: minX, y: minY },
      tiles: selectedTiles.map((tile) => ({
        ...tile,
        x: tile.x - minX,
        y: tile.y - minY,
      })),
    };

    setClipboard(nextClipboard);
    void navigator.clipboard
      ?.writeText(JSON.stringify(nextClipboard, null, 2))
      .catch(() => undefined);
  };

  const pasteClipboard = (cell: Cell) => {
    const currentClipboard = clipboard();

    if (!currentClipboard) {
      return;
    }

    const pastedTiles = currentClipboard.tiles.map((tile) => ({
      ...tile,
      x: cell.x + tile.x,
      y: cell.y + tile.y,
    }));

    dispatchAddOrReplace(pastedTiles, pastedTiles);
  };

  return {
    copySelection,
    deleteSelection,
    eraseCells,
    findTileAt,
    getActiveTiles,
    getBrushTileId,
    getLayerBounds,
    getLayerResizeBounds,
    moveLayer,
    moveSelection,
    paintCells,
    pasteClipboard,
    resizeLayer,
    selectTilesInRect,
  };
};

export type PixiEditorActions = ReturnType<typeof usePixiEditorActions>;
