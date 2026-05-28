import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';

export const contextMenuAnchor = style({
  pointerEvents: 'none',
});

export const contextMenuGroup = style({
  margin: 0,
  listStyle: 'none',

  selectors: {
    '& + &': {
      borderTopStyle: 'solid',
      borderTopWidth: vars.size.line.md,
      borderTopColor: vars.color.surface.higher,
    },
  },
});

export const contextMenuItem = style({
  border: 0,
  cursor: 'pointer',
  textAlign: 'left',

  selectors: {
    '&:disabled': {
      cursor: 'default',
      color: vars.color.text.disabled,
    },
  },
});
