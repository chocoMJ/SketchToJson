import type { Application, Container, Graphics } from 'pixi.js';

import type { Cell, LayerBounds, TilePlacement } from '@/models/level';

export type PixiScene = {
  app: Application;
  background: Graphics;
  grid: Graphics;
  overlay: Container;
  preview: Container;
  tileLayer: Container;
  world: Container;
  pan: Cell;
};

export type ContextMenuState = {
  open: boolean;
  pointerX: number;
  pointerY: number;
  cell: Cell;
};

export type SelectionRect = {
  start: Cell;
  end: Cell;
};

export type LayerResizeHandle =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';

export type DragState =
  | {
      mode: 'pan';
      pointerId: number;
      lastScreen: Cell;
    }
  | {
      mode: 'paint' | 'erase';
      pointerId: number;
      lastCell: Cell;
      cells: Cell[];
    }
  | {
      mode: 'select-rect';
      pointerId: number;
      startCell: Cell;
      startScreen: Cell;
      baseSelection: TilePlacement[];
      additive: boolean;
      moved: boolean;
    }
  | {
      mode: 'move-selection';
      pointerId: number;
      startCell: Cell;
    }
  | {
      mode: 'move-layer';
      layerId: string;
      pointerId: number;
      startCell: Cell;
    }
  | {
      mode: 'resize-layer';
      layerId: string;
      pointerId: number;
      handle: LayerResizeHandle;
      startCell: Cell;
      startBounds: LayerBounds;
    };
