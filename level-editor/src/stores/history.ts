import { computed, map } from 'nanostores';

import type {
  Cell,
  LayerBounds,
  LevelData,
  LevelLayer,
  RecognitionBinaryData,
  RecognitionPayload,
  TileMapping,
  TilePlacement,
} from '@/models/level';

export type TileMove = {
  start: Cell;
  end: Cell;
  tileId: number;
  source?: TilePlacement['source'];
};

export type AddHistoryAction = {
  type: 'add';
  layerId: string;
  tiles: TilePlacement[];
};

export type DeleteHistoryAction = {
  type: 'delete';
  layerId: string;
  tiles: TilePlacement[];
};

export type ReplaceHistoryAction = {
  type: 'replace';
  layerId: string;
  add: TilePlacement[];
  delete: TilePlacement[];
};

export type ReplaceLevelHistoryAction = {
  type: 'replace-level';
  before: LevelData;
  after: LevelData;
};

export type AddLayerHistoryAction = {
  type: 'add-layer';
  layer: LevelLayer;
  tileMappings: TileMapping[];
};

export type LayerBoundsMove = {
  start: LayerBounds;
  end: LayerBounds;
};

export type MoveHistoryAction = {
  type: 'move';
  layerId: string;
  moves: TileMove[];
  bounds?: LayerBoundsMove;
};

export type ResizeLayerHistoryAction = {
  type: 'resize-layer';
  layerId: string;
  startBounds: LayerBounds | null;
  endBounds: LayerBounds;
  startTiles: TilePlacement[];
  endTiles: TilePlacement[];
};

export type EditorHistoryAction =
  | AddLayerHistoryAction
  | AddHistoryAction
  | DeleteHistoryAction
  | MoveHistoryAction
  | ReplaceHistoryAction
  | ResizeLayerHistoryAction
  | ReplaceLevelHistoryAction;

export type EditorHistoryState = {
  actions: EditorHistoryAction[];
  deltaIndex: number;
  latestSnapshot: LevelData | null;
};

const coordinateKey = (cell: Cell) => `${cell.x},${cell.y}`;

const cloneLayerBounds = (bounds: LayerBounds): LayerBounds => ({ ...bounds });

const cloneRecognitionBinaryData = (
  data: RecognitionBinaryData,
): RecognitionBinaryData => ({ ...data });

const cloneRecognitionPayload = (
  payload: RecognitionPayload,
): RecognitionPayload => ({
  ...payload,
  image: {
    ...payload.image,
    ...(payload.image.data
      ? { data: cloneRecognitionBinaryData(payload.image.data) }
      : {}),
  },
  objects: payload.objects.map((object) => ({
    ...object,
    ...(object.data ? { data: cloneRecognitionBinaryData(object.data) } : {}),
  })),
});

const cloneTile = (tile: TilePlacement): TilePlacement => ({
  ...tile,
  ...(tile.source ? { source: { ...tile.source } } : {}),
});

const cloneTileMapping = (tileMapping: TileMapping): TileMapping => ({
  ...tileMapping,
  cvShapes: [...tileMapping.cvShapes],
});

const cloneLayer = (layer: LevelLayer): LevelLayer => ({
  ...layer,
  ...(layer.bounds ? { bounds: cloneLayerBounds(layer.bounds) } : {}),
  ...(layer.source
    ? {
        source: {
          ...layer.source,
          payload: cloneRecognitionPayload(layer.source.payload),
        },
      }
    : {}),
  tiles: layer.tiles.map(cloneTile),
});

const cloneMove = (move: TileMove): TileMove => ({
  start: { ...move.start },
  end: { ...move.end },
  tileId: move.tileId,
  ...(move.source ? { source: { ...move.source } } : {}),
});

const cloneLayerBoundsMove = (move: LayerBoundsMove): LayerBoundsMove => ({
  start: cloneLayerBounds(move.start),
  end: cloneLayerBounds(move.end),
});

