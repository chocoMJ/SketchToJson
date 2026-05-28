import { Box, Button, Item } from '@suis-ui/kit';
import { Pencil, Trash2 } from 'lucide-solid';

import { Icon } from '@/components/ui/icon';
import type { LevelData, TileMapping } from '@/models/level';
import { TilePreview } from '@/pages/_components/tile-preview';
import { getTileDisplayName } from '@/stores/palette';
import { getPaletteDescription } from '../palette-tab.utils';

type PaletteTileItemProps = {
  level: LevelData;
  disabledDelete: boolean;
  tile: TileMapping;
  onEdit: (tileId: number) => void;
  onDelete: (tileId: number) => void;
};

export const PaletteTileItem = (props: PaletteTileItemProps) => (
  <Item
    size={'sm'}
    media={<TilePreview tile={props.tile} />}
    title={getTileDisplayName(props.tile)}
    description={getPaletteDescription(props.level, props.tile)}
    action={
      <Box direction={'row'} gap={'xxs'}>
        <Button
          variant={'ghost'}
          type={'icon'}
          size={'sm'}
          aria-label={`Edit ${getTileDisplayName(props.tile)}`}
          onClick={() => props.onEdit(props.tile.tileId)}
        >
          <Icon name={Pencil} />
        </Button>
        <Button
          variant={'ghost'}
          type={'icon'}
          size={'sm'}
          aria-label={`Delete ${getTileDisplayName(props.tile)}`}
          disabled={props.disabledDelete}
          onClick={() => props.onDelete(props.tile.tileId)}
        >
          <Icon name={Trash2} />
        </Button>
      </Box>
    }
  />
);
