import type {
  LayerBounds,
  LevelData,
  LevelLayer,
  RecognitionBinaryData,
  RecognitionPayload,
  TileMapping,
  TilePlacement,
} from '@/models/level';

export type LayerMoveDirection = 'up' | 'down';

const layerIdPrefix = 'layer';
const layerNamePrefix = 'Layer';

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

const cloneLevelData = (level: LevelData): LevelData => ({
  ...level,
  tileTable: level.tileTable.map(cloneTileMapping),
  layers: level.layers.map(cloneLayer),
});

const normalizeLayerName = (name: string) => name.trim().toLowerCase();

const assignDisplayLayerOrders = (
  layers: readonly LevelLayer[],
): LevelLayer[] =>
  layers.map((layer, index) => ({
    ...cloneLayer(layer),
    order: layers.length - index - 1,
  }));

export const sortLayersForDisplay = (layers: readonly LevelLayer[]) =>
  [...layers].sort((first, second) => {
    if (first.order !== second.order) {
      return second.order - first.order;
    }

    return first.id.localeCompare(second.id);
  });

export const normalizeLayerOrders = (level: LevelData): LevelData => ({
  ...cloneLevelData(level),
  layers: assignDisplayLayerOrders(sortLayersForDisplay(level.layers)),
});

export const createEmptyLayer = (level: LevelData): LevelLayer => {
  const layerIds = new Set(level.layers.map((layer) => layer.id));
  const layerNames = new Set(
    level.layers.map((layer) => normalizeLayerName(layer.name)),
  );
  let index = 1;

  while (
    layerIds.has(`${layerIdPrefix}-${index}`) ||
    layerNames.has(normalizeLayerName(`${layerNamePrefix} ${index}`))
  ) {
    index += 1;
  }

  return {
    id: `${layerIdPrefix}-${index}`,
    name: `${layerNamePrefix} ${index}`,
    order: 0,
    tiles: [],
  };
};

export const addEmptyLayerToBottom = (level: LevelData) => {
  const layer = createEmptyLayer(level);
  const nextLayers = assignDisplayLayerOrders([
    ...sortLayersForDisplay(level.layers),
    layer,
  ]);
  const nextLayer = nextLayers.find((candidate) => candidate.id === layer.id);

  return {
    layer: nextLayer ?? layer,
    level: {
      ...cloneLevelData(level),
      layers: nextLayers,
    },
  };
};

export const moveLayerInLevel = (
  level: LevelData,
  layerId: string,
  direction: LayerMoveDirection,
): LevelData | null => {
  const layers = sortLayersForDisplay(level.layers);
  const currentIndex = layers.findIndex((layer) => layer.id === layerId);
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= layers.length) {
    return null;
  }

  const nextLayers = [...layers];
  [nextLayers[currentIndex], nextLayers[nextIndex]] = [
    nextLayers[nextIndex],
    nextLayers[currentIndex],
  ];

  return {
    ...cloneLevelData(level),
    layers: assignDisplayLayerOrders(nextLayers),
  };
};

export const getLayerDeleteFallbackId = (level: LevelData, layerId: string) => {
  const layers = sortLayersForDisplay(level.layers);
  const currentIndex = layers.findIndex((layer) => layer.id === layerId);

  if (currentIndex < 0) {
    return layers[0]?.id ?? null;
  }

  return layers[currentIndex - 1]?.id ?? layers[currentIndex + 1]?.id ?? null;
};

export const deleteLayerFromLevel = (
  level: LevelData,
  layerId: string,
): LevelData | null => {
  if (level.layers.length <= 1) {
    return null;
  }

  const layers = sortLayersForDisplay(level.layers);

  if (!layers.some((layer) => layer.id === layerId)) {
    return null;
  }

  return {
    ...cloneLevelData(level),
    layers: assignDisplayLayerOrders(
      layers.filter((layer) => layer.id !== layerId),
    ),
  };
};