const layerBoundsEqual = (
  first: LayerBounds | null,
  second: LayerBounds | null,
) =>
  first?.x === second?.x &&
  first?.y === second?.y &&
  first?.width === second?.width &&
  first?.height === second?.height;

const tilePlacementsEqual = (
  first: TilePlacement[],
  second: TilePlacement[],
) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((tile, index) => {
    const candidate = second[index];

    return (
      !!candidate &&
      tile.x === candidate.x &&
      tile.y === candidate.y &&
      tile.tileId === candidate.tileId &&
      tile.source?.type === candidate.source?.type &&
      tile.source?.importId === candidate.source?.importId &&
      tile.source?.objectId === candidate.source?.objectId
    );
  });
};

const cloneHistoryAction = (
  action: EditorHistoryAction,
): EditorHistoryAction => {
  if (action.type === 'add-layer') {
    return {
      ...action,
      layer: cloneLayer(action.layer),
      tileMappings: action.tileMappings.map(cloneTileMapping),
    };
  }

  if (action.type === 'add' || action.type === 'delete') {
    return {
      ...action,
      tiles: action.tiles.map(cloneTile),
    };
  }

  if (action.type === 'replace') {
    return {
      ...action,
      add: action.add.map(cloneTile),
      delete: action.delete.map(cloneTile),
    };
  }

  if (action.type === 'replace-level') {
    return {
      ...action,
      before: cloneSnapshot(action.before),
      after: cloneSnapshot(action.after),
    };
  }

  if (action.type === 'resize-layer') {
    return {
      ...action,
      startBounds: action.startBounds
        ? cloneLayerBounds(action.startBounds)
        : null,
      endBounds: cloneLayerBounds(action.endBounds),
      startTiles: action.startTiles.map(cloneTile),
      endTiles: action.endTiles.map(cloneTile),
    };
  }

  return {
    ...action,
    moves: action.moves.map(cloneMove),
    ...(action.bounds ? { bounds: cloneLayerBoundsMove(action.bounds) } : {}),
  };
};

const cloneSnapshot = (snapshot: LevelData): LevelData => ({
  ...snapshot,
  tileTable: snapshot.tileTable.map(cloneTileMapping),
  layers: snapshot.layers.map(cloneLayer),
});

const normalizeTiles = (tiles: TilePlacement[]) => {
  const tileMap = new Map<string, TilePlacement>();

  for (const tile of tiles) {
    tileMap.set(coordinateKey(tile), cloneTile(tile));
  }

  return [...tileMap.values()].sort((first, second) => {
    if (first.y !== second.y) {
      return first.y - second.y;
    }

    return first.x - second.x;
  });
};

const updateLayer = (
  snapshot: LevelData,
  layerId: string,
  update: (layer: LevelLayer) => LevelLayer,
) => ({
  ...snapshot,
  tileTable: snapshot.tileTable.map(cloneTileMapping),
  layers: snapshot.layers.map((layer) =>
    layer.id === layerId
      ? cloneLayer(update(cloneLayer(layer)))
      : cloneLayer(layer),
  ),
});

const updateLayerTiles = (
  snapshot: LevelData,
  layerId: string,
  update: (tiles: TilePlacement[]) => TilePlacement[],
) =>
  updateLayer(snapshot, layerId, (layer) => ({
    ...layer,
    tiles: normalizeTiles(update(layer.tiles)),
  }));

const removeTiles = (tiles: TilePlacement[], targets: ReadonlyArray<Cell>) => {
  const targetKeys = new Set(targets.map(coordinateKey));

  return tiles.filter((tile) => !targetKeys.has(coordinateKey(tile)));
};

const setLayerBoundsAndTiles = (
  layer: LevelLayer,
  bounds: LayerBounds | null,
  tiles: TilePlacement[],
): LevelLayer => {
  const { bounds: _bounds, ...rest } = layer;

  return {
    ...rest,
    ...(bounds ? { bounds: cloneLayerBounds(bounds) } : {}),
    tiles: normalizeTiles(tiles),
  };
};

