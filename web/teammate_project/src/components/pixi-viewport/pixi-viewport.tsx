import { useStore } from '@nanostores/solid';
import { Box, Item, Popup } from '@suis-ui/kit';
import {
  ClipboardPaste,
  Copy,
  RefreshCcw,
  SquareDashedMousePointer,
  Trash2,
} from 'lucide-solid';
import { createSignal } from 'solid-js';
import type { Cell, LevelData } from '@/models/level';
import { editorStore, setZoom } from '@/stores/editor';
import { Icon } from '../ui/icon';
import * as styles from './pixi-viewport.css';
import type { ContextMenuState, SelectionRect } from './types';
import { usePixiEditorActions } from './use-pixi-editor-actions';
import { usePixiScene } from './use-pixi-scene';
import { usePixiViewportInput } from './use-pixi-viewport-input';

export type PixiViewportProps = {
  snapshot: LevelData;
};

export const PixiViewport = (props: PixiViewportProps) => {
  let host!: HTMLDivElement;

  const editor = useStore(editorStore);
  const [hoverCell, setHoverCell] = createSignal<Cell | null>(null);
  const [contextMenu, setContextMenu] = createSignal<ContextMenuState>({
    open: false,
    pointerX: 0,
    pointerY: 0,
    cell: { x: 0, y: 0 },
  });
  const [dragDelta, setDragDelta] = createSignal<Cell | null>(null);
  const [erasePreviewCells, setErasePreviewCells] = createSignal<Cell[]>([]);
  const [layerDragDelta, setLayerDragDelta] = createSignal<Cell | null>(null);
  const [paintPreviewCells, setPaintPreviewCells] = createSignal<Cell[]>([]);
  const [selectionRect, setSelectionRect] = createSignal<SelectionRect | null>(
    null,
  );
  const [isPanning, setIsPanning] = createSignal(false);
  const [isMovingSelection, setIsMovingSelection] = createSignal(false);

  const activeLayerId = () => editor().activeLayerId;
  const brushTileId = () => editor().selectedBrushTileId;
  const clipboard = () => editor().clipboard;
  const selectedLayerId = () => editor().selectedLayerId;
  const selectedTool = () => editor().selectedTool;
  const selection = () => editor().selection;
  const snapshot = () => props.snapshot;
  const zoom = () => editor().zoom;
  const getHost = () => host;
  const isDeleteDisabled = () => {
    if (selection().length > 0) {
      return false;
    }

    const menu = contextMenu();

    return menu ? !actions.findTileAt(menu.cell) : false;
  };
  const isHoveringSelection = () => {
    const cell = hoverCell();

    return (
      selectedTool() === 'select' &&
      !isMovingSelection() &&
      !!cell &&
      selection().some((tile) => tile.x === cell.x && tile.y === cell.y)
    );
  };

  const actions = usePixiEditorActions({
    activeLayerId,
    brushTileId,
    clipboard,
    selection,
    snapshot,
  });
  const sceneApi = usePixiScene({
    activeLayerId,
    brushTileId: actions.getBrushTileId,
    clipboard,
    contextMenu,
    dragDelta,
    erasePreviewCells,
    getHost,
    hoverCell,
    layerDragDelta,
    paintPreviewCells,
    selectedLayerId,
    selectedTool,
    selection,
    selectionRect,
    setZoom,
    snapshot,
    zoom,
  });
  const input = usePixiViewportInput({
    actions,
    contextMenu,
    getHost,
    hoverCell,
    scene: sceneApi.scene,
    sceneApi,
    selectedLayerId,
    selectedTool,
    selection,
    setContextMenu,
    setDragDelta,
    setErasePreviewCells,
    setHoverCell,
    setLayerDragDelta,
    setIsMovingSelection,
    setIsPanning,
    setPaintPreviewCells,
    setSelectionRect,
    setZoom,
    zoom,
  });

  return (
    <>
      <div
        ref={host}
        class={styles.viewport}
        classList={{
          [styles.isPanTool]: selectedTool() === 'pan',
          [styles.isPanning]: isPanning(),
          [styles.isSelectionDraggable]: isHoveringSelection(),
          [styles.isSelectionDragging]: isMovingSelection(),
        }}
      />
      <Popup
        open={contextMenu().open}
        placement={'bottom-start'}
        element={
          <Box
            minW={'20rem'}
            class={styles.contextMenuContent}
            role={'menu'}
            align={'stretch'}
            bg={'surface.main'}
            bd={'md'}
            bc={'surface.high'}
            r={'md'}
            shadow={'lg'}
          >
            <Box as={'ul'} class={styles.contextMenuGroup}>
              <Box as={'li'} role={'none'}>
                <Item
                  class={styles.contextMenuHeader}
                  role={'presentation'}
                  title={'선택된 셀'}
                  action={`${contextMenu().cell.x}, ${contextMenu().cell.y}`}
                />
              </Box>
            </Box>
            <Box as={'ul'} class={styles.contextMenuGroup}>
              <Box as={'li'} role={'none'}>
                <Item
                  as={'button'}
                  class={styles.contextMenuItem}
                  media={<Icon name={Copy} />}
                  title={'복사'}
                  action={'⌘C'}
                  role={'menuitem'}
                  props={{
                    disabled: selection().length === 0,
                    type: 'button',
                  }}
                  onClick={input.handleMenuCopy}
                />
              </Box>
              <Box as={'li'} role={'none'}>
                <Item
                  as={'button'}
                  class={styles.contextMenuItem}
                  media={<Icon name={ClipboardPaste} />}
                  title={'붙여넣기'}
                  action={'⌘V'}
                  role={'menuitem'}
                  props={{
                    disabled: !clipboard(),
                    type: 'button',
                  }}
                  onClick={input.handleMenuPaste}
                />
              </Box>
              <Box as={'li'} role={'none'}>
                <Item
                  as={'button'}
                  class={styles.contextMenuItem}
                  media={<Icon name={Trash2} />}
                  title={'삭제'}
                  action={'⌫'}
                  role={'menuitem'}
                  props={{
                    disabled: isDeleteDisabled(),
                    type: 'button',
                  }}
                  onClick={input.handleMenuDelete}
                />
              </Box>
            </Box>
            <Box as={'ul'} class={styles.contextMenuGroup}>
              <Box as={'li'} role={'none'}>
                <Item
                  as={'button'}
                  class={styles.contextMenuItem}
                  media={<Icon name={SquareDashedMousePointer} />}
                  title={'선택 해제'}
                  action={'⌘D'}
                  role={'menuitem'}
                  props={{
                    disabled: selection().length === 0,
                    type: 'button',
                  }}
                  onClick={input.handleClearSelection}
                />
              </Box>
              <Box as={'li'} role={'none'}>
                <Item
                  as={'button'}
                  class={styles.contextMenuItem}
                  media={<Icon name={RefreshCcw} />}
                  title={'뷰 초기화'}
                  action={'⌘R'}
                  role={'menuitem'}
                  props={{
                    type: 'button',
                  }}
                  onClick={input.handleResetView}
                />
              </Box>
            </Box>
          </Box>
        }
      >
        <div
          class={styles.contextMenu}
          style={{
            left: `${contextMenu().pointerX}px`,
            top: `${contextMenu().pointerY}px`,
          }}
        />
      </Popup>
    </>
  );
};
