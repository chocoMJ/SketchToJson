import { vars } from '@suis-ui/kit';
import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const treeItemEnterStyle = style({
  opacity: 0,
  translate: '-100% 0',
});

export const treeItemExitStyle = style({
  opacity: 0,
  translate: '-100% 0',
});

export const tileCollapse = recipe({
  base: {
    display: 'grid',
    minHeight: 0,
    transitionDuration: vars.motion.duration.fast,
    transitionProperty: 'grid-template-rows, opacity',
    transitionTimingFunction: vars.motion.easing.decelerate,
  },
  variants: {
    expanded: {
      true: {
        gridTemplateRows: '1fr',
        opacity: 1,
        pointerEvents: 'auto',
      },
      false: {
        gridTemplateRows: '0fr',
        opacity: 0,
        pointerEvents: 'none',
      },
    },
  },
});

export const tileCollapseInner = style({
  minHeight: 0,
  overflow: 'hidden',
});

export const tileNode = style({
  display: 'block',
});

export const tileItem = style({
  pointerEvents: 'none',
});
