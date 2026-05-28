import { Box, type BoxProps } from '@suis-ui/kit';
import { sx } from '@suis-ui/primitives';
import { splitProps, type ValidComponent } from 'solid-js';
import { TileIconMap } from '@/helpers/constants';
import type { TileIcon, TileMapping } from '@/models/level';
import { Icon } from '../../../components/ui/icon';

export const getTileIconComponent = (icon: TileIcon) => TileIconMap[icon];

type TilePreviewOnlyProps = {
  tile: Pick<TileMapping, 'backgroundColor' | 'icon' | 'iconColor'>;
  size?: number;
};
type TilePreviewProps<T extends ValidComponent> = Omit<
  BoxProps<T>,
  keyof TilePreviewOnlyProps
> &
  TilePreviewOnlyProps;

export const TilePreview = <T extends ValidComponent>(
  props: TilePreviewProps<T>,
) => {
  const [local, rest] = splitProps(props, ['tile', 'size']);

  return (
    <Box
      {...(rest as unknown as BoxProps<T>)}
      justify={rest.justify ?? 'center'}
      align={rest.align ?? 'center'}
      p={rest.p ?? 'sm'}
      r={rest.r ?? 'sm'}
      style={sx(
        {
          'background-color': local.tile.backgroundColor,
          color: local.tile.iconColor,
        },
        rest.style,
      )}
    >
      <Icon
        name={getTileIconComponent(local.tile.icon)}
        size={local.size ?? 16}
      />
    </Box>
  );
};
