import { Box } from '@suis-ui/kit';

import type { TileIcon, TileMapping } from '@/models/level';
import { Icon } from '../../../components/ui/icon';
import { TileIconMap } from '@/helpers/constants';

export const getTileIconComponent = (icon: TileIcon) => TileIconMap[icon];

type TilePreviewProps = {
  size?: number;
  tile: Pick<TileMapping, 'backgroundColor' | 'icon' | 'iconColor'>;
};

export const TilePreview = (props: TilePreviewProps) => (
  <Box
    justify={'center'}
    align={'center'}
    style={{
      'background-color': props.tile.backgroundColor,
      color: props.tile.iconColor,
    }}
    p={'sm'}
    r={'sm'}
  >
    <Icon name={getTileIconComponent(props.tile.icon)} />
  </Box>
);
