import Color from 'color';
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';
import type { Accessor } from 'solid-js';
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import type {
  Cell,
  LayerBounds,
  LevelData,
  LevelLayer,
  TileMapping,
  TilePlacement,
} from '@/models/level';
import { type EditorTool, setCanvasReady } from '@/stores/editor';

import { TILE_SIZE } from './constants';
import * as styles from './pixi-viewport.css';
import type {
  ContextMenuState,
  LayerResizeHandle,
  PixiScene,
  SelectionRect,
} from './types';
import {
  getCellRect,
  getLayerTileBounds,
  layerBoundsToTileBounds,
  type TileBounds,
} from './util';

type UsePixiSceneParams = {
  activeLayerResizeHandle: Accessor<LayerResizeHandle | null>;
  activeLayerId: Accessor<string>;
  brushTileId: Accessor<number>;
  clipboard: Accessor<{
    tiles: TilePlacement[];
  } | null>;
  contextMenu: Accessor<ContextMenuState>;
  dragDelta: Accessor<Cell | null>;
  erasePreviewCells: Accessor<Cell[]>;
  getHost: () => HTMLDivElement;
  hoverLayerResizeHandle: Accessor<LayerResizeHandle | null>;
  hoverCell: Accessor<Cell | null>;
  layerDragDelta: Accessor<Cell | null>;
  layerResizePreview: Accessor<LayerBounds | null>;
  paintPreviewCells: Accessor<Cell[]>;
  selectedLayerId: Accessor<string | null>;
  selectedTool: Accessor<EditorTool>;
  selection: Accessor<TilePlacement[]>;
  selectionRect: Accessor<SelectionRect | null>;
  setZoom: (zoom: number) => void;
  snapshot: Accessor<LevelData>;
  zoom: Accessor<number>;
};

type RecognitionImageTextureState = {
  failed: boolean;
  loading: boolean;
  texture: Texture | null;
};

const DEFAULT_VIEWPORT_BACKGROUND_COLOR = 0x101827;
const DEFAULT_TILE_BACKGROUND_COLOR = 0x2563eb;
const DEFAULT_TILE_ICON_COLOR = 0xf8fafc;
const LAYER_BOUNDS_COLOR = 0x10b981;
const RECOGNITION_IMAGE_RESIZE_ALPHA = 0.28;
const LAYER_RESIZE_HANDLE_SIZE = 10;
const LAYER_RESIZE_HANDLES: LayerResizeHandle[] = [
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
];

const fallbackTile: TileMapping = {
  tileId: 0,
  name: 'Tile 0',
  backgroundColor: '#2563eb',
  icon: 'star',
  iconColor: '#f8fafc',
  cvShapes: [],
};

const clampColorChannel = (value: number) =>
  Math.min(255, Math.max(0, Math.round(value)));

