import { useStore } from '@nanostores/solid';
import { Box, Button } from '@suis-ui/kit';
import { createMutation } from '@tanstack/solid-query';
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';

import { uploadRecognitionImage } from '@/api/recognitions';
import { Dialog } from '@/components/ui/dialog';
import { PixiViewport } from '../components/pixi-viewport';
import type { LevelData, RecognitionPayload } from '../models/level';
import {
  editorStore,
  setActiveLayerId,
  setSelectedBrushTileId,
  setSelectedLayerId,
  setSelectedTool,
  setSelection,
  setZoom,
} from '../stores/editor';
import {
  canRedo,
  canUndo,
  currentSnapshot,
  initializeHistory,
  redoHistory,
  replaceLevel,
  undoHistory,
} from '../stores/history';
import {
  addEmptyLayerToBottom,
  deleteLayerFromLevel,
  getLayerDeleteFallbackId,
  type LayerMoveDirection,
  moveLayerInLevel,
  sortLayersForDisplay,
} from '../stores/layers';
import { insertRecognitionLayer } from '../stores/recognition';
import { PropertyPanel } from './_components/property-panel';
import { RecognitionResultDialog } from './_components/recognition-result-dialog';
import { SidePanel } from './_components/side-panel';
import { ToolPanel } from './_components/tool-panel';

const defaultLevel: LevelData = {
  id: 'default-level',
  name: 'level name',
  tileTable: [
    {
      tileId: 0,
      name: 'Tile 0',
      backgroundColor: '#2563eb',
      icon: 'star',
      iconColor: '#f8fafc',
      cvShapes: [],
    },
  ],
  layers: [
    {
      id: 'base',
      name: 'Base',
      order: 0,
      tiles: [
        { x: 1, y: 1, tileId: 0 },
        { x: 2, y: 1, tileId: 0 },
        { x: 3, y: 1, tileId: 0 },
        { x: 5, y: 3, tileId: 0 },
        { x: 6, y: 3, tileId: 0 },
        { x: 7, y: 3, tileId: 0 },
        { x: 8, y: 3, tileId: 0 },
      ],
    },
  ],
};

initializeHistory(defaultLevel);

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.matches('input, textarea, select, button')
  );
};

