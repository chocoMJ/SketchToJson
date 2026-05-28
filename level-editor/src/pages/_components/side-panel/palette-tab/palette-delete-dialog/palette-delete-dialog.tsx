import { Box, Button, Item, Select } from '@suis-ui/kit';

import { Dialog } from '@/components/ui/dialog';
import type { LevelData, TileMapping } from '@/models/level';
import { TilePreview } from '@/pages/_components/tile-preview';
import { getTileDisplayName } from '@/stores/palette';
import {
  getPaletteDescription,
  getReplacementValue,
  getUsedTileCount,
  type ReplacementOption,
  type ReplacementRenderValue,
  selectContentProps,
} from '../palette-tab.utils';

type PaletteDeleteDialogProps = {
  open: boolean;
  level: LevelData;
  replacementOptions: ReplacementOption[];
  replacementValue: string | null;
  tile: TileMapping;
  onChangeReplacement: (value: string | null) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const PaletteDeleteDialog = (props: PaletteDeleteDialogProps) => {
  const getReplacementLabel = (value: string) =>
    props.replacementOptions.find((option) => option.value === value)?.label ??
    value;

  return (
    <Dialog
      open={props.open}
      title={`${getTileDisplayName(props.tile)} 삭제 확인`}
      description={`${getUsedTileCount(
        props.level,
        props.tile.tileId,
      )}개의 타일이 사용되고 있습니다.`}
      onClose={props.onClose}
      footer={
        <>
          <Button variant={'ghost'} onClick={props.onClose}>
            {'취소'}
          </Button>
          <Button variant={'primary'} onClick={props.onConfirm}>
            {'삭제'}
          </Button>
        </>
      }
    >
      <Box gap={'sm'}>
        <Item
          size={'sm'}
          media={<TilePreview tile={props.tile} />}
          title={getTileDisplayName(props.tile)}
          description={getPaletteDescription(props.level, props.tile)}
        />
        <Box minW={'0'} gap={'xxs'}>
          <Box as={'label'} text={'caption'} c={'text.caption'}>
            {'대체할 타일 선택'}
          </Box>
          <Select
            value={props.replacementValue}
            onChangeValue={props.onChangeReplacement}
            data={props.replacementOptions}
            placeholder={'대체 타일'}
            contentProps={selectContentProps}
            renderValue={(value: ReplacementRenderValue) =>
              getReplacementLabel(getReplacementValue(value))
            }
          />
        </Box>
      </Box>
    </Dialog>
  );
};
