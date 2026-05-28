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

export const colorValueStyle = style({
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
