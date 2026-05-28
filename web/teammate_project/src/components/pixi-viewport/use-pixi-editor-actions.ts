import type { Accessor } from 'solid-js';

import type { Cell, LevelData, TilePlacement } from '@/models/level';
import {
  setClipboard,
  setSelection,
  type TileClipboard,
} from '@/stores/editor';
import {
  addTiles,
  moveTiles,
  deleteTiles as recordDeleteTiles,
  replaceTiles,
} from '@/stores/history';

import { DEFAULT_TILE_ID } from './constants';
import {
  cellsEqual,
  coordinateKey,
  getLayerTileBounds,
  normalizeTiles,
  uniqueCells,
} from './util';

const cloneTile = (tile: TilePlacement): TilePlacement => ({ ...tile });

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
    moveLayer,
    moveSelection,
    paintCells,
    pasteClipboard,
    selectTilesInRect,
  };
};

export type PixiEditorActions = ReturnType<typeof usePixiEditorActions>;
