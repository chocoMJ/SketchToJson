import { useStore } from '@nanostores/solid';
import { Box } from '@suis-ui/kit';
import { createEffect, onCleanup, onMount } from 'solid-js';

import { PixiViewport } from '../components/pixi-viewport';
import {
  RecognitionPayloadSchema,
  type LevelData,
  type RecognitionPayload,
} from '../models/level';
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
import { insertRecognitionLayer } from '../stores/recognition';
import { PropertyPanel } from './_components/property-panel';
import { SidePanel } from './_components/side-panel';
import { ToolPanel } from './_components/tool-panel';
import * as styles from './index.css';

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
  const level = () => snapshot() ?? defaultLevel;
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
  const handleInsertRecognitionPayload = (payload: RecognitionPayload) => {
    const layerId = insertRecognitionLayer(payload, {
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
  const handleImportPng = async (file: File) => {
    const formData = new FormData();

    formData.append('image', file);

    const response = await fetch('/api/segment-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();

      throw new Error(message || 'PNG upload failed.');
    }

    const responseBody = await response.formData();
    const payloadField = responseBody.get('payload');

    if (typeof payloadField !== 'string') {
      throw new Error('Recognition response is missing payload data.');
    }

    const payloadResult = RecognitionPayloadSchema.safeParse(
      JSON.parse(payloadField),
    );

    if (!payloadResult.success) {
      const issue = payloadResult.error.issues[0];

      throw new Error(
        issue
          ? `${issue.path.join('.') || 'payload'}: ${issue.message}`
          : 'Recognition response validation failed.',
      );
    }

    return handleInsertRecognitionPayload(payloadResult.data);
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
      class={styles.shell}
      bg={'surface.main'}
      c={'text.main'}
      z={'0'}
    >
      <Box
        as={'section'}
        class={styles.canvasLayer}
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
        onSelectActiveLayer={handleSelectLayer}
        onSelectBrushTile={setSelectedBrushTileId}
        onSelectLayerRect={handleSelectLayerRect}
      />
      <ToolPanel
        canUndo={undoAvailable()}
        canRedo={redoAvailable()}
        selectedBrushTileId={editor().selectedBrushTileId}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedTool={editor().selectedTool}
        tileTable={level().tileTable}
        onImportPng={handleImportPng}
        onSelectBrushTile={setSelectedBrushTileId}
        onSelectTool={setSelectedTool}
      />
      <PropertyPanel
        zoom={editor().zoom}
        onZoomChange={setZoom}
        onInsertRecognitionPayload={handleInsertRecognitionPayload}
      />
    </Box>
  );
}
