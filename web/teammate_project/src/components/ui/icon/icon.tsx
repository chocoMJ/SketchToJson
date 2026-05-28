import { Box, type BoxProps } from '@suis-ui/kit';
import type { LucideProps } from 'lucide-solid';
import { type Component, splitProps, type ValidComponent } from 'solid-js';

import { iconStyle } from './icon.css';

export type IconType = Component<LucideProps>;
export type IconProps<T extends ValidComponent> = Omit<
  BoxProps<T>,
  'as' | 'size'
> &
  LucideProps & {
    name: IconType;
  };
export const Icon = <T extends ValidComponent>(props: IconProps<T>) => {
  const [local, rest] = splitProps(props, ['name']);

  return (
    <Box
      {...rest}
      as={local.name as ValidComponent}
      c={rest.c ?? 'inherit'}
      classList={{
        [iconStyle]: true,
        [rest.class ?? '']: !!rest.class,
        ...rest.classList,
      }}
      props={{
        size: rest.size ?? 16,
      }}
    />
  );
};
