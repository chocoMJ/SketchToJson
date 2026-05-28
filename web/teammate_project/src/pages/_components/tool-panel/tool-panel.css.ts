import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';

export const containerStyle = style({
  position: 'fixed',
  zIndex: 10,
  left: '50%',
  bottom: vars.size.space.lg,

  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: vars.size.space.sm,

  transform: 'translateX(-50%)',
});

export const groupStyle = style({
  backdropFilter: 'blur(8px)',
});
