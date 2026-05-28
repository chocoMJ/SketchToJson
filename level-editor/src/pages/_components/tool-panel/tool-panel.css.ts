import { style } from '@vanilla-extract/css';

export const containerStyle = style({
  transform: 'translateX(-50%)',
});

export const groupStyle = style({
  backdropFilter: 'blur(8px)',
});

export const paletteGroupEnterStyle = style({
  opacity: 0,
});

export const paletteGroupExitStyle = style({
  position: 'absolute',
  opacity: 0,
});
