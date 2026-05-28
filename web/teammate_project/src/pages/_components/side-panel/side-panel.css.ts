import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';

export const panel = style({
  position: 'absolute',
  zIndex: 10,
  top: vars.size.space.lg,
  left: vars.size.space.lg,
  width: '26rem',
  maxHeight: `calc(100vh - (${vars.size.space.lg} * 2))`,
  backdropFilter: 'blur(10px)',
  overflow: 'auto',
});

export const tabs = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.size.space.xxs,
  padding: vars.size.space.xxs,
  borderRadius: vars.size.space.md,
  background: vars.color.surface.main,
});

export const tabButton = style({
  justifyContent: 'center',
});

export const paletteList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.size.space.sm,
});

export const paletteItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.size.space.xs,
  padding: vars.size.space.xs,
  border: `1px solid ${vars.color.surface.higher}`,
  borderRadius: vars.size.space.sm,
  background: vars.color.surface.main,
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.size.space.xs,
});

export const field = style({
  display: 'flex',
  minWidth: 0,
  flexDirection: 'column',
  gap: vars.size.space.xxs,
});

export const wideField = style({
  gridColumn: '1 / -1',
});

export const colorControl = style({
  display: 'grid',
  gridTemplateColumns: `${vars.size.space.xl} ${vars.size.space.xl} 1fr`,
  gap: vars.size.space.xs,
  alignItems: 'center',
});

export const colorInput = style({
  width: vars.size.space.xl,
  minHeight: vars.size.space.xl,
  padding: 0,
  overflow: 'hidden',
});

export const colorSwatch = style({
  display: 'block',
  width: vars.size.space.xl,
  height: vars.size.space.xl,
  border: `1px solid ${vars.color.surface.higher}`,
  borderRadius: vars.size.space.xxs,
  boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${vars.color.surface.main} 45%, transparent)`,
});

export const colorValue = style({
  overflow: 'hidden',
  color: vars.color.text.caption,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const shapeRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: vars.size.space.xs,
  alignItems: 'center',
});

export const status = style({
  minHeight: vars.font.caption.lineHeight,
});

export const statusError = style({
  color: vars.color.error.main,
});

export const appMark = style({
  display: 'grid',
  placeItems: 'center',
  width: vars.size.space.xl,
  height: vars.size.space.xl,
  flex: '0 0 auto',
  borderRadius: vars.size.space.sm,
  fontSize: vars.font.caption.fontSize,
  fontWeight: vars.font.title.fontWeight,
  lineHeight: vars.font.caption.lineHeight,
});

export const title = style({
  margin: 0,
  overflow: 'hidden',
  fontWeight: vars.font.title.fontWeight,
  lineHeight: vars.font.body.lineHeight,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const subtitle = style({
  margin: `${vars.size.space.xxs} 0 0`,
  lineHeight: vars.font.caption.lineHeight,
});

export const treeSection = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
});

export const sectionTitle = style({
  margin: 0,
  lineHeight: vars.font.caption.lineHeight,
});

export const treeScroll = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: vars.size.space.xxs,
});

export const layerNode = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.size.space.xs,
});

export const layerItem = style({
  width: '100%',
  border: 0,
  cursor: 'pointer',
  color: vars.color.text.main,
  background: 'transparent',
  textAlign: 'left',
});

export const activeLayerItem = style({
  background: vars.color.primary.container,
  color: vars.color.primary.containerContrast,
});

export const tileList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.size.space.xxs,
  margin: 0,
  padding: `0 0 ${vars.size.space.sm} ${vars.size.space.lg}`,
  listStyle: 'none',
});

export const tileNode = style({
  display: 'block',
});

export const tileItem = style({
  color: vars.color.text.caption,
  pointerEvents: 'none',
});

export const emptyNode = style({
  padding: `${vars.size.space.xs} ${vars.size.space.sm}`,
  lineHeight: vars.font.caption.lineHeight,
});
