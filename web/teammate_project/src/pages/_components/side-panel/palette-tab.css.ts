import { style } from '@vanilla-extract/css';

export const colorInputStyle = style({
  selectors: {
    '&::-webkit-color-swatch-wrapper': {
      padding: 0,
    },
    '&::-webkit-color-swatch': {
      border: 'none',
    },
    '&::-moz-color-swatch': {
      border: 'none',
    },
  },
});
