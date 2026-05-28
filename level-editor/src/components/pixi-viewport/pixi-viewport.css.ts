import { style } from '@vanilla-extract/css';

export const viewport = style({
  cursor: 'crosshair',
  outline: 'none',
  userSelect: 'none',
});

export const pixiCanvas = style({
  display: 'block',
  width: '100%',
  height: '100%',
});

export const isPanTool = style({
  cursor: 'grab',
});

export const isPanning = style({
  cursor: 'grabbing',
});

export const isSelectionDraggable = style({
  cursor: 'grab',
});

export const isSelectionDragging = style({
  cursor: 'grabbing',
});

export const isResizeNorthSouth = style({
  cursor: 'ns-resize',
});

export const isResizeEastWest = style({
  cursor: 'ew-resize',
});

export const isResizeNorthEastSouthWest = style({
  cursor: 'nesw-resize',
});

export const isResizeNorthWestSouthEast = style({
  cursor: 'nwse-resize',
});