const parseOklchNumber = (value: string) => {
  if (value === 'none') {
    return 0;
  }

  const unitlessValue = value.endsWith('%') ? value.slice(0, -1) : value;
  const parsedValue = Number(unitlessValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return value.endsWith('%') ? parsedValue / 100 : parsedValue;
};

const parseOklchHue = (value: string) => {
  if (value === 'none') {
    return 0;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.endsWith('turn')) {
    return Number(trimmedValue.slice(0, -4)) * 360;
  }

  if (trimmedValue.endsWith('rad')) {
    return (Number(trimmedValue.slice(0, -3)) * 180) / Math.PI;
  }

  if (trimmedValue.endsWith('grad')) {
    return Number(trimmedValue.slice(0, -4)) * 0.9;
  }

  return Number(trimmedValue.replace(/deg$/iu, ''));
};

const oklchToRgb = (lightness: number, chroma: number, hue: number) => {
  const hueRadians = (hue * Math.PI) / 180;
  const okLabA = chroma * Math.cos(hueRadians);
  const okLabB = chroma * Math.sin(hueRadians);

  const long = lightness + 0.3963377774 * okLabA + 0.2158037573 * okLabB;
  const medium = lightness - 0.1055613458 * okLabA - 0.0638541728 * okLabB;
  const short = lightness - 0.0894841775 * okLabA - 1.291485548 * okLabB;

  const longLinear = long ** 3;
  const mediumLinear = medium ** 3;
  const shortLinear = short ** 3;

  const redLinear =
    4.0767416621 * longLinear -
    3.3077115913 * mediumLinear +
    0.2309699292 * shortLinear;
  const greenLinear =
    -1.2684380046 * longLinear +
    2.6097574011 * mediumLinear -
    0.3413193965 * shortLinear;
  const blueLinear =
    -0.0041960863 * longLinear -
    0.7034186147 * mediumLinear +
    1.707614701 * shortLinear;

  const toSrgbChannel = (value: number) =>
    value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

  return [
    clampColorChannel(toSrgbChannel(redLinear) * 255),
    clampColorChannel(toSrgbChannel(greenLinear) * 255),
    clampColorChannel(toSrgbChannel(blueLinear) * 255),
  ] as const;
};

const parseOklchColor = (color: string) => {
  const match = /^oklch\(\s*(?<body>.+?)\s*\)$/iu.exec(color);
  const body = match?.groups?.body;

  if (!body) {
    return null;
  }

  const [channels] = body.split('/');
  const [lightnessValue, chromaValue, hueValue = '0'] =
    channels?.trim().split(/\s+/u) ?? [];

  if (!lightnessValue || !chromaValue) {
    return null;
  }

  const lightness = parseOklchNumber(lightnessValue);
  const chroma = parseOklchNumber(chromaValue);
  const hue = parseOklchHue(hueValue);

  if (lightness === null || chroma === null || !Number.isFinite(hue)) {
    return null;
  }

  return oklchToRgb(lightness, chroma, hue);
};

const cssColorToHex = (color: string) => {
  const trimmedColor = color.trim();
  const oklchRgb = parseOklchColor(trimmedColor);

  try {
    if (oklchRgb) {
      return Color.rgb(...oklchRgb).rgbNumber();
    }

    return Color(trimmedColor).rgbNumber();
  } catch {
    return DEFAULT_VIEWPORT_BACKGROUND_COLOR;
  }
};

const paletteColorToHex = (color: string, fallback: number) => {
  if (!/^#[0-9a-fA-F]{6}$/u.test(color)) {
    return fallback;
  }

  return Number.parseInt(color.slice(1), 16);
};

const getTileStyle = (level: LevelData, tileId: number) => ({
  ...fallbackTile,
  ...(level.tileTable.find((tile) => tile.tileId === tileId) ?? {}),
  tileId,
});

const clearContainer = (container: Container) => {
  for (const child of container.removeChildren()) {
    child.destroy();
  }
};

const createRectSprite = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
) => {
  const sprite = new Sprite(Texture.WHITE);

  sprite.x = x;
  sprite.y = y;
  sprite.width = width;
  sprite.height = height;
  sprite.tint = color;
  sprite.alpha = alpha;

  return sprite;
};

const getRecognitionImageSource = (layer: LevelLayer) => {
  if (layer.source?.type !== 'recognition') {
    return null;
  }

  const image = layer.source.payload.image;

  if (image.data) {
    return `data:${image.data.mimeType};base64,${image.data.value}`;
  }

  return image.src ?? null;
};

