import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';
import { popupAnimation } from '@/helpers/popup-animation.css';

export const anchorStyle = style({
  pointerEvents: 'none',
});

export const backdropStyle = style({
  background: `rgba(from ${vars.color.surface.contrast} r g b / 0.5)`,
});

export const dialogAnimation = popupAnimation({
  enter: {
    opacity: 0,
    transform: 'scale(1.05)',
  },
  exit: {
    opacity: 0,
  },
});
