import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';

export const panel = style({
  position: 'absolute',
  zIndex: 10,
  top: vars.size.space.lg,
  right: vars.size.space.lg,
  width: '22rem',
  maxHeight: `calc(100vh - (${vars.size.space.lg} * 2))`,
  overflow: 'auto',
  backdropFilter: 'blur(10px)',
});

export const panelTitle = style({
  margin: 0,
  fontWeight: vars.font.title.fontWeight,
  lineHeight: vars.font.body.lineHeight,
});

export const headerIcon = style({
  display: 'grid',
  placeItems: 'center',
  width: vars.size.space.xl,
  height: vars.size.space.xl,
  flex: '0 0 auto',
  borderRadius: vars.size.space.sm,
});

export const section = style({
  padding: vars.size.space.xs,
  borderRadius: vars.size.space.md,
  background: vars.color.surface.main,
});

export const sectionHeader = style({
  lineHeight: vars.font.caption.lineHeight,
  textTransform: 'uppercase',
});

export const gridCard = style({
  minHeight: '4rem',
});

export const gridValue = style({
  padding: `${vars.size.space.xxs} ${vars.size.space.xs}`,
  borderRadius: vars.size.space.xs,
  background: vars.color.surface.high,
  whiteSpace: 'nowrap',
  fontWeight: vars.font.title.fontWeight,
});

export const zoomValue = style({
  fontWeight: vars.font.title.fontWeight,
  lineHeight: vars.font.body.lineHeight,
});

export const zoomItem = style({
  alignItems: 'center',
});

export const zoomSlider = style({
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
});

export const zoomTicks = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  lineHeight: vars.font.caption.lineHeight,
});

export const zoomTickCenter = style({
  textAlign: 'center',
});

export const zoomTickEnd = style({
  textAlign: 'right',
});

export const debugTextarea = style({
  width: '100%',
  minHeight: '14rem',
  resize: 'vertical',
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.75rem',
  lineHeight: 1.5,
  whiteSpace: 'pre',
});

export const debugStatus = style({
  minHeight: vars.font.caption.lineHeight,
});

export const debugStatusError = style({
  color: '#f87171',
});

export const debugStatusSuccess = style({
  color: '#34d399',
});
