import { style } from '@vanilla-extract/css';

export const shell = style({
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
});

export const canvasLayer = style({
  position: 'absolute',
  inset: 0,
  minWidth: 0,
  minHeight: 0,
});
