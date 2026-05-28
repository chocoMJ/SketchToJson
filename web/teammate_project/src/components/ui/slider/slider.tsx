import { Box, type BoxProps } from '@suis-ui/kit';
import { splitProps } from 'solid-js';

import * as styles from './slider.css';

export type SliderProps = Omit<
  BoxProps<'div'>,
  'as' | 'onChange' | 'onInput'
> & {
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

export const Slider = (props: SliderProps) => {
  const [local, rest] = splitProps(props, [
    'class',
    'classList',
    'max',
    'min',
    'onChange',
    'step',
    'value',
  ]);

  return (
    <Box
      {...rest}
      classList={{
        [styles.slider]: true,
        [local.class ?? '']: !!local.class,
        ...local.classList,
      }}
    >
      <input
        type={'range'}
        min={`${local.min ?? 0}`}
        max={`${local.max ?? 100}`}
        step={`${local.step ?? 1}`}
        value={local.value}
        onInput={(event) => local.onChange(event.currentTarget.valueAsNumber)}
      />
    </Box>
  );
};
