import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';

export const panel = style({
  backdropFilter: 'blur(10px)',
});

export const zoomValue = style({
  fontWeight: vars.font.title.fontWeight,
  lineHeight: vars.font.body.lineHeight,
});