const drawTileIcon = (
  rect: Cell,
  tile: TileMapping,
  lineWidth: number,
  alpha: number,
) => {
  const icon = new Graphics();
  const color = paletteColorToHex(tile.iconColor, DEFAULT_TILE_ICON_COLOR);
  const x = rect.x + TILE_SIZE * 0.28;
  const y = rect.y + TILE_SIZE * 0.28;
  const size = TILE_SIZE * 0.44;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const stroke = {
    color,
    alpha,
    width: Math.max(lineWidth * 1.8, 1),
  };

  if (tile.icon === 'star') {
    const radius = size / 2;
    const innerRadius = radius * 0.45;
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const pointRadius = index % 2 === 0 ? radius : innerRadius;

      return {
        x: centerX + Math.cos(angle) * pointRadius,
        y: centerY + Math.sin(angle) * pointRadius,
      };
    });

    icon.moveTo(points[0].x, points[0].y);

    for (const point of points.slice(1)) {
      icon.lineTo(point.x, point.y);
    }

    icon.lineTo(points[0].x, points[0].y).stroke(stroke);
    return icon;
  }

  if (tile.icon === 'triangle') {
    icon
      .moveTo(centerX, y)
      .lineTo(x + size, y + size)
      .lineTo(x, y + size)
      .lineTo(centerX, y)
      .stroke(stroke);
    return icon;
  }

  if (tile.icon === 'line') {
    icon
      .moveTo(x, centerY)
      .lineTo(x + size, centerY)
      .stroke({
        ...stroke,
        width: Math.max(lineWidth * 2.4, 2),
      });
    return icon;
  }

  if (tile.icon === 'door') {
    icon
      .rect(x + size * 0.2, y, size * 0.6, size)
      .stroke(stroke)
      .circle(x + size * 0.63, y + size * 0.55, Math.max(lineWidth * 1.5, 1.5))
      .fill({ color, alpha });
    return icon;
  }

  if (tile.icon === 'window') {
    icon
      .rect(x, y, size, size)
      .stroke(stroke)
      .moveTo(centerX, y)
      .lineTo(centerX, y + size)
      .moveTo(x, centerY)
      .lineTo(x + size, centerY)
      .stroke(stroke);
    return icon;
  }

  const step = size / 3;

  icon
    .moveTo(x, y + size)
    .lineTo(x + step, y + size)
    .lineTo(x + step, y + step * 2)
    .lineTo(x + step * 2, y + step * 2)
    .lineTo(x + step * 2, y + step)
    .lineTo(x + size, y + step)
    .stroke(stroke);

  return icon;
};

const drawErasePreviewTile = (
  rect: Cell,
  tile: TileMapping,
  lineWidth: number,
) => {
  const previewTile = new Graphics();
  const inset = 1;
  const size = TILE_SIZE - inset * 2;
  const stripeStep = 7;

  previewTile
    .rect(rect.x + inset, rect.y + inset, size, size)
    .fill({
      color: paletteColorToHex(
        tile.backgroundColor,
        DEFAULT_TILE_BACKGROUND_COLOR,
      ),
      alpha: 0.08,
    })
    .stroke({
      color: 0xf87171,
      alpha: 0.82,
      width: lineWidth,
    });

  for (let offset = -size; offset <= size; offset += stripeStep) {
    const start =
      offset >= 0
        ? { x: rect.x + inset + offset, y: rect.y + inset }
        : { x: rect.x + inset, y: rect.y + inset - offset };
    const end =
      offset >= 0
        ? {
            x: rect.x + inset + size,
            y: rect.y + inset + size - offset,
          }
        : {
            x: rect.x + inset + size + offset,
            y: rect.y + inset + size,
          };

    previewTile.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({
      color: 0xf87171,
      alpha: 0.86,
      width: lineWidth,
    });
  }

  return previewTile;
};

const offsetTileBounds = (bounds: TileBounds, delta: Cell | null) => ({
  minX: bounds.minX + (delta?.x ?? 0),
  maxX: bounds.maxX + (delta?.x ?? 0),
  minY: bounds.minY + (delta?.y ?? 0),
  maxY: bounds.maxY + (delta?.y ?? 0),
});

const getLayerResizeHandleCenters = (bounds: TileBounds) => {
  const left = bounds.minX * TILE_SIZE;
  const right = (bounds.maxX + 1) * TILE_SIZE;
  const bottom = bounds.minY * TILE_SIZE;
  const top = (bounds.maxY + 1) * TILE_SIZE;
  const centerX = (left + right) / 2;
  const centerY = (bottom + top) / 2;

  return {
    n: { x: centerX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: centerY },
    se: { x: right, y: bottom },
    s: { x: centerX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: centerY },
    nw: { x: left, y: top },
  } satisfies Record<LayerResizeHandle, Cell>;
};

