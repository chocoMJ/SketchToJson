import { component } from '@suis-ui/kit';
import { keyframes, type StyleRule, styleVariants } from '@vanilla-extract/css';

type PopupAnimationKey = 'enter' | 'exit';
export type PopupAnimation = Record<PopupAnimationKey, string>;
export const popupAnimation = <T extends Record<PopupAnimationKey, StyleRule>>(
  animation: T,
): PopupAnimation => {
  const enterKeyframe = keyframes({
    '0%': animation.enter,
  });
  const exitKeyframe = keyframes({
    '100%': animation.exit,
  });

  return styleVariants({
    enter: {
      animationName: enterKeyframe,
      animationDuration: component.popup.enter.duration,
      animationTimingFunction: component.popup.enter.easing,
      animationFillMode: 'both',
      pointerEvents: 'auto',
    },
    exit: {
      animationName: exitKeyframe,
      animationDuration: component.popup.exit.duration,
      animationTimingFunction: component.popup.exit.easing,
      animationFillMode: 'both',
      pointerEvents: 'none',
    },
  });
};
