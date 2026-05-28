import { style } from '@vanilla-extract/css';

export const panel = style({
  backdropFilter: 'blur(10px)',
});

export const pagerTrack = style({
  transitionDuration: '220ms',
  transitionProperty: 'transform',
  transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  willChange: 'transform',
});
