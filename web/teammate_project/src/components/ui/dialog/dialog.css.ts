import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';
import { popupAnimation } from '@/helpers/popup-animation.css';

export const anchorStyle = style({
  position: 'fixed',
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  pointerEvents: 'none',
});

export const backdropStyle = style({
  display: 'flex',
  width: '100vw',
  height: '100vh',
  alignItems: 'center',
  justifyContent: 'center',
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
