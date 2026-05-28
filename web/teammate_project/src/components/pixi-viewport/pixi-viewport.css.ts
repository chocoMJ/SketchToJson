import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';

export const viewport = style({
  position: 'absolute',
  inset: 0,
  background: vars.color.surface.main,
  color: vars.color.surface.high,
  borderColor: vars.color.surface.higher,
  overflow: 'hidden',
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

export const contextMenu = style({
  position: 'absolute',
  pointerEvents: 'none',
});

export const contextMenuContent = style({
  overflow: 'hidden',
});

export const contextMenuGroup = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  margin: 0,
  padding: vars.size.space.xs,
  listStyle: 'none',

  selectors: {
    '& + &': {
      borderTopStyle: 'solid',
      borderTopWidth: vars.size.line.md,
      borderTopColor: vars.color.surface.higher,
    },
  },
});

export const contextMenuHeader = style({
  color: vars.color.text.caption,
});

export const contextMenuItem = style({
  width: '100%',
  border: 0,
  cursor: 'pointer',
  color: vars.color.text.main,
  background: 'transparent',
  textAlign: 'left',

  selectors: {
    '&:disabled': {
      cursor: 'default',
      color: vars.color.text.disabled,
    },
  },
});
