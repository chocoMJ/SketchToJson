import { Box, Item, Popup } from '@suis-ui/kit';
import {
  ClipboardPaste,
  Copy,
  RefreshCcw,
  SquareDashedMousePointer,
  Trash2,
} from 'lucide-solid';

import { Icon, type IconType } from '@/components/ui/icon';
import type { ContextMenuState } from '../types';
import * as styles from './pixi-context-menu.css';

type PixiContextMenuProps = {
  clipboardAvailable: boolean;
  contextMenu: ContextMenuState;
  deleteDisabled: boolean;
  selectionCount: number;
  onClearSelection: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onPaste: () => void;
  onResetView: () => void;
};

type ContextMenuActionProps = {
  action: string;
  disabled?: boolean;
  icon: IconType;
  title: string;
  onClick: () => void;
};

const ContextMenuAction = (props: ContextMenuActionProps) => (
  <Box as={'li'} role={'none'}>
    <Item
      as={'button'}
      class={styles.contextMenuItem}
      w={'100%'}
      c={'text.main'}
      bg={'transparent'}
      media={<Icon name={props.icon} />}
      title={props.title}
      action={props.action}
      role={'menuitem'}
      props={{
        disabled: props.disabled,
        type: 'button',
      }}
      onClick={props.onClick}
    />
  </Box>
);

export const PixiContextMenu = (props: PixiContextMenuProps) => (
  <Popup
    open={props.contextMenu.open}
    placement={'bottom-start'}
    element={
      <Box
        minW={'20rem'}
        role={'menu'}
        align={'stretch'}
        bg={'surface.main'}
        bd={'md'}
        bc={'surface.high'}
        r={'md'}
        shadow={'lg'}
        overflow={'hidden'}
      >
        <Box
          as={'ul'}
          class={styles.contextMenuGroup}
          direction={'column'}
          align={'stretch'}
          p={'xs'}
        >
          <Box as={'li'} role={'none'}>
            <Item
              role={'presentation'}
              c={'text.caption'}
              title={'선택된 셀'}
              action={`${props.contextMenu.cell.x}, ${props.contextMenu.cell.y}`}
            />
          </Box>
        </Box>
        <Box
          as={'ul'}
          class={styles.contextMenuGroup}
          direction={'column'}
          align={'stretch'}
          p={'xs'}
        >
          <ContextMenuAction
            icon={Copy}
            title={'복사'}
            action={'⌘C'}
            disabled={props.selectionCount === 0}
            onClick={props.onCopy}
          />
          <ContextMenuAction
            icon={ClipboardPaste}
            title={'붙여넣기'}
            action={'⌘V'}
            disabled={!props.clipboardAvailable}
            onClick={props.onPaste}
          />
          <ContextMenuAction
            icon={Trash2}
            title={'삭제'}
            action={'⌫'}
            disabled={props.deleteDisabled}
            onClick={props.onDelete}
          />
        </Box>
        <Box
          as={'ul'}
          class={styles.contextMenuGroup}
          direction={'column'}
          align={'stretch'}
          p={'xs'}
        >
          <ContextMenuAction
            icon={SquareDashedMousePointer}
            title={'선택 해제'}
            action={'⌘D'}
            disabled={props.selectionCount === 0}
            onClick={props.onClearSelection}
          />
          <ContextMenuAction
            icon={RefreshCcw}
            title={'뷰 초기화'}
            action={'⌘R'}
            onClick={props.onResetView}
          />
        </Box>
      </Box>
    }
  >
    <Box
      class={styles.contextMenuAnchor}
      pos={'absolute'}
      style={{
        left: `${props.contextMenu.pointerX}px`,
        top: `${props.contextMenu.pointerY}px`,
      }}
    />
  </Popup>
);