export const applyHistoryAction = (
  snapshot: LevelData,
  action: EditorHistoryAction,
) => {
  if (action.type === 'replace-level') {
    return cloneSnapshot(action.after);
  }

  if (action.type === 'add-layer') {
    return {
      ...snapshot,
      tileTable: [
        ...snapshot.tileTable.map(cloneTileMapping),
        ...action.tileMappings.map(cloneTileMapping),
      ],
      layers: [...snapshot.layers.map(cloneLayer), cloneLayer(action.layer)],
    };
  }

  if (action.type === 'add') {
    return updateLayerTiles(snapshot, action.layerId, (tiles) => [
      ...removeTiles(tiles, action.tiles),
      ...action.tiles,
    ]);
  }

  if (action.type === 'delete') {
    return updateLayerTiles(snapshot, action.layerId, (tiles) =>
      removeTiles(tiles, action.tiles),
    );
  }

  if (action.type === 'replace') {
    return updateLayerTiles(snapshot, action.layerId, (tiles) => [
      ...removeTiles(tiles, [...action.delete, ...action.add]),
      ...action.add,
    ]);
  }

  if (action.type === 'resize-layer') {
    return updateLayer(snapshot, action.layerId, (layer) =>
      setLayerBoundsAndTiles(layer, action.endBounds, action.endTiles),
    );
  }

  return updateLayer(snapshot, action.layerId, (layer) => ({
    ...layer,
    ...(action.bounds ? { bounds: cloneLayerBounds(action.bounds.end) } : {}),
    tiles: normalizeTiles([
      ...removeTiles(layer.tiles, [
        ...action.moves.map((move) => move.start),
        ...action.moves.map((move) => move.end),
      ]),
      ...action.moves.map((move) => ({
        ...move.end,
        tileId: move.tileId,
        ...(move.source ? { source: { ...move.source } } : {}),
      })),
    ]),
  }));
};

export const revertHistoryAction = (
  snapshot: LevelData,
  action: EditorHistoryAction,
) => {
  if (action.type === 'replace-level') {
    return cloneSnapshot(action.before);
  }

  if (action.type === 'add-layer') {
    const tileMappingIds = new Set(
      action.tileMappings.map((tileMapping) => tileMapping.tileId),
    );

    return {
      ...snapshot,
      tileTable: snapshot.tileTable
        .filter((tileMapping) => !tileMappingIds.has(tileMapping.tileId))
        .map(cloneTileMapping),
      layers: snapshot.layers
        .filter((layer) => layer.id !== action.layer.id)
        .map(cloneLayer),
    };
  }

  if (action.type === 'add') {
    return updateLayerTiles(snapshot, action.layerId, (tiles) =>
      removeTiles(tiles, action.tiles),
    );
  }

  if (action.type === 'delete') {
    return updateLayerTiles(snapshot, action.layerId, (tiles) => [
      ...removeTiles(tiles, action.tiles),
      ...action.tiles,
    ]);
  }

  if (action.type === 'replace') {
    return updateLayerTiles(snapshot, action.layerId, (tiles) => [
      ...removeTiles(tiles, [...action.add, ...action.delete]),
      ...action.delete,
    ]);
  }

  if (action.type === 'resize-layer') {
    return updateLayer(snapshot, action.layerId, (layer) =>
      setLayerBoundsAndTiles(layer, action.startBounds, action.startTiles),
    );
  }

  return updateLayer(snapshot, action.layerId, (layer) => ({
    ...layer,
    ...(action.bounds ? { bounds: cloneLayerBounds(action.bounds.start) } : {}),
    tiles: normalizeTiles([
      ...removeTiles(layer.tiles, [
        ...action.moves.map((move) => move.end),
        ...action.moves.map((move) => move.start),
      ]),
      ...action.moves.map((move) => ({
        ...move.start,
        tileId: move.tileId,
        ...(move.source ? { source: { ...move.source } } : {}),
      })),
    ]),
  }));
};

