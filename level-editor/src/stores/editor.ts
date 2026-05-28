import { map } from 'nanostores';

import type { Cell, TilePlacement } from '@/models/level';

export type EditorTool = 'select' | 'brush' | 'erase' | 'pan';

export type TileClipboard = {
  width: number;
  height: number;
  origin: Cell;
  tiles: TilePlacement[];
};

export type EditorState = {
  activeLayerId: string;
  canvasReady: boolean;
  clipboard: TileClipboard | null;
  selectedBrushTileId: number;
  selectedLayerId: string | null;
  selectedTool: EditorTool;
  selection: TilePlacement[];
  zoom: number;
};

const initialState: EditorState = {
  activeLayerId: 'base',
  canvasReady: false,
  clipboard: null,
  selectedBrushTileId: 0,
  selectedLayerId: null,
  selectedTool: 'select',
  selection: [],
  zoom: 100,
};

export const editorStore = map<EditorState>(initialState);

export const setActiveLayerId = (activeLayerId: string) =>
  editorStore.setKey('activeLayerId', activeLayerId);
export const setSelectedLayerId = (selectedLayerId: string | null) =>
  editorStore.setKey('selectedLayerId', selectedLayerId);
export const setSelectedBrushTileId = (selectedBrushTileId: number) =>
  editorStore.setKey('selectedBrushTileId', selectedBrushTileId);
export const setSelectedTool = (selectedTool: EditorTool) =>
  editorStore.setKey('selectedTool', selectedTool);
export const setZoom = (zoom: number) => editorStore.setKey('zoom', zoom);
export const setCanvasReady = (canvasReady: boolean) =>
  editorStore.setKey('canvasReady', canvasReady);
export const setSelection = (selection: TilePlacement[]) =>
  editorStore.setKey(
    'selection',
    selection.map((tile) => ({ ...tile })),
  );
export const setClipboard = (clipboard: TileClipboard | null) =>
  editorStore.setKey('clipboard', clipboard);