export default function HomePage() {
  const editor = useStore(editorStore);
  const snapshot = useStore(currentSnapshot);
  const undoAvailable = useStore(canUndo);
  const redoAvailable = useStore(canRedo);
  const [recognitionPayloads, setRecognitionPayloads] = createSignal<
    RecognitionPayload[]
  >([]);
  const [selectedRecognitionIndex, setSelectedRecognitionIndex] = createSignal<
    number | null
  >(null);
  const [recognitionResultsOpen, setRecognitionResultsOpen] =
    createSignal(false);
  const [recognitionApiError, setRecognitionApiError] = createSignal<
    string | null
  >(null);
  const level = () => snapshot() ?? defaultLevel;
  const recognitionUploadMutation = createMutation<
    RecognitionPayload[],
    Error,
    File
  >(() => ({
    mutationFn: uploadRecognitionImage,
    onMutate: () => {
      setRecognitionApiError(null);
      setRecognitionResultsOpen(false);
    },
    onSuccess: (payloads) => {
      setRecognitionPayloads(payloads);
      setSelectedRecognitionIndex(payloads.length > 0 ? 0 : null);
      setRecognitionResultsOpen(true);
    },
    onError: (error) => {
      setRecognitionApiError(error.message);
    },
  }));
  const handleUndo = () => {
    undoHistory();
    setSelection([]);
  };
  const handleRedo = () => {
    redoHistory();
    setSelection([]);
  };
  const handleSelectLayer = (layerId: string) => {
    setActiveLayerId(layerId);
    setSelection([]);
  };
  const handleSelectLayerRect = (layerId: string, selected: boolean) => {
    setSelectedLayerId(selected ? layerId : null);
    setSelection([]);
  };
  const handleApplyLevel = (nextLevel: LevelData) => {
    replaceLevel(nextLevel);
    setSelection([]);
  };
  const handleAddLayer = () => {
    const result = addEmptyLayerToBottom(level());

    replaceLevel(result.level);
    setActiveLayerId(result.layer.id);
    setSelectedLayerId(result.layer.id);
    setSelection([]);
  };
  const handleMoveLayer = (layerId: string, direction: LayerMoveDirection) => {
    const nextLevel = moveLayerInLevel(level(), layerId, direction);

    if (!nextLevel) {
      return;
    }

    replaceLevel(nextLevel);
    setSelection([]);
  };
  const handleDeleteLayer = (layerId: string) => {
    const currentLevel = level();
    const currentEditor = editor();
    const fallbackLayerId = getLayerDeleteFallbackId(currentLevel, layerId);
    const nextLevel = deleteLayerFromLevel(currentLevel, layerId);

    if (!nextLevel) {
      return;
    }

    replaceLevel(nextLevel);

    if (currentEditor.activeLayerId === layerId && fallbackLayerId) {
      setActiveLayerId(fallbackLayerId);
    }

    if (currentEditor.selectedLayerId === layerId) {
      setSelectedLayerId(fallbackLayerId);
    }

    setSelection([]);
  };
  const handleInsertRecognitionPayload = async (
    payload: RecognitionPayload,
  ) => {
    const layerId = await insertRecognitionLayer(payload, {
      viewportWidth: window.innerWidth,
    });

    if (!layerId) {
      return null;
    }

    setActiveLayerId(layerId);
    setSelectedLayerId(layerId);
    setSelection([]);

    return layerId;
  };
  const handleImportRecognitionImage = (file: File) => {
    recognitionUploadMutation.mutate(file);
  };
  const handleCloseRecognitionResults = () => {
    setRecognitionResultsOpen(false);
  };
  const handleCloseRecognitionApiError = () => {
    setRecognitionApiError(null);
  };

  createEffect(() => {
    const currentLevel = level();
    const selectedBrushTileId = editor().selectedBrushTileId;

    if (
      currentLevel.tileTable.length > 0 &&
      !currentLevel.tileTable.some(
        (tile) => tile.tileId === selectedBrushTileId,
      )
    ) {
      setSelectedBrushTileId(currentLevel.tileTable[0].tileId);
    }
  });

  createEffect(() => {
    const currentLevel = level();
    const currentEditor = editor();
    const layerIds = new Set(currentLevel.layers.map((layer) => layer.id));
    const fallbackLayerId =
      sortLayersForDisplay(currentLevel.layers)[0]?.id ?? null;

    if (fallbackLayerId && !layerIds.has(currentEditor.activeLayerId)) {
      setActiveLayerId(fallbackLayerId);
    }

    if (
      currentEditor.selectedLayerId &&
      !layerIds.has(currentEditor.selectedLayerId)
    ) {
      setSelectedLayerId(null);
    }
  });

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'z'
      ) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        handleRedo();
        return;
      }

      handleUndo();
    };

    window.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  return (
    <Box
      as={'main'}
      pos={'relative'}
      w={'100vw'}
      h={'100vh'}
      overflow={'hidden'}
      bg={'surface.main'}
      c={'text.main'}
      z={'0'}
    >
      <Box
        as={'section'}
        pos={'absolute'}
        top={'0'}
        right={'0'}
        bottom={'0'}
        left={'0'}
        minW={'0'}
        minH={'0'}
        bg={'gray.950'}
        aria-label={'Level canvas'}
      >
        <PixiViewport snapshot={level()} />
      </Box>

      <SidePanel
        activeLayerId={editor().activeLayerId}
        selectedBrushTileId={editor().selectedBrushTileId}
        selectedLayerId={editor().selectedLayerId}
        level={level()}
        onApplyLevel={handleApplyLevel}
        onAddLayer={handleAddLayer}
        onDeleteLayer={handleDeleteLayer}
        onMoveLayer={handleMoveLayer}
        onSelectActiveLayer={handleSelectLayer}
        onSelectBrushTile={setSelectedBrushTileId}
        onSelectLayerRect={handleSelectLayerRect}
      />
      <ToolPanel
        canUndo={undoAvailable()}
        canRedo={redoAvailable()}
        recognitionImportPending={recognitionUploadMutation.isPending}
        selectedBrushTileId={editor().selectedBrushTileId}
        onImportRecognitionImage={handleImportRecognitionImage}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedTool={editor().selectedTool}
        tileTable={level().tileTable}
        onSelectBrushTile={setSelectedBrushTileId}
        onSelectTool={setSelectedTool}
      />
      <PropertyPanel zoom={editor().zoom} onZoomChange={setZoom} />
      <RecognitionResultDialog
        open={recognitionResultsOpen()}
        payloads={recognitionPayloads()}
        selectedIndex={selectedRecognitionIndex()}
        onClose={handleCloseRecognitionResults}
        onInsertPayload={handleInsertRecognitionPayload}
        onSelectIndex={setSelectedRecognitionIndex}
      />
      <Dialog
        open={Boolean(recognitionApiError())}
        title={'인식 API 실패'}
        description={recognitionApiError() ?? undefined}
        onClose={handleCloseRecognitionApiError}
        footer={
          <Button variant={'primary'} onClick={handleCloseRecognitionApiError}>
            {'확인'}
          </Button>
        }
      >
        <Box text={'body'}>{'이미지 인식 데이터를 가져오지 못했습니다.'}</Box>
      </Dialog>
    </Box>
  );
}
