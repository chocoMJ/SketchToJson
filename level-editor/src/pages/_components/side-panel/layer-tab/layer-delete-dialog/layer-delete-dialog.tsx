import { Button, Item } from '@suis-ui/kit';
import { Show } from 'solid-js';

import { Dialog } from '@/components/ui/dialog';
import type { LevelLayer } from '@/models/level';

type LayerDeleteDialogProps = {
  layer: LevelLayer | undefined;
  onClose: () => void;
  onConfirm: () => void;
};

export const LayerDeleteDialog = (props: LayerDeleteDialogProps) => (
  <Dialog
    open={Boolean(props.layer)}
    title={`${props.layer?.name ?? 'Layer'} 삭제 확인`}
    description={`${props.layer?.tiles.length ?? 0}개의 타일이 포함된 레이어를 삭제합니다.`}
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
    <Show when={props.layer}>
      {(layer) => (
        <Item
          size={'sm'}
          title={layer().name}
          description={`${layer().id} / order ${layer().order}`}
        />
      )}
    </Show>
  </Dialog>
);
