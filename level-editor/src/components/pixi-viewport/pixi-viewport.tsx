import { useStore } from '@nanostores/solid';
import { Box } from '@suis-ui/kit';
import { createSignal } from 'solid-js';
import type { Cell, LayerBounds, LevelData } from '@/models/level';
import { editorStore, setZoom } from '@/stores/editor';
import { PixiContextMenu } from './context-menu';
import * as styles from './pixi-viewport.css';
import type {
  ContextMenuState,
  LayerResizeHandle,
  SelectionRect,
} from './types';
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
  const [activeLayerResizeHandle, setActiveLayerResizeHandle] =
    createSignal<LayerResizeHandle | null>(null);
  const [hoverLayerResizeHandle, setHoverLayerResizeHandle] =
    createSignal<LayerResizeHandle | null>(null);
  const [layerDragDelta, setLayerDragDelta] = createSignal<Cell | null>(null);
  const [layerResizePreview, setLayerResizePreview] =
    createSignal<LayerBounds | null>(null);
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
  const layerResizeHandle = () =>
    activeLayerResizeHandle() ?? hoverLayerResizeHandle();
  const hasLayerResizeCursor = (...handles: LayerResizeHandle[]) => {
    const handle = layerResizeHandle();

    return selectedTool() === 'select' && !!handle && handles.includes(handle);
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
    activeLayerResizeHandle,
    hoverLayerResizeHandle,
    hoverCell,
    layerDragDelta,
    layerResizePreview,
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
    setActiveLayerResizeHandle,
    setHoverCell,
    setHoverLayerResizeHandle,
    setLayerDragDelta,
    setLayerResizePreview,
    setIsMovingSelection,
    setIsPanning,
    setPaintPreviewCells,
    setSelectionRect,
    setZoom,
    zoom,
  });

  return (
    <>
      <Box
        ref={(element) => {
          host = element;
        }}
        class={styles.viewport}
        classList={{
          [styles.isPanTool]: selectedTool() === 'pan',
          [styles.isPanning]: isPanning(),
          [styles.isSelectionDraggable]: isHoveringSelection(),
          [styles.isSelectionDragging]: isMovingSelection(),
          [styles.isResizeNorthSouth]: hasLayerResizeCursor('n', 's'),
          [styles.isResizeEastWest]: hasLayerResizeCursor('e', 'w'),
          [styles.isResizeNorthEastSouthWest]: hasLayerResizeCursor('ne', 'sw'),
          [styles.isResizeNorthWestSouthEast]: hasLayerResizeCursor('nw', 'se'),
        }}
        pos={'absolute'}
        top={'0'}
        right={'0'}
        bottom={'0'}
        left={'0'}
        bg={'surface.main'}
        c={'surface.high'}
        bc={'surface.higher'}
        overflow={'hidden'}
      />
      <PixiContextMenu
        clipboardAvailable={Boolean(clipboard())}
        contextMenu={contextMenu()}
        deleteDisabled={isDeleteDisabled()}
        selectionCount={selection().length}
        onClearSelection={input.handleClearSelection}
        onCopy={input.handleMenuCopy}
        onDelete={input.handleMenuDelete}
        onPaste={input.handleMenuPaste}
        onResetView={input.handleResetView}
      />
    </>
  );
};