export const historyStore = map<EditorHistoryState>({
  actions: [],
  deltaIndex: 0,
  latestSnapshot: null,
});

const getCurrentSnapshot = (history: EditorHistoryState) => {
  if (!history.latestSnapshot) {
    return null;
  }

  return history.actions
    .slice(history.actions.length - history.deltaIndex)
    .reduceRight(revertHistoryAction, history.latestSnapshot);
};

// computed

export const currentSnapshot = computed(historyStore, getCurrentSnapshot);

export const canUndo = computed(
  historyStore,
  ({ actions, deltaIndex }) => deltaIndex < actions.length,
);

export const canRedo = computed(
  historyStore,
  ({ deltaIndex }) => deltaIndex > 0,
);

// actions

export const initializeHistory = (snapshot: LevelData) => {
  historyStore.set({
    actions: [],
    deltaIndex: 0,
    latestSnapshot: cloneSnapshot(snapshot),
  });
};

export const recordHistoryAction = (action: EditorHistoryAction) => {
  const history = historyStore.get();
  const snapshot = getCurrentSnapshot(history);

  if (!snapshot) {
    return;
  }

  const nextAction = cloneHistoryAction(action);
  const activeActions =
    history.deltaIndex === 0
      ? history.actions
      : history.actions.slice(0, history.actions.length - history.deltaIndex);

  historyStore.set({
    actions: [...activeActions, nextAction],
    deltaIndex: 0,
    latestSnapshot: applyHistoryAction(snapshot, nextAction),
  });
};

export const undoHistory = () => {
  const history = historyStore.get();

  if (history.deltaIndex >= history.actions.length) {
    return;
  }

  historyStore.setKey('deltaIndex', history.deltaIndex + 1);
};

export const redoHistory = () => {
  const history = historyStore.get();

  if (history.deltaIndex === 0) {
    return;
  }

  historyStore.setKey('deltaIndex', history.deltaIndex - 1);
};

export const addTiles = (layerId: string, tiles: TilePlacement[]) => {
  if (tiles.length === 0) {
    return;
  }

  recordHistoryAction({ type: 'add', layerId, tiles });
};

export const deleteTiles = (layerId: string, tiles: TilePlacement[]) => {
  if (tiles.length === 0) {
    return;
  }

  recordHistoryAction({ type: 'delete', layerId, tiles });
};

export const addLayer = (
  layer: LevelLayer,
  tileMappings: TileMapping[] = [],
) => {
  recordHistoryAction({ type: 'add-layer', layer, tileMappings });
};

export const replaceLevel = (nextSnapshot: LevelData) => {
  const snapshot = currentSnapshot.get();

  if (!snapshot) {
    return;
  }

  recordHistoryAction({
    type: 'replace-level',
    before: snapshot,
    after: nextSnapshot,
  });
};

export const moveTiles = (
  layerId: string,
  moves: TileMove[],
  bounds?: LayerBoundsMove,
) => {
  if (moves.length === 0 && !bounds) {
    return;
  }

  recordHistoryAction({ type: 'move', layerId, moves, bounds });
};

export const resizeLayer = (
  layerId: string,
  startBounds: LayerBounds | null,
  endBounds: LayerBounds,
  startTiles: TilePlacement[],
  endTiles: TilePlacement[],
) => {
  if (
    layerBoundsEqual(startBounds, endBounds) &&
    tilePlacementsEqual(normalizeTiles(startTiles), normalizeTiles(endTiles))
  ) {
    return;
  }

  recordHistoryAction({
    type: 'resize-layer',
    layerId,
    startBounds,
    endBounds,
    startTiles,
    endTiles,
  });
};

export const replaceTiles = (
  layerId: string,
  add: TilePlacement[],
  deletedTiles: TilePlacement[],
) => {
  if (add.length === 0 && deletedTiles.length === 0) {
    return;
  }

  recordHistoryAction({
    type: 'replace',
    layerId,
    add,
    delete: deletedTiles,
  });
};