const drawLayerResizeHandles = (
  current: PixiScene,
  bounds: TileBounds,
  scale: number,
  hoverHandle: LayerResizeHandle | null,
  activeHandle: LayerResizeHandle | null,
) => {
  const handleSize = LAYER_RESIZE_HANDLE_SIZE / scale;
  const lineWidth = 1.5 / scale;
  const centers = getLayerResizeHandleCenters(bounds);

  for (const handle of LAYER_RESIZE_HANDLES) {
    const center = centers[handle];
    const selected = handle === activeHandle || handle === hoverHandle;
    const handleGraphic = new Graphics();

    handleGraphic
      .rect(
        center.x - handleSize / 2,
        center.y - handleSize / 2,
        handleSize,
        handleSize,
      )
      .fill({
        color: selected ? 0xf8fafc : LAYER_BOUNDS_COLOR,
        alpha: selected ? 1 : 0.92,
      })
      .stroke({
        color: LAYER_BOUNDS_COLOR,
        alpha: 1,
        width: lineWidth,
      });
    current.overlay.addChild(handleGraphic);
  }
};

export const usePixiScene = ({
  activeLayerResizeHandle,
  activeLayerId,
  brushTileId,
  clipboard,
  contextMenu,
  dragDelta,
  erasePreviewCells,
  getHost,
  hoverLayerResizeHandle,
  hoverCell,
  layerDragDelta,
  layerResizePreview,
  paintPreviewCells,
  selectedLayerId,
  selectedTool,
  selection,
  selectionRect,
  setZoom,
  snapshot,
  zoom,
}: UsePixiSceneParams) => {
  const [scene, setScene] = createSignal<PixiScene | null>(null);
  const recognitionImageTextureCache = new Map<
    string,
    RecognitionImageTextureState
  >();
  let isSceneDisposed = false;

  const getRecognitionImageTexture = (source: string) => {
    const cached = recognitionImageTextureCache.get(source);

    if (cached) {
      return cached.texture;
    }

    const state: RecognitionImageTextureState = {
      failed: false,
      loading: true,
      texture: null,
    };

    recognitionImageTextureCache.set(source, state);

    void Assets.load<Texture>(source)
      .then((texture) => {
        state.loading = false;
        state.texture = texture;

        const current = scene();

        if (!isSceneDisposed && current) {
          drawOverlay(current);
        }
      })
      .catch((error) => {
        state.failed = true;
        state.loading = false;
        console.warn('Recognition image overlay load failed.', error);
      });

    return null;
  };

  const drawRecognitionResizeImageOverlay = (
    current: PixiScene,
    layer: LevelLayer,
    bounds: LayerBounds,
  ) => {
    const source = getRecognitionImageSource(layer);

    if (!source) {
      return;
    }

    const texture = getRecognitionImageTexture(source);

    if (!texture) {
      return;
    }

    const width = bounds.width * TILE_SIZE;
    const height = bounds.height * TILE_SIZE;
    const textureWidth = texture.width || 1;
    const textureHeight = texture.height || 1;
    const sprite = new Sprite(texture);

    sprite.x = bounds.x * TILE_SIZE;
    sprite.y = (bounds.y + bounds.height) * TILE_SIZE;
    sprite.scale.set(width / textureWidth, -(height / textureHeight));
    sprite.alpha = RECOGNITION_IMAGE_RESIZE_ALPHA;

    current.overlay.addChild(sprite);
  };

  const getHostPoint = (clientX: number, clientY: number) => {
    const bounds = getHost().getBoundingClientRect();

    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  };

  const screenToWorld = (current: PixiScene, screenPoint: Cell) => {
    const scale = zoom() / 100;

    return {
      x: (screenPoint.x - current.pan.x) / scale,
      y: (current.pan.y - screenPoint.y) / scale,
    };
  };

  const screenToCell = (current: PixiScene, screenPoint: Cell) => {
    const worldPoint = screenToWorld(current, screenPoint);

    return {
      x: Math.floor(worldPoint.x / TILE_SIZE),
      y: Math.floor(worldPoint.y / TILE_SIZE),
    };
  };

  const getViewportBackgroundColor = () =>
    cssColorToHex(getComputedStyle(getHost()).backgroundColor);

  const drawBackground = (current: PixiScene) => {
    const host = getHost();

    current.background.clear();
    current.background
      .rect(0, 0, host.clientWidth, host.clientHeight)
      .fill({ color: getViewportBackgroundColor() });
  };

  const drawGrid = (current: PixiScene) => {
    const host = getHost();
    const scale = zoom() / 100;
    const lineWidth = 1 / scale;
    const topLeft = screenToWorld(current, { x: 0, y: 0 });
    const bottomRight = screenToWorld(current, {
      x: host.clientWidth,
      y: host.clientHeight,
    });
    const minX = Math.floor(topLeft.x / TILE_SIZE) * TILE_SIZE;
    const maxX = Math.ceil(bottomRight.x / TILE_SIZE) * TILE_SIZE;
    const minY =
      Math.floor(Math.min(topLeft.y, bottomRight.y) / TILE_SIZE) * TILE_SIZE;
    const maxY =
      Math.ceil(Math.max(topLeft.y, bottomRight.y) / TILE_SIZE) * TILE_SIZE;

    current.grid.clear();

    const gridColor = cssColorToHex(getComputedStyle(getHost()).color);
    const axisColor = cssColorToHex(getComputedStyle(getHost()).borderColor);
    for (let x = minX; x <= maxX; x += TILE_SIZE) {
      current.grid
        .moveTo(x, minY)
        .lineTo(x, maxY)
        .stroke({
          color: x === 0 ? axisColor : gridColor,
          width: x === 0 ? lineWidth * 2 : lineWidth,
        });
    }

    for (let y = minY; y <= maxY; y += TILE_SIZE) {
      current.grid
        .moveTo(minX, y)
        .lineTo(maxX, y)
        .stroke({
          color: y === 0 ? axisColor : gridColor,
          width: y === 0 ? lineWidth * 2 : lineWidth,
        });
    }
  };

  const drawTiles = (current: PixiScene) => {
    const scale = zoom() / 100;
    const lineWidth = 1 / scale;

    clearContainer(current.tileLayer);

    for (const layer of [...snapshot().layers].sort(
      (first, second) => first.order - second.order,
    )) {
      const isActiveLayer = layer.id === activeLayerId();

      for (const tile of layer.tiles) {
        const rect = getCellRect(tile);
        const tileStyle = getTileStyle(snapshot(), tile.tileId);
        const tileInset = 1;
        const tileSize = TILE_SIZE - tileInset * 2;
        const borderColor = isActiveLayer ? 0x93c5fd : 0x475569;
        const borderAlpha = isActiveLayer ? 0.55 : 0.32;
        const fillInset = tileInset + lineWidth;
        const tileAlpha = isActiveLayer ? 0.82 : 0.36;

        current.tileLayer.addChild(
          createRectSprite(
            rect.x + tileInset,
            rect.y + tileInset,
            tileSize,
            tileSize,
            borderColor,
            borderAlpha,
          ),
          createRectSprite(
            rect.x + fillInset,
            rect.y + fillInset,
            TILE_SIZE - fillInset * 2,
            TILE_SIZE - fillInset * 2,
            paletteColorToHex(
              tileStyle.backgroundColor,
              DEFAULT_TILE_BACKGROUND_COLOR,
            ),
            tileAlpha,
          ),
          drawTileIcon(rect, tileStyle, lineWidth, isActiveLayer ? 0.9 : 0.46),
        );
      }
    }
  };

  const drawPreview = (current: PixiScene) => {
    clearContainer(current.preview);

    const menuState = contextMenu();

    if (menuState.open) {
      return;
    }

    const lineWidth = 1 / (zoom() / 100);

    if (selectedTool() === 'brush') {
      const previewCells = paintPreviewCells();
      const cells = previewCells.length > 0 ? previewCells : hoverCell();
      const tileStyle = getTileStyle(snapshot(), brushTileId());

      for (const cell of Array.isArray(cells) ? cells : cells ? [cells] : []) {
        const rect = getCellRect(cell);
        const previewTile = new Graphics();

        previewTile
          .rect(rect.x + 1, rect.y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
          .fill({
            color: paletteColorToHex(
              tileStyle.backgroundColor,
              DEFAULT_TILE_BACKGROUND_COLOR,
            ),
            alpha: 0.24,
          })
          .stroke({
            color: 0x38bdf8,
            alpha: 0.56,
            width: lineWidth,
          });
        current.preview.addChild(
          previewTile,
          drawTileIcon(rect, tileStyle, lineWidth, 0.72),
        );
      }
      return;
    }

    if (selectedTool() === 'erase') {
      const previewCells = erasePreviewCells();
      const cells = previewCells.length > 0 ? previewCells : hoverCell();
      const targetCells = Array.isArray(cells) ? cells : cells ? [cells] : [];
      const activeLayer = snapshot().layers.find(
        (layer) => layer.id === activeLayerId(),
      );

      if (!activeLayer) {
        return;
      }

      for (const cell of targetCells) {
        const tile = activeLayer.tiles.find(
          (candidate) => candidate.x === cell.x && candidate.y === cell.y,
        );

        if (!tile) {
          continue;
        }

        const rect = getCellRect(tile);
        current.preview.addChild(
          drawErasePreviewTile(
            rect,
            getTileStyle(snapshot(), tile.tileId),
            lineWidth,
          ),
        );
      }
      return;
    }

    if (selectedTool() === 'select') {
      return;
    }

    const currentClipboard = clipboard();
    const targetCell = hoverCell();

    if (!currentClipboard || !targetCell) {
      return;
    }

    for (const tile of currentClipboard.tiles) {
      const rect = getCellRect({
        x: targetCell.x + tile.x,
        y: targetCell.y + tile.y,
      });
      const tileStyle = getTileStyle(snapshot(), tile.tileId);
      const previewTile = new Graphics();

      previewTile
        .rect(rect.x + 1, rect.y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
        .fill({
          color: paletteColorToHex(
            tileStyle.backgroundColor,
            DEFAULT_TILE_BACKGROUND_COLOR,
          ),
          alpha: 0.24,
        })
        .stroke({
          color: 0x38bdf8,
          alpha: 0.56,
          width: lineWidth,
        });
      current.preview.addChild(
        previewTile,
        drawTileIcon(rect, tileStyle, lineWidth, 0.72),
      );
    }
  };

  const drawOverlay = (current: PixiScene) => {
    const scale = zoom() / 100;
    const lineWidth = 2 / scale;
    const delta = dragDelta();
    const hover = hoverCell();
    const rectSelection = selectionRect();
    const resizePreview = layerResizePreview();

    clearContainer(current.overlay);

    const selectedLayer = snapshot().layers.find(
      (layer) => layer.id === selectedLayerId(),
    );
    const selectedLayerBounds = selectedLayer
      ? getLayerTileBounds(selectedLayer)
      : null;
    const layerBounds = resizePreview
      ? layerBoundsToTileBounds(resizePreview)
      : selectedLayerBounds;
    const displayedLayerBounds = layerBounds
      ? offsetTileBounds(layerBounds, resizePreview ? null : layerDragDelta())
      : null;

    if (selectedLayer && resizePreview) {
      drawRecognitionResizeImageOverlay(current, selectedLayer, resizePreview);
    }

    if (displayedLayerBounds) {
      const layerBoundsGraphic = new Graphics();

      layerBoundsGraphic
        .rect(
          displayedLayerBounds.minX * TILE_SIZE,
          displayedLayerBounds.minY * TILE_SIZE,
          (displayedLayerBounds.maxX - displayedLayerBounds.minX + 1) *
            TILE_SIZE,
          (displayedLayerBounds.maxY - displayedLayerBounds.minY + 1) *
            TILE_SIZE,
        )
        .fill({ color: LAYER_BOUNDS_COLOR, alpha: resizePreview ? 0.14 : 0.1 })
        .stroke({ color: LAYER_BOUNDS_COLOR, alpha: 0.72, width: lineWidth });
      current.overlay.addChild(layerBoundsGraphic);
    }

    if (hover) {
      const rect = getCellRect(hover);
      const hoverCellGraphic = new Graphics();

      hoverCellGraphic
        .rect(rect.x, rect.y, TILE_SIZE, TILE_SIZE)
        .stroke({ color: 0xf8fafc, alpha: 0.42, width: lineWidth });
      current.overlay.addChild(hoverCellGraphic);
    }

    for (const tile of selection()) {
      const rect = getCellRect({
        x: tile.x + (delta?.x ?? 0),
        y: tile.y + (delta?.y ?? 0),
      });
      const selectedTile = new Graphics().rect(
        rect.x + 1,
        rect.y + 1,
        TILE_SIZE - 2,
        TILE_SIZE - 2,
      );

      if (delta) {
        selectedTile.fill({
          color: paletteColorToHex(
            getTileStyle(snapshot(), tile.tileId).backgroundColor,
            DEFAULT_TILE_BACKGROUND_COLOR,
          ),
          alpha: 0.28,
        });
      }

      selectedTile.stroke({ color: 0xfacc15, alpha: 0.9, width: lineWidth });
      current.overlay.addChild(selectedTile);
    }

    if (rectSelection) {
      const minX = Math.min(rectSelection.start.x, rectSelection.end.x);
      const maxX = Math.max(rectSelection.start.x, rectSelection.end.x);
      const minY = Math.min(rectSelection.start.y, rectSelection.end.y);
      const maxY = Math.max(rectSelection.start.y, rectSelection.end.y);

      const selectionRectGraphic = new Graphics();

      selectionRectGraphic
        .rect(
          minX * TILE_SIZE,
          minY * TILE_SIZE,
          (maxX - minX + 1) * TILE_SIZE,
          (maxY - minY + 1) * TILE_SIZE,
        )
        .fill({ color: 0x38bdf8, alpha: 0.08 })
        .stroke({ color: 0x38bdf8, alpha: 0.78, width: lineWidth });
      current.overlay.addChild(selectionRectGraphic);
    }

    if (displayedLayerBounds && selectedTool() === 'select') {
      drawLayerResizeHandles(
        current,
        displayedLayerBounds,
        scale,
        hoverLayerResizeHandle(),
        activeLayerResizeHandle(),
      );
    }
  };

  const updateWorldTransform = (current: PixiScene) => {
    const scale = zoom() / 100;

    current.world.position.set(current.pan.x, current.pan.y);
    current.world.scale.set(scale, -scale);
  };

  const redrawScene = (current: PixiScene) => {
    updateWorldTransform(current);
    drawBackground(current);
    drawGrid(current);
    drawTiles(current);
    drawPreview(current);
    drawOverlay(current);
  };

  const resetView = () => {
    const current = scene();

    if (!current) {
      return;
    }

    current.pan.x = 0;
    current.pan.y = 0;
    setZoom(100);
    redrawScene(current);
  };

  onMount(() => {
    let disposed = false;

    isSceneDisposed = false;

    const host = getHost();
    const app = new Application();
    const background = new Graphics();
    const grid = new Graphics();
    const tileLayer = new Container();
    const preview = new Container();
    const overlay = new Container();
    const world = new Container();
    const resizeObserver = new ResizeObserver(() => {
      const current = scene();

      if (!app.renderer || !current) {
        return;
      }

      app.renderer.resize(host.clientWidth, host.clientHeight);
      redrawScene(current);
    });

    void app
      .init({
        antialias: true,
        autoDensity: true,
        background: getViewportBackgroundColor(),
        height: host.clientHeight,
        resolution: window.devicePixelRatio || 1,
        width: host.clientWidth,
      })
      .then(() => {
        if (disposed) {
          app.destroy();
          return;
        }

        const current: PixiScene = {
          app,
          background,
          grid,
          overlay,
          preview,
          tileLayer,
          world,
          pan: { x: 0, y: 0 },
        };

        app.canvas.className = styles.pixiCanvas;
        host.appendChild(app.canvas);
        world.addChild(grid, tileLayer, preview, overlay);
        app.stage.addChild(background, world);
        redrawScene(current);
        resizeObserver.observe(host);
        setScene(current);
        setCanvasReady(true);
      });

    onCleanup(() => {
      disposed = true;
      isSceneDisposed = true;
      recognitionImageTextureCache.clear();
      resizeObserver.disconnect();
      setCanvasReady(false);
      app.destroy(true);
    });
  });

  createEffect(() => {
    const current = scene();

    if (!current) {
      return;
    }

    updateWorldTransform(current);
    drawBackground(current);
    drawGrid(current);
    drawTiles(current);
  });

  createEffect(() => {
    const current = scene();

    if (!current) {
      return;
    }

    drawPreview(current);
  });

  createEffect(() => {
    const current = scene();

    if (!current) {
      return;
    }

    drawOverlay(current);
  });

  return {
    getHostPoint,
    redrawScene,
    resetView,
    scene,
    screenToCell,
    screenToWorld,
  };
};

export type PixiSceneApi = ReturnType<typeof usePixiScene>;
